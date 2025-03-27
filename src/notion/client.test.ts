import { NotionClient } from "./client";
import { Schema } from "../types";
import { NotionPropertyTypes } from "../types/notionTypes";
import { describe, test, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import { Client } from "@notionhq/client";
import type { 
  GetDatabaseResponse,
  UpdateDatabaseResponse,
  ListUsersResponse
} from "@notionhq/client/build/src/api-endpoints";

const mockDatabaseResponse = {
  object: "database",
  id: "db_1",
  created_time: "2024-03-27T00:00:00.000Z",
  last_edited_time: "2024-03-27T00:00:00.000Z",
  icon: null,
  cover: null,
  url: "",
  title: [],
  description: [],
  properties: {
    "テストセレクト": {
      id: "prop_1",
      name: "テストセレクト",
      type: "select",
      select: {
        options: [
          { id: "opt_1", name: "既存オプション", color: "blue" }
        ]
      }
    },
    "テストマルチセレクト": {
      id: "prop_2",
      name: "テストマルチセレクト",
      type: "multi_select",
      multi_select: {
        options: [
          { id: "opt_2", name: "既存オプション", color: "red" }
        ]
      }
    }
  },
  parent: { type: "workspace", workspace: true },
  archived: false,
  is_inline: false
} as unknown as GetDatabaseResponse;

const mockRetrieve = jest.fn().mockImplementation(() => Promise.resolve(mockDatabaseResponse));
const mockUpdate = jest.fn().mockImplementation(() => Promise.resolve(mockDatabaseResponse));
const mockList = jest.fn().mockImplementation(() => Promise.resolve({
  results: [],
  has_more: false,
  next_cursor: null,
  type: "list_users_response",
  object: "list"
}));

jest.mock("@notionhq/client", () => ({
  Client: jest.fn().mockImplementation(() => ({
    databases: {
      retrieve: mockRetrieve,
      update: mockUpdate
    },
    users: {
      list: mockList
    }
  }))
}));

describe("NotionClient", () => {
  let client: NotionClient;
  let mockDatabases: { retrieve: jest.Mock; update: jest.Mock };

  beforeEach(() => {
    process.env.NOTION_API_KEY = "test_api_key";
    jest.clearAllMocks();
    client = new NotionClient();
    mockDatabases = { retrieve: mockRetrieve, update: mockUpdate };
  });

  describe("addPropertyOptions", () => {
    it("セレクトプロパティにオプションを追加できること", async () => {
      await client.addPropertyOptions(
        "db_1",
        "prop_1",
        NotionPropertyTypes.Select,
        [{ name: "新しいオプション", color: "green" }]
      );

      expect(mockDatabases.retrieve).toHaveBeenCalledWith({
        database_id: "db_1"
      });
      expect(mockDatabases.update).toHaveBeenCalled();
    });

    it("マルチセレクトプロパティにオプションを追加できること", async () => {
      await client.addPropertyOptions(
        "db_1",
        "prop_2",
        NotionPropertyTypes.MultiSelect,
        [{ name: "新しいオプション", color: "green" }]
      );

      expect(mockDatabases.retrieve).toHaveBeenCalledWith({
        database_id: "db_1"
      });
      expect(mockDatabases.update).toHaveBeenCalled();
    });

    it("存在しないプロパティIDでエラーを投げること", async () => {
      await expect(
        client.addPropertyOptions(
          "db_1",
          "non_existent_prop",
          NotionPropertyTypes.Select,
          [{ name: "新しいオプション", color: "green" }]
        )
      ).rejects.toThrow("プロパティID");
    });

    it("不正なプロパティタイプでエラーを投げること", async () => {
      mockRetrieve.mockImplementationOnce(() => Promise.resolve({
        object: "database",
        id: "db_1",
        created_time: "2024-03-27T00:00:00.000Z",
        last_edited_time: "2024-03-27T00:00:00.000Z",
        icon: null,
        cover: null,
        url: "",
        title: [],
        description: [],
        properties: {
          "テストセレクト": {
            id: "prop_1",
            name: "テストセレクト",
            type: "text",
            text: {}
          }
        },
        parent: { type: "workspace", workspace: true },
        archived: false,
        is_inline: false
      } as unknown as GetDatabaseResponse));

      await expect(
        client.addPropertyOptions(
          "db_1",
          "prop_1",
          NotionPropertyTypes.Select,
          [{ name: "新しいオプション", color: "green" }]
        )
      ).rejects.toThrow("タイプが");
    });
  });
});

describe("Notion Connection", () => {
  let client: NotionClient;

  beforeAll(() => {
    client = new NotionClient();
  });

  test("should successfully connect to Notion API", async () => {
    const isConnected = await client.validateConnection();
    expect(isConnected).toBe(true);
  });

  test("should validate database existence", async () => {
    const schema: Schema = {
      models: [
        {
          name: "Document",
          fields: [],
          notionDatabaseId: "13f70a52207f80d58f64cdc627123f87",
        },
        {
          name: "Domain",
          fields: [],
          notionDatabaseId: "f6e300b8598e42208a2c163444655842",
        },
      ],
    };

    await expect(client.validateSchema(schema)).resolves.not.toThrow();
  });
});
