import { generateTypes } from "./cli";
import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { readFileSync } from "fs";
import { NotionClient } from "./notion/client";
import { SyncManager } from "./sync/manager";
import { logger } from "./utils/logger";

// Mock dependencies
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock("./notion/client");
jest.mock("./sync/manager");
jest.mock("./utils/logger");

describe("CLI", () => {
  const mockSchemaContent = `
    model User @notionDatabase("test-db-id") {
      name String @title
      email String
    }
  `;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Setup default mock implementations
    (readFileSync as jest.Mock).mockReturnValue(mockSchemaContent);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("should successfully generate types", async () => {
    await expect(generateTypes()).resolves.not.toThrow();

    expect(readFileSync).toHaveBeenCalledWith("schema.prisma", "utf-8");
    expect(NotionClient).toHaveBeenCalled();
    expect(SyncManager).toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith("Successfully generated types and client code");
  });

  test("should handle file read errors", async () => {
    (readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error("File not found");
    });

    await expect(generateTypes()).rejects.toThrow("File not found");
    expect(logger.error).toHaveBeenCalled();
  });

  test("should handle schema validation errors", async () => {
    (readFileSync as jest.Mock).mockReturnValue("invalid schema content");

    await expect(generateTypes()).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });

  test("should handle Notion API errors", async () => {
    const mockSyncManager = new SyncManager({} as NotionClient);
    (SyncManager as jest.Mock).mockImplementation(() => mockSyncManager);

    jest.spyOn(mockSyncManager, "validateAndSync").mockRejectedValue(
      new Error("Notion API Error")
    );

    await expect(generateTypes()).rejects.toThrow("Notion API Error");
    expect(logger.error).toHaveBeenCalled();
  });
});