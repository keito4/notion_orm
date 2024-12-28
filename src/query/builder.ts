import { Client } from '@notionhq/client';
import { NotionPropertyTypes } from '../types/notionTypes';

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'before' | 'after' | 'on_or_before' | 'on_or_after' | 'is_empty' | 'is_not_empty';

export interface FilterCondition {
  property: string;
  operator: FilterOperator;
  value: any;
}

export interface SortCondition {
  property: string;
  direction: 'ascending' | 'descending';
}

export class QueryBuilder<T> {
  private filters: FilterCondition[] = [];
  private sorts: SortCondition[] = [];
  private pageSize?: number;
  private startCursor?: string;

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

  private buildFilter(condition: FilterCondition): any {
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
    // This is a simplified version. In a real implementation,
    // you would want to get the actual property type from the schema
    if (property === 'Name') return 'title';
    if (property.endsWith('Progress')) return 'formula';
    if (['完了', '注力', 'アーカイブ'].includes(property)) return 'checkbox';
    if (['Sub-item', '似てるページ', 'OYKOT Timeline', 'Action', 'Parent item'].includes(property)) return 'relation';
    if (property === '日付') return 'date';
    if (property === '責任者') return 'people';
    return 'rich_text';
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
    return response.results.map((page: any) => this.mapResponseToModel(page));
  }

  private mapResponseToModel(page: any): T {
    // この部分は実際のモデルの型に応じて適切にマッピングする必要があります
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
      case 'title':
        return property.title[0]?.plain_text || '';
      case 'rich_text':
        return property.rich_text[0]?.plain_text || '';
      case 'number':
        return property.number || 0;
      case 'select':
        return property.select?.name || '';
      case 'multi_select':
        return property.multi_select?.map((item: any) => item.name) || [];
      case 'date':
        return property.date?.start || null;
      case 'checkbox':
        return property.checkbox || false;
      case 'people':
        return property.people?.map((user: any) => ({
          id: user.id,
          name: user.name || '',
          avatar_url: user.avatar_url
        })) || [];
      case 'relation':
        return property.relation?.map((item: any) => ({ id: item.id })) || [];
      case 'formula':
        return property.formula?.string || property.formula?.number?.toString() || '';
      default:
        return '';
    }
  }
}
