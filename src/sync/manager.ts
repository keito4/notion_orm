import { Schema, Model, Field } from '../types';
import { NotionClient } from '../notion/client';
import { logger } from '../utils/logger';
import { NotionPropertyTypes } from '../types/notionTypes';

export class SyncManager {
  constructor(private notionClient: NotionClient) {}

  async validateAndSync(schema: Schema): Promise<void> {
    try {
      logger.info('Starting database validation and sync...');
      await this.notionClient.validateSchema(schema);

      for (const model of schema.models) {
        await this.syncModel(model);
      }

      logger.success('Database validation and sync completed successfully');
    } catch (error) {
      logger.error('Error during database validation and sync:', error);
      throw error;
    }
  }

  private async syncModel(model: Model): Promise<void> {
    try {
      logger.info(`Syncing model: ${model.name}`);
      const database = await this.notionClient.getDatabaseSchema(model.notionDatabaseId);

      // データベースのプロパティとモデルのフィールドを比較
      const missingFields = this.findMissingFields(model.fields, database.properties);
      if (missingFields.length > 0) {
        logger.warn(`Missing fields in Notion database for model ${model.name}:`, missingFields);
        // 将来的な機能: データベースの自動更新
        // await this.updateDatabaseSchema(model.notionDatabaseId, missingFields);
      }

      // フィールドの型の検証
      const typeErrors = this.validateFieldTypes(model.fields, database.properties);
      if (typeErrors.length > 0) {
        logger.error(`Type mismatches in model ${model.name}:`, typeErrors);
        throw new Error(`Invalid field types in model ${model.name}: ${typeErrors.join(', ')}`);
      }

      logger.success(`Successfully synced model: ${model.name}`);
    } catch (error) {
      logger.error(`Error syncing model ${model.name}:`, error);
      throw error;
    }
  }

  private findMissingFields(modelFields: Field[], databaseProperties: Record<string, any>): string[] {
    const missingFields: string[] = [];
    const databaseFieldNames = new Set(Object.keys(databaseProperties));

    for (const field of modelFields) {
      const notionName = field.notionName || field.name;
      if (!databaseFieldNames.has(notionName)) {
        missingFields.push(notionName);
      }
    }

    return missingFields;
  }

  private validateFieldTypes(
    modelFields: Field[],
    databaseProperties: Record<string, any>
  ): string[] {
    const typeErrors: string[] = [];

    for (const field of modelFields) {
      const notionName = field.notionName || field.name;
      const databaseProperty = databaseProperties[notionName];

      if (databaseProperty) {
        const expectedType = this.mapModelTypeToNotionType(field.type);
        if (expectedType !== databaseProperty.type) {
          typeErrors.push(
            `${notionName}: expected ${expectedType}, got ${databaseProperty.type}`
          );
        }
      }
    }

    return typeErrors;
  }

  private mapModelTypeToNotionType(modelType: string): NotionPropertyTypes {
    switch (modelType.toLowerCase()) {
      case 'string':
        return NotionPropertyTypes.RichText;
      case 'boolean':
        return NotionPropertyTypes.Checkbox;
      case 'datetime':
        return NotionPropertyTypes.Date;
      case 'json':
        return NotionPropertyTypes.People;
      case 'string[]':
        return NotionPropertyTypes.MultiSelect;
      case 'relation':
        return NotionPropertyTypes.Relation;
      case 'formula':
        return NotionPropertyTypes.Formula;
      case 'title':
        return NotionPropertyTypes.Title;
      case 'select':
        return NotionPropertyTypes.Select;
      default:
        logger.warn(`Unknown model type: ${modelType}, defaulting to rich_text`);
        return NotionPropertyTypes.RichText;
    }
  }
}
