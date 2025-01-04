
import { Client } from '@notionhq/client';
import { Task, Document, Domain } from './types';
import { QueryBuilder } from '../query/builder';

export class NotionOrmClient {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  
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
    return new QueryBuilder<Task>(this.notion, "aac810fcb3414dbb9c46ce485bc6449b", "Task");
  }

  private mapResponseToTask(page: any): Task {
    const props = page.properties;
    return {
      id: page.id,
      "完了": props['完了']?.checkbox || false,
      "注力": props['注力']?.checkbox || false,
      "Sub-item": props['Sub-item']?.relation?.map((item: any) => ({ id: item.id })) || [],
      "似てるページ": props['似てるページ']?.relation?.map((item: any) => ({ id: item.id })) || [],
      "日付": props['日付']?.date?.start || null,
      "責任者": props['責任者']?.people?.map((user: any) => ({
        id: user.id,
        name: user.name || "",
        avatar_url: user.avatar_url
      })) || [],
      "アーカイブ": props['アーカイブ']?.checkbox || false,
      "OYKOT Timeline": props['OYKOT Timeline']?.relation?.map((item: any) => ({ id: item.id })) || [],
      "Action": props['Action']?.relation?.map((item: any) => ({ id: item.id })) || [],
      "Objective進行度": props['Objective進行度']?.formula?.string || props['Objective進行度']?.formula?.number?.toString() || "",
      "Parent item": props['Parent item']?.relation?.map((item: any) => ({ id: item.id })) || [],
      "Action進行度": props['Action進行度']?.formula?.string || props['Action進行度']?.formula?.number?.toString() || "",
      "Name": props['Name']?.title?.[0]?.plain_text || "",
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }
  

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
    return new QueryBuilder<Document>(this.notion, "13f70a52207f80d58f64cdc627123f87", "Document");
  }

  private mapResponseToDocument(page: any): Document {
    const props = page.properties;
    return {
      id: page.id,
      "Domain": props['Domain']?.relation?.map((item: any) => ({ id: item.id })) || [],
      "作成日時": String(props['作成日時'] || ""),
      "作成者": String(props['作成者'] || ""),
      "サブドメイン候補": props['サブドメイン候補']?.multi_select?.map((item: any) => item.name) || [],
      "Name": props['Name']?.title?.[0]?.plain_text || "",
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }
  

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
    return new QueryBuilder<Domain>(this.notion, "f6e300b8598e42208a2c163444655842", "Domain");
  }

  private mapResponseToDomain(page: any): Domain {
    const props = page.properties;
    return {
      id: page.id,
      "description": props['description']?.rich_text?.[0]?.plain_text || "",
      "Domainとのリレーション（Parent item）": props['Domainとのリレーション（Parent item）']?.relation?.map((item: any) => ({ id: item.id })) || [],
      "🏖️ 議事録": props['🏖️ 議事録']?.relation?.map((item: any) => ({ id: item.id })) || [],
      "Archive": props['Archive']?.checkbox || false,
      "Parent item": props['Parent item']?.relation?.map((item: any) => ({ id: item.id })) || [],
      "Name": props['Name']?.title?.[0]?.plain_text || "",
      "Person": props['Person']?.people?.map((user: any) => ({
        id: user.id,
        name: user.name || "",
        avatar_url: user.avatar_url
      })) || [],
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }
  
}
