import { NotionClient } from "./client";
import { Schema } from "../types";
// Jest globals (describe, it, expect, beforeEach, afterEach, jest) are available without import in Jest 30+

// Mock the @notionhq/client module
jest.mock("@notionhq/client", () => ({
  Client: jest.fn().mockImplementation(() => ({
    users: {
      list: jest.fn().mockResolvedValue({ results: [] }),
    },
    databases: {
      retrieve: jest.fn().mockResolvedValue({
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
    // Set mock environment variable for testing
    process.env.NOTION_API_KEY = "secret_mock_key_for_unit_tests_only";
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
          notionDatabaseId: "12345678-1234-5678-9abc-123456789abc",
        },
        {
          name: "Domain",
          fields: [],
          notionDatabaseId: "87654321-4321-8765-cba9-987654321098",
        },
      ],
    };

    await expect(client.validateSchema(schema)).resolves.not.toThrow();
  });
});
