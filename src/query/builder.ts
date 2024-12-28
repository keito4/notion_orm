import { Client } from '@notionhq/client';
import { NotionPropertyTypes } from '../types/notionTypes';

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

export class QueryBuilder<T> {
  private filters: (FilterCondition | RelationFilter)[] = [];
  private sorts: SortCondition[] = [];
  private pageSize?: number;
  private startCursor?: string;
  private includedRelations: Set<string> = new Set();

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

    // サブビルダーのフィルターを取得
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
      // リレーションフィルター
      return {
        property: condition.relationProperty,
        relation: this.buildFilter(condition.filter)
      };
    }

    // 通常のフィルター
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
    // 実際のプロパティタイプは、スキーマ情報から取得する必要があります
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

    const response = await this.notion.databases.query(query);
    const results = response.results.map(page => this.mapResponseToModel(page));

    // リレーションの取得
    if (this.includedRelations.size > 0) {
      for (const result of results) {
        await this.loadRelations(result);
      }
    }

    return results;
  }

  private async loadRelations(model: any): Promise<void> {
    for (const relationProperty of this.includedRelations) {
      if (model[relationProperty]) {
        const relationIds = model[relationProperty].map((rel: { id: string }) => rel.id);
        const relationData = await Promise.all(
          relationIds.map(id => this.notion.pages.retrieve({ page_id: id }))
        );
        model[relationProperty] = relationData.map(page => this.mapResponseToModel(page));
      }
    }
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
        return property.relation?.map((item: any) => ({ id: item.id })) || [];
      case NotionPropertyTypes.Formula:
        return property.formula?.string || property.formula?.number?.toString() || '';
      default:
        return '';
    }
  }
}