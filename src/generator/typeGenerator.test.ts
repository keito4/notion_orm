import { generateTypeDefinitions } from "./typeGenerator";
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
            name: "subItem",
            type: "relation",
            optional: false,
            attributes: [],
            notionType: "relation",
            isArray: false,
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
