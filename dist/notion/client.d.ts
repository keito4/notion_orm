import { Schema } from '../types';
import { NotionDatabase } from '../types/notionTypes';
export declare class NotionClient {
    private client;
    private isInitialized;
    constructor();
    private retryOperation;
    validateConnection(): Promise<boolean>;
    validateSchema(schema: Schema): Promise<void>;
    private validateDatabaseExists;
    getDatabaseSchema(databaseId: string): Promise<NotionDatabase>;
    private validateDatabaseSchema;
    private getPropertyOptions;
    private convertToNotionProperty;
}
