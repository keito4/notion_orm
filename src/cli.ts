#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { parseSchema } from "./parser/schemaParser";
import { generateTypeDefinitions } from "./generator/typeGenerator";
import { generateClient } from "./generator/clientGenerator";
import { generateDatabaseProperties } from "./generator/databaseGenerator";
import { generatePrismaSchema } from "./generator/prismaGenerator";
import { NotionClient } from "./notion/client";
import { SyncManager } from "./sync/manager";
import { logger } from "./utils/logger";
import { t } from "./utils/i18n";
import { program } from "commander";
import { Client } from "@notionhq/client";
import { QueryBuilder } from "./query/builder";
import { NotionPropertyTypes } from "./types/notionTypes";
import { InitCommand } from "./commands/init";

// Try multiple paths to find package.json
const possiblePaths = [
  resolve(__dirname, "../package.json"),
  resolve(__dirname, "../../package.json"),
  resolve(process.cwd(), "package.json")
];

let packageJson: any;
let version: string = "1.0.0"; // Default fallback version

for (const path of possiblePaths) {
  try {
    if (existsSync(path)) {
      packageJson = JSON.parse(readFileSync(path, "utf-8"));
      version = packageJson.version;
      break;
    }
  } catch {
    // Continue to next path
  }
}

export async function generateTypes(filePath: string = "schema.prisma"): Promise<void> {
  try {
    logger.banner("Type Generation", "Generating TypeScript types from Notion schema");
    
    const steps = [
      t('cli.loading_schema', { filePath }),
      t('cli.parsing_schema'),
      t('cli.initializing_notion_client'),
      t('cli.validating_sync'),
      t('cli.generating_types'),
      t('cli.generating_client')
    ];

    logger.progress(steps[0]);
    const schemaContent = readFileSync(filePath, "utf-8");

    logger.progress(steps[1]);
    const schema = parseSchema(schemaContent);

    logger.progress(steps[2]);
    const notionClient = new NotionClient();

    logger.progress(steps[3]);
    const syncManager = new SyncManager(notionClient);
    await syncManager.validateAndSync(schema);

    logger.progress(steps[4]);
    await generateTypeDefinitions(schema);

    logger.progress(steps[5]);
    await generateClient(schema);

    logger.success(t('cli.generation_success'), 
      `Generated types for ${schema.models.length} models`);
  } catch (error) {
    logger.error(t('errors.generation_failed'), error);
    throw error;
  }
}

