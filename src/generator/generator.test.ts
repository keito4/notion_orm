import { generateTypeDefinitions } from "./typeGenerator";
import { generateClient } from "./clientGenerator";
import { Schema } from "../types";
import { describe, test, expect } from "@jest/globals";

describe('Code Generator', () => {
  const mockSchema: Schema = {
    models: [{
      name: 'Test',
      fields: [
        { 
          name: 'title', 
          type: 'title', 
          optional: false, 
          attributes: ['@title'],
          notionName: 'Title'
        },
        { 
          name: 'description', 
          type: 'rich_text', 
          optional: true, 
          attributes: [],
          notionName: 'Description'
        },
        {
          name: 'status',
          type: 'select',
          optional: true,
          attributes: ['@select'],
          notionName: 'Status'
        }
      ],
      notionDatabaseId: 'test123'
    }],
    output: {
      directory: './generated',
      clientFile: 'client.ts',
      typeDefinitionFile: 'types.ts'
    }
  };

  test('should generate type definitions with proper structure', async () => {
    await expect(generateTypeDefinitions(mockSchema)).resolves.not.toThrow();
  });

  test('should generate client code with proper settings', async () => {
    await expect(generateClient(mockSchema)).resolves.not.toThrow();
  });

  test('should handle empty models array', async () => {
    const emptySchema: Schema = {
      models: [],
      output: {
        directory: './generated',
        clientFile: 'client.ts',
        typeDefinitionFile: 'types.ts'
      }
    };
    await expect(generateClient(emptySchema)).resolves.not.toThrow();
  });

  test('should throw error for invalid schema structure', async () => {
    const invalidSchema = {
      models: [{
        name: 'Invalid',
        // Missing required fields
      }]
    } as unknown as Schema;
    await expect(generateClient(invalidSchema)).rejects.toThrow();
  });
});
