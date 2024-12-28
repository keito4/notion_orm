"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeGenerator_1 = require("../src/generator/typeGenerator");
const clientGenerator_1 = require("../src/generator/clientGenerator");
describe('Code Generator', () => {
    const mockSchema = {
        models: [{
                name: 'Test',
                fields: [
                    { name: 'title', type: 'title', optional: false, attributes: [] },
                    { name: 'description', type: 'rich_text', optional: true, attributes: [] }
                ],
                notionDatabaseId: 'test123'
            }]
    };
    test('should generate type definitions', async () => {
        await expect((0, typeGenerator_1.generateTypeDefinitions)(mockSchema)).resolves.not.toThrow();
    });
    test('should generate client code', async () => {
        await expect((0, clientGenerator_1.generateClient)(mockSchema)).resolves.not.toThrow();
    });
});
