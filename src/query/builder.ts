import { Client } from "@notionhq/client";
import { NotionPropertyTypes } from "../types/notionTypes";
import { logger } from "../utils/logger";

export type FilterOperator =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after"
  | "is_empty"
  | "is_not_empty";

export interface FilterCondition {
  property: string;
  operator: FilterOperator;
  value: any;
}

export interface RelationFilterInfo {
  fieldName: string;
  subBuilder: QueryBuilder<any>;
}

export interface SortCondition {
  property: string;
  direction: "ascending" | "descending";
}

interface RelationCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

export class QueryBuilder<T> {
  private filters: FilterCondition[] = [];
  private sorts: SortCondition[] = [];
  private pageSize?: number;
  private startCursor?: string;
  private includedRelations: Set<string> = new Set();
  private relationCache: RelationCache = {};
  private relationFilterBuilders: RelationFilterInfo[] = [];
  private readonly CACHE_DURATION = 5 * 60 * 1000;
  private isDebugMode: boolean = process.env.DEBUG === "true";

  constructor(
    private notion: Client,
    private databaseId: string,
    private modelName: string,
    private relationMappings: Record<string, Record<string, string>> = {},
    private propertyMappings: Record<string, Record<string, string>> = {},
    private propertyTypes: Record<
      string,
      Record<string, NotionPropertyTypes>
    > = {},
    private relationModels: Record<string, Record<string, string>> = {}
  ) {
    if (this.isDebugMode) {
      logger.debug(
        `クエリビルダーを初期化: modelName=${modelName}, databaseId=${databaseId}`
      );
      logger.debug(
        "プロパティマッピング:",
        JSON.stringify(this.propertyMappings[this.modelName], null, 2)
      );
      logger.debug(
        "リレーションマッピング:",
        JSON.stringify(this.relationMappings[this.modelName], null, 2)
      );
    }
    this.notion = notion;
    this.modelName = modelName;
    this.propertyTypes = propertyTypes;
    this.propertyMappings = propertyMappings;
    this.relationMappings = relationMappings;
    this.relationModels = relationModels;
  }

  where(
    property: keyof T | string,
    operator: FilterOperator,
    value: any,
    modelName: string = this.modelName
  ): QueryBuilder<T> {
    const fieldOrNotionName = this.getNotionPropertyName(
      modelName,
      String(property)
    );
    this.filters.push({
      property: fieldOrNotionName,
      operator,
      value,
    });
    if (this.isDebugMode) {
      logger.debug(
        `where() 呼び出し: property=${fieldOrNotionName}, operator=${operator}, value=${value}`
      );
    }
    return this;
  }

  whereRelation<R>(
    relationProperty: keyof T | string,
    property: keyof R | string,
    operator: FilterOperator,
    value: any
  ): QueryBuilder<T> {
    const fieldOrNotionName = String(relationProperty);
    const fieldName = this.getFieldName(fieldOrNotionName);
    const relatedDatabaseId =
      this.relationMappings[this.modelName]?.[fieldName];
    if (!relatedDatabaseId) {
      throw new Error(
        `リレーション "${fieldOrNotionName}" のデータベースIDが見つかりません`
      );
    }
    const subModelName = this.getRelationModelName(this.modelName, fieldName);
    const subBuilder = new QueryBuilder<R>(
      this.notion,
      relatedDatabaseId,
      subModelName,
      this.relationMappings,
      this.propertyMappings,
      this.propertyTypes,
      this.relationModels
    );
    subBuilder.where(property, operator, value, subModelName);
    this.relationFilterBuilders.push({
      fieldName: fieldOrNotionName,
      subBuilder,
    });
    if (this.isDebugMode) {
      logger.debug(
        `whereRelation() 呼び出し: relationProperty=${fieldOrNotionName}, サブモデル=${subModelName}, property=${String(
          property
        )}, operator=${operator}, value=${value}`
      );
    }
    return this;
  }

  include(relationProperty: keyof T | string): QueryBuilder<T> {
    const fieldOrNotionName = String(relationProperty);
    const fieldName = this.getFieldName(fieldOrNotionName);
    this.includedRelations.add(fieldName);
    if (this.isDebugMode) {
      logger.debug(`include() 呼び出し: relationProperty=${fieldName}`);
    }
    return this;
  }

  orderBy(
    property: keyof T | string,
    direction: "ascending" | "descending" = "ascending"
  ): QueryBuilder<T> {
    const fieldOrNotionName = String(property);
    const notionPropertyName = this.getNotionPropertyName(
      this.modelName,
      fieldOrNotionName
    );
    this.sorts.push({ property: notionPropertyName, direction });
    if (this.isDebugMode) {
      logger.debug(
        `orderBy() 呼び出し: property=${fieldOrNotionName}, direction=${direction}`
      );
    }
    return this;
  }

