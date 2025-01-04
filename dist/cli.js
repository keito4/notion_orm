"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTypes = generateTypes;
const fs_1 = require("fs");
const schema_1 = require("./parser/schema");
const typeGenerator_1 = require("./generator/typeGenerator");
const clientGenerator_1 = require("./generator/clientGenerator");
const client_1 = require("./notion/client");
const manager_1 = require("./sync/manager");
const logger_1 = require("./utils/logger");
async function generateTypes() {
    try {
        // スキーマファイルの読み込み
        logger_1.logger.info('Reading schema file...');
        const schemaContent = (0, fs_1.readFileSync)('schema.prisma', 'utf-8');
        // スキーマの解析
        logger_1.logger.info('Parsing schema...');
        const schema = schema_1.SchemaParser.parse(schemaContent);
        // Notionクライアントの初期化
        logger_1.logger.info('Initializing Notion client...');
        const notionClient = new client_1.NotionClient();
        // 同期マネージャーの初期化と実行
        logger_1.logger.info('Validating and syncing schema with Notion...');
        const syncManager = new manager_1.SyncManager(notionClient);
        await syncManager.validateAndSync(schema);
        // TypeScript型定義の生成
        logger_1.logger.info('Generating TypeScript type definitions...');
        await (0, typeGenerator_1.generateTypeDefinitions)(schema);
        // クライアントコードの生成
        logger_1.logger.info('Generating client code...');
        await (0, clientGenerator_1.generateClient)(schema);
        logger_1.logger.success('Successfully generated types and client code');
    }
    catch (error) {
        logger_1.logger.error('Error generating types:', error);
        throw error;
    }
}
