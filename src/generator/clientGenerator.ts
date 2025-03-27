import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { Model, Schema, Field } from "../types";
import { logger } from "../utils/logger";

export async function generateClient(schema: Schema): Promise<void> {
  try {
    if (!schema.models || !Array.isArray(schema.models)) {
      throw new Error("Invalid schema: models array is required");
    }
    for (const model of schema.models) {
      if (!model.fields || !Array.isArray(model.fields)) {
        throw new Error("Invalid schema: model fields are required");
      }
    }

    const outputDir = schema.output?.directory || "./generated";
    const clientFile = schema.output?.clientFile || "client.ts";
    const typeFile = schema.output?.typeDefinitionFile || "types.ts";

    mkdirSync(outputDir, { recursive: true });

    const typeDefinitions = generateTypeDefinitions(schema);
    const typesPath = resolve(outputDir, typeFile);
    writeFileSync(typesPath, typeDefinitions);

    const clientCode = generateClientCode(schema);
    const clientPath = resolve(outputDir, clientFile);
    writeFileSync(clientPath, clientCode);

    generateModelSettingsFiles(schema, outputDir);

    logger.info(`Generated client code in ${clientPath}`);
  } catch (error) {
    logger.error("Error generating client:", error);
    throw error;
  }
}

function generateTypeDefinitions(schema: Schema): string {
  return `
import { NotionPropertyTypes } from "notionmodelsync";
${schema.models
  .map(
    (model) => `
export interface ${model.name} {
  id: string;
  ${model.fields
    .map((field) => {
      const typeStr = getFieldTsType(field, schema);
      return `${field.name}${field.optional ? "?" : ""}: ${typeStr};`;
    })
    .join("\n  ")}
  createdTime: string;
  lastEditedTime: string;
}

export interface ${model.name}Input {
  ${model.fields
    .map((field) => {
      const typeStr = getFieldTsType(field, schema);
      return `${field.name}${field.optional ? "?" : ""}: ${typeStr};`;
    })
    .join("\n  ")}
}
`
  )
  .join("\n")}
`.trim();
}

function getFieldTsType(field: Field, schema: Schema): string {
  const modelNames = schema.models.map((m) => m.name);
  let baseType = field.type;
  if (modelNames.includes(field.type)) {
    baseType = field.type;
  } else {
    switch (field.type) {
      case "String":
        baseType = "string";
        break;
      case "Boolean":
        baseType = "boolean";
        break;
      case "Number":
        baseType = "number";
        break;
      case "Json":
        baseType = "any";
        break;
      case "DateTime":
        baseType = "string";
        break;
      default:
        baseType = "string";
        break;
    }
  }
  if (field.isArray) {
    baseType += "[]";
  }
  return baseType;
}

function generateClientCode(schema: Schema): string {
  const typeFile = schema.output?.typeDefinitionFile || "types.ts";
  const importsForModels = schema.models
    .map(
      (m) =>
        `import { ${m.name}ModelSettings } from "./models/${m.name}ModelSettings";`
    )
    .join("\n");

  const relationMappings = buildRelationMappings(schema);
  const relationMappingsString = objectToTsLiteral(relationMappings);

  const relationModels = buildRelationModels(schema);
  const relationModelsString = objectToTsLiteral(relationModels);

  const propertyMappingsString = buildPropertyMappingsString(schema);
  const propertyTypesString = buildPropertyTypesString(schema);

  return `
import { Client } from "@notionhq/client";
import { NotionPropertyTypes, QueryBuilder } from "notionmodelsync";
import { ${schema.models
    .map((m) => m.name)
    .join(", ")} } from "./${typeFile.replace(/\.ts$/, "")}";
${importsForModels}

export class NotionOrmClient {
  private notion: Client;
  private relationMappings: Record<string, Record<string, string>> = ${relationMappingsString};
  private relationModels: Record<string, Record<string, string>> = ${relationModelsString};
  private propertyMappings: Record<string, Record<string, string>> = ${propertyMappingsString};
  private propertyTypes: Record<string, Record<string, NotionPropertyTypes>> = ${propertyTypesString};

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
    this.initializeSelectOptions();
  }

  private async initializeSelectOptions(): Promise<void> {
    try {
      for (const modelName of Object.keys(this.propertyMappings)) {
        const databaseId = this.findDatabaseIdForModel(modelName);
        if (databaseId) {
          await this.initializeModelSelectOptions(databaseId, modelName);
        }
      }
    } catch (error) {
      console.error("セレクトオプション初期化中にエラーが発生しました:", error);
    }
  }

  private findDatabaseIdForModel(modelName: string): string | undefined {
    for (const model of Object.keys(this.relationMappings)) {
      if (model === modelName) {
        return this.findModelSettings(modelName)?.notionDatabaseId;
      }
    }
    return undefined;
  }

  private findModelSettings(modelName: string): any {
    try {
      return eval(modelName + "ModelSettings");
    } catch (error) {
      console.error("モデル設定の取得に失敗しました: " + modelName, error);
      return null;
    }
  }

  private async initializeModelSelectOptions(databaseId: string, modelName: string): Promise<void> {
    const modelSettings = this.findModelSettings(modelName);
    if (!modelSettings || !modelSettings.selectOptions) return;

    for (const [fieldName, options] of Object.entries(modelSettings.selectOptions)) {
      const propertyType = this.propertyTypes[modelName][fieldName];
      
      if (
        propertyType === NotionPropertyTypes.Select || 
        propertyType === NotionPropertyTypes.MultiSelect
      ) {
        try {
          const qb = new QueryBuilder(
            this.notion,
            databaseId,
            modelName,
            this.relationMappings,
            this.propertyMappings,
            this.propertyTypes,
            this.relationModels
          );
          
          await qb.addSelectOptions(fieldName, options);
          console.log(modelName + "." + fieldName + "のセレクトオプションを初期化しました");
        } catch (error) {
          console.error(modelName + "." + fieldName + "のセレクトオプション初期化中にエラー:", error);
        }
      }
    }
  }

  ${schema.models
    .map((model) => {
      return `
  query${model.name}(): QueryBuilder<${model.name}> {
    return new QueryBuilder<${model.name}>(
      this.notion,
      "${model.notionDatabaseId}",
      "${model.name}",
      this.relationMappings,
      this.propertyMappings,
      this.propertyTypes,
      this.relationModels
    );
  }
`;
    })
    .join("\n")}
}
`.trim();
}

