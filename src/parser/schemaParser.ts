import { Schema, Model, Field } from '../types';
import { logger } from '../utils/logger';

export function parseSchema(content: string): Schema {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    const models: Model[] = [];
    let currentModel: Model | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('model')) {
        if (currentModel) {
          models.push(currentModel);
        }
        currentModel = {
          name: trimmedLine.split(' ')[1],
          fields: [],
          notionDatabaseId: extractNotionDatabaseId(trimmedLine)
        };
      } else if (trimmedLine.match(/^\w+\s+\w+(\?)?(\s+@\w+)?$/)) {
        if (currentModel) {
          const [name, type, ...attributes] = trimmedLine.split(/\s+/);
          currentModel.fields.push({
            name,
            type: mapTypeToNotion(type),
            optional: type.endsWith('?'),
            attributes: attributes.filter(attr => attr.startsWith('@'))
          });
        }
      }
    }

    if (currentModel) {
      models.push(currentModel);
    }

    return { models };
  } catch (error) {
    logger.error('Error parsing schema:', error);
    throw error;
  }
}

function extractNotionDatabaseId(line: string): string {
  const match = line.match(/@notionDatabase\("([^"]+)"\)/);
  return match ? match[1] : '';
}

function mapTypeToNotion(type: string): string {
  const typeMap: Record<string, string> = {
    'String': 'rich_text',
    'Number': 'number',
    'Boolean': 'checkbox',
    'Date': 'date',
    'Select': 'select',
    'MultiSelect': 'multi_select',
    'Title': 'title'
  };
  
  return typeMap[type.replace('?', '')] || type;
}
