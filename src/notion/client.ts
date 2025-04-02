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
  
  private sanitizeId(id: string): string {
    return id.replace(/-/g, '');
  }

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
        return await operation();
      } catch (error: any) {
        lastError = error;
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
    try {
      await this.retryOperation(async () => {
        await this.client.users.list({ page_size: 1 });
      });
      this.isInitialized = true;
      return true;
    } catch (error: any) {
      if (error.code === "unauthorized") {
        throw new Error("Invalid API key for Notion");
      } else if (error.code === "service_unavailable") {
        throw new Error("Notion API service unavailable");
      } else {
        throw error;
      }
    }
  }

  async validateSchema(schema: Schema): Promise<void> {
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

      try {
        const sanitizedDatabaseId = this.sanitizeId(model.notionDatabaseId);
        await this.validateDatabaseExists(sanitizedDatabaseId, model.name);
        const database = await this.getDatabaseSchema(sanitizedDatabaseId);
        await this.validateDatabaseSchema(model, database);
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
    try {
      const sanitizedDatabaseId = this.sanitizeId(databaseId);
      await this.retryOperation(async () => {
        await this.client.databases.retrieve({ database_id: sanitizedDatabaseId });
      });
    } catch (error: any) {
      if (error.code === "unauthorized") {
        throw new Error(
          `Unauthorized access to database ${databaseId} for model ${modelName}`
        );
      }
      if (error.status === 404) {
        throw new Error(
          `Database not found: ${databaseId} for model ${modelName}`
        );
      }
      throw error;
    }
  }

  async getDatabaseSchema(databaseId: string): Promise<NotionDatabase> {
    try {
      const sanitizedDatabaseId = this.sanitizeId(databaseId);
      const response = await this.retryOperation(async () =>
        this.client.databases.retrieve({ database_id: sanitizedDatabaseId })
      );
      const properties = Object.entries(response.properties).reduce(
        (acc, [key, prop]) => {
          acc[key] = this.convertToNotionProperty(prop);
          return acc;
        },
        {} as Record<string, NotionDatabaseProperty>
      );
      return {
        id: response.id,
        properties,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to retrieve database schema for ${databaseId}: ${error.message}`
      );
    }
  }

  private async validateDatabaseSchema(
    model: Model,
    database: NotionDatabase
  ): Promise<void> {
    const notionProperties = database.properties;
    // const propertyNames = Object.keys(notionProperties);

    // Notion から取得したフィールド情報はローカル変数として利用
    /* const notionFields = Object.entries(notionProperties).map(
      ([key, property]) => {
        const isOptional = property.type !== NotionPropertyTypes.Title;
        return {
          name: property.name,
          type: property.type,
          optional: isOptional,
          attributes: [],
        };
      }
    ); */

    // もし Select / MultiSelect でオプション一覧を使う場合の処理
    Object.entries(notionProperties).forEach(([/* unused */_, property]) => {
      if (
        property.type === NotionPropertyTypes.Select ||
        property.type === NotionPropertyTypes.MultiSelect
      ) {
        // const options = this.getPropertyOptions(property);
      }
    });
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
