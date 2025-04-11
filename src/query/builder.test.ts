/**
 * tests/query.test.ts
 */
import { QueryBuilder } from "./builder";
import { NotionPropertyTypes } from "../types/notionTypes";
import { describe, it, beforeEach, expect, jest } from "@jest/globals";

describe("QueryBuilder", () => {
  let notionMock: any;

  beforeEach(() => {
    notionMock = {
      databases: {
        query: jest.fn(),
      },
      pages: {
        retrieve: jest.fn(),
      },
    };
  });

  const databaseId = "b1234567-89ab-cdef-0123-456789abcdef"; // 有効なUUID形式
  const modelName = "TestModel";

  const relationMappings = {
    TestModel: {
      relatedItems: "c1234567-89ab-cdef-0123-456789abcdef", // 有効なUUID形式
    },
  };

  const propertyMappings = {
    TestModel: {
      titleField: "Title",
      statusField: "Status",
      dateField: "Date",
      relatedItems: "Related Items",
      numberField: "Number",
      checkboxField: "Checkbox",
    },
  };

  const propertyTypes = {
    TestModel: {
      titleField: NotionPropertyTypes.Title,
      statusField: NotionPropertyTypes.Select,
      dateField: NotionPropertyTypes.Date,
      relatedItems: NotionPropertyTypes.Relation,
      numberField: NotionPropertyTypes.Number,
      checkboxField: NotionPropertyTypes.Checkbox,
    },
  };

  it("should build a simple query with one filter", async () => {
    notionMock.databases.query.mockResolvedValueOnce({
      results: [
        {
          id: "page-1",
          properties: {
            Title: {
              type: "title",
              title: [{ plain_text: "Test Page" }],
            },
            Date: {
              type: "date",
              date: { start: "2023-10-01" },
            },
          },
          created_time: "2023-10-01T00:00:00.000Z",
          last_edited_time: "2023-10-01T12:00:00.000Z",
        },
      ],
    } as any);

    const qb = new QueryBuilder<any>(
      notionMock,
      databaseId,
      modelName,
      relationMappings,
      propertyMappings,
      propertyTypes
    );

    const result = await qb
      .where("titleField", "equals", "Test Page")
      .orderBy("dateField", "descending")
      .limit(10)
      .after("cursor-1234")
      .execute();

    expect(notionMock.databases.query).toHaveBeenCalledTimes(1);
    const [callArgs] = notionMock.databases.query.mock.calls[0];
    expect(callArgs).toEqual({
      database_id: databaseId,
      filter: {
        property: "Title",
        title: { equals: "Test Page" },
      },
      sorts: [
        {
          direction: "descending",
          property: "Date",
        },
      ],
      page_size: 10,
      start_cursor: "cursor-1234",
    });

    expect(result).toEqual([
      {
        id: "page-1",
        titleField: "Test Page",
        dateField: "2023-10-01",
        createdTime: "2023-10-01T00:00:00.000Z",
        lastEditedTime: "2023-10-01T12:00:00.000Z",
      },
    ]);
  });

  it("should build multiple filters with AND", async () => {
    notionMock.databases.query.mockResolvedValueOnce({ results: [] } as any);

    const qb = new QueryBuilder<any>(
      notionMock,
      databaseId,
      modelName,
      relationMappings,
      propertyMappings,
      propertyTypes
    );

    await qb
      .where("titleField", "contains", "Hello")
      .where("statusField", "equals", "Open")
      .execute();

    expect(notionMock.databases.query).toHaveBeenCalledTimes(1);
    const [callArgs] = notionMock.databases.query.mock.calls[0];
    expect(callArgs.filter).toEqual({
      and: [
        {
          property: "Title",
          title: { contains: "Hello" },
        },
        {
          property: "Status",
          select: { equals: "Open" },
        },
      ],
    });
  });


  it("should build filter for number and checkbox properties", async () => {
    notionMock.databases.query.mockResolvedValueOnce({ results: [] } as any);

    const qb = new QueryBuilder<any>(
      notionMock,
      databaseId,
      modelName,
      relationMappings,
      propertyMappings,
      propertyTypes
    );

    await qb
      .where("numberField", "equals", 123)
      .where("checkboxField", "equals", true)
      .execute();

    const [callArgs] = notionMock.databases.query.mock.calls[0];
    expect(callArgs.filter).toEqual({
      and: [
        {
          property: "Number",
          number: { equals: 123 },
        },
        {
          property: "Checkbox",
          checkbox: { equals: true },
        },
      ],
    });
  });
});
