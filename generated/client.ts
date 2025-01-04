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

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
    this.notionClient = new NotionClient();

    // リレーションマッピングの定義
    this.relationMappings = {
      Document: {
        Domain: 'f6e300b8598e42208a2c163444655842'  // Domain database ID
      },
      Domain: {
        Documents: '13f70a52207f80d58f64cdc627123f87'  // Document database ID
      },
      Task: {
        'Sub-item': 'aac810fcb3414dbb9c46ce485bc6449b',
        'Parent item': 'aac810fcb3414dbb9c46ce485bc6449b',
        'Action': 'aac810fcb3414dbb9c46ce485bc6449b'
      }
    };

    // プロパティマッピングを完全に日本語に更新
    this.propertyMappings = {
      Document: {
        Title: 'Title',
        Content: 'Content',
        Status: 'Status',
        Domain: 'Domain',
        Tags: 'Tags',
        'Created At': 'Created At',
        Author: 'Author'
      },
      Domain: {
        Name: 'Name',
        Description: 'Description',
        IsActive: 'Is Active',
        Documents: 'Documents'
      },
      Task: {
        Name: 'Name',
        completed: 'completed',
        emphasized: 'emphasized',
        'Sub-item': 'Sub-item',
        date: 'date',
        manager: 'manager',
        archived: 'archived'
      }
    };

    // NotionClientの初期化を確認
    this.validateConnection().catch(error => {
      logger.error('Notionクライアントの初期化に失敗:', error);
      throw error;
    });
  }

  // 名前からドメインのUUIDを取得するメソッド
  async getDomainUuidByName(name: string): Promise<string | null> {
    try {
      logger.debug(`ドメイン名 "${name}" のUUIDを検索中...`);

      // まずデータベースのプロパティを取得して確認
      const database = await this.notion.databases.retrieve({
        database_id: "f6e300b8598e42208a2c163444655842"
      });

      logger.debug('利用可能なプロパティ:', database.properties);

      const response = await this.notion.databases.query({
        database_id: "f6e300b8598e42208a2c163444655842",
        filter: {
          property: "Name",
          title: {
            equals: name
          }
        },
        page_size: 1
      });

      if (response.results.length === 0) {
        logger.warn(`ドメイン "${name}" が見つかりませんでした`);
        return null;
      }

      const uuid = response.results[0].id;
      logger.debug(`ドメイン "${name}" のUUID: ${uuid}`);
      return uuid;
    } catch (error) {
      logger.error(`ドメイン "${name}" のUUID検索中にエラーが発生:`, error);
      throw error;
    }
  }

  // タイトルからドキュメントのUUIDを取得するメソッド
  async getDocumentUuidByTitle(title: string): Promise<string | null> {
    try {
      logger.debug(`タイトル "${title}" のUUIDを検索中...`);

      // まずデータベースのプロパティを取得して確認
      const database = await this.notion.databases.retrieve({
        database_id: "13f70a52207f80d58f64cdc627123f87"
      });

      logger.debug('利用可能なプロパティ:', database.properties);

      // データベースのプロパティ情報から正しいタイトルプロパティを探す
      const titleProperty = Object.entries(database.properties).find(
        ([_, prop]) => prop.type === 'title'
      )?.[0];

      if (!titleProperty) {
        logger.error('タイトルプロパティが見つかりませんでした');
        return null;
      }

      logger.debug(`タイトルプロパティ名: ${titleProperty}`);

      const response = await this.notion.databases.query({
        database_id: "13f70a52207f80d58f64cdc627123f87",
        filter: {
          property: titleProperty,
          title: {
            equals: title
          }
        },
        page_size: 1
      });

      if (response.results.length === 0) {
        logger.warn(`ドキュメント "${title}" が見つかりませんでした`);
        return null;
      }

      const uuid = response.results[0].id;
      logger.debug(`ドキュメント "${title}" のUUID: ${uuid}`);
      return uuid;
    } catch (error) {
      logger.error(`ドキュメント "${title}" のUUID検索中にエラーが発生:`, error);
      return null;
    }
  }

  // UUIDからドメインを取得
  async getDomainById(uuid: string): Promise<Domain | null> {
    try {
      logger.debug(`UUID ${uuid} のドメインを取得中...`);
      const response = await this.notion.pages.retrieve({ page_id: uuid });
      return this.mapResponseToDomain(response);
    } catch (error) {
      logger.error(`UUID ${uuid} のドメイン取得中にエラーが発生:`, error);
      return null;
    }
  }

  // UUIDからドキュメントを取得
  async getDocumentById(uuid: string): Promise<Document | null> {
    try {
      logger.debug(`UUID ${uuid} のドキュメントを取得中...`);
      const response = await this.notion.pages.retrieve({ page_id: uuid });
      return this.mapResponseToDocument(response);
    } catch (error) {
      logger.error(`UUID ${uuid} のドキュメント取得中にエラーが発生:`, error);
      return null;
    }
  }

  private mapResponseToDocument(page: any): Document {
    const props = page.properties;
    logger.debug('ドキュメントのマッピング:', { properties: props });

    return {
      id: page.id,
      Title: props['Title']?.title?.[0]?.plain_text || "",
      Content: props['Content']?.rich_text?.[0]?.plain_text || "",
      Status: props['Status']?.select?.name || "",
      Domain: props['Domain']?.relation?.map((item: any) => ({ id: item.id })) || [],
      Tags: props['Tags']?.multi_select?.map((item: any) => item.name) || [],
      'Created At': props['Created At']?.date?.start || null,
      Author: props['Author']?.people?.map((user: any) => ({
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
    logger.debug('ドメインのマッピング:', { properties: props });

    return {
      id: page.id,
      Name: props['Name']?.title?.[0]?.plain_text || "",
      Description: props['Description']?.rich_text?.[0]?.plain_text || "",
      IsActive: props['Is Active']?.checkbox || false,
      Documents: props['Documents']?.relation?.map((item: any) => ({ id: item.id })) || [],
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
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
}