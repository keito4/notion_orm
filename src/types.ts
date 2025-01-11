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
  notionName?: string;
  type: string;
  notionType: string;
  isArray: boolean;
  optional: boolean;
  attributes: string[];
}
