import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { Schema, Model, Field } from "../types";
import { logger } from "../utils/logger";

/**
 * Generate a new Prisma schema file with database IDs as comments
 */
export async function generatePrismaSchema(schema: Schema): Promise<void> {
  try {
    if (!schema.models || !Array.isArray(schema.models)) {
      throw new Error("Invalid schema: models array is required");
    }

    const outputDir = schema.output?.directory || "./";
    const outputFile = "output.prisma";
    const outputPath = resolve(outputDir, outputFile);

    mkdirSync(outputDir, { recursive: true });

    const schemaContent = generateSchemaContent(schema);
    writeFileSync(outputPath, schemaContent);

    logger.info(`Generated Prisma schema in ${outputPath}`);
  } catch (error) {
    logger.error("Error generating Prisma schema:", error);
    throw error;
  }
}

/**
 * Generate the content for the output.prisma file
 */
function generateSchemaContent(schema: Schema): string {
  const generatorBlock = `generator client {
  provider = "notion-orm"
  output   = "./src/generated"
  types    = "notionTypes.ts"
  client   = "notionClient.ts"
}

`;

  const modelBlocks = schema.models
    .map((model) => generateModelBlock(model))
    .join("\n\n");

  return generatorBlock + modelBlocks;
}

/**
 * Generate a model block with database ID as a comment
 */
function generateModelBlock(model: Model): string {
  const modelName = model.name;
  const databaseId = model.notionDatabaseId;
  
  const fieldDefinitions = model.fields
    .map((field) => generateFieldDefinition(field))
    .join("\n  ");

  return `model ${modelName} {
  // id: ${databaseId}
  ${fieldDefinitions}
}`;
}

/**
 * Generate a field definition
 */
function generateFieldDefinition(field: Field): string {
  const { name, type, isArray, optional, attributes } = field;
  
  let typeStr = type;
  if (isArray) {
    typeStr += "[]";
  }
  if (optional) {
    typeStr += "?";
  }
  
  const attributesStr = attributes.join(" ");
  
  return `${name}${optional ? "?" : ""}  ${typeStr}  ${attributesStr}`;
}
