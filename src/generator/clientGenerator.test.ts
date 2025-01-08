import { generateClient } from "./clientGenerator";
import { Schema } from "../types";
import { describe, test, expect } from "@jest/globals";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("Client Generator", () => {
  const mockSchema: Schema = {
    models: [
      {
        name: "Test",
        fields: [
          { 
            name: "title", 
            type: "title", 
            optional: false, 
            attributes: ["@title"],
            notionName: "Title"
          },
          {
            name: "description",
            type: "rich_text",
            optional: true,
            attributes: [],
            notionName: "Description"
          },
          {
            name: "status",
            type: "select",
            optional: true,
            attributes: ["@select"],
            notionName: "Status"
          }
        ],
        notionDatabaseId: "test123",
      },
    ],
    output: {
      directory: "./generated",
      clientFile: "client.ts",
      typeDefinitionFile: "types.ts"
    }
  };

  test("should generate client code with proper structure", async () => {
    // Generate the client code
    await generateClient(mockSchema);

    // Verify the client file exists
    const clientPath = resolve("./generated/client.ts");
    expect(existsSync(clientPath)).toBe(true);

    // Read and verify the generated code
    const generatedCode = readFileSync(clientPath, "utf-8");

    // Check for essential imports
    expect(generatedCode).toContain('import { Client } from "@notionhq/client"');
    expect(generatedCode).toContain('import { QueryBuilder } from "../src/query/builder"');

    // Verify class structure
    expect(generatedCode).toContain("export class NotionOrmClient");
    expect(generatedCode).toContain("private notion: Client");

    // Check constructor
    expect(generatedCode).toContain("constructor(apiKey: string)");
    expect(generatedCode).toContain("this.notion = new Client({ auth: apiKey })");

    // Verify query method for Test model
    expect(generatedCode).toContain("queryTests(): QueryBuilder<Test>");
    expect(generatedCode).toContain('TestModelSettings.notionDatabaseId');
    expect(generatedCode).toContain('TestModelSettings.propertyMappings');
    expect(generatedCode).toContain('TestModelSettings.propertyTypes');
  });

  test("should generate model settings with correct mappings", async () => {
    await generateClient(mockSchema);

    // Verify model settings file exists
    const modelSettingsPath = resolve("./generated/models/Test.ts");
    expect(existsSync(modelSettingsPath)).toBe(true);

    // Read and verify the model settings
    const modelSettings = readFileSync(modelSettingsPath, "utf-8");

    // Check database ID
    expect(modelSettings).toContain('"test123"');

    // Check property mappings
    expect(modelSettings).toContain('"title": "Title"');
    expect(modelSettings).toContain('"description": "Description"');
    expect(modelSettings).toContain('"status": "Status"');

    // Check property types
    expect(modelSettings).toContain("NotionPropertyTypes.Title");
    expect(modelSettings).toContain("NotionPropertyTypes.RichText");
    expect(modelSettings).toContain("NotionPropertyTypes.Select");
  });

  test("should handle empty models array", async () => {
    const emptySchema: Schema = {
      models: [],
      output: {
        directory: "./generated",
        clientFile: "client.ts"
      }
    };

    await expect(generateClient(emptySchema)).resolves.not.toThrow();
  });

  test("should throw error for invalid schema", async () => {
    const invalidSchema = {
      models: [
        {
          name: "Invalid",
          // Missing required fields
        }
      ]
    } as Schema;

    await expect(generateClient(invalidSchema)).rejects.toThrow();
  });
});