  limit(size: number): QueryBuilder<T> {
    this.pageSize = size;
    if (this.isDebugMode) {
      logger.debug(`limit() 呼び出し: size=${size}`);
    }
    return this;
  }

  after(cursor: string): QueryBuilder<T> {
    this.startCursor = cursor;
    if (this.isDebugMode) {
      logger.debug(`after() 呼び出し: startCursor=${cursor}`);
    }
    return this;
  }

  getFilters(): FilterCondition[] {
    return this.filters;
  }

  private getFieldName(property: string): string {
    const modelMap = this.propertyMappings[this.modelName] || {};
    if (modelMap[property]) {
      return property;
    }
    for (const [fieldName, notionName] of Object.entries(modelMap)) {
      if (notionName === property) {
        return fieldName;
      }
    }
    return property;
  }

  private getNotionPropertyName(modelName: string, property: string): string {
    const modelMap = this.propertyMappings[modelName] || {};
    if (modelMap[property]) {
      return modelMap[property];
    }
    for (const [, notionName] of Object.entries(modelMap)) {
      if (notionName === property) {
        return notionName;
      }
    }
    throw new Error(`プロパティ "${property}" が見つかりません`);
  }

  private getRelationModelName(modelName: string, fieldName: string): string {
    return this.relationModels[modelName]?.[fieldName] || fieldName;
  }

  private getPropertyTypeFromModel(property: string): NotionPropertyTypes {
    const fieldName = this.getFieldName(property);
    const modelTypes = this.propertyTypes[this.modelName] || {};
    if (modelTypes[fieldName]) {
      return modelTypes[fieldName];
    }
    return NotionPropertyTypes.RichText;
  }

  private isRelationProperty(property: string): boolean {
    const fieldName = this.getFieldName(property);
    const modelTypes = this.propertyTypes[this.modelName] || {};
    const maybeRelation =
      modelTypes[fieldName] === NotionPropertyTypes.Relation;
    const mappedRelation = this.relationMappings[this.modelName]?.[fieldName];
    return Boolean(maybeRelation || mappedRelation);
  }

  private async buildNotionFilter(): Promise<any> {
    if (this.isDebugMode) {
      logger.debug("buildNotionFilter() を開始します。");
    }
    const relationFilters: any[] = [];
    for (const info of this.relationFilterBuilders) {
      if (this.isDebugMode) {
        logger.debug(
          `リレーションフィルターを構築中: fieldName=${info.fieldName}, subBuilder=(${info.subBuilder.modelName})`
        );
      }
      const relatedPages = await info.subBuilder.execute();
      const ids = relatedPages.map((r: any) => r.id);
      if (ids.length === 0) {
        relationFilters.push({
          property: this.getNotionPropertyName(this.modelName, info.fieldName),
          relation: {
            contains: "00000000-0000-0000-0000-000000000000",
          },
        });
      } else if (ids.length === 1) {
        relationFilters.push({
          property: this.getNotionPropertyName(this.modelName, info.fieldName),
          relation: {
            contains: ids[0],
          },
        });
      } else {
        relationFilters.push({
          or: ids.map((id: string) => ({
            property: this.getNotionPropertyName(
              this.modelName,
              info.fieldName
            ),
            relation: {
              contains: id,
            },
          })),
        });
      }
    }
    const normalFilters = this.filters.map((f) => this.buildNormalFilter(f));
    if (relationFilters.length === 0 && normalFilters.length === 0) {
      return undefined;
    }
    if (relationFilters.length === 0 && normalFilters.length === 1) {
      return normalFilters[0];
    }
    if (relationFilters.length === 0 && normalFilters.length > 1) {
      return { and: normalFilters };
    }
    if (relationFilters.length === 1 && normalFilters.length === 0) {
      return relationFilters[0];
    }
    if (relationFilters.length > 0 && normalFilters.length === 0) {
      if (relationFilters.length === 1) {
        return relationFilters[0];
      }
      return { and: relationFilters };
    }
    return {
      and: [...normalFilters, ...relationFilters],
    };
  }

  private buildNormalFilter(condition: FilterCondition): any {
    if (this.isDebugMode) {
      logger.debug(
        `buildNormalFilter() 呼び出し: property=${condition.property}, operator=${condition.operator}, value=${condition.value}`
      );
    }
    const { property, operator, value } = condition;
    const notionPropertyName = this.getNotionPropertyName(
      this.modelName,
      property
    );
    if (
      this.isRelationProperty(property) &&
      operator !== "is_empty" &&
      operator !== "is_not_empty"
    ) {
      return {
        property: notionPropertyName,
        relation: {
          contains: String(value),
        },
      };
    }
    const propertyType = this.getPropertyTypeFromModel(property);
    return {
      property: notionPropertyName,
      [propertyType]: this.getFilterCondition(operator, value, propertyType),
    };
  }

