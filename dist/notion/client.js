"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionClient = void 0;
const client_1 = require("@notionhq/client");
const notionTypes_1 = require("../types/notionTypes");
const logger_1 = require("../utils/logger");
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒
class NotionClient {
    client;
    isInitialized = false;
    constructor() {
        const apiKey = process.env.NOTION_API_KEY;
        if (!apiKey) {
            throw new Error('NOTION_API_KEY environment variable is required');
        }
        logger_1.logger.debug('Initializing Notion client...');
        this.client = new client_1.Client({
            auth: apiKey,
            notionVersion: '2022-06-28'
        });
    }
    async retryOperation(operation) {
        let lastError = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                logger_1.logger.debug(`Attempt ${attempt}/${MAX_RETRIES}`);
                return await operation();
            }
            catch (error) {
                lastError = error;
                logger_1.logger.warn(`Attempt ${attempt} failed:`, error);
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
                }
            }
        }
        throw lastError;
    }
    async validateConnection() {
        try {
            logger_1.logger.debug('Testing Notion API connection...');
            await this.retryOperation(async () => {
                await this.client.users.list({ page_size: 1 });
            });
            logger_1.logger.success('Successfully connected to Notion API');
            this.isInitialized = true;
            return true;
        }
        catch (error) {
            if (error.code === 'unauthorized') {
                logger_1.logger.error('Failed to connect to Notion API: Invalid API key');
            }
            else if (error.code === 'service_unavailable') {
                logger_1.logger.error('Failed to connect to Notion API: Service unavailable');
            }
            else {
                logger_1.logger.error('Failed to connect to Notion API:', error);
            }
            return false;
        }
    }
    async validateSchema(schema) {
        try {
            logger_1.logger.debug('Starting schema validation...');
            if (!this.isInitialized) {
                const isConnected = await this.validateConnection();
                if (!isConnected) {
                    throw new Error('Failed to validate schema: Could not connect to Notion API');
                }
            }
            for (const model of schema.models) {
                if (!model.notionDatabaseId) {
                    throw new Error(`No Notion database ID specified for model ${model.name}`);
                }
                logger_1.logger.info(`Validating schema for model ${model.name} with database ID ${model.notionDatabaseId}`);
                try {
                    await this.validateDatabaseExists(model.notionDatabaseId, model.name);
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
            logger_1.logger.error('Schema validation failed:', error);
            throw error;
        }
    }
    async validateDatabaseExists(databaseId, modelName) {
        try {
            logger_1.logger.debug(`Checking database existence for ${modelName} (ID: ${databaseId})...`);
            await this.retryOperation(async () => {
                await this.client.databases.retrieve({
                    database_id: databaseId
                });
            });
            logger_1.logger.info(`Successfully verified database existence for ${modelName} (ID: ${databaseId})`);
        }
        catch (error) {
            if (error.code === 'unauthorized') {
                throw new Error(`Unauthorized access to database ${databaseId} for model ${modelName}. Check your API key permissions.`);
            }
            if (error.status === 404) {
                throw new Error(`Database not found: ${databaseId} for model ${modelName}`);
            }
            throw new Error(`Failed to verify database ${databaseId} for model ${modelName}: ${error.message}`);
        }
    }
    async getDatabaseSchema(databaseId) {
        try {
            logger_1.logger.debug(`Retrieving database schema for ${databaseId}...`);
            const response = await this.retryOperation(async () => {
                return await this.client.databases.retrieve({
                    database_id: databaseId
                });
            });
            const database = {
                id: response.id,
                properties: Object.entries(response.properties).reduce((acc, [key, prop]) => {
                    acc[key] = this.convertToNotionProperty(prop);
                    return acc;
                }, {})
            };
            logger_1.logger.debug(`Retrieved database schema, properties:`, Object.keys(database.properties));
            return database;
        }
        catch (error) {
            logger_1.logger.error(`Failed to retrieve database schema for ${databaseId}:`, error);
            throw error;
        }
    }
    async validateDatabaseSchema(model, database) {
        const notionProperties = database.properties;
        logger_1.logger.debug(`Validating database schema for ${model.name}:`, notionProperties);
        // プロパティ名のマッピングの検証
        const propertyNames = Object.keys(notionProperties);
        logger_1.logger.debug(`Available properties in database: ${propertyNames.join(', ')}`);
        model.fields = Object.entries(notionProperties).map(([key, property]) => {
            const isOptional = property.type !== notionTypes_1.NotionPropertyTypes.Title;
            return {
                name: property.name,
                type: property.type,
                optional: isOptional,
                attributes: []
            };
        });
        Object.entries(notionProperties).forEach(([key, property]) => {
            if (property.type === notionTypes_1.NotionPropertyTypes.Select || property.type === notionTypes_1.NotionPropertyTypes.MultiSelect) {
                const options = this.getPropertyOptions(property);
                logger_1.logger.debug(`Property ${property.name} has options:`, options.map(opt => opt.name));
            }
        });
        logger_1.logger.success(`Schema validation completed for ${model.name}`);
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
