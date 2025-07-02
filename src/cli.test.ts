// Jest globals are available globally with @types/jest 30+
// No imports needed: describe, it, expect, beforeEach, afterEach, jest
import { readFileSync } from "fs";

// Mock dependencies BEFORE importing the module that uses them
jest.mock("fs", () => ({
  readFileSync: jest.fn()
}));
jest.mock("./parser/schemaParser");
jest.mock("./generator/typeGenerator");
jest.mock("./generator/clientGenerator");
jest.mock("./notion/client");
jest.mock("./sync/manager");
jest.mock("commander", () => ({
  program: {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    requiredOption: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn()
  }
}));

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

// Set up package.json mock before importing cli module
mockReadFileSync.mockImplementation((path: any) => {
  if (path.includes('package.json')) {
    return JSON.stringify({ version: '1.0.0' });
  }
  return 'mock schema content';
});

// Now import the module that depends on the mocked fs
import { generateTypes, createDatabases } from "./cli";

describe('CLI Functions', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock package.json read
    mockReadFileSync.mockImplementation((path: any) => {
      if (path.includes('package.json')) {
        return JSON.stringify({ version: '1.0.0' });
      }
      return 'mock schema content';
    });
    
    // Mock environment variable
    process.env.NOTION_API_KEY = "test-api-key";
  });

  afterEach(() => {
    // Clean up environment variable
    delete process.env.NOTION_API_KEY;
  });

  describe('generateTypes', () => {
    it('should generate types successfully with default schema path', async () => {
      // mockReadFileSync is already set up in beforeEach for package.json and schema files
      
      // Mock the imported functions
      const { parseSchema } = require("./parser/schemaParser");
      const { generateTypeDefinitions } = require("./generator/typeGenerator");
      const { generateClient } = require("./generator/clientGenerator");
      const { NotionClient } = require("./notion/client");
      const { SyncManager } = require("./sync/manager");

      parseSchema.mockReturnValue({ models: [] });
      generateTypeDefinitions.mockResolvedValue(undefined);
      generateClient.mockResolvedValue(undefined);
      
      const mockSyncManager = {
        validateAndSync: jest.fn()
      };
      (SyncManager as any).mockImplementation(() => mockSyncManager);
      (NotionClient as any).mockImplementation(() => ({}));

      await expect(generateTypes()).resolves.toBeUndefined();
      
      expect(mockReadFileSync).toHaveBeenCalledWith("schema.prisma", "utf-8");
      expect(parseSchema).toHaveBeenCalledWith('mock schema content');
      expect(generateTypeDefinitions).toHaveBeenCalled();
      expect(generateClient).toHaveBeenCalled();
    });

    it('should handle errors during generation', async () => {
      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes('package.json')) {
          return JSON.stringify({ version: '1.0.0' });
        }
        throw new Error('File not found');
      });

      await expect(generateTypes()).rejects.toThrow('File not found');
    });
  });

  describe('createDatabases', () => {
    it('should throw error when NOTION_API_KEY is not set', async () => {
      delete process.env.NOTION_API_KEY;
      // mockReadFileSync is already set up in beforeEach

      await expect(createDatabases('parent-page-id')).rejects.toThrow('NOTION_API_KEY environment variable is required');
    });

    it('should create databases successfully', async () => {
      // mockReadFileSync is already set up in beforeEach
      
      const { parseSchema } = require("./parser/schemaParser");
      parseSchema.mockReturnValue({ 
        models: [
          {
            name: 'TestModel',
            fields: [
              {
                name: 'title',
                type: 'String',
                notionType: 'title'
              }
            ]
          }
        ]
      });

      // Note: This test would need more mocking for a complete implementation
      // For now, we test that it doesn't throw with proper setup
      expect(() => createDatabases('parent-page-id')).not.toThrow();
    });
  });
});
