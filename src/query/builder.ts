/**
 * QueryBuilder.ts
 */
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

export interface RelationFilter extends FilterCondition {
  relationProperty: string;
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

/**
 * 第6引数 "propertyTypes" でモデルごとのプロパティタイプを受け取り、
 * なるべくハードコードを減らして動的にフィルタを生成する。
 */
export class QueryBuilder<T> {
  private filters: (FilterCondition | RelationFilter)[] = [];
  private sorts: SortCondition[] = [];
  private pageSize?: number;
  private startCursor?: string;
  private includedRelations: Set<string> = new Set();
  private relationCache: RelationCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分
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
    > = {}
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
  }

  /**
   * 単一のフィルタを追加する
   */
  where(
    property: keyof T | string,
    operator: FilterOperator,
    value: any
  ): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(property));
    if (this.isDebugMode) {
      logger.debug(
        `フィルター条件を追加: field=${String(
          property
        )}, property=${mappedProperty}, operator=${operator}, value=${JSON.stringify(
          value
        )}`
      );
    }
    this.filters.push({
      property: String(property),
      operator,
      value,
    });
    return this;
  }

  /**
   * リレーション先にも条件をかけたい場合
   */
  whereRelation<R>(
    relationProperty: keyof T | string,
    relationFilter: (builder: QueryBuilder<R>) => QueryBuilder<R>
  ): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(relationProperty));
    if (this.isDebugMode) {
      logger.debug(`リレーションフィルターを追加: ${mappedProperty}`);
    }

    const relatedDatabaseId =
      this.relationMappings[this.modelName]?.[String(relationProperty)];
    if (!relatedDatabaseId) {
      throw new Error(
        `リレーション "${String(
          relationProperty
        )}" のデータベースIDが見つかりません`
      );
    }

    // サブクエリを構築
    const subBuilder = new QueryBuilder<R>(
      this.notion,
      relatedDatabaseId,
      String(relationProperty),
      this.relationMappings,
      this.propertyMappings,
      this.propertyTypes
    );

    // サブフィルタを実行
    const builder = relationFilter(subBuilder);
    const subFilters = builder.getFilters();

    if (subFilters.length === 0) {
      throw new Error("リレーションフィルターには最低1つの条件が必要です");
    }
    const [subFilter] = subFilters;

    this.filters.push({
      property: mappedProperty,
      operator: subFilter.operator,
      value: subFilter.value,
      relationProperty: mappedProperty,
    });

    return this;
  }

  /**
   * リレーションをJOIN的に取得したい場合
   */
  include(relationProperty: keyof T | string): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(relationProperty));
    if (this.isDebugMode) {
      logger.debug(`リレーションを含める: ${mappedProperty}`);
    }
    this.includedRelations.add(mappedProperty);
    return this;
  }

  /**
   * ソート条件を追加する
   */
  orderBy(
    property: keyof T | string,
    direction: "ascending" | "descending" = "ascending"
  ): QueryBuilder<T> {
    const mappedProperty = this.getMappedPropertyName(String(property));
    if (this.isDebugMode) {
      logger.debug(
        `ソート条件を追加: property=${mappedProperty}, direction=${direction}`
      );
    }
    this.sorts.push({ property: mappedProperty, direction });
    return this;
  }

  /**
   * 1ページあたりの取得件数
   */
  limit(size: number): QueryBuilder<T> {
    if (this.isDebugMode) {
      logger.debug(`ページサイズを設定: ${size}`);
    }
    this.pageSize = size;
    return this;
  }

  /**
   * カーソルを指定して続きを取得したい場合
   */
  after(cursor: string): QueryBuilder<T> {
    if (this.isDebugMode) {
      logger.debug(`開始カーソルを設定: ${cursor}`);
    }
    this.startCursor = cursor;
    return this;
  }

  /**
   * 外部からフィルタ一覧を参照したい場合
   */
  getFilters(): (FilterCondition | RelationFilter)[] {
    return this.filters;
  }

  /**
   * propertyMappings から物理プロパティ名を取得
   */
  private getMappedPropertyName(property: string): string {
    const modelMap = this.propertyMappings[this.modelName] || {};
    if (modelMap[property]) {
      if (this.isDebugMode) {
        logger.debug(
          `プロパティマッピング: ${property} => ${modelMap[property]}`
        );
      }
      return modelMap[property];
    }
    if (this.isDebugMode) {
      logger.debug(`プロパティマッピングなし: ${property} をそのまま使用`);
    }
    return property;
  }

  /**
   * モデル設定から プロパティタイプ(NotionPropertyTypes) を取得
   */
  private getPropertyTypeFromModel(property: string): NotionPropertyTypes {
    const modelTypes = this.propertyTypes[this.modelName] || {};
    if (modelTypes[property]) {
      return modelTypes[property];
    }
    return NotionPropertyTypes.RichText; // フォールバック
  }

  /**
   * リレーションか否かを判断
   */
  private isRelationProperty(property: string): boolean {
    const modelTypes = this.propertyTypes[this.modelName] || {};
    const maybeRelation = modelTypes[property] === NotionPropertyTypes.Relation;
    const mappedRelation = this.relationMappings[this.modelName]?.[property];
    return Boolean(maybeRelation || mappedRelation);
  }

  /**
   * フィルタの実際のNotion API構造を組み立て
   */
  private buildFilter(condition: FilterCondition | RelationFilter): any {
    // リレーションフィルタの場合
    if ("relationProperty" in condition) {
      if (this.isDebugMode) {
        logger.debug(
          `リレーションフィルターを構築: property=${condition.relationProperty}, value=${condition.value}`
        );
      }
      return {
        property: condition.relationProperty,
        relation: {
          contains: String(condition.value),
        },
      };
    }

    const { property, operator, value } = condition;
    const mappedProperty = this.getMappedPropertyName(property);
    if (this.isRelationProperty(property)) {
      return {
        property: mappedProperty,
        relation: {
          contains: String(value),
        },
      };
    }

    // モデル設定から型を取得
    const propertyType = this.getPropertyTypeFromModel(property);
    if (this.isDebugMode) {
      logger.debug(`プロパティタイプ: ${propertyType}`);
    }

    const filter = {
      property: mappedProperty,
      [propertyType]: this.getFilterCondition(operator, value, propertyType),
    };
    if (this.isDebugMode) {
      logger.debug("生成されたフィルター:", JSON.stringify(filter, null, 2));
    }
    return filter;
  }

  /**
   * 演算子(operator) と 値(value) を Notion API 仕様に合わせる
   */
  private getFilterCondition(
    operator: FilterOperator,
    value: any,
    propertyType: NotionPropertyTypes
  ): any {
    switch (propertyType) {
      case NotionPropertyTypes.Checkbox:
        // checkbox は equals: true/false
        if (operator === "equals") {
          return { equals: Boolean(value) };
        }
        logger.warn(
          `checkbox プロパティで未対応の演算子 "${operator}"。equals(true/false) のみサポート`
        );
        return { equals: Boolean(value) };

      case NotionPropertyTypes.Title:
      case NotionPropertyTypes.RichText:
      case NotionPropertyTypes.Select:
      case NotionPropertyTypes.MultiSelect:
        // テキスト系: equals / contains / starts_with / ends_with / is_empty / is_not_empty
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
            logger.warn(
              `テキスト系プロパティで未対応の演算子 "${operator}"。equals を使用`
            );
            return { equals: String(value) };
        }

      case NotionPropertyTypes.Number:
        switch (operator) {
          case "equals":
            return { equals: Number(value) };
          // 追加で greater_than, less_than, といったものも実装可能
          default:
            logger.warn(
              `number プロパティに未対応の演算子 "${operator}"。equals を使用`
            );
            return { equals: Number(value) };
        }

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
            logger.warn(
              `date プロパティに未対応の演算子 "${operator}"。equals を使用`
            );
            return { equals: String(value) };
        }

      // People, Formula, Relation などの詳細フィルタは Notion API未対応 or 別途
      default:
        logger.warn(
          `プロパティタイプ "${propertyType}" に対する演算子 "${operator}" は未対応。equals(string) を使用`
        );
        return { equals: String(value) };
    }
  }

  /**
   * クエリをNotionに実行し、結果を T[] にマッピングして返す
   */
  async execute(): Promise<T[]> {
    try {
      const query: any = {
        database_id: this.databaseId,
      };

      // フィルタ条件
      if (this.filters.length > 0) {
        if (this.filters.length === 1) {
          query.filter = this.buildFilter(this.filters[0]);
        } else {
          // 複数なら AND 条件
          query.filter = {
            and: this.filters.map((f) => this.buildFilter(f)),
          };
        }
      }

      // ソート条件
      if (this.sorts.length > 0) {
        query.sorts = this.sorts.map((s) => this.buildSortCondition(s));
      }

      // ページサイズ・カーソル
      if (this.pageSize) {
        query.page_size = this.pageSize;
      }
      if (this.startCursor) {
        query.start_cursor = this.startCursor;
      }

      if (this.isDebugMode) {
        logger.debug(
          `クエリを実行: modelName=${this.modelName}`,
          JSON.stringify(query, null, 2)
        );
      }

      // Notion API 呼び出し
      const response = await this.notion.databases.query(query);
      if (this.isDebugMode) {
        logger.debug(`${response.results.length} 件の結果を取得`);
      }

      // 結果をモデルにマッピング
      const results = response.results.map((page: any) =>
        this.mapResponseToModel(page)
      );

      // リレーションの展開があれば実行
      if (this.includedRelations.size > 0) {
        await Promise.all(results.map((r) => this.loadRelations(r)));
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

  /**
   * ソート条件をNotion APIフォーマットに変換
   */
  private buildSortCondition(sort: SortCondition): any {
    const mappedProperty = this.getMappedPropertyName(String(sort.property));
    if (this.isDebugMode) {
      logger.debug(
        `ソート条件を構築: property=${mappedProperty}, direction=${sort.direction}`
      );
    }

    // createdTime, lastEditedTime はtimestamp指定
    let finalPropertyName = mappedProperty;
    if (mappedProperty === "createdTime" || mappedProperty === "Created At") {
      finalPropertyName = "created_time";
    } else if (mappedProperty === "lastEditedTime") {
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

    if (this.isDebugMode) {
      logger.debug(
        "生成されたソート条件:",
        JSON.stringify(sortCondition, null, 2)
      );
    }
    return sortCondition;
  }

  /**
   * リレーション先のデータを取得して埋め込む
   */
  private async loadRelations(model: any): Promise<void> {
    for (const relationProperty of this.includedRelations) {
      if (!model[relationProperty]) continue;
      const relationValue = model[relationProperty];
      const relationIds = Array.isArray(relationValue)
        ? relationValue.map((r: { id: string }) => r.id)
        : [relationValue.id];

      const relationData = await Promise.all(
        relationIds.map((id) => this.getRelationData(id))
      );

      model[relationProperty] = Array.isArray(relationValue)
        ? relationData
        : relationData[0];
    }
  }

  /**
   * リレーションページIDごとにデータをキャッシュ
   */
  private async getRelationData(id: string): Promise<any> {
    const cached = this.relationCache[id];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      if (this.isDebugMode) {
        logger.debug(`キャッシュを使用: relationID=${id}`);
      }
      return cached.data;
    }

    try {
      if (this.isDebugMode) {
        logger.debug(`リレーションデータを取得: page_id=${id}`);
      }
      const response = await this.notion.pages.retrieve({ page_id: id });
      const mappedData = this.mapResponseToModel(response);

      this.relationCache[id] = {
        data: mappedData,
        timestamp: Date.now(),
      };
      return mappedData;
    } catch (error) {
      logger.error(`リレーションデータの取得中にエラー (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * Notionのページレスポンス -> T 形式に変換
   */
  private mapResponseToModel(page: any): T {
    const props = page.properties;
    if (this.isDebugMode) {
      logger.debug(`レスポンスをモデルにマッピング: page.id=${page.id}`);
      logger.debug("ページのプロパティ:", JSON.stringify(props, null, 2));
    }

    const mapped = {
      id: page.id,
      ...Object.entries(props).reduce((acc: any, [key, propVal]) => {
        acc[key] = this.mapPropertyValue(propVal);
        return acc;
      }, {}),
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    } as T;

    if (this.isDebugMode) {
      logger.debug("マッピング結果:", JSON.stringify(mapped, null, 2));
    }
    return mapped;
  }

  /**
   * 取得したプロパティ値をJSの値に変換
   */
  private mapPropertyValue(property: any): any {
    if (!property || !property.type) {
      return null;
    }
    if (this.isDebugMode) {
      logger.debug("プロパティ値をマッピング:", property);
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
        // 文字列か数値か不明なので両方チェック
        return (
          property.formula?.string || property.formula?.number?.toString() || ""
        );
      default:
        logger.warn(`未サポートのNotionプロパティタイプ: ${property.type}`);
        return "";
    }
  }
}
