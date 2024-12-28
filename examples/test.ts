import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';
import { Task } from '../generated/types';

async function main() {
  try {
    // Notionクライアントの初期化
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // クエリビルダーを使用してタスクを検索
    logger.info('完了済みのタスクを取得中...');
    const completedTasks = await client.queryTasks()
      .where('完了', 'equals', true)
      .orderBy('Name', 'ascending')
      .limit(5)
      .execute();

    // 取得したタスクの情報を表示
    completedTasks.forEach((task: Task) => {
      logger.info('---Completed Task---');
      logger.info(`Name: ${task.Name}`);
      logger.info(`完了: ${task['完了']}`);
      if (task['責任者'] && task['責任者'].length > 0) {
        logger.info(`責任者: ${task['責任者'].map(m => m.name).join(', ')}`);
      }
      if (task['日付']) {
        logger.info(`日付: ${task['日付']}`);
      }
    });

    // 特定の日付以降のタスクを取得
    logger.info('\n特定の日付以降のタスクを取得中...');
    const recentTasks = await client.queryTasks()
      .where('日付', 'after', '2023-12-01')
      .orderBy('日付', 'descending')
      .execute();

    recentTasks.forEach((task: Task) => {
      logger.info('---Recent Task---');
      logger.info(`Name: ${task.Name}`);
      logger.info(`日付: ${task['日付']}`);
    });

  } catch (error) {
    logger.error('エラーが発生しました:', error);
  }
}

main();