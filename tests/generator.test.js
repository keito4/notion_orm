"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeGenerator_1 = require("../src/generator/typeGenerator");
const clientGenerator_1 = require("../src/generator/clientGenerator");

describe('Code Generator', () => {
  const mockSchema = {
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
    const result = await typeGenerator_1.generateTypeDefinitions(mockSchema);
    expect(result).toContain('export interface Test {');
    expect(result).toContain('title: string;');
    expect(result).toContain('description?: string;');
    expect(result).toContain('status?: string;');
  });

  test('should generate client code with proper settings', async () => {
    await expect(clientGenerator_1.generateClient(mockSchema)).resolves.not.toThrow();
  });

  test('should handle empty models array', async () => {
    const emptySchema = {
      models: [],
      output: {
        directory: './generated',
        clientFile: 'client.ts',
        typeDefinitionFile: 'types.ts'
      }
    };
    await expect(clientGenerator_1.generateClient(emptySchema)).resolves.not.toThrow();
  });

  test('should throw error for invalid schema structure', async () => {
    const invalidSchema = {
      models: [{
        name: 'Invalid',
        // Missing required fields
      }]
    };
    await expect(clientGenerator_1.generateClient(invalidSchema)).rejects.toThrow();
  });
});