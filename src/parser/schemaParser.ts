import { Schema, Model, Field } from '../types';
import { NotionPropertyTypes } from '../types/notionTypes';
import { logger } from '../utils/logger';

export function parseSchema(content: string): Schema {
  try {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const models: Model[] = [];
    let currentModel: Model | null = null;
    let inModelBlock = false;

    for (const line of lines) {
      if (line.startsWith('model')) {
        const modelMatch = line.match(/model\s+(\w+)\s*@notionDatabase\("([^"]+)"\)/);
        if (!modelMatch) {
          throw new Error(`Invalid model declaration: ${line}`);
        }

        currentModel = {
          name: modelMatch[1],
          fields: [],
          notionDatabaseId: modelMatch[2]
        };
        inModelBlock = true;
      } else if (line === '}' && inModelBlock) {
        if (currentModel) {
          models.push(currentModel);
        }
        currentModel = null;
        inModelBlock = false;
      } else if (inModelBlock && currentModel) {
        // Handle fields with double quotes
        const fieldMatch = line.match(/(?:"[^"]+"|[\w]+)\s+(\w+)(\[\])?(\?)?\s*((@\w+|\@map\([^)]+\))*)/);
        if (fieldMatch) {
          const fieldName = line.match(/^(?:"([^"]+)"|(\w+))/);
          const name = fieldName ? (fieldName[1] || fieldName[2]) : '';
          const [_, type, isArray, optional, attributesStr] = fieldMatch;

          // Extract all attributes
          const attributes: string[] = [];
          if (attributesStr) {
            const attrMatches = attributesStr.match(/@\w+|\@map\([^)]+\)/g);
            if (attrMatches) {
              attributes.push(...attrMatches);
            }
          }

          // Get mapped name if present
          const mapMatch = attributes.find(attr => attr.startsWith('@map('))?.match(/@map\(([^)]+)\)/);
          const mappedName = mapMatch ? mapMatch[1].replace(/['"]/g, '') : name;

          logger.info(`Field ${name} mapped to "${mappedName}"`);

          const notionType = mapTypeToNotion(type, isArray, attributes);

          currentModel.fields.push({
            name: mappedName,
            type: notionType,
            optional: Boolean(optional),
            attributes
          });
        }
      }
    }

    if (currentModel && inModelBlock) {
      models.push(currentModel);
    }

    if (models.length === 0) {
      throw new Error('No valid models found in schema');
    }

    return { models };
  } catch (error) {
    logger.error('Error parsing schema:', error);
    throw error;
  }
}

function mapTypeToNotion(type: string, isArray: string | undefined, attributes: string[]): string {
  // Check special attributes first
  if (attributes.includes('@title')) {
    return NotionPropertyTypes.Title;
  }
  if (attributes.includes('@checkbox')) {
    return NotionPropertyTypes.Checkbox;
  }
  if (attributes.includes('@formula')) {
    return NotionPropertyTypes.Formula;
  }
  if (attributes.includes('@relation') || isArray) {
    return NotionPropertyTypes.Relation;
  }
  if (attributes.includes('@people')) {
    return NotionPropertyTypes.People;
  }
  if (attributes.includes('@date')) {
    return NotionPropertyTypes.Date;
  }

  // Map basic types
  const typeMap: Record<string, NotionPropertyTypes> = {
    'String': NotionPropertyTypes.RichText,
    'Number': NotionPropertyTypes.Number,
    'Boolean': NotionPropertyTypes.Checkbox,
    'Json': NotionPropertyTypes.RichText,
  };

  const mappedType = typeMap[type];
  if (!mappedType) {
    logger.warn(`Unknown type mapping for: ${type}, using RichText as default`);
    return NotionPropertyTypes.RichText;
  }

  return mappedType;
}