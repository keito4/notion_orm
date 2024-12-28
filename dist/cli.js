"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTypes = generateTypes;
const fs_1 = require("fs");
const parser_1 = require("./parser");
const typeGenerator_1 = require("./generator/typeGenerator");
const clientGenerator_1 = require("./generator/clientGenerator");
const client_1 = require("./notion/client");
const logger_1 = require("./utils/logger");
async function generateTypes() {
    try {
        // Read schema file
        const schemaContent = (0, fs_1.readFileSync)('schema.prisma', 'utf-8');
        // Parse schema
        const schema = (0, parser_1.parseSchema)(schemaContent);
        // Initialize Notion client
        const notionClient = new client_1.NotionClient();
        // Validate schema against Notion database
        await notionClient.validateSchema(schema);
        // Generate TypeScript types
        await (0, typeGenerator_1.generateTypeDefinitions)(schema);
        // Generate client code
        await (0, clientGenerator_1.generateClient)(schema);
    }
    catch (error) {
        logger_1.logger.error('Error generating types:', error);
        throw error;
    }
}
