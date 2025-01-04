import { Client } from '@notionhq/client';
import { Schema, Model } from '../types';
import { 
  NotionPropertyTypes, 
  NotionDatabase, 
  NotionDatabaseProperty,
  NotionSelectProperty,
  NotionMultiSelectProperty,
  NotionSelectOption
} from '../types/notionTypes';
import { logger } from '../utils/logger';

export class NotionClient {
  private client: Client;

  constructor() {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }

    logger.debug('Initializing Notion client...');
    this.client = new Client({ 
      auth: apiKey,
      notionVersion: '2022-06-28'
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      logger.debug('Testing Notion API connection...');
      await this.client.users.list({ page_size: 1 });
      logger.success('Successfully connected to Notion API');
      return true;
    } catch (error: any) {
      if (error.code === 'unauthorized') {
        logger.error('Failed to connect to Notion API: Invalid API key');
      } else if (error.code === 'service_unavailable') {
        logger.error('Failed to connect to Notion API: Service unavailable');
      } else {
        logger.error('Failed to connect to Notion API:', error);
      }
      return false;
    }
  }

  async validateSchema(schema: Schema): Promise<void> {
    try {
      logger.debug('Starting schema validation...');
      const isConnected = await this.validateConnection();
      if (!isConnected) {
        throw new Error('Failed to validate schema: Could not connect to Notion API');
      }

      for (const model of schema.models) {
        if (!model.notionDatabaseId) {
          throw new Error(`No Notion database ID specified for model ${model.name}`);
        }

        logger.info(`Validating schema for model ${model.name} with database ID ${model.notionDatabaseId}`);

        try {
          await this.validateDatabaseExists(model.notionDatabaseId, model.name);
          const database = await this.getDatabaseSchema(model.notionDatabaseId);
          await this.validateDatabaseSchema(model, database);
          logger.success(`Validated schema for model ${model.name}`);
        } catch (error: any) {
          if (error.code === 'object_not_found') {
            throw new Error(`Notion database not found for model ${model.name} with ID ${model.notionDatabaseId}`);
          }
          throw error;
        }
      }
    } catch (error) {
      logger.error('Schema validation failed:', error);
      throw error;
    }
  }

  private async validateDatabaseExists(databaseId: string, modelName: string): Promise<void> {
    try {
      logger.debug(`Checking database existence for ${modelName} (ID: ${databaseId})...`);
      await this.client.databases.retrieve({
        database_id: databaseId
      });
      logger.info(`Successfully verified database existence for ${modelName} (ID: ${databaseId})`);
    } catch (error: any) {
      if (error.code === 'unauthorized') {
        throw new Error(`Unauthorized access to database ${databaseId} for model ${modelName}. Check your API key permissions.`);
      }
      if (error.status === 404) {
        throw new Error(`Database not found: ${databaseId} for model ${modelName}`);
      }
      throw new Error(`Failed to verify database ${databaseId} for model ${modelName}: ${error.message}`);
    }
  }

  private async validateDatabaseSchema(model: Model, database: NotionDatabase): Promise<void> {
    const notionProperties = database.properties;
    logger.debug(`Validating database schema for ${model.name}:`, notionProperties);

    // プロパティ名のマッピングの検証
    const propertyNames = Object.keys(notionProperties);
    logger.debug(`Available properties in database: ${propertyNames.join(', ')}`);

    model.fields = Object.entries(notionProperties).map(([key, property]) => {
      const isOptional = property.type !== NotionPropertyTypes.Title;
      return {
        name: property.name,
        type: property.type,
        optional: isOptional,
        attributes: []
      };
    });

    Object.entries(notionProperties).forEach(([key, property]) => {
      if (property.type === NotionPropertyTypes.Select || property.type === NotionPropertyTypes.MultiSelect) {
        const options = this.getPropertyOptions(property);
        logger.debug(`Property ${property.name} has options:`, options.map(opt => opt.name));
      }
    });

    logger.success(`Schema validation completed for ${model.name}`);
  }

  async getDatabaseSchema(databaseId: string): Promise<NotionDatabase> {
    try {
      logger.debug(`Retrieving database schema for ${databaseId}...`);
      const response = await this.client.databases.retrieve({
        database_id: databaseId
      });

      const database: NotionDatabase = {
        id: response.id,
        properties: Object.entries(response.properties).reduce((acc, [key, prop]) => {
          acc[key] = this.convertToNotionProperty(prop);
          return acc;
        }, {} as Record<string, NotionDatabaseProperty>)
      };

      logger.debug(`Retrieved database schema, properties:`, Object.keys(database.properties));
      return database;
    } catch (error: any) {
      logger.error(`Failed to retrieve database schema for ${databaseId}:`, error);
      throw error;
    }
  }

  private getPropertyOptions(property: NotionDatabaseProperty): NotionSelectOption[] {
    if (property.type === NotionPropertyTypes.Select) {
      return (property as NotionSelectProperty).select.options || [];
    } else if (property.type === NotionPropertyTypes.MultiSelect) {
      return (property as NotionMultiSelectProperty).multi_select.options || [];
    }
    return [];
  }

  private convertToNotionProperty(apiProperty: any): NotionDatabaseProperty {
    const base = {
      id: apiProperty.id,
      name: apiProperty.name,
      type: apiProperty.type as NotionPropertyTypes
    };

    switch (apiProperty.type) {
      case NotionPropertyTypes.Select:
        return {
          ...base,
          type: NotionPropertyTypes.Select,
          select: {
            options: apiProperty.select.options || []
          }
        } as NotionSelectProperty;

      case NotionPropertyTypes.MultiSelect:
        return {
          ...base,
          type: NotionPropertyTypes.MultiSelect,
          multi_select: {
            options: apiProperty.multi_select.options || []
          }
        } as NotionMultiSelectProperty;

      default:
        return {
          ...base,
          [apiProperty.type]: {}
        } as NotionDatabaseProperty;
    }
  }
}