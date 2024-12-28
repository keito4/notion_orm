import { Client } from '@notionhq/client';
import { Schema } from '../types';
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

        const database = await this.client.databases.retrieve({
          database_id: model.notionDatabaseId
        });

        this.validateDatabaseSchema(model, database);
      }
    } catch (error) {
      logger.error('Error validating schema:', error);
      throw error;
    }
  }

  private validateDatabaseSchema(model: any, database: any): void {
    const notionProperties = database.properties;
    
    for (const field of model.fields) {
      const property = notionProperties[field.name];
      if (!property) {
        throw new Error(`Property ${field.name} not found in Notion database for model ${model.name}`);
      }
      
      if (property.type !== field.type) {
        throw new Error(
          `Type mismatch for property ${field.name} in model ${model.name}: ` +
          `expected ${field.type}, got ${property.type}`
        );
      }
    }
  }
}
