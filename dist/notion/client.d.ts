import { Schema } from '../types';
import type { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';
export declare class NotionClient {
    private client;
    constructor();
    validateSchema(schema: Schema): Promise<void>;
    private validateDatabaseSchema;
    private findPropertyByName;
    getDatabaseSchema(databaseId: string): Promise<DatabaseObjectResponse>;
    private getPropertyOptions;
}
