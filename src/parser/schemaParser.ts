import { Schema, Model } from "../types";
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

    for (const line of lines) {
      if (line.startsWith("model")) {
        const modelMatch = line.match(
          /model\s+(\w+)\s*@notionDatabase\("([^"]+)"\)/
        );
        if (!modelMatch) {
          throw new Error(`Invalid model declaration: ${line}`);
        }
        currentModel = {
          name: modelMatch[1],
          fields: [],
          notionDatabaseId: modelMatch[2],
        };
        inModelBlock = true;
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
          /^(?:"([^"]+)"|(\w+))\s+(\w+)(\[\])?(\?)?\s*((?:@\w+(?:\([^)]*\))?\s*)*)/
        );
        if (fieldMatch) {
          const originalName = fieldMatch[1] || fieldMatch[2];
          const type = fieldMatch[3];
          const isArray = fieldMatch[4];
          const optional = fieldMatch[5];
          const attributesStr = fieldMatch[6] || "";
          const attributes = attributesStr.match(/@\w+(?:\([^)]*\))?/g) || [];
          const mapMatch = attributes
            .find((attr) => attr.startsWith("@map("))
            ?.match(/@map\(([^)]+)\)/);
          const mappedName = mapMatch
            ? mapMatch[1].replace(/["']/g, "")
            : originalName;
          logger.info(`Field "${originalName}" mapped to "${mappedName}"`);
          const notionType = mapTypeToNotion(type, isArray, attributes);
          currentModel.fields.push({
            name: originalName,
            notionName: mappedName,
            type: notionType,
            optional: Boolean(optional),
            attributes,
          });
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
  isArray: string | undefined,
  attributes: string[]
): string {
  if (attributes.includes("@title")) {
    return NotionPropertyTypes.Title;
  }
  if (attributes.includes("@checkbox")) {
    return NotionPropertyTypes.Checkbox;
  }
  if (attributes.includes("@formula")) {
    return NotionPropertyTypes.Formula;
  }
  if (attributes.includes("@relation") && isArray) {
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
  const typeMap: Record<string, NotionPropertyTypes> = {
    String: NotionPropertyTypes.RichText,
    Number: NotionPropertyTypes.Number,
    Boolean: NotionPropertyTypes.Checkbox,
    Json: NotionPropertyTypes.RichText,
  };
  const mappedType = typeMap[type];
  if (!mappedType) {
    logger.warn(`Unknown type mapping for: ${type}, using RichText as default`);
    return NotionPropertyTypes.RichText;
  }
  return mappedType;
}
