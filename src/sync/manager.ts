import { Schema, Model, Field } from "../types";
import { NotionClient } from "../notion/client";
import { logger } from "../utils/logger";
import { NotionPropertyTypes } from "../types/notionTypes";

export class SyncManager {
  constructor(private readonly _notionClient: NotionClient) {}

  async validateAndSync(schema: Schema): Promise<void> {
    try {
      logger.info("Starting database validation and sync...");
      await this._notionClient.validateSchema(schema);

      for (const model of schema.models) {
        await this.syncModel(model);
      }

      logger.success("Database validation and sync completed successfully");
    } catch (error) {
      logger.error("Error during database validation and sync:", error);
      throw error;
    }
  }

  private async syncModel(model: Model): Promise<void> {
    try {
      logger.info(`Syncing model: ${model.name}`);
      const database = await this._notionClient.getDatabaseSchema(
        model.notionDatabaseId
      );

      // データベースのプロパティとモデルのフィールドを比較
      const missingFields = this.findMissingFields(
        model.fields,
        database.properties
      );
      if (missingFields.length > 0) {
        logger.warn(
          `Missing fields in Notion database for model ${model.name}:`,
          missingFields
        );
      }

      // フィールドの型の検証
      const typeErrors = this.validateFieldTypes(
        model.fields,
        database.properties
      );
      if (typeErrors.length > 0) {
        logger.error(`Type mismatches in model ${model.name}:`, typeErrors);
        throw new Error(
          `Invalid field types in model ${model.name}: ${typeErrors.join(", ")}`
        );
      }

      logger.success(`Successfully synced model: ${model.name}`);
    } catch (error) {
      logger.error(`Error syncing model ${model.name}:`, error);
      throw error;
    }
  }

  private findMissingFields(
    modelFields: Field[],
    databaseProperties: Record<string, any>
  ): string[] {
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
        const expectedType = this.mapModelTypeToNotionType(field);
        if (expectedType !== databaseProperty.type) {
          typeErrors.push(
            `${notionName}: expected ${expectedType}, got ${databaseProperty.type}`
          );
        }
      }
    }

    return typeErrors;
  }

  private mapModelTypeToNotionType(field: Field): NotionPropertyTypes {
    const hasAttribute = (attr: string) =>
      field.attributes.some((a) => a === attr || a.startsWith(`${attr}(`));

    if (hasAttribute("title")) {
      return NotionPropertyTypes.Title;
    }
    if (hasAttribute("checkbox")) {
      return NotionPropertyTypes.Checkbox;
    }
    if (hasAttribute("date")) {
      return NotionPropertyTypes.Date;
    }
    if (hasAttribute("people")) {
      return NotionPropertyTypes.People;
    }
    if (hasAttribute("select")) {
      return NotionPropertyTypes.Select;
    }
    if (hasAttribute("multiSelect")) {
      return NotionPropertyTypes.MultiSelect;
    }
    if (hasAttribute("relation")) {
      return NotionPropertyTypes.Relation;
    }
    if (hasAttribute("formula")) {
      return NotionPropertyTypes.Formula;
    }
    if (hasAttribute("richText")) {
      return NotionPropertyTypes.RichText;
    }
    if (hasAttribute("created_time")) {
      return NotionPropertyTypes.CreatedTime;
    }
    if (hasAttribute("created_by")) {
      return NotionPropertyTypes.CreatedBy;
    }

    switch (field.notionType.toLowerCase()) {
      case "string":
      case "rich_text":
        return NotionPropertyTypes.RichText;
      case "boolean":
      case "checkbox":
        return NotionPropertyTypes.Checkbox;
      case "created_time":
        return NotionPropertyTypes.CreatedTime;
      case "datetime":
      case "date":
        return NotionPropertyTypes.Date;
      case "people":
        return NotionPropertyTypes.People;
      case "created_by":
        return NotionPropertyTypes.CreatedBy;
      case "multi_select":
        return NotionPropertyTypes.MultiSelect;
      case "relation":
        return NotionPropertyTypes.Relation;
      case "formula":
        return NotionPropertyTypes.Formula;
      case "title":
        return NotionPropertyTypes.Title;
      default:
        if (
          field.notionType.includes("relation") ||
          field.notionType.includes("Relation")
        ) {
          return NotionPropertyTypes.Relation;
        }
        if (
          field.notionType.includes("formula") ||
          field.notionType.includes("Formula")
        ) {
          return NotionPropertyTypes.Formula;
        }
        logger.warn(
          `Unknown field type: ${field.notionType}, defaulting to rich_text`
        );
        return NotionPropertyTypes.RichText;
    }
  }
}
