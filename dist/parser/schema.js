"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaParser = void 0;
const logger_1 = require("../utils/logger");
class SchemaParser {
    static DATABASE_ATTRIBUTE = 'notionDatabase';
    static MAP_ATTRIBUTE = 'map';
    static parse(schemaContent) {
        try {
            logger_1.logger.debug('Starting schema parsing...');
            const models = this.parseModels(schemaContent);
            return { models };
        }
        catch (error) {
            logger_1.logger.error('Error parsing schema:', error);
            throw new Error(`Failed to parse schema: ${error}`);
        }
    }
    static parseModels(content) {
        const modelRegex = /model\s+(\w+)\s+@notionDatabase\("([^"]+)"\)\s*{([^}]+)}/g;
        const models = [];
        let match;
        while ((match = modelRegex.exec(content)) !== null) {
            const [_, name, databaseId, fieldsContent] = match;
            const fields = this.parseFields(fieldsContent.trim());
            models.push({
                name,
                fields,
                notionDatabaseId: databaseId
            });
        }
        return models;
    }
    static parseFields(fieldsContent) {
        const fieldRegex = /(\w+)\s+([^\s@]+)(\??)\s*(@[^@]+)?/g;
        const fields = [];
        let match;
        while ((match = fieldRegex.exec(fieldsContent)) !== null) {
            const [_, name, type, optional, attributes] = match;
            const parsedField = this.parseField(name, type, optional === '?', attributes || '');
            fields.push(parsedField);
        }
        return fields;
    }
    static parseField(name, type, optional, attributesStr) {
        const attributes = [];
        let notionMapping;
        // 属性の解析
        const attrRegex = /@(\w+)(?:\("([^"]+)"\))?/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
            const [_, attrName, attrValue] = attrMatch;
            if (attrName === this.MAP_ATTRIBUTE && attrValue) {
                notionMapping = attrValue;
            }
            attributes.push(attrName + (attrValue ? `("${attrValue}")` : ''));
        }
        // フィールドの作成
        const field = {
            name,
            type: this.mapPrismaTypeToNotionType(type),
            optional,
            attributes
        };
        if (notionMapping) {
            field.notionName = notionMapping;
        }
        return field;
    }
    static mapPrismaTypeToNotionType(prismaType) {
        switch (prismaType.toLowerCase()) {
            case 'string':
                return 'rich_text';
            case 'boolean':
                return 'checkbox';
            case 'datetime':
                return 'date';
            case 'json':
                return 'people';
            case 'string[]':
                return 'multi_select';
            default:
                return prismaType.toLowerCase();
        }
    }
}
exports.SchemaParser = SchemaParser;
