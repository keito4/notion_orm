"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionClient = void 0;
const client_1 = require("@notionhq/client");
const notionTypes_1 = require("../types/notionTypes");
const logger_1 = require("../utils/logger");
class NotionClient {
    client;
    constructor() {
        const apiKey = process.env.NOTION_API_KEY;
        if (!apiKey) {
            throw new Error('NOTION_API_KEY environment variable is required');
        }
        this.client = new client_1.Client({ auth: apiKey });
    }
    async validateSchema(schema) {
        try {
            for (const model of schema.models) {
                if (!model.notionDatabaseId) {
                    throw new Error(`No Notion database ID specified for model ${model.name}`);
                }
                logger_1.logger.info(`Validating schema for model ${model.name} with database ID ${model.notionDatabaseId}`);
                try {
                    const database = await this.getDatabaseSchema(model.notionDatabaseId);
                    await this.validateDatabaseSchema(model, database);
                    logger_1.logger.success(`Validated schema for model ${model.name}`);
                }
                catch (error) {
                    if (error.code === 'object_not_found') {
                        throw new Error(`Notion database not found for model ${model.name} with ID ${model.notionDatabaseId}`);
                    }
                    throw error;
                }
            }
        }
        catch (error) {
            if (error instanceof Error) {
                logger_1.logger.error(`Schema validation failed: ${error.message}`);
            }
            throw error;
        }
    }
    async validateDatabaseSchema(model, database) {
        const notionProperties = database.properties;
        logger_1.logger.info('Notion database properties:', notionProperties);
        // Notionデータベースの構造に基づいて、モデルのフィールドを更新
        model.fields = Object.entries(notionProperties).map(([key, property]) => {
            const isOptional = property.type !== notionTypes_1.NotionPropertyTypes.Title; // タイトル以外は任意
            return {
                name: property.name,
                type: property.type,
                optional: isOptional,
                attributes: []
            };
        });
        // プロパティの詳細情報をログ出力
        Object.entries(notionProperties).forEach(([key, property]) => {
            if (property.type === notionTypes_1.NotionPropertyTypes.Select || property.type === notionTypes_1.NotionPropertyTypes.MultiSelect) {
                const options = this.getPropertyOptions(property);
                logger_1.logger.info(`Property ${property.name} has options:`, options.map(opt => opt.name));
            }
        });
    }
    async getDatabaseSchema(databaseId) {
        try {
            const response = await this.client.databases.retrieve({
                database_id: databaseId
            });
            // NotionのAPIレスポンスを我々の型定義に変換
            const database = {
                id: response.id,
                properties: Object.entries(response.properties).reduce((acc, [key, prop]) => {
                    acc[key] = this.convertToNotionProperty(prop);
                    return acc;
                }, {})
            };
            logger_1.logger.info('Retrieved database schema:', database.properties);
            return database;
        }
        catch (error) {
            logger_1.logger.error(`Failed to retrieve database schema: ${error.message}`);
            throw error;
        }
    }
    getPropertyOptions(property) {
        if (property.type === notionTypes_1.NotionPropertyTypes.Select) {
            return property.select.options || [];
        }
        else if (property.type === notionTypes_1.NotionPropertyTypes.MultiSelect) {
            return property.multi_select.options || [];
        }
        return [];
    }
    convertToNotionProperty(apiProperty) {
        const base = {
            id: apiProperty.id,
            name: apiProperty.name,
            type: apiProperty.type
        };
        switch (apiProperty.type) {
            case notionTypes_1.NotionPropertyTypes.Select:
                return {
                    ...base,
                    type: notionTypes_1.NotionPropertyTypes.Select,
                    select: {
                        options: apiProperty.select.options || []
                    }
                };
            case notionTypes_1.NotionPropertyTypes.MultiSelect:
                return {
                    ...base,
                    type: notionTypes_1.NotionPropertyTypes.MultiSelect,
                    multi_select: {
                        options: apiProperty.multi_select.options || []
                    }
                };
            default:
                return {
                    ...base,
                    [apiProperty.type]: {}
                };
        }
    }
}
exports.NotionClient = NotionClient;
