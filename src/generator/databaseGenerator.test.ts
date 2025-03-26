import { generateDatabaseProperties } from "./databaseGenerator";
import { Model, Field } from "../types";
import { NotionPropertyTypes } from "../types/notionTypes";

describe("databaseGenerator", () => {
  describe("generateDatabaseProperties", () => {
    it("タイトルフィールドを含むモデルから正しくプロパティを生成する", () => {
      const model: Model = {
        name: "TestModel",
        notionDatabaseId: "test-db-id",
        fields: [
          {
            name: "name",
            notionName: "Name",
            type: "String",
            notionType: NotionPropertyTypes.Title,
            isArray: false,
            optional: false,
            attributes: ["@title"]
          },
          {
            name: "description",
            notionName: "Description",
            type: "String",
            notionType: NotionPropertyTypes.RichText,
            isArray: false,
            optional: true,
            attributes: ["@richText"]
          }
        ]
      };

      const properties = generateDatabaseProperties(model);
      
      expect(properties).toHaveProperty("Name");
      expect(properties).toHaveProperty("Description");
      expect(properties["Name"]).toEqual({ title: {} });
      expect(properties["Description"]).toEqual({ rich_text: {} });
    });

    it("タイトルフィールドがない場合はエラーをスローする", () => {
      const model: Model = {
        name: "TestModel",
        notionDatabaseId: "test-db-id",
        fields: [
          {
            name: "description",
            notionName: "Description",
            type: "String",
            notionType: NotionPropertyTypes.RichText,
            isArray: false,
            optional: true,
            attributes: ["@richText"]
          }
        ]
      };

      expect(() => generateDatabaseProperties(model)).toThrow();
    });
  });
});
