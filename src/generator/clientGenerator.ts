import { writeFileSync } from 'fs';
import { Schema } from '../types';
import { logger } from '../utils/logger';
import { NotionPropertyTypes } from '../types/notionTypes';
import { resolve, dirname } from 'path';
import { mkdirSync } from 'fs';
import { QueryBuilder } from '../query/builder';

interface NotionPropertyValue {
  id: string;
  type: string;
  [key: string]: any;
}

interface NotionPage {
  id: string;
  properties: Record<string, NotionPropertyValue>;
  created_time: string;
  last_edited_time: string;
}

interface NotionUser {
  id: string;
  name?: string;
  avatar_url?: string;
}

interface NotionRelation {
  id: string;
}

export async function generateClient(schema: Schema): Promise<void> {
  try {
    const outputDir = schema.output?.directory || './generated';
    const clientFile = schema.output?.clientFile || 'client.ts';
    const outputPath = resolve(outputDir, clientFile);

    // 出力ディレクトリの作成
    mkdirSync(dirname(outputPath), { recursive: true });

    const clientCode = generateClientCode(schema);
    writeFileSync(outputPath, clientCode);

    logger.info(`Generated client code in ${outputPath}`);
  } catch (error) {
    logger.error('Error generating client:', error);
    throw error;
  }
}

function generateClientCode(schema: Schema): string {
  const typeFile = schema.output?.typeDefinitionFile || 'types';

  return `
import { Client } from '@notionhq/client';
import { ${schema.models.map(m => m.name).join(', ')} } from './${typeFile.replace(/\.ts$/, '')}';
import { QueryBuilder } from '../query/builder';

interface NotionPropertyValue {
  id: string;
  type: string;
  [key: string]: any;
}

interface NotionPage {
  id: string;
  properties: Record<string, NotionPropertyValue>;
  created_time: string;
  last_edited_time: string;
}

interface NotionUser {
  id: string;
  name?: string;
  avatar_url?: string;
}

interface NotionRelation {
  id: string;
}

export class NotionOrmClient {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  ${schema.models.map(model => `
  async get${model.name}(id: string): Promise<${model.name}> {
    const response = await this.notion.pages.retrieve({ page_id: id }) as NotionPage;
    return this.mapResponseTo${model.name}(response);
  }

  async list${model.name}s(): Promise<${model.name}[]> {
    const response = await this.notion.databases.query({
      database_id: "${model.notionDatabaseId}"
    });
    return response.results.map(page => this.mapResponseTo${model.name}(page as NotionPage));
  }

  query${model.name}s(): QueryBuilder<${model.name}> {
    return new QueryBuilder<${model.name}>(this.notion, "${model.notionDatabaseId}", "${model.name}");
  }

  private mapResponseTo${model.name}(response: NotionPage): ${model.name} {
    const props = response.properties;
    return {
      id: response.id,
      ${model.fields.map(field => {
        const propAccess = `props['${field.name}']`;
        return `${JSON.stringify(field.name)}: ${mapNotionResponseToProperty(field.type, propAccess)}`;
      }).join(',\n      ')},
      createdTime: response.created_time,
      lastEditedTime: response.last_edited_time
    };
  }
  `).join('\n')}
}
`;
}

function mapNotionResponseToProperty(type: string, propertyPath: string): string {
  switch (type) {
    case NotionPropertyTypes.Title:
      return `${propertyPath}?.title?.[0]?.plain_text || ""`;
    case NotionPropertyTypes.RichText:
      return `${propertyPath}?.rich_text?.[0]?.plain_text || ""`;
    case NotionPropertyTypes.Number:
      return `${propertyPath}?.number || 0`;
    case NotionPropertyTypes.Select:
      return `${propertyPath}?.select?.name || ""`;
    case NotionPropertyTypes.MultiSelect:
      return `${propertyPath}?.multi_select?.map((item: { name: string }) => item.name) || []`;
    case NotionPropertyTypes.Date:
      return `${propertyPath}?.date?.start || null`;
    case NotionPropertyTypes.Checkbox:
      return `${propertyPath}?.checkbox || false`;
    case NotionPropertyTypes.People:
      return `${propertyPath}?.people?.map((user: NotionUser) => ({
        id: user.id,
        name: user.name || "",
        avatar_url: user.avatar_url
      })) || []`;
    case NotionPropertyTypes.Relation:
      return `${propertyPath}?.relation?.map((item: NotionRelation) => ({ id: item.id })) || []`;
    case NotionPropertyTypes.Formula:
      return `${propertyPath}?.formula?.string || ${propertyPath}?.formula?.number?.toString() || ""`;
    default:
      logger.warn(`Unsupported Notion property type: ${type}, using default string conversion`);
      return `String(${propertyPath} || "")`;
  }
}