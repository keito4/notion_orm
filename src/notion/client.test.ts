import { NotionClient } from "./client";
import { Schema } from "../types";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { Client, APIResponseError, APIErrorCode } from "@notionhq/client";
import type { 
  ListUsersResponse,
  DatabaseObjectResponse,
  PropertyItemObjectResponse,
  RichTextItemResponse
} from "@notionhq/client/build/src/api-endpoints";

// APIResponseErrorのパラメータ型を定義
type NotionErrorResponse = {
  code: APIErrorCode;
  message: string;
  status: number;
  headers: Record<string, string>;
  rawBodyText: string;
};

const mockListResponse: ListUsersResponse = {
  results: [],
  object: "list",
  type: "user",
  has_more: false,
  next_cursor: null,
  user: {}
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
      description: null
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
            description: null
          },
          { 
            name: "Done", 
            id: "done-id", 
            color: "default",
            description: null
          }
        ]
      }
    }
  },
  parent: {
    type: "page_id",
    page_id: "parent-page-id"
  },
  url: "https://notion.so/test-db",
  is_inline: false,
  archived: false,
  created_by: {
    object: "user",
    id: "user-id"
  },
  last_edited_by: {
    object: "user",
    id: "user-id"
  },
  public_url: null,
  in_trash: false
};

const mockClient = {
  users: {
    list: jest.fn<() => Promise<ListUsersResponse>>().mockResolvedValue(mockListResponse)
  },
  databases: {
    retrieve: jest.fn<() => Promise<DatabaseObjectResponse>>().mockResolvedValue(mockDatabaseResponse)
  }
};

// モックの設定
jest.mock("@notionhq/client", () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
  APIResponseError: jest.fn().mockImplementation(
    (params: NotionErrorResponse) => Object.assign(new Error(params.message), params)
  ),
  APIErrorCode
}));

describe("Notion Connection", () => {
  let client: NotionClient;

  beforeEach(() => {
    process.env.NOTION_API_KEY = "test-api-key";
    client = new NotionClient();
    jest.clearAllMocks();
  });

  test("should successfully connect to Notion API", async () => {
    const isConnected = await client.validateConnection();
    expect(isConnected).toBe(true);
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

    await expect(client.validateSchema(schema)).resolves.not.toThrow();
  });

  test("should throw error for invalid database ID", async () => {
    const errorResponse: NotionErrorResponse = {
      code: APIErrorCode.InvalidRequestURL,
      message: "Invalid database ID",
      status: 400,
      headers: {},
      rawBodyText: "Invalid database ID"
    };

    mockClient.databases.retrieve.mockRejectedValueOnce(
      new APIResponseError(errorResponse)
    );

    const invalidSchema: Schema = {
      models: [
        {
          name: "Invalid",
          fields: [],
          notionDatabaseId: "invalid-id",
        },
      ],
    };

    await expect(client.validateSchema(invalidSchema)).rejects.toThrow(/invalid/i);
  });

  test("should throw error for unauthorized access", async () => {
    const errorResponse: NotionErrorResponse = {
      code: APIErrorCode.Unauthorized,
      message: "API key is invalid",
      status: 401,
      headers: {},
      rawBodyText: "API key is invalid"
    };

    mockClient.databases.retrieve.mockRejectedValueOnce(
      new APIResponseError(errorResponse)
    );

    const schema: Schema = {
      models: [
        {
          name: "Test",
          fields: [],
          notionDatabaseId: "test-db-id",
        },
      ],
    };

    await expect(client.validateSchema(schema)).rejects.toThrow(/invalid/i);
  });
});