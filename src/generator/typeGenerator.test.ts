import { generateTypeDefinitions } from "./typeGenerator";
import { Schema } from "../types";
import { describe, test, expect } from "@jest/globals";
describe("Code Generator", () => {
  const mockSchema: Schema = {
    models: [
      {
        name: "Test",
        fields: [
          { name: "title", type: "title", optional: false, attributes: [] },
          {
            name: "description",
            type: "rich_text",
            optional: true,
            attributes: [],
          },
        ],
        notionDatabaseId: "test123",
      },
    ],
  };

  test("should generate type definitions", async () => {
    await expect(generateTypeDefinitions(mockSchema)).resolves.not.toThrow();
  });
});
