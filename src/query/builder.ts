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

  constructor(
    private notion: Client,
    private databaseId: string,
    private modelName: string,
    private relationMappings: Record<string, Record<string, string>> = {},
    private propertyMappings: Record<string, Record<string, string>> = {}
  ) {
    logger.debug(`Initializing QueryBuilder for ${modelName} with database ID ${databaseId}`);
    logger.debug('Property mappings:', this.propertyMappings[this.modelName]);
    logger.debug('Relation mappings:', this.relationMappings[this.modelName]);
  }

  where(property: keyof T | string, operator: FilterOperator, value: any): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(property));
    logger.debug(`Adding where condition for property: ${mappedProperty}, operator: ${operator}, value:`, value);
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
    logger.debug(`Adding relation filter for property: ${mappedProperty}`);

    const relatedDatabaseId = this.relationMappings[this.modelName]?.[String(relationProperty)];
    if (!relatedDatabaseId) {
      throw new Error(`No database ID mapping found for relation: ${String(relationProperty)}`);
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
      throw new Error('Relation filter must have at least one condition');
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
    logger.debug(`Including relation: ${mappedProperty}`);
    this.includedRelations.add(mappedProperty);
    return this;
  }

  orderBy(property: keyof T | string, direction: 'ascending' | 'descending' = 'ascending'): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(property));
    logger.debug(`Adding sort condition for property: ${mappedProperty}, direction: ${direction}`);
    this.sorts.push({
      property: mappedProperty,
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

  private getMappedPropertyName(property: string): string {
    const modelMappings = this.propertyMappings[this.modelName];
    if (modelMappings) {
      const mappedName = modelMappings[property];
      if (mappedName) {
        logger.debug(`Mapped property ${property} to ${mappedName}`);
        return mappedName;
      }
    }
    logger.debug(`Using original property name: ${property}`);
    return property;
  }

  private isRelationProperty(property: string): boolean {
    const propertyLower = property.toLowerCase();
    return propertyLower === 'domain' || 
           propertyLower === 'documents' || 
           propertyLower.includes('relation') ||
           this.relationMappings[this.modelName]?.[property] !== undefined;
  }

  private buildFilter(condition: FilterCondition | RelationFilter): any {
    if ('relationProperty' in condition) {
      logger.debug(`Building relation filter for property: ${condition.relationProperty}, value:`, condition.value);
      return {
        property: condition.relationProperty,
        relation: {
          contains: condition.value.toString()
        }
      };
    }

    const { property, operator, value } = condition;
    const isRelation = this.isRelationProperty(property);
    logger.debug(`Building filter for property: ${property}, operator: ${operator}, isRelation: ${isRelation}, value:`, value);

    // リレーションプロパティの特別な処理
    if (isRelation) {
      return {
        property,
        relation: {
          contains: value.toString()
        }
      };
    }

    const propertyType = this.getPropertyType(property);
    logger.debug(`Property type determined as: ${propertyType}`);

    switch (operator) {
      case 'equals':
        return {
          property,
          [propertyType]: {
            equals: value
          }
        };
      case 'contains':
        return {
          property,
          [propertyType]: {
            contains: value
          }
        };
      case 'startsWith':
        return {
          property,
          [propertyType]: {
            starts_with: value
          }
        };
      case 'endsWith':
        return {
          property,
          [propertyType]: {
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
          [propertyType]: {
            is_empty: true
          }
        };
      case 'is_not_empty':
        return {
          property,
          [propertyType]: {
            is_not_empty: true
          }
        };
      default:
        logger.warn(`Unsupported operator: ${operator}, using default equals`);
        return {
          property,
          [propertyType]: {
            equals: value
          }
        };
    }
  }

  private getPropertyType(property: string): string {
    const propertyLower = property.toLowerCase();

    // Domain関連のプロパティはリレーション
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

    // デフォルトはRichText
    return NotionPropertyTypes.RichText;
  }

  private buildSortCondition(sort: SortCondition): any {
    const mappedProperty = this.getMappedPropertyName(String(sort.property));
    logger.debug(`Building sort condition for property: ${mappedProperty}, direction: ${sort.direction}`);

    // Notionの特殊なプロパティ名とシステムプロパティのマッピング
    let finalPropertyName = mappedProperty;

    // システムプロパティの処理
    if (mappedProperty === 'createdTime' || mappedProperty === 'Created At') {
      finalPropertyName = 'created_time';
    } else if (mappedProperty === 'lastEditedTime') {
      finalPropertyName = 'last_edited_time';
    }

    // プロパティ名がNotionのシステムプロパティでない場合は、通常のプロパティとして扱う
    const isSystemProperty = ['created_time', 'last_edited_time'].includes(finalPropertyName);
    const sortCondition = {
      direction: sort.direction
    } as any;

    if (isSystemProperty) {
      sortCondition.timestamp = finalPropertyName;
    } else {
      sortCondition.property = finalPropertyName;
    }

    logger.debug(`Generated sort condition:`, sortCondition);
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
        logger.debug(`Generated filter:`, JSON.stringify(query.filter, null, 2));
      }

      if (this.sorts.length > 0) {
        query.sorts = this.sorts.map(sort => this.buildSortCondition(sort));
        logger.debug(`Generated sorts:`, JSON.stringify(query.sorts, null, 2));
      }

      if (this.pageSize) {
        query.page_size = this.pageSize;
      }

      if (this.startCursor) {
        query.start_cursor = this.startCursor;
      }

      logger.debug(`Executing Notion query for ${this.modelName}:`, JSON.stringify(query, null, 2));

      const response = await this.notion.databases.query(query);
      logger.debug(`Received response with ${response.results.length} results`);

      const results = response.results.map(page => this.mapResponseToModel(page));
      logger.debug(`Mapped results:`, JSON.stringify(results, null, 2));

      if (this.includedRelations.size > 0) {
        await Promise.all(results.map(result => this.loadRelations(result)));
      }

      return results;
    } catch (error: any) {
      logger.error(`Error executing query for ${this.modelName}:`, error);
      if (error.code === 'validation_error') {
        logger.error(`Validation error details: ${error.message}`);
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
      logger.debug(`Using cached relation data for ID: ${id}`);
      return cached.data;
    }

    try {
      logger.debug(`Fetching relation data for ID: ${id}`);
      const response = await this.notion.pages.retrieve({ page_id: id });
      const mappedData = this.mapResponseToModel(response);

      this.relationCache[id] = {
        data: mappedData,
        timestamp: Date.now()
      };

      return mappedData;
    } catch (error) {
      logger.error(`Error retrieving relation data for ID ${id}:`, error);
      throw error;
    }
  }

  private mapResponseToModel(page: any): T {
    const props = page.properties;
    logger.debug(`Mapping response to model for page ID: ${page.id}`);
    logger.debug(`Page properties:`, JSON.stringify(props, null, 2));

    const mapped = {
      id: page.id,
      ...Object.entries(props).reduce((acc: any, [key, value]: [string, any]) => {
        acc[key] = this.mapPropertyValue(value);
        return acc;
      }, {}),
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    } as T;

    logger.debug(`Mapped model:`, JSON.stringify(mapped, null, 2));
    return mapped;
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
        return property.relation?.map((item: any) => ({ id: item.id })) || [];
      case NotionPropertyTypes.Formula:
        return property.formula?.string || property.formula?.number?.toString() || '';
      default:
        logger.warn(`Unsupported Notion property type: ${property.type}`);
        return '';
    }
  }
}