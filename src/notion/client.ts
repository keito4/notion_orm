import { Client } from "@notionhq/client";
import type { UpdateDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
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
  private _client: Client;
  private isInitialized: boolean = false;
  
  get client(): Client {
    return this._client;
  }

  constructor() {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error("NOTION_API_KEY environment variable is required");
    }
    this._client = new Client({
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
        await this._client.users.list({ page_size: 1 });
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
        await this.validateDatabaseExists(model.notionDatabaseId, model.name);
        const database = await this.getDatabaseSchema(model.notionDatabaseId);
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
      await this.retryOperation(async () => {
        await this._client.databases.retrieve({ database_id: databaseId });
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
      const response = await this.retryOperation(async () =>
        this._client.databases.retrieve({ database_id: databaseId })
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
    property: any
  ): NotionSelectOption[] {
    if (property.type === NotionPropertyTypes.Select) {
      return property.select?.options?.map((opt: any) => ({
        id: opt.id || "",
        name: opt.name,
        color: opt.color || "default"
      })) || [];
    } else if (property.type === NotionPropertyTypes.MultiSelect) {
      return property.multi_select?.options?.map((opt: any) => ({
        id: opt.id || "",
        name: opt.name,
        color: opt.color || "default"
      })) || [];
    }
    return [];
  }

  async addPropertyOptions(
    databaseId: string,
    propertyId: string,
    propertyType: NotionPropertyTypes.Select | NotionPropertyTypes.MultiSelect,
    options: { name: string; color?: string }[]
  ): Promise<void> {
    try {
      const database = await this.retryOperation(async () =>
        this._client.databases.retrieve({ database_id: databaseId })
      );
      
      const propertyName = Object.keys(database.properties).find(
        (key) => database.properties[key].id === propertyId
      );
      
      if (!propertyName) {
        throw new Error(`プロパティID${propertyId}が見つかりません`);
      }
      
      const property = database.properties[propertyName];
      
      if (property.type !== propertyType) {
        throw new Error(
          `プロパティ${propertyName}のタイプが${propertyType}ではありません (実際: ${property.type})`
        );
      }
      
      const existingOptions = this.getPropertyOptions(property);
      const newOptions = [...existingOptions];
      
      for (const option of options) {
        if (!newOptions.some((o) => o.name === option.name)) {
          newOptions.push({
            id: "",  // 新規オプションのためIDは空文字列
            name: option.name,
            color: option.color || "default",
          } as NotionSelectOption);
        }
      }
      
      const propertyUpdate: UpdateDatabaseParameters["properties"] = {
        [propertyName]: {
          [propertyType === NotionPropertyTypes.Select ? "select" : "multi_select"]: {
            options: newOptions.map(opt => ({
              name: opt.name,
              color: opt.color || "default"
            })),
          },
          type: propertyType,
        } as any,
      };
      
      await this.retryOperation(async () =>
        this._client.databases.update({
          database_id: databaseId,
          properties: propertyUpdate,
        })
      );
      
      logger.debug(
        `データベース ${databaseId} のプロパティ ${propertyName} に ${options.length} 個のオプションを追加しました`
      );
    } catch (error: any) {
      logger.error(
        `オプション追加中にエラーが発生しました: ${error.message}`,
        error
      );
      throw error;
    }
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
