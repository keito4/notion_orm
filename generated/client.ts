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

    // Define nested relation mappings structure
    this.relationMappings = {
      Document: {
        Domain: '***REMOVED***'  // Domain database ID
      },
      Domain: {
        Documents: '***REMOVED***'  // Document database ID
      },
      Task: {
        'Sub-item': '***REMOVED***',  // Task database ID (self-reference)
        'Parent item': '***REMOVED***',  // Task database ID (self-reference)
        Action: '***REMOVED***'  // Task database ID (self-reference)
      }
    };

    // プロパティマッピングを更新
    this.propertyMappings = {
      Document: {
        Title: 'タイトル',  // 日本語のプロパティ名に対応
        Content: 'コンテンツ',
        Status: 'ステータス',
        Domain: 'ドメイン',
        Tags: 'タグ',
        'Created At': '作成日時',
        Author: '作成者'
      },
      Domain: {
        Name: '名前',  // 日本語のプロパティ名に対応
        Description: '説明',
        IsActive: 'アクティブ',
        Documents: 'ドキュメント'
      },
      Task: {
        Name: '名前',
        completed: '完了',
        emphasized: '注力',
        'Sub-item': 'サブアイテム',
        date: '日付',
        manager: '責任者',
        archived: 'アーカイブ'
      }
    };

    // NotionClientの初期化を確認
    this.validateConnection().catch(error => {
      logger.error('Failed to initialize NotionOrmClient:', error);
      throw error;
    });
  }

  private async validateConnection(): Promise<void> {
    try {
      const isConnected = await this.notionClient.validateConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Notion API');
      }
      logger.success('NotionOrmClient initialized successfully');
    } catch (error) {
      logger.error('Error validating Notion connection:', error);
      throw error;
    }
  }

  // UUIDに関連する新しいメソッド

  // UUIDからドメインを取得
  async getDomainById(uuid: string): Promise<Domain | null> {
    try {
      logger.debug(`Fetching domain with UUID: ${uuid}`);
      const response = await this.notion.pages.retrieve({ page_id: uuid });
      return this.mapResponseToDomain(response);
    } catch (error) {
      logger.error(`Error fetching domain with UUID ${uuid}:`, error);
      return null;
    }
  }

  // 名前からドメインのUUIDを取得
  async getDomainUuidByName(name: string): Promise<string | null> {
    try {
      logger.debug(`Finding domain UUID for name: ${name}`);
      const response = await this.notion.databases.query({
        database_id: "***REMOVED***",
        filter: {
          property: "名前",  // 日本語のプロパティ名を使用
          title: {
            equals: name
          }
        },
        page_size: 1
      });

      if (response.results.length === 0) {
        logger.warn(`No domain found with name "${name}"`);
        return null;
      }

      const uuid = response.results[0].id;
      logger.debug(`Found UUID for domain "${name}": ${uuid}`);
      return uuid;
    } catch (error) {
      logger.error(`Error finding UUID for domain "${name}":`, error);
      return null;
    }
  }

  // 同様にドキュメントに関するUUIDメソッドを追加
  async getDocumentById(uuid: string): Promise<Document | null> {
    try {
      logger.debug(`Fetching document with UUID: ${uuid}`);
      const response = await this.notion.pages.retrieve({ page_id: uuid });
      return this.mapResponseToDocument(response);
    } catch (error) {
      logger.error(`Error fetching document with UUID ${uuid}:`, error);
      return null;
    }
  }

  async getDocumentUuidByTitle(title: string): Promise<string | null> {
    try {
      logger.debug(`Finding document UUID for title: ${title}`);
      const response = await this.notion.databases.query({
        database_id: "***REMOVED***",
        filter: {
          property: "タイトル",  // 日本語のプロパティ名を使用
          title: {
            equals: title
          }
        },
        page_size: 1
      });

      if (response.results.length === 0) {
        logger.warn(`No document found with title "${title}"`);
        return null;
      }

      const uuid = response.results[0].id;
      logger.debug(`Found UUID for document "${title}": ${uuid}`);
      return uuid;
    } catch (error) {
      logger.error(`Error finding UUID for document "${title}":`, error);
      return null;
    }
  }

  // Document related methods
  async getDocument(id: string): Promise<Document> {
    try {
      const response = await this.notion.pages.retrieve({ page_id: id });
      return this.mapResponseToDocument(response);
    } catch (error) {
      logger.error('Error retrieving document:', error);
      throw error;
    }
  }

  async listDocuments(): Promise<Document[]> {
    try {
      const response = await this.notion.databases.query({
        database_id: "***REMOVED***"
      });
      return response.results.map(page => this.mapResponseToDocument(page));
    } catch (error) {
      logger.error('Error listing documents:', error);
      throw error;
    }
  }

  queryDocuments(): QueryBuilder<Document> {
    return new QueryBuilder<Document>(
      this.notion,
      "***REMOVED***",
      "Document",
      this.relationMappings,
      this.propertyMappings
    );
  }

  private mapResponseToDocument(page: any): Document {
    try {
      const props = page.properties;
      logger.debug('Mapping Document response:', { properties: props });

      const mappedDoc = {
        id: page.id,
        Title: props['タイトル']?.title?.[0]?.plain_text || "",
        Content: props['コンテンツ']?.rich_text?.[0]?.plain_text || "",
        Status: props['ステータス']?.select?.name || "",
        Domain: props['ドメイン']?.relation?.map((item: any) => ({ id: item.id })) || [],
        Tags: props['タグ']?.multi_select?.map((item: any) => item.name) || [],
        'Created At': props['作成日時']?.date?.start || null,
        Author: props['作成者']?.people?.map((user: any) => ({
          id: user.id,
          name: user.name || "",
          avatar_url: user.avatar_url
        })) || [],
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      };

      logger.debug('Mapped Document:', mappedDoc);
      return mappedDoc;
    } catch (error) {
      logger.error('Error mapping document response:', error);
      throw error;
    }
  }

  // Domain related methods
  async getDomain(id: string): Promise<Domain> {
    try {
      const response = await this.notion.pages.retrieve({ page_id: id });
      return this.mapResponseToDomain(response);
    } catch (error) {
      logger.error('Error retrieving domain:', error);
      throw error;
    }
  }

  async listDomains(): Promise<Domain[]> {
    try {
      const response = await this.notion.databases.query({
        database_id: "***REMOVED***"
      });
      return response.results.map(page => this.mapResponseToDomain(page));
    } catch (error) {
      logger.error('Error listing domains:', error);
      throw error;
    }
  }

  queryDomains(): QueryBuilder<Domain> {
    return new QueryBuilder<Domain>(
      this.notion,
      "***REMOVED***",
      "Domain",
      this.relationMappings,
      this.propertyMappings
    );
  }

  private mapResponseToDomain(page: any): Domain {
    try {
      const props = page.properties;
      logger.debug('Mapping Domain response:', { properties: props });

      const mappedDomain = {
        id: page.id,
        Name: props['名前']?.title?.[0]?.plain_text || "",
        Description: props['説明']?.rich_text?.[0]?.plain_text || "",
        IsActive: props['アクティブ']?.checkbox || false,
        Documents: props['ドキュメント']?.relation?.map((item: any) => ({ id: item.id })) || [],
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      };

      logger.debug('Mapped Domain:', mappedDomain);
      return mappedDomain;
    } catch (error) {
      logger.error('Error mapping domain response:', error);
      throw error;
    }
  }
  // ドメイン名からUUIDを取得するための新しいメソッド
  async findDomainByName(name: string): Promise<Domain | null> {
    try {
      logger.debug(`Finding domain with name: ${name}`);
      const response = await this.notion.databases.query({
        database_id: "***REMOVED***",
        filter: {
          property: "Name",
          title: {
            equals: name
          }
        },
        page_size: 1
      });

      if (response.results.length === 0) {
        logger.warn(`Domain with name "${name}" not found`);
        return null;
      }

      const domain = this.mapResponseToDomain(response.results[0]);
      logger.debug(`Found domain:`, domain);
      return domain;
    } catch (error) {
      logger.error(`Error finding domain by name "${name}":`, error);
      throw error;
    }
  }

  // Task related methods
  async getTask(id: string): Promise<Task> {
    try {
      const response = await this.notion.pages.retrieve({ page_id: id });
      return this.mapResponseToTask(response);
    } catch (error) {
      logger.error('Error retrieving task:', error);
      throw error;
    }
  }

  async listTasks(): Promise<Task[]> {
    try {
      const response = await this.notion.databases.query({
        database_id: "***REMOVED***"
      });
      return response.results.map(page => this.mapResponseToTask(page));
    } catch (error) {
      logger.error('Error listing tasks:', error);
      throw error;
    }
  }

  queryTasks(): QueryBuilder<Task> {
    return new QueryBuilder<Task>(
      this.notion,
      "***REMOVED***",
      "Task",
      this.relationMappings,
      this.propertyMappings
    );
  }

  private mapResponseToTask(page: any): Task {
    const props = page.properties;
    return {
      id: page.id,
      Name: props['名前']?.title?.[0]?.plain_text || "",
      completed: props['完了']?.checkbox || false,
      emphasized: props['注力']?.checkbox || false,
      subItem: props['サブアイテム']?.relation?.map((item: any) => ({ id: item.id })) || [],
      similarPage: props['似てるページ']?.relation?.map((item: any) => ({ id: item.id })) || [],
      date: props['日付']?.date?.start || null,
      manager: props['責任者']?.people?.map((user: any) => ({
        id: user.id,
        name: user.name || "",
        avatar_url: user.avatar_url
      })) || [],
      archived: props['アーカイブ']?.checkbox || false,
      oykotTimeline: props['OYKOT Timeline']?.relation?.map((item: any) => ({ id: item.id })) || [],
      action: props['Action']?.relation?.map((item: any) => ({ id: item.id })) || [],
      objectiveProgress: props['Objective進行度']?.formula?.string || "",
      parentItem: props['Parent item']?.relation?.map((item: any) => ({ id: item.id })) || [],
      actionProgress: props['Action進行度']?.formula?.string || "",
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }
}