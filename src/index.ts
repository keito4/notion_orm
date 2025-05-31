// Core functionality
export { parseSchema } from "./parser/schemaParser";
export { generateTypeDefinitions } from "./generator/typeGenerator";
export { generateClient } from "./generator/clientGenerator";
export { generateDatabaseProperties } from "./generator/databaseGenerator";

// Query and client
export { QueryBuilder } from "./query/builder";
export { NotionClient } from "./notion/client";

// Types
export { NotionPropertyTypes } from "./types/notionTypes";
export type { Model, Schema, Field } from "./types";

// Utilities
export { logger } from "./utils/logger";
export { SyncManager } from "./sync/manager";

// CLI functions (for programmatic use)
export { generateTypes, createDatabases } from "./cli";
