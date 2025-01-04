export enum NotionPropertyTypes {
  Title = "title",
  RichText = "rich_text",
  Number = "number",
  Select = "select",
  MultiSelect = "multi_select",
  Date = "date",
  Checkbox = "checkbox",
  URL = "url",
  Email = "email",
  PhoneNumber = "phone_number",
  Files = "files",
  People = "people",
  Relation = "relation",
  Formula = "formula",
  Rollup = "rollup",
  CreatedTime = "created_time",
  CreatedBy = "created_by",
  LastEditedTime = "last_edited_time",
  LastEditedBy = "last_edited_by",
}

export interface NotionProperty {
  id: string;
  type: NotionPropertyTypes;
  name: string;
}

export interface NotionSelectOption {
  id: string;
  name: string;
  color: string;
}

export interface NotionSelectProperty extends NotionProperty {
  type: NotionPropertyTypes.Select;
  select: {
    options: NotionSelectOption[];
  };
}

export interface NotionMultiSelectProperty extends NotionProperty {
  type: NotionPropertyTypes.MultiSelect;
  multi_select: {
    options: NotionSelectOption[];
  };
}

export interface NotionTitleProperty extends NotionProperty {
  type: NotionPropertyTypes.Title;
  title: {};
}

export interface NotionRichTextProperty extends NotionProperty {
  type: NotionPropertyTypes.RichText;
  rich_text: {};
}

export interface NotionNumberProperty extends NotionProperty {
  type: NotionPropertyTypes.Number;
  number: {
    format?: "number" | "percent" | "dollar" | "euro";
  };
}

export interface NotionDateProperty extends NotionProperty {
  type: NotionPropertyTypes.Date;
  date: {};
}

export interface NotionCheckboxProperty extends NotionProperty {
  type: NotionPropertyTypes.Checkbox;
  checkbox: {};
}

export interface NotionPeopleProperty extends NotionProperty {
  type: NotionPropertyTypes.People;
  people: {};
}

export interface NotionRelationProperty extends NotionProperty {
  type: NotionPropertyTypes.Relation;
  relation: {
    database_id: string;
  };
}

export interface NotionFormulaProperty extends NotionProperty {
  type: NotionPropertyTypes.Formula;
  formula: {
    expression: string;
  };
}

export type NotionDatabaseProperty =
  | NotionTitleProperty
  | NotionRichTextProperty
  | NotionNumberProperty
  | NotionSelectProperty
  | NotionMultiSelectProperty
  | NotionDateProperty
  | NotionCheckboxProperty
  | NotionPeopleProperty
  | NotionRelationProperty
  | NotionFormulaProperty;

export interface NotionDatabase {
  id: string;
  properties: Record<string, NotionDatabaseProperty>;
}

export interface NotionRichTextObject {
  type: string;
  text: {
    content: string;
    link: string | null;
  };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text: string;
  href: string | null;
}
