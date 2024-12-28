
import { Client } from '@notionhq/client';
import { Task } from './types';
import { QueryBuilder } from '../query/builder';

interface NotionPropertyValue {
  id: string;
  type: string;
  [key: string]: any;
}

interface NotionPage {
  id: string;
  properties: Record<string, NotionPropertyValue>;
  created_time: string;
  last_edited_time: string;
}

interface NotionUser {
  id: string;
  name?: string;
  avatar_url?: string;
}

interface NotionRelation {
  id: string;
}

export class NotionOrmClient {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  
  async getTask(id: string): Promise<Task> {
    const response = await this.notion.pages.retrieve({ page_id: id }) as NotionPage;
    return this.mapResponseToTask(response);
  }

  async listTasks(): Promise<Task[]> {
    const response = await this.notion.databases.query({
      database_id: "***REMOVED***"
    });
    return response.results.map(page => this.mapResponseToTask(page as NotionPage));
  }

  queryTasks(): QueryBuilder<Task> {
    return new QueryBuilder<Task>(this.notion, "***REMOVED***", "Task");
  }

  private mapResponseToTask(response: NotionPage): Task {
    const props = response.properties;
    return {
      id: response.id,
      "完了": props['完了']?.checkbox || false,
      "注力": props['注力']?.checkbox || false,
      "Sub-item": props['Sub-item']?.relation?.map((item: NotionRelation) => ({ id: item.id })) || [],
      "似てるページ": props['似てるページ']?.relation?.map((item: NotionRelation) => ({ id: item.id })) || [],
      "日付": props['日付']?.date?.start || null,
      "責任者": props['責任者']?.people?.map((user: NotionUser) => ({
        id: user.id,
        name: user.name || "",
        avatar_url: user.avatar_url
      })) || [],
      "アーカイブ": props['アーカイブ']?.checkbox || false,
      "OYKOT Timeline": props['OYKOT Timeline']?.relation?.map((item: NotionRelation) => ({ id: item.id })) || [],
      "Action": props['Action']?.relation?.map((item: NotionRelation) => ({ id: item.id })) || [],
      "Objective進行度": props['Objective進行度']?.formula?.string || props['Objective進行度']?.formula?.number?.toString() || "",
      "Parent item": props['Parent item']?.relation?.map((item: NotionRelation) => ({ id: item.id })) || [],
      "Action進行度": props['Action進行度']?.formula?.string || props['Action進行度']?.formula?.number?.toString() || "",
      "Name": props['Name']?.title?.[0]?.plain_text || "",
      createdTime: response.created_time,
      lastEditedTime: response.last_edited_time
    };
  }
  
}
