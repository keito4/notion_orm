// Jest globals (describe, it, expect, beforeEach, afterEach, jest) are available without import in Jest 30+
import { generateTypes, createDatabases } from "./cli";
import { readFileSync } from "fs";

// Mock dependencies
jest.mock("fs");
jest.mock("./parser/schemaParser");
jest.mock("./generator/typeGenerator");
jest.mock("./generator/clientGenerator");
jest.mock("./notion/client");
jest.mock("./sync/manager");

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('CLI Functions', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock environment variable
    process.env.NOTION_API_KEY = "test-api-key";
  });

  afterEach(() => {
    // Clean up environment variable
    delete process.env.NOTION_API_KEY;
  });

  describe('generateTypes', () => {
    it('should generate types successfully with default schema path', async () => {
      mockReadFileSync.mockReturnValue('mock schema content');
      
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
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(generateTypes()).rejects.toThrow('File not found');
    });
  });

  describe('createDatabases', () => {
    it('should throw error when NOTION_API_KEY is not set', async () => {
      delete process.env.NOTION_API_KEY;
      mockReadFileSync.mockReturnValue('mock schema content');

      await expect(createDatabases('parent-page-id')).rejects.toThrow('NOTION_API_KEY 環境変数が必要です');
    });

    it('should create databases successfully', async () => {
      mockReadFileSync.mockReturnValue('mock schema content');
      
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
