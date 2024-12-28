import { Client } from '@notionhq/client';
import { Task, Document, Domain } from './types';
import { QueryBuilder } from '../query/builder';

export class NotionOrmClient {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
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
    return new QueryBuilder<Task>(this.notion, "***REMOVED***", "Task");
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
    return new QueryBuilder<Document>(this.notion, "***REMOVED***", "Document");
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
    return new QueryBuilder<Domain>(this.notion, "***REMOVED***", "Domain");
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