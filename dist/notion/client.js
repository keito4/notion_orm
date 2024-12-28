"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionClient = void 0;
const client_1 = require("@notionhq/client");
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
                    const database = await this.client.databases.retrieve({
                        database_id: model.notionDatabaseId
                    });
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
        const typeMismatches = [];
        logger_1.logger.info('Notion database properties:', notionProperties);
        for (const field of model.fields) {
            const mappedName = this.getMappedName(field.attributes, field.name);
            logger_1.logger.info(`Validating field ${field.name} with mapped name "${mappedName}"`);
            // プロパティを大文字小文字を区別せずに検索
            const property = this.findPropertyCaseInsensitive(notionProperties, mappedName);
            if (!property) {
                logger_1.logger.warn(`Property not found for field ${field.name} (mapped: ${mappedName})`);
                typeMismatches.push({
                    field: field.name,
                    expected: field.type,
                    got: 'not found'
                });
                continue;
            }
            logger_1.logger.info(`Found property for ${field.name}: ${JSON.stringify(property)}`);
            const expectedType = field.type.toLowerCase();
            const actualType = property.type;
            if (expectedType !== actualType) {
                typeMismatches.push({
                    field: field.name,
                    expected: expectedType,
                    got: actualType
                });
            }
        }
        if (typeMismatches.length > 0) {
            let errorMessage = `Schema validation failed for model ${model.name}:\n`;
            errorMessage += 'Type mismatches:\n';
            typeMismatches.forEach(({ field, expected, got }) => {
                errorMessage += `  - ${field}: expected ${expected}, got ${got}\n`;
            });
            throw new Error(errorMessage);
        }
    }
    getMappedName(attributes, defaultName) {
        const mapAttribute = attributes.find(attr => attr.startsWith('@map('));
        if (!mapAttribute)
            return defaultName;
        const match = mapAttribute.match(/@map\("([^"]+)"\)/);
        return match ? match[1] : defaultName;
    }
    findPropertyCaseInsensitive(properties, fieldName) {
        const lowerFieldName = fieldName.toLowerCase();
        const entry = Object.entries(properties).find(([key]) => key.toLowerCase() === lowerFieldName);
        return entry ? entry[1] : null;
    }
    async getDatabaseSchema(databaseId) {
        try {
            const database = await this.client.databases.retrieve({
                database_id: databaseId
            });
            logger_1.logger.info('Retrieved database schema:', database.properties);
            return database;
        }
        catch (error) {
            logger_1.logger.error(`Failed to retrieve database schema: ${error.message}`);
            throw error;
        }
    }
}
exports.NotionClient = NotionClient;
