import { Client } from '@notionhq/client';
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
export declare class QueryBuilder<T> {
    private notion;
    private databaseId;
    private modelName;
    private filters;
    private sorts;
    private pageSize?;
    private startCursor?;
    constructor(notion: Client, databaseId: string, modelName: string);
    where(property: keyof T, operator: FilterOperator, value: any): QueryBuilder<T>;
    orderBy(property: keyof T, direction?: 'ascending' | 'descending'): QueryBuilder<T>;
    limit(size: number): QueryBuilder<T>;
    after(cursor: string): QueryBuilder<T>;
    private buildFilter;
    private getPropertyType;
    execute(): Promise<T[]>;
    private mapResponseToModel;
    private mapPropertyValue;
}
