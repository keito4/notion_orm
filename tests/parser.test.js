"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schemaParser_1 = require("../src/parser/schemaParser");

describe('Schema Parser', () => {
  test('should parse valid schema with complete model definition', () => {
    const schema = `
      model User @notionDatabase("abc123") {
        name String
        age Number?
        isActive Boolean
        createdAt DateTime
      }
    `;
    const result = (0, schemaParser_1.parseSchema)(schema);
    expect(result.models).toHaveLength(1);
    expect(result.models[0].name).toBe('User');
    expect(result.models[0].notionDatabaseId).toBe('abc123');
    expect(result.models[0].fields).toHaveLength(4);

    // Verify each field's type mapping
    const fields = result.models[0].fields;
    expect(fields[0].type).toBe('rich_text');
    expect(fields[1].type).toBe('number');
    expect(fields[2].type).toBe('checkbox');
    expect(fields[3].type).toBe('date');
  });

  test('should handle optional fields and array types correctly', () => {
    const schema = `
      model Post @notionDatabase("def456") {
        title String @title
        tags String[]
        relatedPosts Number[] @relation
        publishDate DateTime?
      }
    `;
    const result = (0, schemaParser_1.parseSchema)(schema);
    const fields = result.models[0].fields;

    expect(fields[0].type).toBe('title');
    expect(fields[0].optional).toBe(false);
    expect(fields[1].type).toBe('multi_select');
    expect(fields[2].type).toBe('relation');
    expect(fields[3].type).toBe('date');
    expect(fields[3].optional).toBe(true);
  });

  test('should handle Japanese field names with proper escaping', () => {
    const schema = `
      model Task @notionDatabase("task123") {
        "タイトル" String @title
        "説明文" String @rich_text
        "完了フラグ" Boolean
      }
    `;
    const result = (0, schemaParser_1.parseSchema)(schema);
    const fields = result.models[0].fields;

    expect(fields[0].name).toBe('タイトル');
    expect(fields[1].name).toBe('説明文');
    expect(fields[2].name).toBe('完了フラグ');
  });

  test('should handle all valid Notion property types', () => {
    const schema = `
      model Properties @notionDatabase("props123") {
        title String @title
        text String @rich_text
        number Number
        select String @select
        multiSelect String[] @multi_select
        date DateTime
        checkbox Boolean
        url String
        email String
        phone String
        formula String @formula
        relation String[] @relation
        rollup String @formula
        createdTime DateTime
        createdBy String @people
        lastEditedTime DateTime
        lastEditedBy String @people
        files String[]
      }
    `;
    const result = (0, schemaParser_1.parseSchema)(schema);
    expect(result.models[0].fields).toHaveLength(18);
  });

  test('should throw error for invalid model declaration', () => {
    const invalidSchema = `
      model InvalidModel {
        field String
      }
    `;
    expect(() => (0, schemaParser_1.parseSchema)(invalidSchema)).toThrowError(
      /Invalid model declaration/
    );
  });

  test('should throw error for invalid field type', () => {
    const invalidSchema = `
      model Test @notionDatabase("test123") {
        field UnknownType
      }
    `;
    expect(() => (0, schemaParser_1.parseSchema)(invalidSchema)).toThrowError(
      /Invalid field type/
    );
  });

  test('should throw error for duplicate field names', () => {
    const invalidSchema = `
      model Test @notionDatabase("test123") {
        field String
        field Number
      }
    `;
    expect(() => (0, schemaParser_1.parseSchema)(invalidSchema)).toThrowError(
      /Duplicate field name/
    );
  });
});