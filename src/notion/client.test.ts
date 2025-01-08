import { NotionClient } from "./client";
import { Schema } from "../types";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { Client, APIResponseError, APIErrorCode } from "@notionhq/client";
import { 
  ListUsersResponse, 
  DatabaseObjectResponse,
  GetPageResponse,
  RichTextItemResponse,
  TitlePropertyItemObjectResponse,
  SelectPropertyResponse
} from "@notionhq/client/build/src/api-endpoints";

jest.mock("@notionhq/client", () => {
  const mockListResponse: ListUsersResponse = {
    results: [],
    object: "list",
    type: "user",
    has_more: false,
    next_cursor: null,
    user: {}
  };

  const titleProperty: TitlePropertyItemObjectResponse = {
    id: "title-id",
    type: "title",
    title: {},
    name: "Title"
  };

  const statusProperty: SelectPropertyResponse = {
    id: "status-id",
    type: "select",
    select: {
      options: [
        { name: "Open", id: "open-id", color: "default" },
        { name: "Done", id: "done-id", color: "default" }
      ]
    },
    name: "Status"
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
      Title: titleProperty,
      Status: statusProperty
    },
    parent: {
      type: "page_id",
      page_id: "parent-page-id"
    },
    url: "https://notion.so/test-db",
    archived: false,
    is_inline: false,
    public_url: null
  };

  return {
    Client: jest.fn().mockImplementation(() => ({
      users: {
        list: jest.fn().mockResolvedValue(mockListResponse),
      },
      databases: {
        retrieve: jest.fn().mockResolvedValue(mockDatabaseResponse),
      },
    })),
    APIResponseError,
    APIErrorCode,
  };
});

describe("Notion Connection", () => {
  let client: NotionClient;

  beforeEach(() => {
    process.env.NOTION_API_KEY = "test-api-key";
    client = new NotionClient();
  });

  test("should successfully connect to Notion API", async () => {
    const isConnected = await client.validateConnection();
    expect(isConnected).toBe(true);
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
    const mockClient = {
      databases: {
        retrieve: jest.fn().mockRejectedValue(
          new APIResponseError({
            code: APIErrorCode.InvalidRequestURL,
            message: "Invalid database ID",
            status: 400,
            headers: {},
            rawBodyText: "Invalid database ID"
          })
        ),
      },
    };

    // @ts-ignore: モックのため型を無視
    client["client"] = mockClient;

    const invalidSchema: Schema = {
      models: [
        {
          name: "Invalid",
          fields: [],
          notionDatabaseId: "invalid-id",
        },
      ],
    };

    await expect(client.validateSchema(invalidSchema)).rejects.toThrow();
  });

  test("should throw error for unauthorized access", async () => {
    const mockClient = {
      databases: {
        retrieve: jest.fn().mockRejectedValue(
          new APIResponseError({
            code: APIErrorCode.Unauthorized,
            message: "API key is invalid",
            status: 401,
            headers: {},
            rawBodyText: "API key is invalid"
          })
        ),
      },
    };

    // @ts-ignore: モックのため型を無視
    client["client"] = mockClient;

    const schema: Schema = {
      models: [
        {
          name: "Test",
          fields: [],
          notionDatabaseId: "test-db-id",
        },
      ],
    };

    await expect(client.validateSchema(schema)).rejects.toThrow(/unauthorized/i);
  });
});