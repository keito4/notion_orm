"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncManager = void 0;
const logger_1 = require("../utils/logger");
const notionTypes_1 = require("../types/notionTypes");
class SyncManager {
  notionClient;
  constructor(notionClient) {
    this.notionClient = notionClient;
  }
  async validateAndSync(schema) {
    try {
      logger_1.logger.info("Starting database validation and sync...");
      await this.notionClient.validateSchema(schema);
      for (const model of schema.models) {
        await this.syncModel(model);
      }
      logger_1.logger.success(
        "Database validation and sync completed successfully"
      );
    } catch (error) {
      logger_1.logger.error(
        "Error during database validation and sync:",
        error
      );
      throw error;
    }
  }
  async syncModel(model) {
    try {
      logger_1.logger.info(`Syncing model: ${model.name}`);
      const database = await this.notionClient.getDatabaseSchema(
        model.notionDatabaseId
      );
      // データベースのプロパティとモデルのフィールドを比較
      const missingFields = this.findMissingFields(
        model.fields,
        database.properties
      );
      if (missingFields.length > 0) {
        logger_1.logger.warn(
          `Missing fields in Notion database for model ${model.name}:`,
          missingFields
        );
        // 将来的な機能: データベースの自動更新
        // await this.updateDatabaseSchema(model.notionDatabaseId, missingFields);
      }
      // フィールドの型の検証
      const typeErrors = this.validateFieldTypes(
        model.fields,
        database.properties
      );
      if (typeErrors.length > 0) {
        logger_1.logger.error(
          `Type mismatches in model ${model.name}:`,
          typeErrors
        );
        throw new Error(
          `Invalid field types in model ${model.name}: ${typeErrors.join(", ")}`
        );
      }
      logger_1.logger.success(`Successfully synced model: ${model.name}`);
    } catch (error) {
      logger_1.logger.error(`Error syncing model ${model.name}:`, error);
      throw error;
    }
  }
  findMissingFields(modelFields, databaseProperties) {
    const missingFields = [];
    const databaseFieldNames = new Set(Object.keys(databaseProperties));
    for (const field of modelFields) {
      const notionName = field.notionName || field.name;
      if (!databaseFieldNames.has(notionName)) {
        missingFields.push(notionName);
      }
    }
    return missingFields;
  }
  validateFieldTypes(modelFields, databaseProperties) {
    const typeErrors = [];
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
  mapModelTypeToNotionType(modelType) {
    switch (modelType.toLowerCase()) {
      case "string":
        return notionTypes_1.NotionPropertyTypes.RichText;
      case "boolean":
        return notionTypes_1.NotionPropertyTypes.Checkbox;
      case "checkbox":
        return notionTypes_1.NotionPropertyTypes.Checkbox;
      case "datetime":
        return notionTypes_1.NotionPropertyTypes.Date;
      case "people":
        return notionTypes_1.NotionPropertyTypes.People;
      case "multi_select":
        return notionTypes_1.NotionPropertyTypes.MultiSelect;
      case "relation":
        return notionTypes_1.NotionPropertyTypes.Relation;
      case "formula":
        return notionTypes_1.NotionPropertyTypes.Formula;
      case "title":
        return notionTypes_1.NotionPropertyTypes.Title;
      case "select":
        return notionTypes_1.NotionPropertyTypes.Select;
      default:
        logger_1.logger.warn(
          `Unknown model type: ${modelType}, defaulting to rich_text`
        );
        return notionTypes_1.NotionPropertyTypes.RichText;
    }
  }
}
exports.SyncManager = SyncManager;
