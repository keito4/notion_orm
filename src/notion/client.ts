import { Client } from "@notionhq/client";
import { Schema, Model } from "../types";
import {
  NotionPropertyTypes,
  NotionDatabase,
  NotionDatabaseProperty,
  NotionSelectProperty,
  NotionMultiSelectProperty,
  NotionSelectOption,
} from "../types/notionTypes";
import { logger } from "../utils/logger";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

export class NotionClient {
  private client: Client;
  private isInitialized: boolean = false;

  constructor() {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error("NOTION_API_KEY environment variable is required");
    }
    this.client = new Client({
      auth: apiKey,
      notionVersion: "2022-06-28",
    });
    logger.debug("Notion client initialized.");
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.debug(`Attempt ${attempt}/${MAX_RETRIES}`);
        return await operation();
      } catch (error: any) {
        lastError = error;
        logger.warn(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY * attempt)
          );
        }
      }
    }
    throw lastError;
  }

  async validateConnection(): Promise<boolean> {
    logger.debug("Testing Notion API connection...");
    try {
      await this.retryOperation(async () => {
        await this.client.users.list({ page_size: 1 });
      });
      logger.info("Successfully connected to Notion API");
      this.isInitialized = true;
      return true;
    } catch (error: any) {
      if (error.code === "unauthorized") {
        logger.error("Invalid API key for Notion");
      } else if (error.code === "service_unavailable") {
        logger.error("Notion API service unavailable");
      } else {
        logger.error("Unexpected error while connecting to Notion:", error);
      }
      return false;
    }
  }

  async validateSchema(schema: Schema): Promise<void> {
    logger.debug("Starting schema validation...");
    if (!this.isInitialized) {
      const isConnected = await this.validateConnection();
      if (!isConnected) {
        throw new Error(
          "Could not connect to Notion API for schema validation"
        );
      }
    }

    for (const model of schema.models) {
      if (!model.notionDatabaseId) {
        throw new Error(
          `No Notion database ID specified for model ${model.name}`
        );
      }
      logger.info(
        `Validating schema for model: ${model.name} (DB ID: ${model.notionDatabaseId})`
      );
      try {
        await this.validateDatabaseExists(model.notionDatabaseId, model.name);
        const database = await this.getDatabaseSchema(model.notionDatabaseId);
        await this.validateDatabaseSchema(model, database);
        logger.success(`Successfully validated schema for model ${model.name}`);
      } catch (error: any) {
        if (error.code === "object_not_found") {
          throw new Error(
            `Notion database not found for model ${model.name} (ID: ${model.notionDatabaseId})`
          );
        }
        throw error;
      }
    }
  }

  private async validateDatabaseExists(
    databaseId: string,
    modelName: string
  ): Promise<void> {
    logger.debug(
      `Checking existence of database for model ${modelName} (ID: ${databaseId})`
    );
    try {
      await this.retryOperation(async () => {
        await this.client.databases.retrieve({ database_id: databaseId });
      });
      logger.info(`Database found for model ${modelName} (ID: ${databaseId})`);
    } catch (error: any) {
      if (error.code === "unauthorized") {
        throw new Error(
          `Unauthorized access to database ${databaseId} for model ${modelName}. Check API key permissions.`
        );
      }
      if (error.status === 404) {
        throw new Error(
          `Database not found: ${databaseId} for model ${modelName}`
        );
      }
      throw new Error(
        `Failed to verify database ${databaseId} for model ${modelName}: ${error.message}`
      );
    }
  }

  async getDatabaseSchema(databaseId: string): Promise<NotionDatabase> {
    logger.debug(`Retrieving database schema for ${databaseId}...`);
    try {
      const response = await this.retryOperation(async () =>
        this.client.databases.retrieve({ database_id: databaseId })
      );
      const properties = Object.entries(response.properties).reduce(
        (acc, [key, prop]) => {
          acc[key] = this.convertToNotionProperty(prop);
          return acc;
        },
        {} as Record<string, NotionDatabaseProperty>
      );
      const database: NotionDatabase = {
        id: response.id,
        properties,
      };
      logger.debug(
        `Database schema retrieved for ${databaseId}, properties:`,
        Object.keys(properties)
      );
      return database;
    } catch (error: any) {
      logger.error(
        `Failed to retrieve database schema for ${databaseId}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * **重要: ここで model.fields を書き換えないようにする**
   * Notion 側のフィールド一覧はローカル変数で管理し、バリデーションのみ行う。
   */
  private async validateDatabaseSchema(
    model: Model,
    database: NotionDatabase
  ): Promise<void> {
    logger.debug(`Validating database schema for ${model.name}`);
    const notionProperties = database.properties;
    const propertyNames = Object.keys(notionProperties);
    logger.debug(`Properties in database: [${propertyNames.join(", ")}]`);

    // ここで model.fields を直接上書きしない
    // Notion から取得したフィールド情報はローカル変数として利用
    const notionFields = Object.entries(notionProperties).map(
      ([key, property]) => {
        const isOptional = property.type !== NotionPropertyTypes.Title;
        return {
          name: property.name,
          type: property.type,
          optional: isOptional,
          attributes: [],
        };
      }
    );

    // もし Select / MultiSelect でオプション一覧を使う場合の処理
    Object.entries(notionProperties).forEach(([_, property]) => {
      if (
        property.type === NotionPropertyTypes.Select ||
        property.type === NotionPropertyTypes.MultiSelect
      ) {
        const options = this.getPropertyOptions(property);
        logger.debug(
          `Property "${property.name}" has options: [${options
            .map((opt) => opt.name)
            .join(", ")}]`
        );
      }
    });

    logger.debug(`Finished validating database schema for ${model.name}.`);
  }

  private getPropertyOptions(
    property: NotionDatabaseProperty
  ): NotionSelectOption[] {
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
      type: apiProperty.type as NotionPropertyTypes,
    };

    switch (apiProperty.type) {
      case NotionPropertyTypes.Select:
        return {
          ...base,
          select: { options: apiProperty.select?.options || [] },
        } as NotionSelectProperty;

      case NotionPropertyTypes.MultiSelect:
        return {
          ...base,
          multi_select: { options: apiProperty.multi_select?.options || [] },
        } as NotionMultiSelectProperty;

      default:
        return {
          ...base,
          [apiProperty.type]: {},
        } as NotionDatabaseProperty;
    }
  }
}
