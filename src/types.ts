import { NotionPropertyTypes } from "./types/notionTypes";

// Supported TypeScript types for fields
export type SupportedType = 
  | 'String' 
  | 'Number' 
  | 'Boolean' 
  | 'DateTime' 
  | 'Json';

// Notion property type union - use the actual enum values
export type NotionPropertyType = NotionPropertyTypes;

// Valid field attributes
export type FieldAttribute = 
  | '@id'
  | '@title'
  | '@checkbox'
  | '@formula'
  | '@relation'
  | '@multi_select'
  | '@select'
  | '@people'
  | '@date'
  | '@rich_text'
  | '@number'
  | '@createdTime'
  | '@createdBy'
  | '@lastEditedTime'
  | '@lastEditedBy'
  | `@map(${string})`;

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

export interface Field<T extends SupportedType = SupportedType> {
  name: string;
  notionName?: string;
  type: T;
  notionType: NotionPropertyType;
  isArray: boolean;
  optional: boolean;
  attributes: readonly FieldAttribute[];
}

// Type-specific field interfaces for better type safety
export interface StringField extends Field<'String'> {
  type: 'String';
  notionType: NotionPropertyTypes.Title | NotionPropertyTypes.RichText;
}

export interface NumberField extends Field<'Number'> {
  type: 'Number';
  notionType: NotionPropertyTypes.Number;
}

export interface BooleanField extends Field<'Boolean'> {
  type: 'Boolean';
  notionType: NotionPropertyTypes.Checkbox;
}

export interface DateTimeField extends Field<'DateTime'> {
  type: 'DateTime';
  notionType: NotionPropertyTypes.Date | NotionPropertyTypes.CreatedTime | NotionPropertyTypes.LastEditedTime;
}

export interface JsonField extends Field<'Json'> {
  type: 'Json';
  notionType: NotionPropertyTypes.RichText | NotionPropertyTypes.Formula;
}

// Union type for all possible field types
export type TypedField = StringField | NumberField | BooleanField | DateTimeField | JsonField;

// Type guards for field types
export function isStringField(field: Field): field is StringField {
  return field.type === 'String';
}

export function isNumberField(field: Field): field is NumberField {
  return field.type === 'Number';
}

export function isBooleanField(field: Field): field is BooleanField {
  return field.type === 'Boolean';
}

export function isDateTimeField(field: Field): field is DateTimeField {
  return field.type === 'DateTime';
}

export function isJsonField(field: Field): field is JsonField {
  return field.type === 'Json';
}
