export enum NotionPropertyTypes {
  Title = 'title',
  RichText = 'rich_text',
  Number = 'number',
  Select = 'select',
  MultiSelect = 'multi_select',
  Date = 'date',
  Checkbox = 'checkbox',
  URL = 'url',
  Email = 'email',
  PhoneNumber = 'phone_number',
  Files = 'files'
}

export interface NotionProperty {
  id: string;
  type: NotionPropertyTypes;
  name: string;
}

export interface NotionDatabase {
  id: string;
  title: Array<{
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
  }>;
  properties: Record<string, NotionProperty>;
}