function buildRelationMappings(
  schema: Schema
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const model of schema.models) {
    result[model.name] = {};
    const relationFields = model.fields.filter(
      (f) => f.notionType.toLowerCase() === "relation"
    );
    for (const field of relationFields) {
      const relatedModel = findRelatedModel(schema, field.type);
      if (relatedModel) {
        result[model.name][field.name] = relatedModel.notionDatabaseId;
      }
    }
  }
  return result;
}

function buildRelationModels(
  schema: Schema
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const model of schema.models) {
    result[model.name] = {};
    const relationFields = model.fields.filter(
      (f) => f.notionType.toLowerCase() === "relation"
    );
    for (const field of relationFields) {
      const relatedModel = findRelatedModel(schema, field.type);
      if (relatedModel) {
        result[model.name][field.name] = relatedModel.name;
      }
    }
  }
  return result;
}

function buildPropertyMappingsString(schema: Schema): string {
  let result = "{\n";
  for (const model of schema.models) {
    result += `  "${model.name}": ${model.name}ModelSettings.propertyMappings,\n`;
  }
  result += "}";
  return result;
}

function buildPropertyTypesString(schema: Schema): string {
  let result = "{\n";
  for (const model of schema.models) {
    result += `  "${model.name}": ${model.name}ModelSettings.propertyTypes,\n`;
  }
  result += "}";
  return result;
}

function findRelatedModel(schema: Schema, typeName: string): Model | undefined {
  return schema.models.find((m) => m.name === typeName);
}

function objectToTsLiteral(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

function generateModelSettingsFiles(schema: Schema, outputDir: string): void {
  const modelsDir = resolve(outputDir, "models");
  mkdirSync(modelsDir, { recursive: true });
  for (const model of schema.models) {
    const settingsCode = generateModelSettingsCode(model);
    const fileName = `${model.name}ModelSettings.ts`;
    const filePath = resolve(modelsDir, fileName);
    writeFileSync(filePath, settingsCode);
  }
}

function generateModelSettingsCode(model: Model): string {
  return `
import { NotionPropertyTypes } from "notionmodelsync";

export const ${model.name}ModelSettings = {
  notionDatabaseId: "${model.notionDatabaseId}",
  propertyMappings: {
    id: "id",
    ${model.fields
      .map((field) => `${field.name}: "${field.notionName}"`)
      .join(",\n    ")}
  },
  propertyTypes: {
    id: NotionPropertyTypes.Id,
    ${model.fields
      .map(
        (field) => `${field.name}: ${getNotionPropertyEnum(field.notionType)}`
      )
      .join(",\n    ")}
  },
  ${model.fields.some(field => field.selectOptions && field.selectOptions.length > 0) ? `selectOptions: {
    ${model.fields
      .filter(field => field.selectOptions && field.selectOptions.length > 0)
      .map(field => `${field.name}: ${JSON.stringify(field.selectOptions)}`)
      .join(",\n    ")}
  },` : ''}
};
`.trim();
}

function getNotionPropertyEnum(type: string): string {
  switch (type.toLowerCase()) {
    case "title":
      return "NotionPropertyTypes.Title";
    case "id":
      return "NotionPropertyTypes.Id";
    case "rich_text":
    case "text":
      return "NotionPropertyTypes.RichText";
    case "select":
      return "NotionPropertyTypes.Select";
    case "number":
      return "NotionPropertyTypes.Number";
    case "multi_select":
      return "NotionPropertyTypes.MultiSelect";
    case "date":
    case "datetime":
      return "NotionPropertyTypes.Date";
    case "checkbox":
    case "boolean":
      return "NotionPropertyTypes.Checkbox";
    case "people":
      return "NotionPropertyTypes.People";
    case "relation":
      return "NotionPropertyTypes.Relation";
    case "formula":
      return "NotionPropertyTypes.Formula";
    case "rollup":
      return "NotionPropertyTypes.Rollup";
    case "files":
      return "NotionPropertyTypes.Files";
    default:
      return "NotionPropertyTypes.RichText";
  }
}
