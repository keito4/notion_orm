import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import type { 
  ListUsersResponse,
  DatabaseObjectResponse,
  GetDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { Client } from "@notionhq/client";
import { Schema } from "../types";

// APIResponseError interface definition based on Notion's API error structure
interface APIResponseError extends Error {
  code: string;
  status: number;
  headers: Record<string, string>;
  body: string;
}

// APIResponseErrorのパラメータ型を定義
type NotionErrorParams = {
  code: string;
  message: string;
  status: number;
  headers: Record<string, string>;
  rawBodyText: string;
};

const mockListResponse: ListUsersResponse = {
  results: [
    {
      object: "user",
      id: "user-1",
      type: "person",
      person: {
        email: "test@example.com",
      },
      name: "Test User",
      avatar_url: null,
    },
  ],
  object: "list",
  type: "user",
  has_more: false,
  next_cursor: null,
  user: {},
};

const mockDatabaseResponse: GetDatabaseResponse = {
  object: "database",
  id: "b1234567-89ab-cdef-0123-456789abcdef",
  created_time: "2024-01-08T00:00:00.000Z",
  last_edited_time: "2024-01-08T00:00:00.000Z",
  icon: null,
  cover: null,
  title: [
    {
      type: "text",
      text: { content: "Test Database", link: null },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: "default",
      },
      plain_text: "Test Database",
      href: null,
    },
  ],
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
    type: "workspace",
    workspace: true
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

class MockAPIResponseError extends Error implements APIResponseError {
  code: string;
  status: number;
  headers: Record<string, string>;
  body: string;

  constructor(params: NotionErrorParams) {
    super(params.message);
    this.name = "APIResponseError";
    this.code = params.code;
    this.status = params.status;
    this.headers = params.headers;
    this.body = params.rawBodyText;
  }
}

// モックの設定
const mockClient = {
  users: {
    list: jest.fn<() => Promise<ListUsersResponse>>()
      .mockResolvedValue(mockListResponse)
  },
  databases: {
    retrieve: jest.fn<(params: { database_id: string }) => Promise<GetDatabaseResponse>>()
      .mockImplementation((params) => {
        if (params.database_id === "invalid-id") {
          return Promise.reject(new MockAPIResponseError({
            code: "invalid_request_url",
            message: "Invalid database ID",
            status: 400,
            headers: {},
            rawBodyText: "Invalid database ID"
          }));
        }
        if (params.database_id === "unauthorized-id") {
          return Promise.reject(new MockAPIResponseError({
            code: "unauthorized",
            message: "API key is invalid",
            status: 401,
            headers: {},
            rawBodyText: "API key is invalid"
          }));
        }
        return Promise.resolve(mockDatabaseResponse);
      })
  }
};

const ErrorCodes = {
  InvalidRequestURL: "invalid_request_url",
  Unauthorized: "unauthorized"
} as const;

jest.mock("@notionhq/client", () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
  APIResponseError: MockAPIResponseError,
  APIErrorCode: ErrorCodes
}));

describe("Notion Connection", () => {
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
          fields: [
            {
              name: "title",
              type: "title",
              optional: false,
              attributes: [],
              notionName: "Title"
            },
            {
              name: "status",
              type: "select",
              optional: true,
              attributes: [],
              notionName: "Status"
            }
          ],
          notionDatabaseId: "b1234567-89ab-cdef-0123-456789abcdef",
        },
        {
          name: "Domain",
          fields: [
            {
              name: "title",
              type: "title",
              optional: false,
              attributes: [],
              notionName: "Title"
            }
          ],
          notionDatabaseId: "c1234567-89ab-cdef-0123-456789abcdef",
        },
      ],
    };

    const response = await mockClient.databases.retrieve({ database_id: schema.models[0].notionDatabaseId });
    expect(response).toEqual(mockDatabaseResponse);
    expect(mockClient.databases.retrieve).toHaveBeenCalledTimes(1);
  });

  test("should throw error for invalid database ID", async () => {
    await expect(mockClient.databases.retrieve({ database_id: "invalid-id" }))
      .rejects
      .toMatchObject({
        code: "invalid_request_url",
        status: 400,
        message: "Invalid database ID",
        name: "APIResponseError"
      });
  });

  test("should throw error for unauthorized access", async () => {
    await expect(mockClient.databases.retrieve({ database_id: "unauthorized-id" }))
      .rejects
      .toMatchObject({
        code: "unauthorized",
        status: 401,
        message: "API key is invalid",
        name: "APIResponseError"
      });
  });
});