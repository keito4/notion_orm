// generateClient.ts

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { Schema } from "../types";
import { logger } from "../utils/logger";
import { NotionPropertyTypes } from "../types/notionTypes";

/**
 * この関数は:
 * - 各モデルの設定ファイルを `generated/models/ModelName.ts` に出力
 * - `generated/client.ts` を作成し、そこからモデル設定をインポートして
 *   QueryBuilder を初期化するコードを生成
 */
export async function generateClient(schema: Schema): Promise<void> {
  try {
    const outputDir = schema.output?.directory || "./generated";
    const clientFile = schema.output?.clientFile || "client.ts";
    const modelsDir = resolve(outputDir, "models");
    mkdirSync(modelsDir, { recursive: true }); // modelsフォルダを作成

    // ① 各モデル設定ファイルを出力
    for (const model of schema.models) {
      const filePath = resolve(modelsDir, `${model.name}.ts`);
      const modelSettingsCode = generateModelSettingsFile(model);
      writeFileSync(filePath, modelSettingsCode);
      logger.info(`Generated model settings for ${model.name}: ${filePath}`);
    }

    // ② client.ts を生成
    const clientCode = generateClientFile(schema);
    const outputPath = resolve(outputDir, clientFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, clientCode);

    logger.info(`Generated client code in ${outputPath}`);
  } catch (error) {
    logger.error("Error generating client:", error);
    throw error;
  }
}

/**
 * 各モデル設定ファイルのコードを生成
 */
function generateModelSettingsFile(model: any): string {
  // model.fields から "TypeScriptフィールド名" "Notionプロパティ名" "Notionプロパティタイプ" を設定
  // ここでは簡単に "notionName" があればそれを使い、なければ field.name を使う例にします。
  // type も仮で field.type を NotionPropertyTypes.xxx に直接変換するとします。
  // 実運用ではもっと精緻なマッピングが必要かもしれません。

  const propertyMappings: Record<string, string> = {};
  const propertyTypes: Record<string, string> = {};

  for (const field of model.fields) {
    const notionName = field.notionName || field.name;
    propertyMappings[field.name] = notionName;

    // Prisma type → NotionPropertyTypes の仮マッピング
    // ここでは既存の "field.type" をそのまま使う
    propertyTypes[field.name] = field.type;
  }

  // JSON文字列化
  const mappingsStr = JSON.stringify(propertyMappings, null, 2);
  const typesStr = JSON.stringify(propertyTypes, null, 2);

  return `import { NotionPropertyTypes } from "../../src/types/notionTypes";

export const ${model.name}ModelSettings = {
  notionDatabaseId: "${model.notionDatabaseId}",
  propertyMappings: ${mappingsStr},
  propertyTypes: {
    ${getNotionPropertyTypes(propertyTypes)}
  }
};
`;
}

function getNotionPropertyTypes(propertyTypes: Record<string, string>): string {
  return Object.entries(propertyTypes)
    .map(([key, value]) => `${key}: ${toNotionPropertyTypes(value)}`)
    .join(",\n    ");
}

function toNotionPropertyTypes(str: string): string {
  // rich_text -> RichText
  return (
    "NotionPropertyTypes." +
    str.replace(/^([a-z])|_([a-z])/g, (match, p1, p2) =>
      (p1 || p2).toUpperCase()
    )
  );
}

/**
 * `generated/client.ts` のコード生成
 */
function generateClientFile(schema: Schema): string {
  // modelsフォルダのファイルをインポートしてQueryBuilderに流す
  // 例: import { ObjectiveModelSettings } from "./models/Objective";
  const importLines = schema.models
    .map((m) => `import { ${m.name}ModelSettings } from "./models/${m.name}";`)
    .join("\n");

  // query${Model}() メソッドの実装を作る
  const queryMethods = schema.models
    .map((model) => {
      return `
  query${model.name}s(): QueryBuilder<${model.name}> {
    return new QueryBuilder<${model.name}>(
      this.notion,
      ${model.name}ModelSettings.notionDatabaseId,
      "${model.name}",
      {},
      { "${model.name}": ${model.name}ModelSettings.propertyMappings },
      { "${model.name}": ${model.name}ModelSettings.propertyTypes }
    );
  }
`;
    })
    .join("\n");

  return `
import { Client } from "@notionhq/client";
import { QueryBuilder } from "../src/query/builder";
import { ${schema.models.map((m) => m.name).join(", ")} } from "./${
    schema.output?.typeDefinitionFile?.replace(/\.ts$/, "") || "types"
  }";

${importLines}

export class NotionOrmClient {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  ${queryMethods}
}
`;
}
