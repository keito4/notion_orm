#!/usr/bin/env node
import { program } from 'commander';
import { generateTypes } from './cli';
import { logger } from './utils/logger';

program
  .name('notion-orm')
  .description('Notion ORM CLI tool for managing database schemas and generating TypeScript types')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate TypeScript types and client from schema')
  .action(async () => {
    try {
      await generateTypes();
      logger.success('Successfully generated types and client');
    } catch (error) {
      logger.error('Failed to generate types:', error);
      process.exit(1);
    }
  });

program.parse();
