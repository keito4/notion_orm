import { Client } from '@notionhq/client';
import { Task, Document, Domain } from './types';
import { QueryBuilder } from '../src/query/builder';
import { logger } from '../src/utils/logger';
import { NotionClient } from '../src/notion/client';

export class NotionOrmClient {
  private notion: Client;
  private notionClient: NotionClient;
  private relationMappings: Record<string, Record<string, string>>;
  private propertyMappings: Record<string, Record<string, string>>;
  private readonly QUERY_TIMEOUT = 10000; // 10秒のタイムアウト
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1秒

  // データベースIDの定数
  private readonly DATABASE_IDS = {
    DOMAIN: 'f6e300b8-598e-4220-8a2c-163444655842',
    DOCUMENT: '13f70a52-207f-80d5-8f64-cdc627123f87',
    TASK: 'aac810fc-b341-4dbb-9c46-ce485bc6449b'
  };

  constructor(apiKey: string) {
    this.notion = new Client({ 
      auth: apiKey,
      notionVersion: '2022-06-28'
    });
    this.notionClient = new NotionClient();

    // リレーションマッピングの更新
    this.relationMappings = {
      Document: {
        domain: this.DATABASE_IDS.DOMAIN
      },
      Domain: {
        documents: this.DATABASE_IDS.DOCUMENT
      },
      Task: {
        'Sub-item': this.DATABASE_IDS.TASK,
        'Parent item': this.DATABASE_IDS.TASK
      }
    };

    // プロパティマッピングの更新
    this.propertyMappings = {
      Document: {
        title: 'Title',
        content: 'Content',
        status: 'Status',
        domain: 'Domain',
        tags: 'Tags',
        createdAt: 'Created At',
        author: 'Author'
      },
      Domain: {
        name: 'Name',
        description: 'Description',
        isActive: 'Archive',
        documents: 'Documents'
      }
    };

    // 初期化時にNotionクライアントの検証を行う
    this.validateConnection().catch(error => {
      logger.error('Notionクライアントの初期化に失敗:', error);
      throw error;
    });
  }

