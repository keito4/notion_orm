export interface Schema {
    models: Model[];
    output?: OutputConfig;
}
export interface OutputConfig {
    directory?: string;
    typeDefinitionFile?: string;
    clientFile?: string;
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
    notionName?: string;
}
