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
                // Handle model declaration
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
                // End of model block
                if (currentModel) {
                    models.push(currentModel);
                }
                currentModel = null;
                inModelBlock = false;
            }
            else if (inModelBlock && currentModel) {
                // Handle field declaration
                const fieldMatch = line.match(/(\w+)\s+(\w+)(\?)?\s*((@\w+|\@map\([^)]+\))*)/);
                if (fieldMatch) {
                    const [_, name, type, optional, attributesStr] = fieldMatch;
                    // Extract all attributes
                    const attributes = [];
                    if (attributesStr) {
                        const attrMatches = attributesStr.match(/@\w+|\@map\([^)]+\)/g);
                        if (attrMatches) {
                            attributes.push(...attrMatches);
                        }
                    }
                    // Check if field has specific attributes
                    const isTitle = attributes.includes('@title');
                    const isCheckbox = attributes.includes('@checkbox');
                    // Get mapped name if present
                    const mapMatch = attributes.find(attr => attr.startsWith('@map('))?.match(/@map\(([^)]+)\)/);
                    const mappedName = mapMatch ? mapMatch[1].replace(/['"]/g, '') : name;
                    logger_1.logger.info(`Field ${name} mapped to "${mappedName}"`);
                    currentModel.fields.push({
                        name: mappedName,
                        type: mapTypeToNotion(type, { isTitle, isCheckbox }),
                        optional: Boolean(optional),
                        attributes
                    });
                }
            }
        }
        // Handle last model if exists
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
function mapTypeToNotion(type, options) {
    const { isTitle, isCheckbox } = options;
    // If field is marked with @title, always use 'title' type
    if (isTitle) {
        return notionTypes_1.NotionPropertyTypes.Title;
    }
    // If field is marked with @checkbox, use 'checkbox' type
    if (isCheckbox) {
        return notionTypes_1.NotionPropertyTypes.Checkbox;
    }
    const typeMap = {
        'String': notionTypes_1.NotionPropertyTypes.RichText,
        'Number': notionTypes_1.NotionPropertyTypes.Number,
        'Boolean': notionTypes_1.NotionPropertyTypes.Checkbox,
        'Date': notionTypes_1.NotionPropertyTypes.Date,
        'Select': notionTypes_1.NotionPropertyTypes.Select,
        'MultiSelect': notionTypes_1.NotionPropertyTypes.MultiSelect,
        'People': notionTypes_1.NotionPropertyTypes.People
    };
    const mappedType = typeMap[type.replace('?', '')];
    if (!mappedType) {
        logger_1.logger.warn(`Unknown type mapping for: ${type}, using as-is`);
        return type.toLowerCase();
    }
    return mappedType;
}
