import { Client } from '@notionhq/client';
import { NotionPropertyTypes } from '../types/notionTypes';
import { logger } from '../utils/logger';

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'before' | 'after' | 'on_or_before' | 'on_or_after' | 'is_empty' | 'is_not_empty';

export interface FilterCondition {
  property: string;
  operator: FilterOperator;
  value: any;
}

export interface RelationFilter extends FilterCondition {
  relationProperty: string;
}

export interface SortCondition {
  property: string;
  direction: 'ascending' | 'descending';
}

interface RelationCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

export class QueryBuilder<T> {
  private filters: (FilterCondition | RelationFilter)[] = [];
  private sorts: SortCondition[] = [];
  private pageSize?: number;
  private startCursor?: string;
  private includedRelations: Set<string> = new Set();
  private relationCache: RelationCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュを保持
  private isDebugMode: boolean = process.env.DEBUG === 'true';

  constructor(
    private notion: Client,
    private databaseId: string,
    private modelName: string,
    private relationMappings: Record<string, Record<string, string>> = {},
    private propertyMappings: Record<string, Record<string, string>> = {}
  ) {
    if (this.isDebugMode) {
      logger.debug(`クエリビルダーを初期化: ${modelName}, データベースID: ${databaseId}`);
      logger.debug('プロパティマッピング:', JSON.stringify(this.propertyMappings[this.modelName], null, 2));
      logger.debug('リレーションマッピング:', JSON.stringify(this.relationMappings[this.modelName], null, 2));
    }
  }

