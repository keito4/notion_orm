import { generateClient } from "./clientGenerator";
import { Schema } from "../types";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

describe("Client Generator", () => {
  beforeEach(() => {
    // テストディレクトリの作成
    try {
      mkdirSync("./generated", { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }
  });

  const mockSchema: Schema = {
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

  test("should generate client code with proper structure", async () => {
    await generateClient(mockSchema);

    const clientPath = resolve("./generated/client.ts");
    expect(existsSync(clientPath)).toBe(true);

    const generatedCode = readFileSync(clientPath, "utf-8");

    // 必須のインポートをチェック
    expect(generatedCode).toContain('import { Client } from "@notionhq/client"');
    expect(generatedCode).toContain('import { QueryBuilder } from "../query/builder"');
    expect(generatedCode).toContain("export class NotionOrmClient");
    expect(generatedCode).toContain("private notion: Client");
    expect(generatedCode).toContain("constructor(apiKey: string)");
    expect(generatedCode).toContain("this.notion = new Client({ auth: apiKey })");
    expect(generatedCode).toContain("queryTest(): QueryBuilder<Test>");
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
  });

  test("should throw error for invalid schema structure", async () => {
    const invalidSchema = {
      // 不完全なスキーマ構造
      models: [{
        name: "Invalid"
        // 必須フィールドが欠落
      }]
    } as unknown as Schema;

    await expect(generateClient(invalidSchema))
      .rejects
      .toThrow("Invalid schema: model fields are required");
  });

  test("should generate type definitions for all fields", async () => {
    await generateClient(mockSchema);

    const typesPath = resolve("./generated/types.ts");
    expect(existsSync(typesPath)).toBe(true);

    const generatedTypes = readFileSync(typesPath, "utf-8");

    // 生成された型定義の内容を検証
    const expectedContent = `
export interface Test {
  id: string;
  title: string;
  description?: string;
  status?: string;
  createdTime: string;
  lastEditedTime: string;
}`;

    // 改行とスペースを正規化して比較
    const normalizedExpected = expectedContent.replace(/\s+/g, ' ').trim();
    const normalizedGenerated = generatedTypes.replace(/\s+/g, ' ').trim();
    expect(normalizedGenerated).toContain(normalizedExpected.replace(/\s+/g, ' ').trim());
  });
});