  private getFilterCondition(
    operator: FilterOperator,
    value: any,
    propertyType: NotionPropertyTypes
  ): any {
    if (this.isDebugMode) {
      logger.debug(
        `getFilterCondition() 呼び出し: operator=${operator}, value=${value}, propertyType=${propertyType}`
      );
    }
    switch (propertyType) {
      case NotionPropertyTypes.Checkbox:
        if (operator === "equals") {
          return { equals: Boolean(value) };
        }
        return { equals: Boolean(value) };
      case NotionPropertyTypes.Title:
      case NotionPropertyTypes.RichText:
      case NotionPropertyTypes.Select:
      case NotionPropertyTypes.MultiSelect:
        switch (operator) {
          case "equals":
            return { equals: String(value) };
          case "contains":
            return { contains: String(value) };
          case "startsWith":
            return { starts_with: String(value) };
          case "endsWith":
            return { ends_with: String(value) };
          case "is_empty":
            return { is_empty: true };
          case "is_not_empty":
            return { is_not_empty: true };
          default:
            return { equals: String(value) };
        }
      case NotionPropertyTypes.Number:
        switch (operator) {
          case "equals":
            return { equals: Number(value) };
          default:
            return { equals: Number(value) };
        }
      case NotionPropertyTypes.People:
        return { contains: String(value) };
      case NotionPropertyTypes.Date:
        switch (operator) {
          case "equals":
            return { equals: String(value) };
          case "before":
          case "after":
          case "on_or_before":
          case "on_or_after":
            return { [operator]: String(value) };
          case "is_empty":
            return { is_empty: true };
          case "is_not_empty":
            return { is_not_empty: true };
          default:
            return { equals: String(value) };
        }
      default:
        return { equals: String(value) };
    }
  }

  async execute(): Promise<T[]> {
    if (this.isDebugMode) {
      logger.debug(
        `execute() を呼び出し: databaseId=${this.databaseId}, modelName=${this.modelName}`
      );
    }
    try {
      const notionFilter = await this.buildNotionFilter();
      const query: any = {
        database_id: this.databaseId,
      };
      if (notionFilter) {
        query.filter = notionFilter;
      }
      if (this.sorts.length > 0) {
        query.sorts = this.sorts.map((s) => this.buildSortCondition(s));
      }
      if (this.pageSize) {
        query.page_size = this.pageSize;
      }
      if (this.startCursor) {
        query.start_cursor = this.startCursor;
      }
      if (this.isDebugMode) {
        logger.debug("最終的なクエリ:", JSON.stringify(query, null, 2));
      }
      const response = await this.notion.databases.query(query);
      if (this.isDebugMode) {
        logger.debug(
          `Notionからのレスポンス (結果件数=${response.results.length})`
        );
      }
      const results = response.results.map((page: any) =>
        this.mapResponseToModel(page)
      );
      if (this.includedRelations.size > 0) {
        if (this.isDebugMode) {
          logger.debug(
            `関連データを読み込み: includedRelations=${Array.from(
              this.includedRelations
            ).join(", ")}`
          );
        }
        await this.loadRelationsBulk(results);
      }
      return results;
    } catch (error: any) {
      logger.error(`${this.modelName} のクエリ実行中にエラーが発生:`, error);
      if (error.code === "validation_error") {
        logger.error(`バリデーションエラーの詳細: ${error.message}`);
      }
      throw error;
    }
  }

  private buildSortCondition(sort: SortCondition): any {
    if (this.isDebugMode) {
      logger.debug(
        `buildSortCondition() 呼び出し: property=${sort.property}, direction=${sort.direction}`
      );
    }
    const notionPropertyName = this.getNotionPropertyName(
      this.modelName,
      String(sort.property)
    );
    let finalPropertyName = notionPropertyName;
    if (
      notionPropertyName === "createdTime" ||
      notionPropertyName === "Created At"
    ) {
      finalPropertyName = "created_time";
    } else if (notionPropertyName === "lastEditedTime") {
      finalPropertyName = "last_edited_time";
    }
    const isSystemProperty = ["created_time", "last_edited_time"].includes(
      finalPropertyName
    );
    const sortCondition: any = {
      direction: sort.direction,
    };
    if (isSystemProperty) {
      sortCondition.timestamp = finalPropertyName;
    } else {
      sortCondition.property = finalPropertyName;
    }
    return sortCondition;
  }

