#!/usr/bin/env node

import { readFileSync } from "fs";
import { parseSchema } from "./parser/schemaParser";
import { generateTypeDefinitions } from "./generator/typeGenerator";
import { generateClient } from "./generator/clientGenerator";
import { generateDatabaseProperties } from "./generator/databaseGenerator";
import { NotionClient } from "./notion/client";
import { SyncManager } from "./sync/manager";
import { logger } from "./utils/logger";
import { program } from "commander";
import { version } from "../package.json";
import { Client } from "@notionhq/client";
import { QueryBuilder } from "./query/builder";
import { NotionPropertyTypes } from "./types/notionTypes";

export async function generateTypes(): Promise<void> {
  try {
    logger.info("Reading schema file...");
    const schemaContent = readFileSync("schema.prisma", "utf-8");

    logger.info("Parsing schema...");
    const schema = parseSchema(schemaContent);

    logger.info("Initializing Notion client...");
    const notionClient = new NotionClient();

    logger.info("Validating and syncing schema with Notion...");
    const syncManager = new SyncManager(notionClient);
    await syncManager.validateAndSync(schema);

    logger.info("Generating TypeScript type definitions...");
    await generateTypeDefinitions(schema);

    logger.info("Generating client code...");
    await generateClient(schema);

    logger.success("Successfully generated types and client code");
  } catch (error) {
    logger.error("Error generating types:", error);
    throw error;
  }
}

export async function createDatabases(parentPageId: string): Promise<void> {
  try {
    logger.info("スキーマファイルを読み込んでいます...");
    const schemaContent = readFileSync("schema.prisma", "utf-8");

    logger.info("スキーマを解析しています...");
    const schema = parseSchema(schemaContent);

    logger.info("Notion クライアントを初期化しています...");
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error("NOTION_API_KEY 環境変数が必要です");
    }
    const notionClient = new Client({
      auth: apiKey,
      notionVersion: "2022-06-28",
    });

    logger.info("スキーマからデータベースを作成しています...");
    const createdDatabases = new Map<string, string>();
    
    for (const model of schema.models) {
      logger.info(`モデル ${model.name} のデータベースを作成しています...`);
      
      const propertyDefinitions = generateDatabaseProperties(model);
      
      const queryBuilder = new QueryBuilder(
        notionClient,
        "",  // 新規作成なのでデータベースIDは空
        model.name
      );
      
      const response = await queryBuilder.createDatabase(
        parentPageId,
        model.name,
        propertyDefinitions
      );
      
      createdDatabases.set(model.name, response.id);
      
      logger.success(`データベース「${model.name}」を作成しました。ID: ${response.id}`);
    }
    
    logger.info("リレーションプロパティを更新しています...");
    
    for (const model of schema.models) {
      const relationFields = model.fields.filter(f => f.notionType === NotionPropertyTypes.Relation);
      
      if (relationFields.length > 0) {
        logger.info(`モデル ${model.name} のリレーションを更新しています...`);
        
        const databaseId = createdDatabases.get(model.name);
        if (!databaseId) {
          logger.warn(`モデル ${model.name} のデータベースIDが見つかりません。スキップします。`);
          continue;
        }
        
        const updates: Record<string, any> = {};
        
        for (const field of relationFields) {
          const propertyName = field.notionName || field.name;
          const relationAttr = field.attributes.find(attr => attr.startsWith("@relation"));
          
          const targetModelName = field.type.replace(/\[\]$/, ""); // 配列型の場合は[]を削除
          const targetDatabaseId = createdDatabases.get(targetModelName);
          
          if (targetDatabaseId) {
            updates[propertyName] = {
              relation: {
                single_property: {},
                database_id: targetDatabaseId
              }
            };
            logger.info(`フィールド "${propertyName}" が "${targetModelName}" にマップされました`);
          }
        }
        
        if (Object.keys(updates).length > 0) {
          await notionClient.databases.update({
            database_id: databaseId,
            properties: updates
          });
          logger.success(`データベース「${model.name}」のリレーションを更新しました`);
        }
      }
    }

    logger.info("output.prismaファイルを生成しています...");
    
    const originalSchema = readFileSync("schema.prisma", "utf-8");
    
    let outputSchema = originalSchema;
    
    for (const model of schema.models) {
      const databaseId = createdDatabases.get(model.name);
      if (databaseId) {
        const modelRegex = new RegExp(`model\\s+${model.name}\\s+{[^}]*}`, "s");
        
        const attrRegex = new RegExp(`@notionDatabase\\([^)]*\\)`, "g");
        
        const modelMatch = outputSchema.match(modelRegex);
        
        if (modelMatch) {
          let modelDef = modelMatch[0];
          
          if (modelDef.match(attrRegex)) {
            modelDef = modelDef.replace(attrRegex, `@notionDatabase("${databaseId}")`);
          } else {
            const modelNameLine = new RegExp(`model\\s+${model.name}\\s+{`, "");
            modelDef = modelDef.replace(modelNameLine, `$& @notionDatabase("${databaseId}")`);
          }
          
          outputSchema = outputSchema.replace(modelRegex, modelDef);
        }
      }
    }
    
    const { writeFileSync } = require("fs");
    writeFileSync("output.prisma", outputSchema, "utf-8");
    
    logger.success("output.prismaファイルを生成しました");
    logger.success("すべてのデータベースを作成しました");
  } catch (error) {
    logger.error("データベース作成中にエラーが発生しました:", error);
    throw error;
  }
}

program
  .name("notionmodelsync")
  .description(
    "Notion ORM CLI tool for managing database schemas and generating TypeScript types"
  )
  .version(version);

program
  .command("generate")
  .description("Generate TypeScript types and client from schema")
  .action(async () => {
    try {
      await generateTypes();
      logger.success("Successfully generated types and client");
    } catch (error) {
      logger.error("Failed to generate types:", error);
      typeof process !== 'undefined' && process.exit(1);
    }
  });

program
  .command("create-databases")
  .description("スキーマからNotionデータベースを作成")
  .requiredOption("-p, --parent <id>", "データベースを作成する親ページID")
  .action(async (options) => {
    try {
      await createDatabases(options.parent);
      logger.success("データベースの作成に成功しました");
    } catch (error) {
      logger.error("データベース作成に失敗しました:", error);
      typeof process !== 'undefined' && process.exit(1);
    }
  });

program.parse();