  where(property: keyof T | string, operator: FilterOperator, value: any): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(property));
    if (this.isDebugMode) {
      logger.debug(`フィルター条件を追加: プロパティ=${mappedProperty}, 演算子=${operator}, 値=${JSON.stringify(value)}`);
    }
    this.filters.push({
      property: mappedProperty,
      operator,
      value
    });
    return this;
  }

  whereRelation<R>(
    relationProperty: keyof T | string,
    relationFilter: (builder: QueryBuilder<R>) => QueryBuilder<R>
  ): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(relationProperty));
    if (this.isDebugMode) {
      logger.debug(`リレーションフィルターを追加: ${mappedProperty}`);
    }

    const relatedDatabaseId = this.relationMappings[this.modelName]?.[String(relationProperty)];
    if (!relatedDatabaseId) {
      throw new Error(`リレーション "${String(relationProperty)}" のデータベースIDが見つかりません`);
    }

    const subBuilder = new QueryBuilder<R>(
      this.notion,
      relatedDatabaseId,
      String(relationProperty),
      this.relationMappings,
      this.propertyMappings
    );

    const builder = relationFilter(subBuilder);
    const subFilters = builder.getFilters();

    if (subFilters.length === 0) {
      throw new Error('リレーションフィルターには少なくとも1つの条件が必要です');
    }

    const subFilter = subFilters[0];
    this.filters.push({
      property: mappedProperty,
      operator: subFilter.operator,
      value: subFilter.value,
      relationProperty: mappedProperty
    });

    return this;
  }

  include(relationProperty: keyof T | string): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(relationProperty));
    if (this.isDebugMode) {
      logger.debug(`リレーションを含める: ${mappedProperty}`);
    }
    this.includedRelations.add(mappedProperty);
    return this;
  }

  orderBy(property: keyof T | string, direction: 'ascending' | 'descending' = 'ascending'): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(property));
    if (this.isDebugMode) {
      logger.debug(`ソート条件を追加: プロパティ=${mappedProperty}, 方向=${direction}`);
    }
    this.sorts.push({
      property: mappedProperty,
      direction
    });
    return this;
  }

  limit(size: number): QueryBuilder<T> {
    if (this.isDebugMode) {
      logger.debug(`ページサイズを設定: ${size}`);
    }
    this.pageSize = size;
    return this;
  }

  after(cursor: string): QueryBuilder<T> {
    if (this.isDebugMode) {
      logger.debug(`開始カーソルを設定: ${cursor}`);
    }
    this.startCursor = cursor;
    return this;
  }

  getFilters(): (FilterCondition | RelationFilter)[] {
    return this.filters;
  }

  private getMappedPropertyName(property: string): string {
    const modelMappings = this.propertyMappings[this.modelName];
    if (modelMappings) {
      const mappedName = modelMappings[property];
      if (mappedName) {
        if (this.isDebugMode) {
          logger.debug(`プロパティマッピング: ${property} => ${mappedName}`);
        }
        return mappedName;
      }
    }
    if (this.isDebugMode) {
      logger.debug(`プロパティマッピングなし: ${property} をそのまま使用`);
    }
    return property;
  }

  private isRelationProperty(property: string): boolean {
    const propertyLower = property.toLowerCase();
    const isRelation = propertyLower === 'domain' || 
                      propertyLower === 'documents' || 
                      propertyLower.includes('relation') ||
                      this.relationMappings[this.modelName]?.[property] !== undefined;

    if (this.isDebugMode && isRelation) {
      logger.debug(`プロパティ "${property}" はリレーションとして検出されました`);
    }
    return isRelation;
  }

  private buildFilter(condition: FilterCondition | RelationFilter): any {
    if ('relationProperty' in condition) {
      if (this.isDebugMode) {
        logger.debug(`リレーションフィルターを構築: ${condition.relationProperty}, 値:`, condition.value);
      }
      return {
        property: condition.relationProperty,
        relation: {
          contains: condition.value.toString()
        }
      };
    }

    const { property, operator, value } = condition;
    const isRelation = this.isRelationProperty(property);
    if (this.isDebugMode) {
      logger.debug(`フィルターを構築: プロパティ=${property}, 演算子=${operator}, リレーション=${isRelation}, 値:`, value);
    }

    if (isRelation) {
      return {
        property,
        relation: {
          contains: value.toString()
        }
      };
    }

    const propertyType = this.getPropertyType(property);
    if (this.isDebugMode) {
      logger.debug(`プロパティタイプ: ${propertyType}`);
    }

    const filter = {
      property,
      [propertyType]: this.getFilterCondition(operator, value)
    };

    if (this.isDebugMode) {
      logger.debug('生成されたフィルター:', JSON.stringify(filter, null, 2));
    }

    return filter;
  }

  private getFilterCondition(operator: FilterOperator, value: any): any {
    switch (operator) {
      case 'equals':
        return { equals: value };
      case 'contains':
        return { contains: value };
      case 'startsWith':
        return { starts_with: value };
      case 'endsWith':
        return { ends_with: value };
      case 'before':
      case 'after':
      case 'on_or_before':
      case 'on_or_after':
        return { [operator]: value };
      case 'is_empty':
        return { is_empty: true };
      case 'is_not_empty':
        return { is_not_empty: true };
      default:
        logger.warn(`未サポートの演算子: ${operator}, equals を使用します`);
        return { equals: value };
    }
  }

  private getPropertyType(property: string): string {
    if (this.isDebugMode) {
      logger.debug(`プロパティタイプを判定: ${property}`);
    }

    const propertyLower = property.toLowerCase();

    if (this.isRelationProperty(property)) {
      return NotionPropertyTypes.Relation;
    }

    // 標準的なプロパティタイプのマッピング
    if (propertyLower === 'title' || propertyLower === 'name') {
      return NotionPropertyTypes.Title;
    }
    if (propertyLower.endsWith('at') || propertyLower.includes('date')) {
      return NotionPropertyTypes.Date;
    }
    if (propertyLower.startsWith('is') || propertyLower === 'active') {
      return NotionPropertyTypes.Checkbox;
    }
    if (propertyLower.includes('tags')) {
      return NotionPropertyTypes.MultiSelect;
    }
    if (propertyLower.includes('status')) {
      return NotionPropertyTypes.Select;
    }

    if (this.isDebugMode) {
      logger.debug(`デフォルトのプロパティタイプ(RichText)を使用: ${property}`);
    }
    return NotionPropertyTypes.RichText;
  }

  private buildSortCondition(sort: SortCondition): any {
    const mappedProperty = this.getMappedPropertyName(String(sort.property));
    if (this.isDebugMode) {
      logger.debug(`ソート条件を構築: プロパティ=${mappedProperty}, 方向=${sort.direction}`);
    }

    let finalPropertyName = mappedProperty;

    if (mappedProperty === 'createdTime' || mappedProperty === 'Created At') {
      finalPropertyName = 'created_time';
    } else if (mappedProperty === 'lastEditedTime') {
      finalPropertyName = 'last_edited_time';
    }

    const isSystemProperty = ['created_time', 'last_edited_time'].includes(finalPropertyName);
    const sortCondition = {
      direction: sort.direction
    } as any;

    if (isSystemProperty) {
      sortCondition.timestamp = finalPropertyName;
    } else {
      sortCondition.property = finalPropertyName;
    }

    if (this.isDebugMode) {
      logger.debug('生成されたソート条件:', JSON.stringify(sortCondition, null, 2));
    }
    return sortCondition;
  }

  async execute(): Promise<T[]> {
    try {
      const query: any = {
        database_id: this.databaseId
      };

      if (this.filters.length > 0) {
        query.filter = this.filters.length === 1
          ? this.buildFilter(this.filters[0])
          : {
              and: this.filters.map(filter => this.buildFilter(filter))
            };
      }

      if (this.sorts.length > 0) {
        query.sorts = this.sorts.map(sort => this.buildSortCondition(sort));
      }

      if (this.pageSize) {
        query.page_size = this.pageSize;
      }

      if (this.startCursor) {
        query.start_cursor = this.startCursor;
      }

      if (this.isDebugMode) {
        logger.debug(`クエリを実行: ${this.modelName}`, JSON.stringify(query, null, 2));
      }

      const response = await this.notion.databases.query(query);
      if (this.isDebugMode) {
        logger.debug(`${response.results.length} 件の結果を取得`);
      }

      const results = response.results.map(page => this.mapResponseToModel(page));

      if (this.includedRelations.size > 0) {
        await Promise.all(results.map(result => this.loadRelations(result)));
      }

      return results;
    } catch (error: any) {
      logger.error(`${this.modelName} のクエリ実行中にエラーが発生:`, error);
      if (error.code === 'validation_error') {
        logger.error(`バリデーションエラーの詳細: ${error.message}`);
      }
      throw error;
    }
  }

  private async loadRelations(model: any): Promise<void> {
    for (const relationProperty of this.includedRelations) {
      if (model[relationProperty]) {
        const relationIds = Array.isArray(model[relationProperty])
          ? model[relationProperty].map((rel: { id: string }) => rel.id)
          : [model[relationProperty].id];

        const relationData = await Promise.all(
          relationIds.map(id => this.getRelationData(id))
        );

        model[relationProperty] = Array.isArray(model[relationProperty])
          ? relationData
          : relationData[0];
      }
    }
  }

  private async getRelationData(id: string): Promise<any> {
    const cached = this.relationCache[id];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      if (this.isDebugMode) {
        logger.debug(`キャッシュされたリレーションデータを使用: ${id}`);
      }
      return cached.data;
    }

    try {
      if (this.isDebugMode) {
        logger.debug(`リレーションデータを取得: ${id}`);
      }
      const response = await this.notion.pages.retrieve({ page_id: id });
      const mappedData = this.mapResponseToModel(response);

      this.relationCache[id] = {
        data: mappedData,
        timestamp: Date.now()
      };

      return mappedData;
    } catch (error) {
      logger.error(`リレーションデータの取得中にエラーが発生 (ID: ${id}):`, error);
      throw error;
    }
  }

  private mapResponseToModel(page: any): T {
    const props = page.properties;
    if (this.isDebugMode) {
      logger.debug(`レスポンスをモデルにマッピング: ${page.id}`);
      logger.debug('ページのプロパティ:', JSON.stringify(props, null, 2));
    }

    const mapped = {
      id: page.id,
      ...Object.entries(props).reduce((acc: any, [key, value]: [string, any]) => {
        acc[key] = this.mapPropertyValue(value);
        return acc;
      }, {}),
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    } as T;

    if (this.isDebugMode) {
      logger.debug('マッピング結果:', JSON.stringify(mapped, null, 2));
    }
    return mapped;
  }

  private mapPropertyValue(property: any): any {
    if (this.isDebugMode) {
      logger.debug(`プロパティ値をマッピング:`, property);
    }

    switch (property.type) {
      case NotionPropertyTypes.Title:
        return property.title[0]?.plain_text || '';
      case NotionPropertyTypes.RichText:
        return property.rich_text[0]?.plain_text || '';
      case NotionPropertyTypes.Number:
        return property.number || 0;
      case NotionPropertyTypes.Select:
        return property.select?.name || '';
      case NotionPropertyTypes.MultiSelect:
        return property.multi_select?.map((item: any) => item.name) || [];
      case NotionPropertyTypes.Date:
        return property.date?.start || null;
      case NotionPropertyTypes.Checkbox:
        return property.checkbox || false;
      case NotionPropertyTypes.People:
        return property.people?.map((user: any) => ({
          id: user.id,
          name: user.name || '',
          avatar_url: user.avatar_url
        })) || [];
      case NotionPropertyTypes.Relation:
        return property.relation?.map((item: any) => ({ id: item.id })) || [];
      case NotionPropertyTypes.Formula:
        return property.formula?.string || property.formula?.number?.toString() || '';
      default:
        logger.warn(`未サポートのNotionプロパティタイプ: ${property.type}`);
        return '';
    }
  }
}