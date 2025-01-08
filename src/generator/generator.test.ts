import { generateTypeDefinitions } from "./typeGenerator";
import { generateClient } from "./clientGenerator";
import { Schema } from "../types";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("Code Generator", () => {
  let mockSchema: Schema;

  beforeEach(() => {
    mockSchema = {
      models: [{
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
        notionDatabaseId: "test123"
      }],
      output: {
        directory: "./generated",
        clientFile: "client.ts",
        typeDefinitionFile: "types.ts"
      }
    };
  });

  test("should generate type definitions with proper structure", async () => {
    await generateTypeDefinitions(mockSchema);

    // output は必須であることを保証
    const directory = mockSchema.output?.directory || "./generated";
    const typeFile = mockSchema.output?.typeDefinitionFile || "types.ts";
    const typesPath = resolve(directory, typeFile);

    expect(existsSync(typesPath)).toBe(true);

    const content = readFileSync(typesPath, "utf-8");
    expect(content).toContain("export interface Test {");
    expect(content).toContain("id: string;");
    expect(content).toContain("title: string;");
    expect(content).toContain("description?: string;");
    expect(content).toContain("status?: string;");
    expect(content).toContain("createdTime: string;");
    expect(content).toContain("lastEditedTime: string;");
  });

  test("should generate client code with proper structure", async () => {
    await generateClient(mockSchema);

    // output は必須であることを保証
    const directory = mockSchema.output?.directory || "./generated";
    const clientFile = mockSchema.output?.clientFile || "client.ts";
    const clientPath = resolve(directory, clientFile);

    expect(existsSync(clientPath)).toBe(true);

    const content = readFileSync(clientPath, "utf-8");
    expect(content).toContain('import { Client } from "@notionhq/client"');
    expect(content).toContain("export class NotionOrmClient");
    expect(content).toContain("private notion: Client");
    expect(content).toContain("queryTest(): QueryBuilder<Test>");
  });

  test("should handle empty models array", async () => {
    const emptySchema: Schema = {
      models: [],
      output: {
        directory: "./generated",
        clientFile: "client.ts",
        typeDefinitionFile: "types.ts"
      }
    };
    await expect(generateClient(emptySchema)).resolves.not.toThrow();
    await expect(generateTypeDefinitions(emptySchema)).resolves.not.toThrow();
  });

  test("should throw error for invalid schema structure", async () => {
    const invalidSchema = {
      models: [{
        name: "Invalid"
        // Missing required fields
      }]
    } as unknown as Schema;

    await expect(generateClient(invalidSchema))
      .rejects
      .toThrow("Invalid schema: model fields are required");

    await expect(generateTypeDefinitions(invalidSchema))
      .rejects
      .toThrow();
  });

  test("should handle complex field types", async () => {
    const complexSchema: Schema = {
      models: [{
        name: "Complex",
        fields: [
          { name: "people", type: "people", optional: true, attributes: [], notionName: "People" },
          { name: "files", type: "files", optional: true, attributes: [], notionName: "Files" },
          { name: "relation", type: "relation", optional: true, attributes: [], notionName: "Relation" },
          { name: "formula", type: "formula", optional: true, attributes: [], notionName: "Formula" }
        ],
        notionDatabaseId: "complex123"
      }],
      output: {
        directory: "./generated",
        clientFile: "client.ts",
        typeDefinitionFile: "types.ts"
      }
    };

    await generateTypeDefinitions(complexSchema);

    // output は必須であることを保証
    const directory = complexSchema.output?.directory || "./generated";
    const typeFile = complexSchema.output?.typeDefinitionFile || "types.ts";
    const typesPath = resolve(directory, typeFile);

    const content = readFileSync(typesPath, "utf-8");

    expect(content).toContain("Array<{ id: string; name: string; avatar_url?: string }>");
    expect(content).toContain("Array<{ name: string; url: string }>");
    expect(content).toContain("Array<{ id: string }>");
    expect(content).toContain("string");
  });
});