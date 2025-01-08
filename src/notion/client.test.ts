import { NotionClient } from "./client";
import { Schema } from "../types";
import { describe, test, expect, beforeAll } from "@jest/globals";

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
          notionDatabaseId: "***REMOVED***",
        },
        {
          name: "Domain",
          fields: [],
          notionDatabaseId: "***REMOVED***",
        },
      ],
    };

    await expect(client.validateSchema(schema)).resolves.not.toThrow();
  });
});
