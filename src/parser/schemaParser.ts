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
        const fieldMatch = line.match(/(\w+)\s+(\w+)(\?)?\s*(@\w+)?/);
        if (fieldMatch) {
          const [_, name, type, optional, attribute] = fieldMatch;
          currentModel.fields.push({
            name,
            type: mapTypeToNotion(type),
            optional: Boolean(optional),
            attributes: attribute ? [attribute] : []
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

function extractNotionDatabaseId(line: string): string {
  const match = line.match(/@notionDatabase\("([^"]+)"\)/);
  return match ? match[1] : '';
}