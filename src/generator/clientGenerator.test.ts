import { generateClient } from "./clientGenerator";
import { Schema } from "../types";
// Jest globals are available globally with @types/jest 30+
// No imports needed: describe, test, expect

describe("Code Generator", () => {
  const mockSchema: Schema = {
    models: [
      {
        name: "Test",
        fields: [
          {
            name: "title",
            type: "title",
            optional: false,
            attributes: [],
            notionType: "title",
            isArray: false,
          },
          {
            name: "description",
            type: "rich_text",
            optional: true,
            attributes: [],
            notionType: "rich_text",
            isArray: false,
          },
        ],
        notionDatabaseId: "test123",
      },
    ],
  };

  test("should generate client code", async () => {
    await expect(generateClient(mockSchema)).resolves.not.toThrow();
  });
});
