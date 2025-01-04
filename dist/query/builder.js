"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = void 0;
const notionTypes_1 = require("../types/notionTypes");
const logger_1 = require("../utils/logger");
class QueryBuilder {
    notion;
    databaseId;
    modelName;
    relationMappings;
    propertyMappings;
    filters = [];
    sorts = [];
    pageSize;
    startCursor;
    includedRelations = new Set();
    relationCache = {};
    CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュを保持
    isDebugMode = process.env.DEBUG === 'true';
    constructor(notion, databaseId, modelName, relationMappings = {}, propertyMappings = {}) {
        this.notion = notion;
        this.databaseId = databaseId;
        this.modelName = modelName;
        this.relationMappings = relationMappings;
        this.propertyMappings = propertyMappings;
        if (this.isDebugMode) {
            logger_1.logger.debug(`クエリビルダーを初期化: ${modelName}, データベースID: ${databaseId}`);
            logger_1.logger.debug('プロパティマッピング:', JSON.stringify(this.propertyMappings[this.modelName], null, 2));
            logger_1.logger.debug('リレーションマッピング:', JSON.stringify(this.relationMappings[this.modelName], null, 2));
        }
    }
    where(property, operator, value) {
        const mappedProperty = this.getMappedPropertyName(String(property));
        if (this.isDebugMode) {
            logger_1.logger.debug(`フィルター条件を追加: プロパティ=${mappedProperty}, 演算子=${operator}, 値=${JSON.stringify(value)}`);
        }
        this.filters.push({
            property: mappedProperty,
            operator,
            value
        });
        return this;
    }
    whereRelation(relationProperty, relationFilter) {
        const mappedProperty = this.getMappedPropertyName(String(relationProperty));
        if (this.isDebugMode) {
            logger_1.logger.debug(`リレーションフィルターを追加: ${mappedProperty}`);
        }
        const relatedDatabaseId = this.relationMappings[this.modelName]?.[String(relationProperty)];
        if (!relatedDatabaseId) {
            throw new Error(`リレーション "${String(relationProperty)}" のデータベースIDが見つかりません`);
        }
        const subBuilder = new QueryBuilder(this.notion, relatedDatabaseId, String(relationProperty), this.relationMappings, this.propertyMappings);
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
    include(relationProperty) {
        const mappedProperty = this.getMappedPropertyName(String(relationProperty));
        if (this.isDebugMode) {
            logger_1.logger.debug(`リレーションを含める: ${mappedProperty}`);
        }
        this.includedRelations.add(mappedProperty);
        return this;
    }
    orderBy(property, direction = 'ascending') {
        const mappedProperty = this.getMappedPropertyName(String(property));
        if (this.isDebugMode) {
            logger_1.logger.debug(`ソート条件を追加: プロパティ=${mappedProperty}, 方向=${direction}`);
        }
        this.sorts.push({
            property: mappedProperty,
            direction
        });
        return this;
    }
    limit(size) {
        if (this.isDebugMode) {
            logger_1.logger.debug(`ページサイズを設定: ${size}`);
        }
        this.pageSize = size;
        return this;
    }
    after(cursor) {
        if (this.isDebugMode) {
            logger_1.logger.debug(`開始カーソルを設定: ${cursor}`);
        }
        this.startCursor = cursor;
        return this;
    }
    getFilters() {
        return this.filters;
    }
    getMappedPropertyName(property) {
        const modelMappings = this.propertyMappings[this.modelName];
        if (modelMappings) {
            const mappedName = modelMappings[property];
            if (mappedName) {
                if (this.isDebugMode) {
                    logger_1.logger.debug(`プロパティマッピング: ${property} => ${mappedName}`);
                }
                return mappedName;
            }
        }
        if (this.isDebugMode) {
            logger_1.logger.debug(`プロパティマッピングなし: ${property} をそのまま使用`);
        }
        return property;
    }
    isRelationProperty(property) {
        const propertyLower = property.toLowerCase();
        const isRelation = propertyLower === 'domain' ||
            propertyLower === 'documents' ||
            propertyLower.includes('relation') ||
            this.relationMappings[this.modelName]?.[property] !== undefined;
        if (this.isDebugMode && isRelation) {
            logger_1.logger.debug(`プロパティ "${property}" はリレーションとして検出されました`);
        }
        return isRelation;
    }
    buildFilter(condition) {
        if ('relationProperty' in condition) {
            if (this.isDebugMode) {
                logger_1.logger.debug(`リレーションフィルターを構築: ${condition.relationProperty}, 値:`, condition.value);
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
            logger_1.logger.debug(`フィルターを構築: プロパティ=${property}, 演算子=${operator}, リレーション=${isRelation}, 値:`, value);
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
            logger_1.logger.debug(`プロパティタイプ: ${propertyType}`);
        }
        const filter = {
            property,
            [propertyType]: this.getFilterCondition(operator, value)
        };
        if (this.isDebugMode) {
            logger_1.logger.debug('生成されたフィルター:', JSON.stringify(filter, null, 2));
        }
        return filter;
    }
    getFilterCondition(operator, value) {
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
                logger_1.logger.warn(`未サポートの演算子: ${operator}, equals を使用します`);
                return { equals: value };
        }
    }
    getPropertyType(property) {
        if (this.isDebugMode) {
            logger_1.logger.debug(`プロパティタイプを判定: ${property}`);
        }
        const propertyLower = property.toLowerCase();
        if (this.isRelationProperty(property)) {
            return notionTypes_1.NotionPropertyTypes.Relation;
        }
        // 標準的なプロパティタイプのマッピング
        if (propertyLower === 'title' || propertyLower === 'name') {
            return notionTypes_1.NotionPropertyTypes.Title;
        }
        if (propertyLower.endsWith('at') || propertyLower.includes('date')) {
            return notionTypes_1.NotionPropertyTypes.Date;
        }
        if (propertyLower.startsWith('is') || propertyLower === 'active') {
            return notionTypes_1.NotionPropertyTypes.Checkbox;
        }
        if (propertyLower.includes('tags')) {
            return notionTypes_1.NotionPropertyTypes.MultiSelect;
        }
        if (propertyLower.includes('status')) {
            return notionTypes_1.NotionPropertyTypes.Select;
        }
        if (this.isDebugMode) {
            logger_1.logger.debug(`デフォルトのプロパティタイプ(RichText)を使用: ${property}`);
        }
        return notionTypes_1.NotionPropertyTypes.RichText;
    }
    buildSortCondition(sort) {
        const mappedProperty = this.getMappedPropertyName(String(sort.property));
        if (this.isDebugMode) {
            logger_1.logger.debug(`ソート条件を構築: プロパティ=${mappedProperty}, 方向=${sort.direction}`);
        }
        let finalPropertyName = mappedProperty;
        if (mappedProperty === 'createdTime' || mappedProperty === 'Created At') {
            finalPropertyName = 'created_time';
        }
        else if (mappedProperty === 'lastEditedTime') {
            finalPropertyName = 'last_edited_time';
        }
        const isSystemProperty = ['created_time', 'last_edited_time'].includes(finalPropertyName);
        const sortCondition = {
            direction: sort.direction
        };
        if (isSystemProperty) {
            sortCondition.timestamp = finalPropertyName;
        }
        else {
            sortCondition.property = finalPropertyName;
        }
        if (this.isDebugMode) {
            logger_1.logger.debug('生成されたソート条件:', JSON.stringify(sortCondition, null, 2));
        }
        return sortCondition;
    }
    async execute() {
        try {
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
                query.sorts = this.sorts.map(sort => this.buildSortCondition(sort));
            }
            if (this.pageSize) {
                query.page_size = this.pageSize;
            }
            if (this.startCursor) {
                query.start_cursor = this.startCursor;
            }
            if (this.isDebugMode) {
                logger_1.logger.debug(`クエリを実行: ${this.modelName}`, JSON.stringify(query, null, 2));
            }
            const response = await this.notion.databases.query(query);
            if (this.isDebugMode) {
                logger_1.logger.debug(`${response.results.length} 件の結果を取得`);
            }
            const results = response.results.map(page => this.mapResponseToModel(page));
            if (this.includedRelations.size > 0) {
                await Promise.all(results.map(result => this.loadRelations(result)));
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error(`${this.modelName} のクエリ実行中にエラーが発生:`, error);
            if (error.code === 'validation_error') {
                logger_1.logger.error(`バリデーションエラーの詳細: ${error.message}`);
            }
            throw error;
        }
    }
    async loadRelations(model) {
        for (const relationProperty of this.includedRelations) {
            if (model[relationProperty]) {
                const relationIds = Array.isArray(model[relationProperty])
                    ? model[relationProperty].map((rel) => rel.id)
                    : [model[relationProperty].id];
                const relationData = await Promise.all(relationIds.map(id => this.getRelationData(id)));
                model[relationProperty] = Array.isArray(model[relationProperty])
                    ? relationData
                    : relationData[0];
            }
        }
    }
    async getRelationData(id) {
        const cached = this.relationCache[id];
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            if (this.isDebugMode) {
                logger_1.logger.debug(`キャッシュされたリレーションデータを使用: ${id}`);
            }
            return cached.data;
        }
        try {
            if (this.isDebugMode) {
                logger_1.logger.debug(`リレーションデータを取得: ${id}`);
            }
            const response = await this.notion.pages.retrieve({ page_id: id });
            const mappedData = this.mapResponseToModel(response);
            this.relationCache[id] = {
                data: mappedData,
                timestamp: Date.now()
            };
            return mappedData;
        }
        catch (error) {
            logger_1.logger.error(`リレーションデータの取得中にエラーが発生 (ID: ${id}):`, error);
            throw error;
        }
    }
    mapResponseToModel(page) {
        const props = page.properties;
        if (this.isDebugMode) {
            logger_1.logger.debug(`レスポンスをモデルにマッピング: ${page.id}`);
            logger_1.logger.debug('ページのプロパティ:', JSON.stringify(props, null, 2));
        }
        const mapped = {
            id: page.id,
            ...Object.entries(props).reduce((acc, [key, value]) => {
                acc[key] = this.mapPropertyValue(value);
                return acc;
            }, {}),
            createdTime: page.created_time,
            lastEditedTime: page.last_edited_time
        };
        if (this.isDebugMode) {
            logger_1.logger.debug('マッピング結果:', JSON.stringify(mapped, null, 2));
        }
        return mapped;
    }
    mapPropertyValue(property) {
        if (this.isDebugMode) {
            logger_1.logger.debug(`プロパティ値をマッピング:`, property);
        }
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
                logger_1.logger.warn(`未サポートのNotionプロパティタイプ: ${property.type}`);
                return '';
        }
    }
}
exports.QueryBuilder = QueryBuilder;
