export interface Schema {
    models: Model[];
}
export interface Model {
    name: string;
    fields: Field[];
    notionDatabaseId: string;
}
export interface Field {
    name: string;
    type: string;
    optional: boolean;
    attributes: string[];
}
