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
      
      logger.success(`データベース「${model.name}」を作成しました。ID: ${response.id}`);
    }

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
