import { generateTypeDefinitions } from "../src/generator/typeGenerator";
import { generateClient } from "../src/generator/clientGenerator";
import { Schema } from "../src/types";

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

  test("should generate client code", async () => {
    await expect(generateClient(mockSchema)).resolves.not.toThrow();
  });
});
