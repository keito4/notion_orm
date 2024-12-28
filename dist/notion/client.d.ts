import { Schema } from '../types';
export declare class NotionClient {
    private client;
    constructor();
    validateSchema(schema: Schema): Promise<void>;
    private validateDatabaseSchema;
    private getMappedName;
    private findPropertyCaseInsensitive;
    getDatabaseSchema(databaseId: string): Promise<any>;
}
