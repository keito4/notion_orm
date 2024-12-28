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
}