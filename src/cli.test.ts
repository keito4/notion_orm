// Jest globals are available without import in this setup
import { generateTypes, createDatabases } from "./cli";
import { readFileSync } from "fs";

// Mock dependencies
jest.mock("fs");
jest.mock("./parser/schemaParser");
jest.mock("./generator/typeGenerator");
jest.mock("./generator/clientGenerator");
jest.mock("./notion/client");
jest.mock("./sync/manager");
jest.mock("@notionhq/client");

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
    // Clear all mocks and timers
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
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

      await expect(createDatabases('parent-page-id')).rejects.toThrow('NOTION_API_KEY environment variable is required');
    });

    it('should create databases successfully', async () => {
      mockReadFileSync.mockReturnValue('mock schema content');
      
      const { parseSchema } = require("./parser/schemaParser");
      const { Client } = require("@notionhq/client");
      
      // Mock the Notion client
      const mockNotionClientInstance = {
        databases: {
          create: jest.fn().mockResolvedValue({ id: 'test-db-id' }),
          update: jest.fn().mockResolvedValue({ id: 'test-db-id' })
        }
      };
      
      (Client as any).mockImplementation(() => mockNotionClientInstance);
      
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

      // Mock writeFileSync
      const fs = require('fs');
      fs.writeFileSync = jest.fn();

      // This is an async function, so we need to await it
      await expect(createDatabases('parent-page-id')).resolves.toBeUndefined();
      
      // Verify that the database creation was attempted
      expect(mockNotionClientInstance.databases.create).toHaveBeenCalled();
      
      // Verify the output file was written
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'output.prisma',
        expect.any(String),
        'utf-8'
      );
    });
  });
});
