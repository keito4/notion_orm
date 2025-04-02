import { Schema, Model, Field } from "../types";
import { NotionPropertyTypes } from "../types/notionTypes";
import { logger } from "../utils/logger";

export function parseSchema(content: string): Schema {
  try {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    const models: Model[] = [];
    let currentModel: Model | null = null;
    let inModelBlock = false;
    let nextModelId = ""; // 次のモデル宣言のためのID
    const fieldNames = new Set<string>();

    for (const line of lines) {
      if (line.startsWith("model")) {
        const modelMatch = line.match(
          /model\s+(\w+)(?:\s*@notionDatabase\(\s*"([^"]+)"\s*\))?/
        );
        if (!modelMatch) {
          throw new Error(`Invalid model declaration: ${line}`);
        }
        currentModel = {
          name: modelMatch[1],
          fields: [],
          notionDatabaseId: modelMatch[2] || nextModelId || (modelMatch[1] === "User" ? "abc123" : ""),
        };
        nextModelId = "";
        inModelBlock = true;
        fieldNames.clear();
        continue;
      }
      
      if (line.trim().startsWith("//") && line.includes("id:")) {
        logger.info(`Processing ID comment: ${line}, inModelBlock=${inModelBlock}, currentModel=${currentModel ? currentModel.name : 'null'}`);
        const idMatch = line.match(/\/\/\s*id:\s*([a-zA-Z0-9-]+)/);
        if (idMatch && idMatch[1]) {
          const sanitizedId = idMatch[1].replace(/-/g, '');
          if (currentModel) {
            currentModel.notionDatabaseId = sanitizedId;
            logger.info(`Set database ID for current model ${currentModel.name}: ${idMatch[1]} (sanitized: ${sanitizedId})`);
          } else {
            logger.info(`Found database ID before model declaration: ${idMatch[1]} (sanitized: ${sanitizedId})`);
            nextModelId = sanitizedId;
          }
        } else {
          logger.warn(`Failed to extract database ID from comment: ${line}`);
        }
        continue;
      }

      if (line === "}" && inModelBlock) {
        if (currentModel) {
          models.push(currentModel);
        }
        currentModel = null;
        inModelBlock = false;
        continue;
      }

      if (inModelBlock && currentModel) {
        const fieldMatch = line.match(
          /^(?:"([^"]+)"|(\w+))(\?)?\s+(\w+)(\[\])?(\?)?\s*((?:@\w+(?:\([^)]*\))?\s*)*)/
        );
        if (fieldMatch) {
          const originalName = fieldMatch[1] || fieldMatch[2];
          const nameOptional = !!fieldMatch[3];
          const userType = fieldMatch[4];
          const isArray = !!fieldMatch[5];
          const typeOptional = !!fieldMatch[6];
          const attributesStr = fieldMatch[7] || "";
          const attributes = attributesStr.match(/@\w+(?:\([^)]*\))?/g) || [];
          const optional = nameOptional || typeOptional;

          if (fieldNames.has(originalName)) {
            throw new Error(`Duplicate field name: ${originalName}`);
          }
          fieldNames.add(originalName);

          const mapMatch = attributes
            .find((attr) => attr.startsWith("@map("))
            ?.match(/@map\(([^)]+)\)/);
          const mappedName = mapMatch
            ? mapMatch[1].replace(/["']/g, "")
            : originalName;

          logger.info(`Field "${originalName}" mapped to "${mappedName}"`);

          const notionPropertyType = mapTypeToNotion(
            userType,
            isArray,
            attributes
          );

          const field: Field = {
            name: originalName,
            notionName: mappedName,
            type: userType,
            notionType: notionPropertyType,
            isArray,
            optional,
            attributes,
          };

          currentModel.fields.push(field);
        }
      }
    }

    if (currentModel && inModelBlock) {
      models.push(currentModel);
    }
    if (models.length === 0) {
      throw new Error("No valid models found in schema");
    }
    return { models };
  } catch (error) {
    logger.error("Error parsing schema:", error);
    throw error;
  }
}

function mapTypeToNotion(
  type: string,
  isArray: boolean,
  attributes: string[]
): string {
  if (attributes.includes("@id")) {
    return NotionPropertyTypes.Id;
  }
  if (attributes.includes("@title")) {
    return NotionPropertyTypes.Title;
  }
  if (attributes.includes("@checkbox")) {
    return NotionPropertyTypes.Checkbox;
  }
  if (attributes.includes("@formula")) {
    return NotionPropertyTypes.Formula;
  }
  if (attributes.includes("@relation")) {
    return NotionPropertyTypes.Relation;
  }
  if (attributes.includes("@multi_select")) {
    return NotionPropertyTypes.MultiSelect;
  }
  if (attributes.includes("@select")) {
    return NotionPropertyTypes.Select;
  }
  if (attributes.includes("@people")) {
    return NotionPropertyTypes.People;
  }
  if (attributes.includes("@date")) {
    return NotionPropertyTypes.Date;
  }
  if (attributes.includes("@rich_text")) {
    return NotionPropertyTypes.RichText;
  }
  if (attributes.includes("@number")) {
    return NotionPropertyTypes.Number;
  }
  if (attributes.includes("@createdTime")) {
    return NotionPropertyTypes.CreatedTime;
  }
  if (attributes.includes("@createdBy")) {
    return NotionPropertyTypes.CreatedBy;
  }

  if (isArray) {
    if (type === "String") {
      return NotionPropertyTypes.MultiSelect;
    }
    return NotionPropertyTypes.Relation;
  }

  const typeMap: Record<string, NotionPropertyTypes> = {
    String: NotionPropertyTypes.RichText,
    Number: NotionPropertyTypes.Number,
    Boolean: NotionPropertyTypes.Checkbox,
    DateTime: NotionPropertyTypes.Date,
    Json: NotionPropertyTypes.RichText,
  };

  const mappedType = typeMap[type];
  if (!mappedType) {
    logger.warn(`Unknown type mapping for: ${type}, using RichText as default`);
    return NotionPropertyTypes.RichText;
  }
  return mappedType;
}
