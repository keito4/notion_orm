import { NotionClient } from "./client";
import { Schema } from "../types";
import { describe, test, expect, beforeAll, jest } from "@jest/globals";

// Mock the @notionhq/client module
jest.mock("@notionhq/client", () => ({
  Client: jest.fn().mockImplementation(() => ({
    users: {
      list: jest.fn<() => Promise<{ results: any[] }>>().mockResolvedValue({ results: [] }),
    },
    databases: {
      retrieve: jest.fn<() => Promise<any>>().mockResolvedValue({
        id: "test-database-id",
        properties: {
          title: {
            id: "title",
            name: "Title",
            type: "title",
          },
        },
      }),
    },
  })),
}));

describe("Notion Connection", () => {
  let client: NotionClient;

  beforeAll(() => {
    // Set mock environment variable
    process.env.NOTION_API_KEY = "mock-api-key";
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
          notionDatabaseId: "mock-database-id-1234567890abcdef",
        },
        {
          name: "Domain",
          fields: [],
          notionDatabaseId: "mock-database-id-fedcba0987654321",
        },
      ],
    };

    await expect(client.validateSchema(schema)).resolves.not.toThrow();
  });
});
