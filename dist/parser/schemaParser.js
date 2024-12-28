"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSchema = parseSchema;
const notionTypes_1 = require("../types/notionTypes");
const logger_1 = require("../utils/logger");
function parseSchema(content) {
    try {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const models = [];
        let currentModel = null;
        let inModelBlock = false;
        for (const line of lines) {
            if (line.startsWith('model')) {
                const modelMatch = line.match(/model\s+(\w+)\s*@notionDatabase\("([^"]+)"\)/);
                if (!modelMatch) {
                    throw new Error(`Invalid model declaration: ${line}`);
                }
                currentModel = {
                    name: modelMatch[1],
                    fields: [],
                    notionDatabaseId: modelMatch[2]
                };
                inModelBlock = true;
            }
            else if (line === '}' && inModelBlock) {
                if (currentModel) {
                    models.push(currentModel);
                }
                currentModel = null;
                inModelBlock = false;
            }
            else if (inModelBlock && currentModel) {
                const fieldMatch = line.match(/(\w+)\s+(\w+)(\[\])?(\?)?\s*((@\w+|\@map\([^)]+\))*)/);
                if (fieldMatch) {
                    const [_, name, type, isArray, optional, attributesStr] = fieldMatch;
                    // Extract all attributes
                    const attributes = [];
                    if (attributesStr) {
                        const attrMatches = attributesStr.match(/@\w+|\@map\([^)]+\)/g);
                        if (attrMatches) {
                            attributes.push(...attrMatches);
                        }
                    }
                    // Get mapped name if present
                    const mapMatch = attributes.find(attr => attr.startsWith('@map('))?.match(/@map\(([^)]+)\)/);
                    const mappedName = mapMatch ? mapMatch[1].replace(/['"]/g, '') : name;
                    // Determine the correct Notion type based on attributes and type
                    const notionType = mapTypeToNotion(type, isArray, attributes);
                    logger_1.logger.info(`Field ${name} mapped to "${mappedName}"`);
                    currentModel.fields.push({
                        name: mappedName,
                        type: notionType,
                        optional: Boolean(optional),
                        attributes
                    });
                }
            }
        }
        if (currentModel && inModelBlock) {
            models.push(currentModel);
        }
        if (models.length === 0) {
            throw new Error('No valid models found in schema');
        }
        return { models };
    }
    catch (error) {
        logger_1.logger.error('Error parsing schema:', error);
        throw error;
    }
}
function mapTypeToNotion(type, isArray, attributes) {
    // Check special attributes first
    if (attributes.includes('@title')) {
        return notionTypes_1.NotionPropertyTypes.Title;
    }
    if (attributes.includes('@checkbox')) {
        return notionTypes_1.NotionPropertyTypes.Checkbox;
    }
    if (attributes.includes('@formula')) {
        return notionTypes_1.NotionPropertyTypes.Formula;
    }
    if (attributes.includes('@relation') || isArray) {
        return notionTypes_1.NotionPropertyTypes.Relation;
    }
    // Map basic types
    const typeMap = {
        'String': notionTypes_1.NotionPropertyTypes.RichText,
        'Number': notionTypes_1.NotionPropertyTypes.Number,
        'Boolean': notionTypes_1.NotionPropertyTypes.Checkbox,
        'Json': notionTypes_1.NotionPropertyTypes.People,
    };
    const mappedType = typeMap[type];
    if (!mappedType) {
        logger_1.logger.warn(`Unknown type mapping for: ${type}, using as-is`);
        return type.toLowerCase();
    }
    return mappedType;
}
