import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { SyncManager } from "./manager";
import { NotionClient } from "../notion/client";
import { Schema } from "../types";

import type {
  DatabaseObjectResponse,
  ListUsersResponse,
} from "@notionhq/client/build/src/api-endpoints";

// APIResponseErrorのパラメータ型を定義
type NotionErrorParams = {
  code: string;
  message: string;
  status: number;
  headers: Record<string, string>;
  rawBodyText: string;
};

// モックレスポンスの定義
const mockListResponse: ListUsersResponse = {
  results: [],
  object: "list",
  type: "user",
  has_more: false,
  next_cursor: null,
  user: {},
};

const mockDatabaseResponse: DatabaseObjectResponse = {
  object: "database",
  id: "test-db-id",
  created_time: "2024-01-08",
  last_edited_time: "2024-01-08",
  icon: null,
  cover: null,
  title: [],
  description: [],
  properties: {
    Title: {
      id: "title-id",
      type: "title",
      name: "Title",
      title: {},
      description: null,
    },
    Status: {
      id: "status-id",
      type: "select",
      name: "Status",
      description: null,
      select: {
        options: [
          {
            name: "Open",
            id: "open-id",
            color: "default",
            description: null,
          },
          {
            name: "Done",
            id: "done-id",
            color: "default",
            description: null,
          },
        ],
      },
    },
  },
  parent: {
    type: "page_id",
    page_id: "parent-page-id",
  },
  url: "https://notion.so/test-db",
  is_inline: false,
  archived: false,
  created_by: {
    object: "user",
    id: "user-id",
  },
  last_edited_by: {
    object: "user",
    id: "user-id",
  },
  public_url: null,
  in_trash: false,
};

// モックの設定
const mockClient = {
  users: {
    list: jest
      .fn<() => Promise<ListUsersResponse>>()
      .mockResolvedValue(mockListResponse),
  },
  databases: {
    retrieve: jest
      .fn<(params: any) => Promise<DatabaseObjectResponse>>()
      .mockImplementation(async (params) => {
        if (params.database_id === "invalid-id") {
          const error = Object.assign(new Error("Invalid database ID"), {
            code: "invalid_request_url",
            status: 400,
            headers: {},
            rawBodyText: "Invalid database ID",
          });
          return Promise.reject(error);
        }
        if (params.database_id === "unauthorized-id") {
          const error = Object.assign(new Error("API key is invalid"), {
            code: "unauthorized",
            status: 401,
            headers: {},
            rawBodyText: "API key is invalid",
          });
          return Promise.reject(error);
        }
        return Promise.resolve(mockDatabaseResponse);
      }),
  },
};

const ErrorCodes = {
  InvalidRequestURL: "invalid_request_url",
  Unauthorized: "unauthorized",
} as const;

jest.mock("@notionhq/client", () => {
  class MockAPIResponseError extends Error {
    constructor(params: NotionErrorParams) {
      super(params.message);
      this.name = "APIResponseError";
      Object.assign(this, params);
    }
  }

  return {
    Client: jest.fn().mockImplementation(() => mockClient),
    APIResponseError: MockAPIResponseError,
    APIErrorCode: ErrorCodes,
  };
});

describe("Notion Connection", () => {
  let mockNotionClient: jest.Mocked<NotionClient>;
  let syncManager: SyncManager;

  beforeEach(() => {
    process.env.NOTION_API_KEY = "test-api-key";
    jest.clearAllMocks();
  });

  test("should successfully connect to Notion API", async () => {
    const response = await mockClient.users.list();
    expect(response).toEqual(mockListResponse);
    expect(mockClient.users.list).toHaveBeenCalledTimes(1);
  });

  test("should validate schema with multiple models", async () => {
    const schema: Schema = {
      models: [
        {
          name: "Document",
          fields: [],
          notionDatabaseId: "valid-database-id-1",
        },
        {
          name: "Domain",
          fields: [],
          notionDatabaseId: "valid-database-id-2",
        },
      ],
    };

    const response = await mockClient.databases.retrieve({
      database_id: "valid-database-id-1",
    });
    expect(response).toEqual(mockDatabaseResponse);
    expect(mockClient.databases.retrieve).toHaveBeenCalledTimes(1);
  });

  test("should throw error for invalid database ID", async () => {
    await expect(
      mockClient.databases.retrieve({ database_id: "invalid-id" })
    ).rejects.toHaveProperty("code", "invalid_request_url");
    await expect(
      mockClient.databases.retrieve({ database_id: "invalid-id" })
    ).rejects.toHaveProperty("status", 400);
  });

  test("should throw error for unauthorized access", async () => {
    await expect(
      mockClient.databases.retrieve({ database_id: "unauthorized-id" })
    ).rejects.toHaveProperty("code", "unauthorized");
    await expect(
      mockClient.databases.retrieve({ database_id: "unauthorized-id" })
    ).rejects.toHaveProperty("status", 401);
  });
});

describe("Notion Connection", () => {
  let mockNotionClient: jest.Mocked<NotionClient>;
  let syncManager: SyncManager;

  beforeEach(() => {
    process.env.NOTION_API_KEY = "test-api-key";
    jest.clearAllMocks();
  });

  test("should successfully connect to Notion API", async () => {
    const response = await mockClient.users.list();
    expect(response).toEqual(mockListResponse);
    expect(mockClient.users.list).toHaveBeenCalledTimes(1);
  });

  test("should validate schema with multiple models", async () => {
    const schema: Schema = {
      models: [
        {
          name: "Document",
          fields: [],
          notionDatabaseId: "valid-database-id-1",
        },
        {
          name: "Domain",
          fields: [],
          notionDatabaseId: "valid-database-id-2",
        },
      ],
    };

    const response = await mockClient.databases.retrieve({
      database_id: "valid-database-id-1",
    });
    expect(response).toEqual(mockDatabaseResponse);
    expect(mockClient.databases.retrieve).toHaveBeenCalledTimes(1);
  });

  test("should throw error for invalid database ID", async () => {
    await expect(
      mockClient.databases.retrieve({ database_id: "invalid-id" })
    ).rejects.toHaveProperty("code", "invalid_request_url");
    await expect(
      mockClient.databases.retrieve({ database_id: "invalid-id" })
    ).rejects.toHaveProperty("status", 400);
  });

  test("should throw error for unauthorized access", async () => {
    await expect(
      mockClient.databases.retrieve({ database_id: "unauthorized-id" })
    ).rejects.toHaveProperty("code", "unauthorized");
    await expect(
      mockClient.databases.retrieve({ database_id: "unauthorized-id" })
    ).rejects.toHaveProperty("status", 401);
  });
});
