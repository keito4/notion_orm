import { Client } from '@notionhq/client';
import { Schema, Model } from '../types';
import { NotionPropertyTypes } from '../types/notionTypes';
import { logger } from '../utils/logger';
import type { DatabaseObjectResponse, DatabasePropertyConfigResponse, SelectPropertyResponse, MultiSelectPropertyResponse } from '@notionhq/client/build/src/api-endpoints';

export class NotionClient {
  private client: Client;

  constructor() {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }
    this.client = new Client({ auth: apiKey });
  }

  async validateSchema(schema: Schema): Promise<void> {
    try {
      for (const model of schema.models) {
        if (!model.notionDatabaseId) {
          throw new Error(`No Notion database ID specified for model ${model.name}`);
        }

        logger.info(`Validating schema for model ${model.name} with database ID ${model.notionDatabaseId}`);

        try {
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
      if (error instanceof Error) {
        logger.error(`Schema validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  private async validateDatabaseSchema(model: Model, database: DatabaseObjectResponse): Promise<void> {
    const notionProperties = database.properties;
    const typeMismatches: Array<{ field: string; expected: string; got: string }> = [];

    logger.info('Notion database properties:', notionProperties);

    for (const field of model.fields) {
      const mappedName = field.name;

      const property = this.findPropertyByName(notionProperties, mappedName);

      if (!property) {
        logger.warn(`Property not found for field ${field.name} (mapped: ${mappedName})`);
        typeMismatches.push({
          field: field.name,
          expected: field.type,
          got: 'not found'
        });
        continue;
      }

      logger.info(`Found property for ${field.name}: ${JSON.stringify(property)}`);

      const expectedType = field.type.toLowerCase();
      const actualType = property.type;

      if (expectedType !== actualType) {
        typeMismatches.push({
          field: field.name,
          expected: expectedType,
          got: actualType
        });
      }

      // 選択肢の検証（select, multi_selectの場合）
      if (property.type === 'select' || property.type === 'multi_select') {
        const options = await this.getPropertyOptions(database.id, property.id);
        logger.info(`Property ${field.name} has options:`, options.map(opt => opt.name));
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

  private findPropertyByName(properties: Record<string, DatabasePropertyConfigResponse>, fieldName: string): DatabasePropertyConfigResponse | null {
    logger.info(`Looking for property "${fieldName}" in properties:`, Object.keys(properties));

    if (properties[fieldName]) {
      logger.info(`Found exact match for "${fieldName}"`);
      return properties[fieldName];
    }

    const propertyMap = new Map<string, DatabasePropertyConfigResponse>();
    Object.entries(properties).forEach(([key, value]) => {
      propertyMap.set(key.toLowerCase(), value);
      propertyMap.set(key, value);
      if ('name' in value) {
        propertyMap.set(value.name.toLowerCase(), value);
        propertyMap.set(value.name, value);
      }
    });

    const matchedProperty = propertyMap.get(fieldName) || propertyMap.get(fieldName.toLowerCase());

    if (matchedProperty) {
      logger.info(`Found match for "${fieldName}": ${matchedProperty.name}`);
      return matchedProperty;
    }

    logger.warn(`No property found for "${fieldName}"`);
    return null;
  }

  async getDatabaseSchema(databaseId: string): Promise<DatabaseObjectResponse> {
    try {
      const database = await this.client.databases.retrieve({
        database_id: databaseId
      });

      // プロパティ情報の詳細を取得
      for (const [key, prop] of Object.entries(database.properties)) {
        if (prop.type === 'select' || prop.type === 'multi_select') {
          const options = await this.getPropertyOptions(databaseId, prop.id);
          if (prop.type === 'select') {
            (prop as SelectPropertyResponse).select.options = options;
          } else {
            (prop as MultiSelectPropertyResponse).multi_select.options = options;
          }
        }
      }

      logger.info('Retrieved database schema:', database.properties);
      return database;
    } catch (error: any) {
      logger.error(`Failed to retrieve database schema: ${error.message}`);
      throw error;
    }
  }

  private async getPropertyOptions(databaseId: string, propertyId: string): Promise<Array<{ id: string; name: string; color: string }>> {
    try {
      const response = await this.client.databases.retrieve({ database_id: databaseId });
      const property = response.properties[propertyId];

      if (property.type === 'select') {
        return property.select.options;
      } else if (property.type === 'multi_select') {
        return property.multi_select.options;
      }

      return [];
    } catch (error) {
      logger.error(`Failed to retrieve property options: ${error}`);
      return [];
    }
  }
}