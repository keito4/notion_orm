import { Schema, Model, Field } from '../types';
import { logger } from '../utils/logger';
import { NotionPropertyTypes } from '../types/notionTypes';

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
  private static readonly TITLE_ATTRIBUTE = 'title';
  private static readonly CHECKBOX_ATTRIBUTE = 'checkbox';
  private static readonly DATE_ATTRIBUTE = 'date';
  private static readonly PEOPLE_ATTRIBUTE = 'people';
  private static readonly SELECT_ATTRIBUTE = 'select';
  private static readonly MULTI_SELECT_ATTRIBUTE = 'multiSelect';
  private static readonly RELATION_ATTRIBUTE = 'relation';
  private static readonly FORMULA_ATTRIBUTE = 'formula';
  private static readonly RICH_TEXT_ATTRIBUTE = 'richText';

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
      attributes.push(attrValue ? `${attrName}("${attrValue}")` : attrName);
    }

    // フィールドの作成
    const field: Field = {
      name,
      type: this.mapPrismaTypeToNotionType(type, attributes),
      optional,
      attributes
    };

    if (notionMapping) {
      field.notionName = notionMapping;
    }

    return field;
  }

  private static mapPrismaTypeToNotionType(type: string, attributes: string[]): string {
    // 属性ベースのマッピング
    const hasAttribute = (attr: string) => attributes.some(a => a.startsWith(attr));

    if (hasAttribute(this.TITLE_ATTRIBUTE)) {
      return NotionPropertyTypes.Title;
    }
    if (hasAttribute(this.CHECKBOX_ATTRIBUTE)) {
      return NotionPropertyTypes.Checkbox;
    }
    if (hasAttribute(this.DATE_ATTRIBUTE)) {
      return NotionPropertyTypes.Date;
    }
    if (hasAttribute(this.PEOPLE_ATTRIBUTE)) {
      return NotionPropertyTypes.People;
    }
    if (hasAttribute(this.SELECT_ATTRIBUTE)) {
      return NotionPropertyTypes.Select;
    }
    if (hasAttribute(this.MULTI_SELECT_ATTRIBUTE)) {
      return NotionPropertyTypes.MultiSelect;
    }
    if (hasAttribute(this.RELATION_ATTRIBUTE)) {
      return NotionPropertyTypes.Relation;
    }
    if (hasAttribute(this.FORMULA_ATTRIBUTE)) {
      return NotionPropertyTypes.Formula;
    }
    if (hasAttribute(this.RICH_TEXT_ATTRIBUTE)) {
      return NotionPropertyTypes.RichText;
    }

    // 型ベースのデフォルトマッピング
    switch (type.toLowerCase()) {
      case 'string':
        return NotionPropertyTypes.RichText;
      case 'boolean':
        return NotionPropertyTypes.Checkbox;
      case 'datetime':
        return NotionPropertyTypes.Date;
      case 'json':
        return NotionPropertyTypes.People;
      case 'string[]':
        return NotionPropertyTypes.MultiSelect;
      default:
        logger.warn(`Unknown Prisma type: ${type}, defaulting to rich_text`);
        return NotionPropertyTypes.RichText;
    }
  }
}