  private async retryOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<T> {
    let lastError: Error | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${operationName || '操作'}がタイムアウトしました`)), this.QUERY_TIMEOUT);
    });

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        logger.debug(`試行 ${attempt}/${this.MAX_RETRIES} ${operationName || ''}`);
        const operationPromise = operation();
        return await Promise.race([operationPromise, timeoutPromise]);
      } catch (error: any) {
        lastError = error;
        logger.warn(`試行 ${attempt} が失敗:`, error);

        if (error.message.includes('タイムアウト')) {
          logger.error('操作がタイムアウトしました');
          break;
        }

        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * attempt;
          logger.debug(`${delay}ms待機して再試行します`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      logger.error(`${operationName || '操作'}が${this.MAX_RETRIES}回試行後も失敗しました`);
      throw lastError;
    }

    throw new Error(`${operationName || '操作'}が予期せぬ理由で失敗しました`);
  }

  async getDomainUuidByName(name: string): Promise<string | null> {
    try {
      logger.debug(`ドメイン名 "${name}" のUUIDを検索中...`);

      // データベースのプロパティ構造を取得
      const database = await this.retryOperation(
        () => this.notion.databases.retrieve({
          database_id: this.DATABASE_IDS.DOMAIN
        }),
        'データベース情報の取得'
      );

      logger.debug('データベースのプロパティ:', database.properties);

      // タイトルプロパティを探す（Nameプロパティ）
      const titleProperty = Object.entries(database.properties).find(
        ([key, prop]) => prop.type === 'title' && key === 'Name'
      );

      if (!titleProperty) {
        logger.error('Nameプロパティが見つかりませんでした');
        return null;
      }

      const [propertyName] = titleProperty;
      logger.debug(`使用するタイトルプロパティ名: ${propertyName}`);

      // 検索クエリの構築
      const queryFilter = {
        database_id: this.DATABASE_IDS.DOMAIN,
        filter: {
          property: propertyName,
          title: {
            equals: name
          }
        },
        page_size: 1
      };

      logger.debug('実行するクエリ:', JSON.stringify(queryFilter, null, 2));

      // クエリの実行
      const queryResponse = await this.retryOperation(
        () => this.notion.databases.query(queryFilter),
        'ドメインの検索'
      );

      logger.debug(`クエリ応答:`, JSON.stringify(queryResponse, null, 2));
      logger.debug(`クエリ結果: ${queryResponse.results.length} 件のドメインが見つかりました`);

      if (queryResponse.results.length === 0) {
        logger.warn(`ドメイン "${name}" が見つかりませんでした`);
        return null;
      }

      const uuid = queryResponse.results[0].id;
      logger.debug(`ドメイン "${name}" のUUID: ${uuid}`);
      return uuid;

    } catch (error) {
      logger.error(`ドメイン "${name}" のUUID検索中にエラーが発生:`, error);
      if (error instanceof Error) {
        logger.error('エラーの詳細:', error.message);
        logger.error('スタックトレース:', error.stack);
        if ('code' in error) {
          logger.error('エラーコード:', (error as any).code);
        }
      }
      return null;
    }
  }

  async getDomainById(uuid: string): Promise<Domain | null> {
    try {
      logger.debug(`UUID ${uuid} のドメインを取得中...`);
      const response = await this.retryOperation(
        () => this.notion.pages.retrieve({ page_id: uuid }),
        'ドメイン情報の取得'
      );
      return this.mapResponseToDomain(response);
    } catch (error) {
      logger.error(`UUID ${uuid} のドメイン取得中にエラーが発生:`, error);
      return null;
    }
  }

  async getDocumentUuidByTitle(title: string): Promise<string | null> {
    try {
      logger.debug(`タイトル "${title}" のUUIDを検索中...`);

      // データベースのプロパティ構造を取得
      const database = await this.retryOperation(
        () => this.notion.databases.retrieve({
          database_id: this.DATABASE_IDS.DOCUMENT
        }),
        'ドキュメントデータベース情報の取得'
      );

      logger.debug('データベースのプロパティ:', database.properties);

      // タイトルプロパティを探す
      const titleProperty = Object.entries(database.properties).find(
        ([key, prop]) => prop.type === 'title' && key === 'Title'
      );

      if (!titleProperty) {
        logger.error('Titleプロパティが見つかりませんでした');
        return null;
      }

      const [propertyName] = titleProperty;
      logger.debug(`使用するタイトルプロパティ名: ${propertyName}`);

      // 検索クエリの構築
      const queryFilter = {
        database_id: this.DATABASE_IDS.DOCUMENT,
        filter: {
          property: propertyName,
          title: {
            equals: title
          }
        },
        page_size: 1
      };

      logger.debug('実行するクエリ:', JSON.stringify(queryFilter, null, 2));

      // クエリの実行
      const queryResponse = await this.retryOperation(
        () => this.notion.databases.query(queryFilter),
        'ドキュメントの検索'
      );

      logger.debug(`クエリ応答:`, JSON.stringify(queryResponse, null, 2));
      logger.debug(`クエリ結果: ${queryResponse.results.length} 件のドキュメントが見つかりました`);

      if (queryResponse.results.length === 0) {
        logger.warn(`ドキュメント "${title}" が見つかりませんでした`);
        return null;
      }

      const uuid = queryResponse.results[0].id;
      logger.debug(`ドキュメント "${title}" のUUID: ${uuid}`);
      return uuid;

    } catch (error) {
      logger.error(`ドキュメント "${title}" のUUID検索中にエラーが発生:`, error);
      if (error instanceof Error) {
        logger.error('エラーの詳細:', error.message);
        logger.error('スタックトレース:', error.stack);
        if ('code' in error) {
          logger.error('エラーコード:', (error as any).code);
        }
      }
      return null;
    }
  }

  async getDocumentById(uuid: string): Promise<Document | null> {
    try {
      logger.debug(`UUID ${uuid} のドキュメントを取得中...`);
      const response = await this.retryOperation(
        () => this.notion.pages.retrieve({ page_id: uuid }),
        'ドキュメント情報の取得'
      );
      return this.mapResponseToDocument(response);
    } catch (error) {
      logger.error(`UUID ${uuid} のドキュメント取得中にエラーが発生:`, error);
      return null;
    }
  }

  private async validateConnection(): Promise<void> {
    try {
      const isConnected = await this.notionClient.validateConnection();
      if (!isConnected) {
        throw new Error('Notion APIへの接続に失敗しました');
      }
      logger.success('NotionOrmClientの初期化に成功しました');
    } catch (error) {
      logger.error('Notion接続の検証中にエラーが発生:', error);
      throw error;
    }
  }

  private mapResponseToDocument(page: any): Document {
    const props = page.properties;
    logger.debug('ドキュメントのマッピング:', props);

    const mappings = this.propertyMappings.Document;
    return {
      id: page.id,
      Title: props[mappings.title]?.title?.[0]?.plain_text || "",
      Content: props[mappings.content]?.rich_text?.[0]?.plain_text || "",
      Status: props[mappings.status]?.select?.name || "",
      Domain: props[mappings.domain]?.relation?.map((item: any) => ({ id: item.id })) || [],
      Tags: props[mappings.tags]?.multi_select?.map((item: any) => item.name) || [],
      'Created At': props[mappings.createdAt]?.date?.start || null,
      Author: props[mappings.author]?.people?.map((user: any) => ({
        id: user.id,
        name: user.name || "",
        avatar_url: user.avatar_url
      })) || [],
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }

  private mapResponseToDomain(page: any): Domain {
    const props = page.properties;
    logger.debug('ドメインのマッピング:', props);

    const mappings = this.propertyMappings.Domain;
    return {
      id: page.id,
      Name: props[mappings.name]?.title?.[0]?.plain_text || "",
      Description: props[mappings.description]?.rich_text?.[0]?.plain_text || "",
      IsActive: !props[mappings.isActive]?.checkbox,  // Archiveの値を反転
      Documents: props[mappings.documents]?.relation?.map((item: any) => ({ id: item.id })) || [],
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }
}