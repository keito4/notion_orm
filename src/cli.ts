import { readFileSync } from "fs";
import { parseSchema } from "./parser/schemaParser";
import { generateTypeDefinitions } from "./generator/typeGenerator";
import { generateClient } from "./generator/clientGenerator";
import { NotionClient } from "./notion/client";
import { SyncManager } from "./sync/manager";
import { logger } from "./utils/logger";

export async function generateTypes(): Promise<void> {
  try {
    logger.info("Reading schema file...");
    const schemaContent = readFileSync("schema.prisma", "utf-8");
    logger.info(schemaContent);

    logger.info("Parsing schema...");
    const schema = parseSchema(schemaContent);
    logger.info("Parsed schema:", JSON.stringify(schema));

    logger.info("Initializing Notion client...");
    const notionClient = new NotionClient();

    logger.info("Validating and syncing schema with Notion...");
    const syncManager = new SyncManager(notionClient);
    await syncManager.validateAndSync(schema);

    // スキーマオブジェクトが上書きされず、ここでも元の内容を利用できる
    logger.info("Schema after validation and sync:", JSON.stringify(schema));

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
