import { readFileSync } from 'fs';
import { SchemaParser } from './parser/schema';
import { generateTypeDefinitions } from './generator/typeGenerator';
import { generateClient } from './generator/clientGenerator';
import { NotionClient } from './notion/client';
import { SyncManager } from './sync/manager';
import { logger } from './utils/logger';

export async function generateTypes(): Promise<void> {
  try {
    // スキーマファイルの読み込み
    logger.info('Reading schema file...');
    const schemaContent = readFileSync('schema.prisma', 'utf-8');

    // スキーマの解析
    logger.info('Parsing schema...');
    const schema = SchemaParser.parse(schemaContent);

    // Notionクライアントの初期化
    logger.info('Initializing Notion client...');
    const notionClient = new NotionClient();

    // 同期マネージャーの初期化と実行
    logger.info('Validating and syncing schema with Notion...');
    const syncManager = new SyncManager(notionClient);
    await syncManager.validateAndSync(schema);

    // TypeScript型定義の生成
    logger.info('Generating TypeScript type definitions...');
    await generateTypeDefinitions(schema);

    // クライアントコードの生成
    logger.info('Generating client code...');
    await generateClient(schema);

    logger.success('Successfully generated types and client code');
  } catch (error) {
    logger.error('Error generating types:', error);
    throw error;
  }
}