#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const cli_1 = require("./cli");
const logger_1 = require("./utils/logger");
commander_1.program
    .name('notion-orm')
    .description('Notion ORM CLI tool for managing database schemas and generating TypeScript types')
    .version('1.0.0');
commander_1.program
    .command('generate')
    .description('Generate TypeScript types and client from schema')
    .action(async () => {
    try {
        await (0, cli_1.generateTypes)();
        logger_1.logger.success('Successfully generated types and client');
    }
    catch (error) {
        logger_1.logger.error('Failed to generate types:', error);
        process.exit(1);
    }
});
commander_1.program.parse();
