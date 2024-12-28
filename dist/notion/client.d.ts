import { Schema } from '../types';
import { NotionDatabase } from '../types/notionTypes';
export declare class NotionClient {
    private client;
    constructor();
    validateSchema(schema: Schema): Promise<void>;
    private validateDatabaseSchema;
    getDatabaseSchema(databaseId: string): Promise<NotionDatabase>;
    private getPropertyOptions;
    private convertToNotionProperty;
}
