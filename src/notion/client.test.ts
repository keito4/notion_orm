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
    // Using mock API key for testing purposes only
    process.env.NOTION_API_KEY = "test-mock-api-key-for-testing-only";
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
          notionDatabaseId: "test-mock-database-id-for-testing-1",
        },
        {
          name: "Domain",
          fields: [],
          notionDatabaseId: "test-mock-database-id-for-testing-2",
        },
      ],
    };

    await expect(client.validateSchema(schema)).resolves.not.toThrow();
  });
});
