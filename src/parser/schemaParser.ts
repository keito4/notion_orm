import { Schema, Model, Field } from '../types';
import { logger } from '../utils/logger';

export function parseSchema(content: string): Schema {
  try {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const models: Model[] = [];
    let currentModel: Model | null = null;
    let inModelBlock = false;

    for (const line of lines) {
      if (line.startsWith('model')) {
        // Handle model declaration
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
        // End of model block
        if (currentModel) {
          models.push(currentModel);
        }
        currentModel = null;
        inModelBlock = false;
      } else if (inModelBlock && currentModel) {
        // Handle field declaration
        const fieldMatch = line.match(/(\w+)\s+(\w+)(\?)?\s*((@\w+|\@map\("[^"]+"\))*)/);
        if (fieldMatch) {
          const [_, name, type, optional, attributesStr] = fieldMatch;

          // Extract all attributes
          const attributes: string[] = [];
          if (attributesStr) {
            const attrMatches = attributesStr.match(/@\w+|\@map\("[^"]+"\)/g);
            if (attrMatches) {
              attributes.push(...attrMatches);
            }
          }

          // Check if field has specific attributes
          const isTitle = attributes.includes('@title');
          const isCheckbox = attributes.includes('@checkbox');

          // Get mapped name if present
          const mapMatch = attributes.find(attr => attr.startsWith('@map('))?.match(/@map\("([^"]+)"\)/);
          const mappedName = mapMatch ? mapMatch[1] : name;

          currentModel.fields.push({
            name,
            type: mapTypeToNotion(type, { isTitle, isCheckbox }),
            optional: Boolean(optional),
            attributes
          });
        }
      }
    }

    // Handle last model if exists
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

function mapTypeToNotion(type: string, options: { isTitle: boolean; isCheckbox: boolean }): string {
  const { isTitle, isCheckbox } = options;

  // If field is marked with @title, always use 'title' type
  if (isTitle) {
    return 'title';
  }

  // If field is marked with @checkbox, use 'checkbox' type
  if (isCheckbox) {
    return 'checkbox';
  }

  const typeMap: Record<string, string> = {
    'String': 'rich_text',
    'Number': 'number',
    'Boolean': 'checkbox',
    'Date': 'date',
    'Select': 'select',
    'MultiSelect': 'multi_select',
    'People': 'people'
  };

  const mappedType = typeMap[type.replace('?', '')];
  if (!mappedType) {
    logger.warn(`Unknown type mapping for: ${type}, using as-is`);
    return type.toLowerCase();
  }

  return mappedType;
}