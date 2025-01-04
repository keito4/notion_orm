"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateClient = generateClient;
const fs_1 = require("fs");
const logger_1 = require("../utils/logger");
const notionTypes_1 = require("../types/notionTypes");
const path_1 = require("path");
const fs_2 = require("fs");
async function generateClient(schema) {
    try {
        const outputDir = schema.output?.directory || './generated';
        const clientFile = schema.output?.clientFile || 'client.ts';
        const outputPath = (0, path_1.resolve)(outputDir, clientFile);
        // 出力ディレクトリの作成
        (0, fs_2.mkdirSync)((0, path_1.dirname)(outputPath), { recursive: true });
        const clientCode = generateClientCode(schema);
        (0, fs_1.writeFileSync)(outputPath, clientCode);
        logger_1.logger.info(`Generated client code in ${outputPath}`);
    }
    catch (error) {
        logger_1.logger.error('Error generating client:', error);
        throw error;
    }
}
function generateClientCode(schema) {
    const typeFile = schema.output?.typeDefinitionFile || 'types';
    return `
import { Client } from '@notionhq/client';
import { ${schema.models.map(m => m.name).join(', ')} } from './${typeFile.replace(/\.ts$/, '')}';
import { QueryBuilder } from '../query/builder';

export class NotionOrmClient {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  ${schema.models.map(model => `
  async get${model.name}(id: string): Promise<${model.name}> {
    const response = await this.notion.pages.retrieve({ page_id: id });
    return this.mapResponseTo${model.name}(response);
  }

  async list${model.name}s(): Promise<${model.name}[]> {
    const response = await this.notion.databases.query({
      database_id: "${model.notionDatabaseId}"
    });
    return response.results.map(page => this.mapResponseTo${model.name}(page));
  }

  query${model.name}s(): QueryBuilder<${model.name}> {
    return new QueryBuilder<${model.name}>(this.notion, "${model.notionDatabaseId}", "${model.name}");
  }

  private mapResponseTo${model.name}(page: any): ${model.name} {
    const props = page.properties;
    return {
      id: page.id,
      ${model.fields.map(field => {
        const propAccess = `props['${field.name}']`;
        return `${JSON.stringify(field.name)}: ${mapNotionResponseToProperty(field.type, propAccess)}`;
    }).join(',\n      ')},
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }
  `).join('\n')}
}
`;
}
function mapNotionResponseToProperty(type, propertyPath) {
    switch (type) {
        case notionTypes_1.NotionPropertyTypes.Title:
            return `${propertyPath}?.title?.[0]?.plain_text || ""`;
        case notionTypes_1.NotionPropertyTypes.RichText:
            return `${propertyPath}?.rich_text?.[0]?.plain_text || ""`;
        case notionTypes_1.NotionPropertyTypes.Number:
            return `${propertyPath}?.number || 0`;
        case notionTypes_1.NotionPropertyTypes.Select:
            return `${propertyPath}?.select?.name || ""`;
        case notionTypes_1.NotionPropertyTypes.MultiSelect:
            return `${propertyPath}?.multi_select?.map((item: any) => item.name) || []`;
        case notionTypes_1.NotionPropertyTypes.Date:
            return `${propertyPath}?.date?.start || null`;
        case notionTypes_1.NotionPropertyTypes.Checkbox:
            return `${propertyPath}?.checkbox || false`;
        case notionTypes_1.NotionPropertyTypes.People:
            return `${propertyPath}?.people?.map((user: any) => ({
        id: user.id,
        name: user.name || "",
        avatar_url: user.avatar_url
      })) || []`;
        case notionTypes_1.NotionPropertyTypes.Relation:
            return `${propertyPath}?.relation?.map((item: any) => ({ id: item.id })) || []`;
        case notionTypes_1.NotionPropertyTypes.Formula:
            return `${propertyPath}?.formula?.string || ${propertyPath}?.formula?.number?.toString() || ""`;
        default:
            logger_1.logger.warn(`Unsupported Notion property type: ${type}, using default string conversion`);
            return `String(${propertyPath} || "")`;
    }
}
