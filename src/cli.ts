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

export async function createDatabases(parentPageId: string, schemaPath: string = "schema.prisma", outputPath: string = "output.prisma"): Promise<void> {
  try {
    logger.info(`スキーマファイル ${schemaPath} を読み込んでいます...`);
    const schemaContent = readFileSync(schemaPath, "utf-8");

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
    
    const modelsWithoutRelations = schema.models.filter(
      model => !model.fields.some(f => f.notionType === NotionPropertyTypes.Relation)
    );
    
    for (const model of modelsWithoutRelations) {
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
    
    const modelsWithRelations = schema.models.filter(
      model => model.fields.some(f => f.notionType === NotionPropertyTypes.Relation)
    );
    
    for (const model of modelsWithRelations) {
      logger.info(`モデル ${model.name} のデータベースを作成しています...`);
      
      const relationFields = model.fields.filter(f => f.notionType === NotionPropertyTypes.Relation);
      const nonRelationFields = model.fields.filter(f => f.notionType !== NotionPropertyTypes.Relation);
      
      const tempModel = {
        ...model,
        fields: nonRelationFields
      };
      
      const propertyDefinitions = generateDatabaseProperties(tempModel);
      
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
      
      if (relationFields.length > 0) {
        const updates: Record<string, any> = {};
        
        for (const field of relationFields) {
          const propertyName = field.notionName || field.name;
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
            database_id: response.id,
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
    writeFileSync(outputPath, outputSchema, "utf-8");
    
    logger.success(`${outputPath}ファイルを生成しました`);
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
  .option("-s, --schema <path>", "スキーマファイルのパス", "schema.prisma")
  .option("-o, --output <path>", "出力スキーマファイルのパス", "output.prisma")
  .action(async (options) => {
    try {
      await createDatabases(options.parent, options.schema, options.output);
      logger.success("データベースの作成に成功しました");
    } catch (error) {
      logger.error("データベース作成に失敗しました:", error);
      typeof process !== 'undefined' && process.exit(1);
    }
  });

program.parse();
