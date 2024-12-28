
import { Client } from '@notionhq/client';
import { Task } from './models';

export class NotionOrmClient {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  
  async getTask(id: string): Promise<Task> {
    const response = await this.notion.pages.retrieve({ page_id: id });
    return this.mapResponseToTask(response);
  }

  private mapResponseToTask(response: any): Task {
    return {
      
        完了: response.properties.完了?.checkbox
      ,

        注力: response.properties.注力?.checkbox
      ,

        Sub-item: response.properties.Sub-item?.any
      ,

        似てるページ: response.properties.似てるページ?.any
      ,

        日付: response.properties.日付?.date?.start || null
      ,

        責任者: response.properties.責任者?.any
      ,

        アーカイブ: response.properties.アーカイブ?.checkbox
      ,

        OYKOT Timeline: response.properties.OYKOT Timeline?.any
      ,

        Action: response.properties.Action?.any
      ,

        Objective進行度: response.properties.Objective進行度?.any
      ,

        Parent item: response.properties.Parent item?.any
      ,

        Action進行度: response.properties.Action進行度?.any
      ,

        Name: response.properties.Name?.title[0]?.plain_text || ""
      
    };
  }
  
}
