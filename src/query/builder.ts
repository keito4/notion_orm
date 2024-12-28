import { Client } from '@notionhq/client';
import { NotionPropertyTypes } from '../types/notionTypes';
import { logger } from '../utils/logger';

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'before' | 'after' | 'on_or_before' | 'on_or_after' | 'is_empty' | 'is_not_empty';

export interface FilterCondition {
  property: string;
  operator: FilterOperator;
  value: any;
}

export interface RelationFilter {
  relationProperty: string;
  filter: FilterCondition;
}

export interface SortCondition {
  property: string;
  direction: 'ascending' | 'descending';
}

// キャッシュ管理のためのインターフェース
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

  constructor(
    private notion: Client,
    private databaseId: string,
    private modelName: string
  ) {}

  where(property: keyof T, operator: FilterOperator, value: any): QueryBuilder<T> {
    this.filters.push({
      property: String(property),
      operator,
      value
    });
    return this;
  }

  whereRelation<R>(
    relationProperty: keyof T,
    relationFilter: (builder: QueryBuilder<R>) => QueryBuilder<R>
  ): QueryBuilder<T> {
    const subBuilder = new QueryBuilder<R>(this.notion, '', relationProperty as string);
    relationFilter(subBuilder);

    const subFilters = subBuilder.getFilters();
    for (const filter of subFilters) {
      this.filters.push({
        relationProperty: String(relationProperty),
        filter: filter as FilterCondition
      });
    }
    return this;
  }

  include(relationProperty: keyof T): QueryBuilder<T> {
    this.includedRelations.add(String(relationProperty));
    return this;
  }

  orderBy(property: keyof T, direction: 'ascending' | 'descending' = 'ascending'): QueryBuilder<T> {
    this.sorts.push({
      property: String(property),
      direction
    });
    return this;
  }

  limit(size: number): QueryBuilder<T> {
    this.pageSize = size;
    return this;
  }

  after(cursor: string): QueryBuilder<T> {
    this.startCursor = cursor;
    return this;
  }

  getFilters(): (FilterCondition | RelationFilter)[] {
    return this.filters;
  }

  private buildFilter(condition: FilterCondition | RelationFilter): any {
    if ('relationProperty' in condition) {
      return {
        property: condition.relationProperty,
        relation: this.buildFilter(condition.filter)
      };
    }

    const { property, operator, value } = condition;

    switch (operator) {
      case 'equals':
        return {
          property,
          [this.getPropertyType(property)]: {
            equals: value
          }
        };
      case 'contains':
        return {
          property,
          [this.getPropertyType(property)]: {
            contains: value
          }
        };
      case 'startsWith':
        return {
          property,
          [this.getPropertyType(property)]: {
            starts_with: value
          }
        };
      case 'endsWith':
        return {
          property,
          [this.getPropertyType(property)]: {
            ends_with: value
          }
        };
      case 'before':
      case 'after':
      case 'on_or_before':
      case 'on_or_after':
        return {
          property,
          date: {
            [operator]: value
          }
        };
      case 'is_empty':
        return {
          property,
          [this.getPropertyType(property)]: {
            is_empty: true
          }
        };
      case 'is_not_empty':
        return {
          property,
          [this.getPropertyType(property)]: {
            is_not_empty: true
          }
        };
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  private getPropertyType(property: string): string {
    // プロパティタイプをスキーマ情報から推測
    if (property === 'title') return NotionPropertyTypes.Title;
    if (property.endsWith('At')) return NotionPropertyTypes.Date;
    if (property === 'isActive') return NotionPropertyTypes.Checkbox;
    return NotionPropertyTypes.RichText;
  }

  async execute(): Promise<T[]> {
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
      query.sorts = this.sorts.map(({ property, direction }) => ({
        property,
        direction
      }));
    }

    if (this.pageSize) {
      query.page_size = this.pageSize;
    }

    if (this.startCursor) {
      query.start_cursor = this.startCursor;
    }

    logger.info(`Executing query for ${this.modelName}:`, query);

    const response = await this.notion.databases.query(query);
    const results = response.results.map(page => this.mapResponseToModel(page));

    // リレーションの取得（必要な場合のみ）
    if (this.includedRelations.size > 0) {
      await Promise.all(results.map(result => this.loadRelations(result)));
    }

    return results;
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

        // 単一のリレーションか配列かを維持
        model[relationProperty] = Array.isArray(model[relationProperty])
          ? relationData
          : relationData[0];
      }
    }
  }

  private async getRelationData(id: string): Promise<any> {
    // キャッシュチェック
    const cached = this.relationCache[id];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      logger.info(`Using cached relation data for ID: ${id}`);
      return cached.data;
    }

    // キャッシュがない場合は取得
    const response = await this.notion.pages.retrieve({ page_id: id });
    const mappedData = this.mapResponseToModel(response);

    // キャッシュを更新
    this.relationCache[id] = {
      data: mappedData,
      timestamp: Date.now()
    };

    return mappedData;
  }

  private mapResponseToModel(page: any): T {
    const props = page.properties;
    return {
      id: page.id,
      ...Object.entries(props).reduce((acc: any, [key, value]: [string, any]) => {
        acc[key] = this.mapPropertyValue(value);
        return acc;
      }, {}),
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    } as T;
  }

  private mapPropertyValue(property: any): any {
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
        // 単一のリレーションの場合は配列ではなくオブジェクトを返す
        const relations = property.relation?.map((item: any) => ({ id: item.id })) || [];
        return relations.length === 1 ? relations[0] : relations;
      case NotionPropertyTypes.Formula:
        return property.formula?.string || property.formula?.number?.toString() || '';
      default:
        logger.warn(`Unsupported Notion property type: ${property.type}`);
        return '';
    }
  }
}