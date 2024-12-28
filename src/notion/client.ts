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
    const missingProperties: string[] = [];
    const typeMismatches: Array<{ field: string; expected: string; got: string }> = [];

    logger.info('Notion database properties:', notionProperties);

    for (const field of model.fields) {
      const property = this.findPropertyCaseInsensitive(notionProperties, field.name);

      if (!property) {
        missingProperties.push(field.name);
        continue;
      }

      const expectedType = this.mapSchemaTypeToNotionType(field.type);
      if (property.type !== expectedType) {
        typeMismatches.push({
          field: field.name,
          expected: expectedType,
          got: property.type
        });
      }
    }

    if (missingProperties.length > 0 || typeMismatches.length > 0) {
      let errorMessage = `Schema validation failed for model ${model.name}:\n`;

      if (missingProperties.length > 0) {
        errorMessage += `Missing properties: ${missingProperties.join(', ')}\n`;
      }

      if (typeMismatches.length > 0) {
        errorMessage += 'Type mismatches:\n';
        typeMismatches.forEach(({ field, expected, got }) => {
          errorMessage += `  - ${field}: expected ${expected}, got ${got}\n`;
        });
      }

      throw new Error(errorMessage);
    }
  }

  private findPropertyCaseInsensitive(properties: Record<string, any>, fieldName: string): any {
    const lowerFieldName = fieldName.toLowerCase();
    const propertyEntry = Object.entries(properties).find(
      ([key]) => key.toLowerCase() === lowerFieldName
    );
    return propertyEntry ? propertyEntry[1] : null;
  }

  private mapSchemaTypeToNotionType(schemaType: string): string {
    const typeMap: Record<string, string> = {
      'String': 'rich_text',
      'Number': 'number',
      'Boolean': 'checkbox',
      'Date': 'date',
      'Select': 'select',
      'MultiSelect': 'multi_select',
      'Title': 'title'
    };

    return typeMap[schemaType] || schemaType;
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