"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateClient = generateClient;
const fs_1 = require("fs");
const logger_1 = require("../utils/logger");
async function generateClient(schema) {
    try {
        const clientCode = generateClientCode(schema);
        (0, fs_1.writeFileSync)('./generated/client.ts', clientCode);
    }
    catch (error) {
        logger_1.logger.error('Error generating client:', error);
        throw error;
    }
}
function generateClientCode(schema) {
    return `
import { Client } from '@notionhq/client';
import { ${schema.models.map(m => m.name).join(', ')} } from './models';

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

  private mapResponseTo${model.name}(response: any): ${model.name} {
    return {
      ${model.fields.map(field => `
        ${field.name}: response.properties.${field.name}?.${mapNotionTypeToProperty(field.type)}
      `).join(',\n')}
    };
  }
  `).join('\n')}
}
`;
}
function mapNotionTypeToProperty(notionType) {
    const propertyMap = {
        'title': 'title[0]?.plain_text || ""',
        'rich_text': 'rich_text[0]?.plain_text || ""',
        'number': 'number',
        'select': 'select?.name || ""',
        'multi_select': 'multi_select.map(item => item.name)',
        'date': 'date?.start || null',
        'checkbox': 'checkbox',
    };
    return propertyMap[notionType] || 'any';
}
