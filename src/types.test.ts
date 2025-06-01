import { 
  SupportedType, 
  NotionPropertyType, 
  FieldAttribute, 
  Field, 
  StringField, 
  NumberField, 
  BooleanField, 
  DateTimeField, 
  JsonField,
  isStringField,
  isNumberField,
  isBooleanField,
  isDateTimeField,
  isJsonField
} from './types';
import { NotionPropertyTypes } from './types/notionTypes';

describe('Type Safety Improvements', () => {
  describe('SupportedType', () => {
    it('should only allow valid supported types', () => {
      const validTypes: SupportedType[] = ['String', 'Number', 'Boolean', 'DateTime', 'Json'];
      expect(validTypes).toHaveLength(5);
      
      // This would cause a TypeScript error if uncommented:
      // const invalidType: SupportedType = 'InvalidType';
    });
  });

  describe('NotionPropertyType', () => {
    it('should only allow valid notion property types', () => {
      const validNotionTypes: NotionPropertyType[] = [
        NotionPropertyTypes.Id, NotionPropertyTypes.Title, NotionPropertyTypes.RichText, 
        NotionPropertyTypes.Number, NotionPropertyTypes.Select, NotionPropertyTypes.MultiSelect, 
        NotionPropertyTypes.Date, NotionPropertyTypes.Checkbox, NotionPropertyTypes.People, 
        NotionPropertyTypes.Relation, NotionPropertyTypes.Formula
      ];
      
      expect(validNotionTypes.length).toBeGreaterThan(0);
    });
  });

  describe('FieldAttribute', () => {
    it('should only allow valid field attributes', () => {
      const validAttributes: FieldAttribute[] = [
        '@id', '@title', '@checkbox', '@formula', '@relation', 
        '@multi_select', '@select', '@people', '@date', '@rich_text', 
        '@number', '@createdTime', '@createdBy', '@map(fieldName)'
      ];
      
      expect(validAttributes.length).toBeGreaterThan(0);
    });
  });

  describe('Field interface with generics', () => {
    it('should enforce type constraints on Field interface', () => {
      const stringField: Field<'String'> = {
        name: 'title',
        type: 'String',
        notionType: NotionPropertyTypes.Title,
        isArray: false,
        optional: false,
        attributes: ['@title'] as const
      };

      expect(stringField.type).toBe('String');
      expect(stringField.notionType).toBe(NotionPropertyTypes.Title);
    });
  });

  describe('Type-specific field interfaces', () => {
    it('should create proper StringField', () => {
      const stringField: StringField = {
        name: 'title',
        type: 'String',
        notionType: NotionPropertyTypes.Title,
        isArray: false,
        optional: false,
        attributes: ['@title'] as const
      };

      expect(stringField.type).toBe('String');
      expect([NotionPropertyTypes.Title, NotionPropertyTypes.RichText]).toContain(stringField.notionType);
    });

    it('should create proper NumberField', () => {
      const numberField: NumberField = {
        name: 'price',
        type: 'Number',
        notionType: NotionPropertyTypes.Number,
        isArray: false,
        optional: false,
        attributes: ['@number'] as const
      };

      expect(numberField.type).toBe('Number');
      expect(numberField.notionType).toBe(NotionPropertyTypes.Number);
    });

    it('should create proper BooleanField', () => {
      const booleanField: BooleanField = {
        name: 'isActive',
        type: 'Boolean',
        notionType: NotionPropertyTypes.Checkbox,
        isArray: false,
        optional: false,
        attributes: ['@checkbox'] as const
      };

      expect(booleanField.type).toBe('Boolean');
      expect(booleanField.notionType).toBe(NotionPropertyTypes.Checkbox);
    });

    it('should create proper DateTimeField', () => {
      const dateField: DateTimeField = {
        name: 'createdAt',
        type: 'DateTime',
        notionType: NotionPropertyTypes.Date,
        isArray: false,
        optional: false,
        attributes: ['@date'] as const
      };

      expect(dateField.type).toBe('DateTime');
      expect([NotionPropertyTypes.Date, NotionPropertyTypes.CreatedTime, NotionPropertyTypes.LastEditedTime]).toContain(dateField.notionType);
    });

    it('should create proper JsonField', () => {
      const jsonField: JsonField = {
        name: 'metadata',
        type: 'Json',
        notionType: NotionPropertyTypes.RichText,
        isArray: false,
        optional: false,
        attributes: ['@rich_text'] as const
      };

      expect(jsonField.type).toBe('Json');
      expect([NotionPropertyTypes.RichText, NotionPropertyTypes.Formula]).toContain(jsonField.notionType);
    });
  });

  describe('Type guards', () => {
    const stringField: Field = {
      name: 'title',
      type: 'String',
      notionType: NotionPropertyTypes.Title,
      isArray: false,
      optional: false,
      attributes: ['@title'] as const
    };

    const numberField: Field = {
      name: 'price',
      type: 'Number',
      notionType: NotionPropertyTypes.Number,
      isArray: false,
      optional: false,
      attributes: ['@number'] as const
    };

    const booleanField: Field = {
      name: 'isActive',
      type: 'Boolean',
      notionType: NotionPropertyTypes.Checkbox,
      isArray: false,
      optional: false,
      attributes: ['@checkbox'] as const
    };

    const dateField: Field = {
      name: 'createdAt',
      type: 'DateTime',
      notionType: NotionPropertyTypes.Date,
      isArray: false,
      optional: false,
      attributes: ['@date'] as const
    };

    const jsonField: Field = {
      name: 'metadata',
      type: 'Json',
      notionType: NotionPropertyTypes.RichText,
      isArray: false,
      optional: false,
      attributes: ['@rich_text'] as const
    };

    it('should correctly identify string fields', () => {
      expect(isStringField(stringField)).toBe(true);
      expect(isStringField(numberField)).toBe(false);
      expect(isStringField(booleanField)).toBe(false);
      expect(isStringField(dateField)).toBe(false);
      expect(isStringField(jsonField)).toBe(false);
    });

    it('should correctly identify number fields', () => {
      expect(isNumberField(stringField)).toBe(false);
      expect(isNumberField(numberField)).toBe(true);
      expect(isNumberField(booleanField)).toBe(false);
      expect(isNumberField(dateField)).toBe(false);
      expect(isNumberField(jsonField)).toBe(false);
    });

    it('should correctly identify boolean fields', () => {
      expect(isBooleanField(stringField)).toBe(false);
      expect(isBooleanField(numberField)).toBe(false);
      expect(isBooleanField(booleanField)).toBe(true);
      expect(isBooleanField(dateField)).toBe(false);
      expect(isBooleanField(jsonField)).toBe(false);
    });

    it('should correctly identify datetime fields', () => {
      expect(isDateTimeField(stringField)).toBe(false);
      expect(isDateTimeField(numberField)).toBe(false);
      expect(isDateTimeField(booleanField)).toBe(false);
      expect(isDateTimeField(dateField)).toBe(true);
      expect(isDateTimeField(jsonField)).toBe(false);
    });

    it('should correctly identify json fields', () => {
      expect(isJsonField(stringField)).toBe(false);
      expect(isJsonField(numberField)).toBe(false);
      expect(isJsonField(booleanField)).toBe(false);
      expect(isJsonField(dateField)).toBe(false);
      expect(isJsonField(jsonField)).toBe(true);
    });
  });

  describe('Readonly attributes', () => {
    it('should enforce readonly attributes array', () => {
      const field: Field = {
        name: 'title',
        type: 'String',
        notionType: NotionPropertyTypes.Title,
        isArray: false,
        optional: false,
        attributes: ['@title'] as const
      };

      // This would cause a TypeScript error if uncommented:
      // field.attributes.push('@id');
      
      expect(field.attributes).toEqual(['@title']);
    });
  });
});