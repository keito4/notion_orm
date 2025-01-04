import { Client } from '@notionhq/client';
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
export declare class QueryBuilder<T> {
    private notion;
    private databaseId;
    private modelName;
    private relationMappings;
    private propertyMappings;
    private filters;
    private sorts;
    private pageSize?;
    private startCursor?;
    private includedRelations;
    private relationCache;
    private readonly CACHE_DURATION;
    private isDebugMode;
    constructor(notion: Client, databaseId: string, modelName: string, relationMappings?: Record<string, Record<string, string>>, propertyMappings?: Record<string, Record<string, string>>);
    where(property: keyof T | string, operator: FilterOperator, value: any): QueryBuilder<T>;
    whereRelation<R>(relationProperty: keyof T | string, relationFilter: (builder: QueryBuilder<R>) => QueryBuilder<R>): QueryBuilder<T>;
    include(relationProperty: keyof T | string): QueryBuilder<T>;
    orderBy(property: keyof T | string, direction?: 'ascending' | 'descending'): QueryBuilder<T>;
    limit(size: number): QueryBuilder<T>;
    after(cursor: string): QueryBuilder<T>;
    getFilters(): (FilterCondition | RelationFilter)[];
    private getMappedPropertyName;
    private isRelationProperty;
    private buildFilter;
    private getFilterCondition;
    private getPropertyType;
    private buildSortCondition;
    execute(): Promise<T[]>;
    private loadRelations;
    private getRelationData;
    private mapResponseToModel;
    private mapPropertyValue;
}
