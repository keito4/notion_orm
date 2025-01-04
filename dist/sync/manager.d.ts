import { Schema } from '../types';
import { NotionClient } from '../notion/client';
export declare class SyncManager {
    private notionClient;
    constructor(notionClient: NotionClient);
    validateAndSync(schema: Schema): Promise<void>;
    private syncModel;
    private findMissingFields;
    private validateFieldTypes;
    private mapModelTypeToNotionType;
}
