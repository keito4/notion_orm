import { parseSchema } from "./schemaParser";
import { describe, test, expect } from "@jest/globals";

describe("Schema Parser", () => {
  test("should parse valid schema with one model", () => {
    const schema = `
      model User @notionDatabase("abc123") {
        name String
        age Number?
        isActive Boolean
      }
    `;
    const result = parseSchema(schema);
    expect(result.models).toHaveLength(1);

    const userModel = result.models[0];
    expect(userModel.name).toBe("User");
    expect(userModel.notionDatabaseId).toBe("abc123");
    expect(userModel.fields).toHaveLength(3);

    const [nameField, ageField, isActiveField] = userModel.fields;
    expect(nameField.name).toBe("name");
    expect(nameField.type).toBe("rich_text");
    expect(nameField.optional).toBe(false);

    expect(ageField.name).toBe("age");
    expect(ageField.type).toBe("number");
    expect(ageField.optional).toBe(true);

    expect(isActiveField.name).toBe("isActive");
    expect(isActiveField.type).toBe("checkbox");
    expect(isActiveField.optional).toBe(false);
  });

  test("should handle optional fields", () => {
    const schema = `
      model Post @notionDatabase("def456") {
        title String
        content String?
      }
    `;
    const result = parseSchema(schema);
    expect(result.models).toHaveLength(1);

    const postModel = result.models[0];
    expect(postModel.name).toBe("Post");
    expect(postModel.notionDatabaseId).toBe("def456");
    expect(postModel.fields).toHaveLength(2);

    const [titleField, contentField] = postModel.fields;
    expect(titleField.optional).toBe(false);
    expect(contentField.optional).toBe(true);
  });

  test("should parse fields with double-quoted names", () => {
    const schema = `
      model Todo @notionDatabase("todoDB") {
        "やること" String
        "説明" String?
      }
    `;
    const result = parseSchema(schema);

    expect(result.models).toHaveLength(1);
    const todoModel = result.models[0];
    expect(todoModel.name).toBe("Todo");
    expect(todoModel.notionDatabaseId).toBe("todoDB");
    expect(todoModel.fields).toHaveLength(2);

    const [todoField, descField] = todoModel.fields;
    expect(todoField.name).toBe("やること");
    expect(todoField.type).toBe("rich_text");
    expect(todoField.optional).toBe(false);

    expect(descField.name).toBe("説明");
    expect(descField.type).toBe("rich_text");
    expect(descField.optional).toBe(true);
  });

  test("should parse array fields and attributes", () => {
    const schema = `
      model Task @notionDatabase("taskDB") {
        id Number @title
        tags String[]
        assignees Number[] @relation @map("担当者")
      }
    `;
    const result = parseSchema(schema);

    expect(result.models).toHaveLength(1);
    const taskModel = result.models[0];
    expect(taskModel.name).toBe("Task");
    expect(taskModel.notionDatabaseId).toBe("taskDB");
    expect(taskModel.fields).toHaveLength(3);

    const [idField, tagsField, assigneesField] = taskModel.fields;
    expect(idField.name).toBe("id");
    expect(idField.type).toBe("title");
    expect(idField.optional).toBe(false);

    expect(tagsField.name).toBe("tags");
    expect(tagsField.type).toBe("rich_text");
    expect(tagsField.optional).toBe(false);

    expect(assigneesField.name).toBe("assignees");
    expect(assigneesField.notionName).toBe("担当者");
    expect(assigneesField.type).toBe("relation");
    expect(assigneesField.optional).toBe(false);
  });

  test("should parse multiple models", () => {
    const schema = `
      model ModelA @notionDatabase("aaa") {
        fieldA String
      }

      model ModelB @notionDatabase("bbb") {
        fieldB Boolean?
      }
    `;
    const result = parseSchema(schema);
    expect(result.models).toHaveLength(2);

    const [modelA, modelB] = result.models;

    expect(modelA.name).toBe("ModelA");
    expect(modelA.notionDatabaseId).toBe("aaa");
    expect(modelA.fields).toHaveLength(1);
    expect(modelA.fields[0].name).toBe("fieldA");
    expect(modelA.fields[0].type).toBe("rich_text");
    expect(modelA.fields[0].optional).toBe(false);

    expect(modelB.name).toBe("ModelB");
    expect(modelB.notionDatabaseId).toBe("bbb");
    expect(modelB.fields).toHaveLength(1);
    expect(modelB.fields[0].name).toBe("fieldB");
    expect(modelB.fields[0].type).toBe("checkbox");
    expect(modelB.fields[0].optional).toBe(true);
  });

  // test("should throw error for invalid schema without @notionDatabase", () => {
  //   const invalidSchema = `
  //     model InvalidModel {
  //       someField String
  //     }
  //   `;
  //   expect(() => parseSchema(invalidSchema)).toThrowError(
  //     /Invalid model declaration/
  //   );
  // });

  // test("should throw error for invalid field type", () => {
  //   const invalidSchema = `
  //     model InvalidType @notionDatabase("test") {
  //       field InvalidType
  //     }
  //   `;
  //   expect(() => parseSchema(invalidSchema)).toThrowError(/Invalid field type/);
  // });

  // test("should throw error for duplicate field names", () => {
  //   const invalidSchema = `
  //     model DuplicateFields @notionDatabase("test") {
  //       field String
  //       field Number
  //     }
  //   `;
  //   expect(() => parseSchema(invalidSchema)).toThrowError(
  //     /Duplicate field name/
  //   );
  // });

  test("should handle all valid attribute combinations", () => {
    const schema = `
      model Attributes @notionDatabase("test") {
        id String @title
        name String @rich_text
        count Number @number
        status String @select
        tags String[] @multi_select
        date DateTime @date
        done Boolean @checkbox
        owner String @people
        related String[] @relation
        computed String @formula
      }
    `;
    const result = parseSchema(schema);
    const model = result.models[0];

    expect(model.fields).toHaveLength(10);
    expect(model.fields[0].type).toBe("title");
    expect(model.fields[1].type).toBe("rich_text");
    expect(model.fields[2].type).toBe("number");
    expect(model.fields[3].type).toBe("select");
    expect(model.fields[4].type).toBe("multi_select");
    expect(model.fields[5].type).toBe("date");
    expect(model.fields[6].type).toBe("checkbox");
    expect(model.fields[7].type).toBe("people");
    expect(model.fields[8].type).toBe("relation");
    expect(model.fields[9].type).toBe("formula");
  });
});
