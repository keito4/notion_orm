import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { SyncManager } from "./manager";
import { NotionClient } from "../notion/client";
import { Schema } from "../types";
import { NotionDatabaseProperty, NotionPropertyTypes, NotionDatabase } from "../types/notionTypes";
import type { DatabaseObjectResponse } from "@notionhq/client/build/src/api-endpoints";

jest.mock("../notion/client");

describe("SyncManager", () => {
  let mockNotionClient: jest.Mocked<NotionClient>;
  let syncManager: SyncManager;

  beforeEach(() => {
    // NotionClientのモックを適切に型付けして作成
    mockNotionClient = {
      validateConnection: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      validateSchema: jest.fn<(schema: Schema) => Promise<void>>().mockResolvedValue(undefined),
      getDatabaseSchema: jest.fn<(databaseId: string) => Promise<NotionDatabase>>().mockResolvedValue({
        id: "test-db-id",
        properties: {}
      }),
      validateDatabaseExists: jest.fn<(databaseId: string) => Promise<void>>().mockResolvedValue(undefined),
      validateDatabaseSchema: jest.fn<(model: any, database: NotionDatabase) => Promise<void>>().mockResolvedValue(undefined),
      getPropertyOptions: jest.fn<(property: NotionDatabaseProperty) => any[]>().mockReturnValue([]),
      convertToNotionProperty: jest.fn<(apiProperty: any) => NotionDatabaseProperty>().mockReturnValue({
        id: "prop-id",
        name: "prop-name",
        type: NotionPropertyTypes.Title,
        title: {}
      }),
      retryOperation: jest.fn().mockImplementation(async <T>(operation: () => Promise<T>): Promise<T> => {
        return operation();
      }),
      client: {
        databases: {
          retrieve: jest.fn<() => Promise<DatabaseObjectResponse>>().mockResolvedValue({
            id: "test-db-id",
            properties: {},
            object: "database",
            created_time: "2024-01-08",
            last_edited_time: "2024-01-08",
            title: [],
            description: [],
            parent: { type: "workspace", workspace: true },
            url: "",
            archived: false,
            is_inline: false,
            public_url: null,
            created_by: {
              object: "user",
              id: "user-id"
            },
            last_edited_by: {
              object: "user",
              id: "user-id"
            }
          })
        }
      },
      isInitialized: false
    } as jest.Mocked<NotionClient>;

    syncManager = new SyncManager(mockNotionClient);
  });

  test("should validate and sync schema successfully", async () => {
    const schema: Schema = {
      models: [
        {
          name: "Test",
          fields: [
            {
              name: "title",
              type: "title",
              optional: false,
              attributes: ["@title"],
              notionName: "Title",
            },
          ],
          notionDatabaseId: "test-db-id",
        },
      ],
    };

    await expect(syncManager.validateAndSync(schema)).resolves.not.toThrow();
    expect(mockNotionClient.validateConnection).toHaveBeenCalled();
    expect(mockNotionClient.validateSchema).toHaveBeenCalledWith(schema);
  });

  test("should throw error when connection validation fails", async () => {
    mockNotionClient.validateConnection.mockResolvedValue(false);

    const schema: Schema = {
      models: [],
    };

    await expect(syncManager.validateAndSync(schema)).rejects.toThrow(
      "Failed to validate Notion connection"
    );
  });

  test("should throw error when schema validation fails", async () => {
    mockNotionClient.validateSchema.mockRejectedValue(
      new Error("Invalid schema")
    );

    const schema: Schema = {
      models: [],
    };

    await expect(syncManager.validateAndSync(schema)).rejects.toThrow(
      "Invalid schema"
    );
  });
});