import { Client } from '@notionhq/client';
import { Task, Document, Domain } from './types';
import { QueryBuilder } from '../src/query/builder';

export class NotionOrmClient {
  private notion: Client;
  private relationMappings: Record<string, Record<string, string>>;
  private propertyMappings: Record<string, Record<string, string>>;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });

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

    // Define property mappings for correct field name mapping
    this.propertyMappings = {
      Document: {
        Title: 'Title',
        Content: 'Content',
        Status: 'Status',
        Domain: 'Domain',
        Tags: 'Tags',
        CreatedAt: 'Created At',
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
        completed: '完了',
        emphasized: '注力',
        'Sub-item': 'Sub-item',
        similarPage: '似てるページ',
        date: '日付',
        manager: '責任者',
        archived: 'アーカイブ',
        'OYKOT Timeline': 'OYKOT Timeline',
        Action: 'Action',
        objectiveProgress: 'Objective進行度',
        'Parent item': 'Parent item',
        actionProgress: 'Action進行度'
      }
    };
  }

  // Task related methods
  async getTask(id: string): Promise<Task> {
    const response = await this.notion.pages.retrieve({ page_id: id });
    return this.mapResponseToTask(response);
  }

  async listTasks(): Promise<Task[]> {
    const response = await this.notion.databases.query({
      database_id: "***REMOVED***"
    });
    return response.results.map(page => this.mapResponseToTask(page));
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

  // Document related methods
  async getDocument(id: string): Promise<Document> {
    const response = await this.notion.pages.retrieve({ page_id: id });
    return this.mapResponseToDocument(response);
  }

  async listDocuments(): Promise<Document[]> {
    const response = await this.notion.databases.query({
      database_id: "***REMOVED***"
    });
    return response.results.map(page => this.mapResponseToDocument(page));
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
    const props = page.properties;
    return {
      id: page.id,
      Title: props['Title']?.title?.[0]?.plain_text || "",
      Content: props['Content']?.rich_text?.[0]?.plain_text || "",
      Status: props['Status']?.select?.name || "",
      Domain: props['Domain']?.relation?.map((item: any) => ({ id: item.id })) || [],
      Tags: props['Tags']?.multi_select?.map((item: any) => item.name) || [],
      CreatedAt: props['Created At']?.date?.start || null,
      Author: props['Author']?.people?.map((user: any) => ({
        id: user.id,
        name: user.name || "",
        avatar_url: user.avatar_url
      })) || [],
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }

  // Domain related methods
  async getDomain(id: string): Promise<Domain> {
    const response = await this.notion.pages.retrieve({ page_id: id });
    return this.mapResponseToDomain(response);
  }

  async listDomains(): Promise<Domain[]> {
    const response = await this.notion.databases.query({
      database_id: "***REMOVED***"
    });
    return response.results.map(page => this.mapResponseToDomain(page));
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
    const props = page.properties;
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
}