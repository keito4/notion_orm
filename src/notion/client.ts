import { Client } from '@notionhq/client';
import { Schema, Model } from '../types';
import { logger } from '../utils/logger';

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
          const database = await this.client.databases.retrieve({
            database_id: model.notionDatabaseId
          });

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

  private async validateDatabaseSchema(model: Model, database: any): Promise<void> {
    const notionProperties = database.properties;
    const typeMismatches: Array<{ field: string; expected: string; got: string }> = [];

    logger.info('Notion database properties:', notionProperties);

    for (const field of model.fields) {
      const mappedName = this.getMappedName(field.attributes, field.name);
      logger.info(`Validating field ${field.name} with mapped name "${mappedName}"`);

      // プロパティを大文字小文字を区別せずに検索
      const property = this.findPropertyCaseInsensitive(notionProperties, mappedName);

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

  private getMappedName(attributes: string[], defaultName: string): string {
    const mapAttribute = attributes.find(attr => attr.startsWith('@map('));
    if (!mapAttribute) return defaultName;

    const match = mapAttribute.match(/@map\("([^"]+)"\)/);
    return match ? match[1] : defaultName;
  }

  private findPropertyCaseInsensitive(properties: Record<string, any>, fieldName: string): any {
    const lowerFieldName = fieldName.toLowerCase();
    const entry = Object.entries(properties).find(
      ([key]) => key.toLowerCase() === lowerFieldName
    );
    return entry ? entry[1] : null;
  }

  async getDatabaseSchema(databaseId: string): Promise<any> {
    try {
      const database = await this.client.databases.retrieve({
        database_id: databaseId
      });
      logger.info('Retrieved database schema:', database.properties);
      return database;
    } catch (error: any) {
      logger.error(`Failed to retrieve database schema: ${error.message}`);
      throw error;
    }
  }
}