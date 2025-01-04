import { Client } from '@notionhq/client';
import { Task, Document, Domain } from './types';
import { QueryBuilder } from '../src/query/builder';
import { logger } from '../src/utils/logger';

export class NotionOrmClient {
  private notion: Client;
  private relationMappings: Record<string, Record<string, string>>;
  private propertyMappings: Record<string, Record<string, string>>;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });

    // Define nested relation mappings structure
    this.relationMappings = {
      Document: {
        Domain: 'f6e300b8598e42208a2c163444655842'  // Domain database ID
      },
      Domain: {
        Documents: '13f70a52207f80d58f64cdc627123f87'  // Document database ID
      },
      Task: {
        'Sub-item': 'aac810fcb3414dbb9c46ce485bc6449b',  // Task database ID (self-reference)
        'Parent item': 'aac810fcb3414dbb9c46ce485bc6449b',  // Task database ID (self-reference)
        Action: 'aac810fcb3414dbb9c46ce485bc6449b'  // Task database ID (self-reference)
      }
    };

    // Define property mappings for correct field name mapping
    this.propertyMappings = {
      Document: {
        Title: 'Title',
        Content: 'Content',
        Status: 'Status',
        Domain: 'Domain',
        Tags: 'Tags',
        'Created At': 'Created At',  // Ensure exact match with Notion property name
        Author: 'Author'
      },
      Domain: {
        Name: 'Name',
        Description: 'Description',
        IsActive: 'Is Active',
        Documents: 'Documents'
      }
    };
  }

  // Document related methods
  async getDocument(id: string): Promise<Document> {
    const response = await this.notion.pages.retrieve({ page_id: id });
    return this.mapResponseToDocument(response);
  }

  async listDocuments(): Promise<Document[]> {
    const response = await this.notion.databases.query({
      database_id: "13f70a52207f80d58f64cdc627123f87"
    });
    return response.results.map(page => this.mapResponseToDocument(page));
  }

  queryDocuments(): QueryBuilder<Document> {
    return new QueryBuilder<Document>(
      this.notion,
      "13f70a52207f80d58f64cdc627123f87",
      "Document",
      this.relationMappings,
      this.propertyMappings
    );
  }

  private mapResponseToDocument(page: any): Document {
    const props = page.properties;
    logger.debug('Mapping Document response:', { properties: props });

    const mappedDoc = {
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

    logger.debug('Mapped Document:', mappedDoc);
    return mappedDoc;
  }

  // Domain related methods
  async getDomain(id: string): Promise<Domain> {
    const response = await this.notion.pages.retrieve({ page_id: id });
    return this.mapResponseToDomain(response);
  }

  async listDomains(): Promise<Domain[]> {
    const response = await this.notion.databases.query({
      database_id: "f6e300b8598e42208a2c163444655842"
    });
    return response.results.map(page => this.mapResponseToDomain(page));
  }

  queryDomains(): QueryBuilder<Domain> {
    return new QueryBuilder<Domain>(
      this.notion,
      "f6e300b8598e42208a2c163444655842",
      "Domain",
      this.relationMappings,
      this.propertyMappings
    );
  }

  private mapResponseToDomain(page: any): Domain {
    const props = page.properties;
    logger.debug('Mapping Domain response:', { properties: props });

    const mappedDomain = {
      id: page.id,
      Name: props['Name']?.title?.[0]?.plain_text || "",
      Description: props['Description']?.rich_text?.[0]?.plain_text || "",
      IsActive: props['Is Active']?.checkbox || false,
      Documents: props['Documents']?.relation?.map((item: any) => ({ id: item.id })) || [],
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };

    logger.debug('Mapped Domain:', mappedDomain);
    return mappedDomain;
  }
  // Task related methods
  async getTask(id: string): Promise<Task> {
    const response = await this.notion.pages.retrieve({ page_id: id });
    return this.mapResponseToTask(response);
  }

  async listTasks(): Promise<Task[]> {
    const response = await this.notion.databases.query({
      database_id: "aac810fcb3414dbb9c46ce485bc6449b"
    });
    return response.results.map(page => this.mapResponseToTask(page));
  }

  queryTasks(): QueryBuilder<Task> {
    return new QueryBuilder<Task>(
      this.notion,
      "aac810fcb3414dbb9c46ce485bc6449b",
      "Task",
      this.relationMappings,
      this.propertyMappings
    );
  }

  private mapResponseToTask(page: any): Task {
    const props = page.properties;
    return {
      id: page.id,
      Name: props['Name']?.title?.[0]?.plain_text || "",
      completed: props['完了']?.checkbox || false,
      emphasized: props['注力']?.checkbox || false,
      subItem: props['Sub-item']?.relation?.map((item: any) => ({ id: item.id })) || [],
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