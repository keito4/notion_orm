import { Schema } from '../types';
export declare class SchemaParser {
    private static readonly DATABASE_ATTRIBUTE;
    private static readonly MAP_ATTRIBUTE;
    static parse(schemaContent: string): Schema;
    private static parseModels;
    private static parseFields;
    private static parseField;
    private static mapPrismaTypeToNotionType;
}
