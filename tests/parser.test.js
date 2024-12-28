"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schemaParser_1 = require("../src/parser/schemaParser");
describe('Schema Parser', () => {
    test('should parse valid schema', () => {
        const schema = `
      model User @notionDatabase("abc123") {
        name String
        age Number?
        isActive Boolean
      }
    `;
        const result = (0, schemaParser_1.parseSchema)(schema);
        expect(result.models).toHaveLength(1);
        expect(result.models[0].name).toBe('User');
        expect(result.models[0].notionDatabaseId).toBe('abc123');
        expect(result.models[0].fields).toHaveLength(3);
    });
    test('should handle optional fields', () => {
        const schema = `
      model Post @notionDatabase("def456") {
        title String
        content String?
      }
    `;
        const result = (0, schemaParser_1.parseSchema)(schema);
        expect(result.models[0].fields[1].optional).toBe(true);
    });
});