  private async loadRelationsBulk(results: T[]): Promise<void> {
    const requests: {
      recordIndex: number;
      fieldName: string;
      subModelName: string;
      pageId: string;
    }[] = [];
    for (let i = 0; i < results.length; i++) {
      const model = results[i] as any;
      for (const fieldName of this.includedRelations) {
        const value = model[fieldName];
        if (!value) continue;
        const relationIds = Array.isArray(value)
          ? value.map((v: any) => v.id)
          : [value.id];
        const subModelName = this.getRelationModelName(
          this.modelName,
          fieldName
        );
        for (const pageId of relationIds) {
          requests.push({
            recordIndex: i,
            fieldName,
            subModelName,
            pageId,
          });
        }
      }
    }
    const uniqueRequestsMap = new Map<
      string,
      {
        recordIndex: number;
        fieldName: string;
        subModelName: string;
        pageId: string;
      }[]
    >();
    for (const req of requests) {
      const key = `${req.subModelName}:${req.pageId}`;
      if (!uniqueRequestsMap.has(key)) {
        uniqueRequestsMap.set(key, [req]);
      } else {
        uniqueRequestsMap.get(key)!.push(req);
      }
    }
    const pageLoadPromises: {
      key: string;
      promise: Promise<any>;
    }[] = [];
    for (const [key, batch] of uniqueRequestsMap.entries()) {
      const { subModelName, pageId } = batch[0];
      pageLoadPromises.push({
        key,
        promise: this.getRelationData(pageId, subModelName),
      });
    }
    const resultsMap = new Map<string, any>();
    await Promise.all(
      pageLoadPromises.map(async (p) => {
        const data = await p.promise;
        resultsMap.set(p.key, data);
      })
    );
    for (const [key, batch] of uniqueRequestsMap.entries()) {
      const data = resultsMap.get(key);
      for (const req of batch) {
        const model = results[req.recordIndex] as any;
        const rawValue = model[req.fieldName];
        if (Array.isArray(rawValue)) {
          const idx = rawValue.findIndex((v: any) => v.id === req.pageId);
          if (idx !== -1) rawValue[idx] = data;
        } else {
          model[req.fieldName] = data;
        }
      }
    }
  }

  private async getRelationData(id: string, modelName: string): Promise<any> {
    const cacheKey = `${modelName}-${id}`;
    const cached = this.relationCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      if (this.isDebugMode) {
        logger.debug(
          `リレーションデータをキャッシュから取得: id=${id}, modelName=${modelName}, cacheTimestamp=${cached.timestamp}`
        );
      }
      return cached.data;
    }
    try {
      if (this.isDebugMode) {
        logger.debug(
          `リレーションデータをNotionから取得: id=${id}, modelName=${modelName}`
        );
      }
      const response = await this.notion.pages.retrieve({ page_id: id });
      const mappedData = this.mapResponseToModel(response);
      this.relationCache[cacheKey] = {
        data: mappedData,
        timestamp: Date.now(),
      };
      return mappedData;
    } catch (error) {
      logger.error(
        `リレーションデータの取得中にエラー (ID: ${id}, modelName: ${modelName}):`,
        error
      );
      throw error;
    }
  }

  private mapResponseToModel(page: any): T {
    const props = page.properties;
    const mapped = {
      id: page.id,
      ...Object.entries(props).reduce((acc: any, [notionKey, propVal]) => {
        acc[this.getFieldName(notionKey)] = this.mapPropertyValue(propVal);
        return acc;
      }, {}),
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    } as T;
    if (this.isDebugMode) {
      logger.debug(
        `mapResponseToModel() 呼び出し: pageId=${page.id}, プロパティ数=${
          Object.keys(props).length
        }`
      );
    }
    return mapped;
  }

  private mapPropertyValue(property: any): any {
    if (!property || !property.type) {
      return null;
    }
    switch (property.type) {
      case NotionPropertyTypes.Title:
        return property.title?.[0]?.plain_text || "";
      case NotionPropertyTypes.RichText:
        return property.rich_text?.[0]?.plain_text || "";
      case NotionPropertyTypes.Number:
        return property.number ?? 0;
      case NotionPropertyTypes.Select:
        return property.select?.name || "";
      case NotionPropertyTypes.MultiSelect:
        return property.multi_select?.map((item: any) => item.name) || [];
      case NotionPropertyTypes.Date:
        return property.date?.start || null;
      case NotionPropertyTypes.Checkbox:
        return property.checkbox || false;
      case NotionPropertyTypes.People:
        return (
          property.people?.map((user: any) => ({
            id: user.id,
            name: user.name || "",
            avatar_url: user.avatar_url,
          })) || []
        );
      case NotionPropertyTypes.Relation:
        return property.relation?.map((r: any) => ({ id: r.id })) || [];
      case NotionPropertyTypes.Formula:
        return (
          property.formula?.string || property.formula?.number?.toString() || ""
        );
      default:
        return "";
    }
  }
}