export async function createDatabases(parentPageId: string, schemaPath: string = "schema.prisma", outputPath: string = "output.prisma"): Promise<void> {
  try {
    logger.info(t('cli.loading_schema_file', { schemaPath }));
    const schemaContent = readFileSync(schemaPath, "utf-8");

    logger.info(t('cli.parsing_schema'));
    const schema = parseSchema(schemaContent);

    logger.info(t('cli.initializing_client'));
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error(t('errors.api_key_required'));
    }
    const notionClient = new Client({
      auth: apiKey,
      notionVersion: "2022-06-28",
    });

    logger.info(t('cli.creating_databases'));
    const createdDatabases = new Map<string, string>();

    const modelsWithoutRelations = schema.models.filter(
      model => !model.fields.some(f => f.notionType === NotionPropertyTypes.Relation)
    );

    for (const model of modelsWithoutRelations) {
      logger.info(t('cli.creating_model_database', { modelName: model.name }));

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

      logger.success(t('cli.database_created', { modelName: model.name, databaseId: response.id }));
    }

    const modelsWithRelations = schema.models.filter(
      model => model.fields.some(f => f.notionType === NotionPropertyTypes.Relation)
    );

    for (const model of modelsWithRelations) {
      logger.info(t('cli.creating_model_database', { modelName: model.name }));

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

      logger.success(t('cli.database_created', { modelName: model.name, databaseId: response.id }));

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
            logger.info(t('cli.field_mapped', { fieldName: propertyName, targetModelName }));
          }
        }

        if (Object.keys(updates).length > 0) {
          await notionClient.databases.update({
            database_id: response.id,
            properties: updates
          });
          logger.success(t('cli.updating_relations', { modelName: model.name }));
        }
      }
    }


    logger.info(t('cli.generating_output_file'));

    const originalSchema = readFileSync(schemaPath, "utf-8");

    let outputSchema = originalSchema;

    for (const model of schema.models) {
      const databaseId = createdDatabases.get(model.name);
      if (databaseId) {
        const modelRegex = new RegExp(`model\\s+${model.name}\\s+{[^}]*}`, "s");

        const attrRegex = new RegExp(`// id: ${databaseId}`, "g");
        const modelMatch = outputSchema.match(modelRegex);

        if (modelMatch) {
          let modelDef = modelMatch[0];

          if (modelDef.match(attrRegex)) {
            modelDef = modelDef.replace(attrRegex, `// id: ${databaseId}`);
          } else {
            const modelNameLine = new RegExp(`model\\s+${model.name}\\s+{`, "");
            modelDef = modelDef.replace(modelNameLine, `$& \n// id: ${databaseId.replace("-", "")}`);
          }

          outputSchema = outputSchema.replace(modelRegex, modelDef);
        }
      }
    }

    const { writeFileSync } = require("fs");
    writeFileSync(outputPath, outputSchema, "utf-8");

    logger.success(t('cli.output_file_generated', { outputPath }));
    logger.success(t('cli.all_databases_created'));
  } catch (error) {
    logger.error(t('errors.database_creation_failed'), error);
    throw error;
  }
}

program
  .name("notion-orm")
  .description(
    "Notion ORM CLI tool for managing database schemas and generating TypeScript types"
  )
  .version(version);

program
  .command("init")
  .description(t('commands.init.description'))
  .option("-f, --force", t('commands.init.force_option'))
  .action(async (options) => {
    try {
      const initCommand = new InitCommand();
      await initCommand.execute(options);
    } catch (error) {
      logger.error(t('init.error'), error);
      typeof process !== 'undefined' && process.exit(1);
    }
  });

program
  .command("generate")
  .description(t('commands.generate.description'))
  .option("-s, --schema <path>", t('commands.generate.schema_option'), "schema.prisma")
  .action(async (options) => {
    try {
      await generateTypes(options.schema);
      logger.success(t('cli.generation_success'));
    } catch (error) {
      logger.error(t('errors.generation_failed'), error);
      typeof process !== 'undefined' && process.exit(1);
    }
  });

program
  .command("create-databases")
  .description(t('commands.create_databases.description'))
  .requiredOption("-p, --parent <id>", t('commands.create_databases.parent_option'))
  .option("-s, --schema <path>", t('commands.create_databases.schema_option'), "schema.prisma")
  .option("-o, --output <path>", t('commands.create_databases.output_option'), "output.prisma")
  .action(async (options) => {
    try {
      await createDatabases(options.parent, options.schema, options.output);
      logger.success(t('cli.all_databases_created'));
    } catch (error) {
      logger.error(t('errors.database_creation_failed'), error);
      typeof process !== 'undefined' && process.exit(1);
    }
  });

program
  .command("export")
  .description(t('commands.export.description'))
  .option("-s, --schema <path>", t('commands.export.schema_option'), "schema.prisma")
  .action(async (options) => {
    try {
      logger.info(t('cli.loading_schema', { filePath: options.schema }));
      const schemaContent = readFileSync(options.schema, "utf-8");

      logger.info(t('cli.parsing_schema'));
      const schema = parseSchema(schemaContent);

      logger.info(t('cli.generating_prisma_schema'));
      await generatePrismaSchema(schema);

      logger.success(t('cli.prisma_schema_success'));
    } catch (error) {
      logger.error(t('errors.prisma_export_failed'), error);
      typeof process !== 'undefined' && process.exit(1);
    }
  });

// Only parse arguments if this script is being run directly (not imported in tests)
if (require.main === module) {
  program.parse();
}
