import { Schema, Model, Field } from '../types';
import { logger } from '../utils/logger';

interface PrismaModel {
  name: string;
  fields: PrismaField[];
  notionDatabaseId?: string;
}

interface PrismaField {
  name: string;
  type: string;
  optional: boolean;
  attributes: string[];
  notionMapping?: string;
}

export class SchemaParser {
  private static readonly DATABASE_ATTRIBUTE = 'notionDatabase';
  private static readonly MAP_ATTRIBUTE = 'map';

  static parse(schemaContent: string): Schema {
    try {
      logger.debug('Starting schema parsing...');
      const models = this.parseModels(schemaContent);
      return { models };
    } catch (error) {
      logger.error('Error parsing schema:', error);
      throw new Error(`Failed to parse schema: ${error}`);
    }
  }

  private static parseModels(content: string): Model[] {
    const modelRegex = /model\s+(\w+)\s+@notionDatabase\("([^"]+)"\)\s*{([^}]+)}/g;
    const models: Model[] = [];
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const [_, name, databaseId, fieldsContent] = match;
      const fields = this.parseFields(fieldsContent.trim());
      
      models.push({
        name,
        fields,
        notionDatabaseId: databaseId
      });
    }

    return models;
  }

  private static parseFields(fieldsContent: string): Field[] {
    const fieldRegex = /(\w+)\s+([^\s@]+)(\??)\s*(@[^@]+)?/g;
    const fields: Field[] = [];
    let match;

    while ((match = fieldRegex.exec(fieldsContent)) !== null) {
      const [_, name, type, optional, attributes] = match;
      const parsedField = this.parseField(name, type, optional === '?', attributes || '');
      fields.push(parsedField);
    }

    return fields;
  }

  private static parseField(
    name: string,
    type: string,
    optional: boolean,
    attributesStr: string
  ): Field {
    const attributes: string[] = [];
    let notionMapping: string | undefined;

    // 属性の解析
    const attrRegex = /@(\w+)(?:\("([^"]+)"\))?/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
      const [_, attrName, attrValue] = attrMatch;
      if (attrName === this.MAP_ATTRIBUTE && attrValue) {
        notionMapping = attrValue;
      }
      attributes.push(attrName + (attrValue ? `("${attrValue}")` : ''));
    }

    // フィールドの作成
    const field: Field = {
      name,
      type: this.mapPrismaTypeToNotionType(type),
      optional,
      attributes
    };

    if (notionMapping) {
      field.notionName = notionMapping;
    }

    return field;
  }

  private static mapPrismaTypeToNotionType(prismaType: string): string {
    switch (prismaType.toLowerCase()) {
      case 'string':
        return 'rich_text';
      case 'boolean':
        return 'checkbox';
      case 'datetime':
        return 'date';
      case 'json':
        return 'people';
      case 'string[]':
        return 'multi_select';
      default:
        return prismaType.toLowerCase();
    }
  }
}
