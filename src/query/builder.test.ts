/**
 * tests/query.test.ts
 */
import { QueryBuilder } from "./builder";
import { NotionPropertyTypes } from "../types/notionTypes";
import { NotionClient } from "../notion/client";
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

  // it("should build a relation filter", async () => {
  //   notionMock.databases.query.mockResolvedValueOnce({ results: [] } as any);

  //   const qb = new QueryBuilder<any>(
  //     notionMock,
  //     databaseId,
  //     modelName,
  //     relationMappings,
  //     propertyMappings,
  //     propertyTypes
  //   );

  //   const subQb = new QueryBuilder<any>(
  //     notionMock,
  //     relationMappings.TestModel.relatedItems,
  //     "RelatedModel",
  //     relationMappings,
  //     propertyMappings,
  //     propertyTypes
  //   );

  //   await qb
  //     .whereRelation("relatedItems", "Title", "equals", "SubPage")
  //     .execute();

  //   const [callArgs] = notionMock.databases.query.mock.calls[0];
  //   expect(callArgs.filter).toEqual({
  //     property: "Related Items",
  //     relation: { contains: "SubPage" },
  //   });
  // });

  // it("should include relation data", async () => {
  //   notionMock.databases.query.mockResolvedValueOnce({
  //     results: [
  //       {
  //         id: "page-1",
  //         properties: {
  //           Title: {
  //             type: "title",
  //             title: [{ plain_text: "Main Page" }],
  //           },
  //           "Related Items": {
  //             type: "relation",
  //             relation: [{ id: "relation-page-1" }, { id: "relation-page-2" }],
  //           },
  //         },
  //         created_time: "2023-10-02T00:00:00.000Z",
  //         last_edited_time: "2023-10-02T12:00:00.000Z",
  //       },
  //     ],
  //   } as any);

  //   notionMock.pages.retrieve
  //     .mockResolvedValueOnce({
  //       id: "relation-page-1",
  //       properties: {
  //         Title: {
  //           type: "title",
  //           title: [{ plain_text: "Relation Page 1" }],
  //         },
  //       },
  //       created_time: "2023-10-03T00:00:00.000Z",
  //       last_edited_time: "2023-10-03T12:00:00.000Z",
  //     } as any)
  //     .mockResolvedValueOnce({
  //       id: "relation-page-2",
  //       properties: {
  //         Title: {
  //           type: "title",
  //           title: [{ plain_text: "Relation Page 2" }],
  //         },
  //       },
  //       created_time: "2023-10-04T00:00:00.000Z",
  //       last_edited_time: "2023-10-04T12:00:00.000Z",
  //     } as any);

  //   const qb = new QueryBuilder<any>(
  //     notionMock,
  //     databaseId,
  //     modelName,
  //     relationMappings,
  //     propertyMappings,
  //     propertyTypes
  //   );

  //   const result = await qb.include("relatedItems").execute();

  //   expect(notionMock.databases.query).toHaveBeenCalledTimes(1);
  //   expect(notionMock.pages.retrieve).toHaveBeenCalledTimes(2);

  //   expect(result).toEqual([
  //     {
  //       id: "page-1",
  //       "Related Items": [
  //         {
  //           id: "relation-page-1",
  //           Title: "Relation Page 1",
  //           createdTime: "2023-10-03T00:00:00.000Z",
  //           lastEditedTime: "2023-10-03T12:00:00.000Z",
  //         },
  //         {
  //           id: "relation-page-2",
  //           Title: "Relation Page 2",
  //           createdTime: "2023-10-04T00:00:00.000Z",
  //           lastEditedTime: "2023-10-04T12:00:00.000Z",
  //         },
  //       ],
  //       Title: "Main Page",
  //       createdTime: "2023-10-02T00:00:00.000Z",
  //       lastEditedTime: "2023-10-02T12:00:00.000Z",
  //     },
  //   ]);
  // });

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
  
  describe("addSelectOptions", () => {
    beforeEach(() => {
      notionMock.databases.retrieve = jest.fn().mockResolvedValue({
        properties: {
          Status: {
            id: "prop_1",
            name: "Status",
            type: "select",
            select: {
              options: [
                { id: "opt_1", name: "既存オプション", color: "blue" }
              ]
            }
          }
        }
      });
      notionMock.databases.update = jest.fn().mockResolvedValue({});
    });
    
    it("セレクトプロパティにオプションを追加できること", async () => {
      const qb = new QueryBuilder<any>(
        notionMock,
        databaseId,
        modelName,
        relationMappings,
        propertyMappings,
        propertyTypes
      );
      
      await qb.addSelectOptions(
        "statusField",
        [{ name: "新しいオプション", color: "green" }]
      );
      
      expect(notionMock.databases.retrieve).toHaveBeenCalledWith({
        database_id: databaseId
      });
      
      expect(notionMock.databases.update).toHaveBeenCalled();
    });
    
    it("マルチセレクトプロパティにオプションを追加できること", async () => {
      const originalPropertyType = propertyTypes.TestModel.statusField;
      propertyTypes.TestModel.statusField = NotionPropertyTypes.MultiSelect;
      
      notionMock.databases.retrieve = jest.fn().mockResolvedValue({
        properties: {
          Status: {
            id: "prop_1",
            name: "Status",
            type: "multi_select",
            multi_select: {
              options: [
                { id: "opt_1", name: "既存オプション", color: "red" }
              ]
            }
          }
        }
      });
      
      const qb = new QueryBuilder<any>(
        notionMock,
        databaseId,
        modelName,
        relationMappings,
        propertyMappings,
        propertyTypes
      );
      
      await qb.addSelectOptions(
        "statusField",
        [{ name: "新しいオプション", color: "green" }]
      );
      
      expect(notionMock.databases.retrieve).toHaveBeenCalledWith({
        database_id: databaseId
      });
      
      expect(notionMock.databases.update).toHaveBeenCalled();
      
      propertyTypes.TestModel.statusField = originalPropertyType;
    });
    
    it("Select/MultiSelect以外のプロパティでエラーを投げること", async () => {
      const qb = new QueryBuilder<any>(
        notionMock,
        databaseId,
        modelName,
        relationMappings,
        propertyMappings,
        propertyTypes
      );
      
      await expect(
        qb.addSelectOptions(
          "titleField", // タイトルフィールド（Select/MultiSelectではない）
          [{ name: "新しいオプション", color: "green" }]
        )
      ).rejects.toThrow(/Select\/MultiSelectタイプではありません/);
    });
    
    it("NotionClientを使用する場合もオプションを追加できること", async () => {
      const mockNotionClient = {
        addPropertyOptions: jest.fn().mockResolvedValue(undefined)
      } as unknown as NotionClient;
      
      const qb = new QueryBuilder<any>(
        mockNotionClient,
        databaseId,
        modelName,
        relationMappings,
        propertyMappings,
        propertyTypes
      );
      
      await qb.addSelectOptions(
        "statusField",
        [{ name: "新しいオプション", color: "green" }]
      );
      
      expect(mockNotionClient.addPropertyOptions).toHaveBeenCalledWith(
        databaseId,
        expect.any(String),
        NotionPropertyTypes.Select,
        [{ name: "新しいオプション", color: "green" }]
      );
    });
  });
});
