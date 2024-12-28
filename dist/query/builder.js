"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = void 0;
const notionTypes_1 = require("../types/notionTypes");
class QueryBuilder {
    notion;
    databaseId;
    modelName;
    filters = [];
    sorts = [];
    pageSize;
    startCursor;
    includedRelations = new Set();
    constructor(notion, databaseId, modelName) {
        this.notion = notion;
        this.databaseId = databaseId;
        this.modelName = modelName;
    }
    where(property, operator, value) {
        this.filters.push({
            property: String(property),
            operator,
            value
        });
        return this;
    }
    whereRelation(relationProperty, relationFilter) {
        const subBuilder = new QueryBuilder(this.notion, '', relationProperty);
        relationFilter(subBuilder);
        // サブビルダーのフィルターを取得
        const subFilters = subBuilder.getFilters();
        for (const filter of subFilters) {
            this.filters.push({
                relationProperty: String(relationProperty),
                filter: filter
            });
        }
        return this;
    }
    include(relationProperty) {
        this.includedRelations.add(String(relationProperty));
        return this;
    }
    orderBy(property, direction = 'ascending') {
        this.sorts.push({
            property: String(property),
            direction
        });
        return this;
    }
    limit(size) {
        this.pageSize = size;
        return this;
    }
    after(cursor) {
        this.startCursor = cursor;
        return this;
    }
    getFilters() {
        return this.filters;
    }
    buildFilter(condition) {
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
    getPropertyType(property) {
        // 実際のプロパティタイプは、スキーマ情報から取得する必要があります
        if (property === 'title')
            return notionTypes_1.NotionPropertyTypes.Title;
        if (property.endsWith('At'))
            return notionTypes_1.NotionPropertyTypes.Date;
        if (property === 'isActive')
            return notionTypes_1.NotionPropertyTypes.Checkbox;
        return notionTypes_1.NotionPropertyTypes.RichText;
    }
    async execute() {
        const query = {
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
    async loadRelations(model) {
        for (const relationProperty of this.includedRelations) {
            if (model[relationProperty]) {
                const relationIds = model[relationProperty].map((rel) => rel.id);
                const relationData = await Promise.all(relationIds.map(id => this.notion.pages.retrieve({ page_id: id })));
                model[relationProperty] = relationData.map(page => this.mapResponseToModel(page));
            }
        }
    }
    mapResponseToModel(page) {
        const props = page.properties;
        return {
            id: page.id,
            ...Object.entries(props).reduce((acc, [key, value]) => {
                acc[key] = this.mapPropertyValue(value);
                return acc;
            }, {}),
            createdTime: page.created_time,
            lastEditedTime: page.last_edited_time
        };
    }
    mapPropertyValue(property) {
        switch (property.type) {
            case notionTypes_1.NotionPropertyTypes.Title:
                return property.title[0]?.plain_text || '';
            case notionTypes_1.NotionPropertyTypes.RichText:
                return property.rich_text[0]?.plain_text || '';
            case notionTypes_1.NotionPropertyTypes.Number:
                return property.number || 0;
            case notionTypes_1.NotionPropertyTypes.Select:
                return property.select?.name || '';
            case notionTypes_1.NotionPropertyTypes.MultiSelect:
                return property.multi_select?.map((item) => item.name) || [];
            case notionTypes_1.NotionPropertyTypes.Date:
                return property.date?.start || null;
            case notionTypes_1.NotionPropertyTypes.Checkbox:
                return property.checkbox || false;
            case notionTypes_1.NotionPropertyTypes.People:
                return property.people?.map((user) => ({
                    id: user.id,
                    name: user.name || '',
                    avatar_url: user.avatar_url
                })) || [];
            case notionTypes_1.NotionPropertyTypes.Relation:
                return property.relation?.map((item) => ({ id: item.id })) || [];
            case notionTypes_1.NotionPropertyTypes.Formula:
                return property.formula?.string || property.formula?.number?.toString() || '';
            default:
                return '';
        }
    }
}
exports.QueryBuilder = QueryBuilder;
