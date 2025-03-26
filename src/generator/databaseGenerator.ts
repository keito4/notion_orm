import { Schema, Model, Field } from "../types";
import { NotionPropertyTypes } from "../types/notionTypes";
import { logger } from "../utils/logger";

/**
 * スキーマからNotionデータベースのプロパティ定義を生成する
 */
export function generateDatabaseProperties(model: Model): Record<string, any> {
  const properties: Record<string, any> = {};
  
  const titleField = model.fields.find(field => 
    field.notionType === NotionPropertyTypes.Title
  );
  
  if (!titleField) {
    throw new Error(`モデル ${model.name} にタイトルフィールドが見つかりません。@title 属性を持つフィールドが必要です。`);
  }
  
  for (const field of model.fields) {
    const propertyName = field.notionName || field.name;
    const propertyDefinition = createPropertyDefinition(field);
    properties[propertyName] = propertyDefinition;
  }
  
  return properties;
}

/**
 * フィールドからNotionプロパティ定義を作成する
 */
function createPropertyDefinition(field: Field): any {
  switch (field.notionType) {
    case NotionPropertyTypes.Title:
      return { title: {} };
    
    case NotionPropertyTypes.RichText:
      return { rich_text: {} };
    
    case NotionPropertyTypes.Number:
      return { number: {} };
    
    case NotionPropertyTypes.Select:
      return { select: { options: [] } };
    
    case NotionPropertyTypes.MultiSelect:
      return { multi_select: { options: [] } };
    
    case NotionPropertyTypes.Date:
      return { date: {} };
    
    case NotionPropertyTypes.Checkbox:
      return { checkbox: {} };
    
    case NotionPropertyTypes.URL:
      return { url: {} };
    
    case NotionPropertyTypes.Email:
      return { email: {} };
    
    case NotionPropertyTypes.PhoneNumber:
      return { phone_number: {} };
    
    case NotionPropertyTypes.People:
      return { people: {} };
    
    case NotionPropertyTypes.Relation:
      return { relation: { database_id: null } };
    
    case NotionPropertyTypes.Formula:
      return { formula: { expression: "" } };
    
    default:
      logger.warn(`未知のNotionプロパティタイプ: ${field.notionType}、リッチテキストとして扱います`);
      return { rich_text: {} };
  }
}
