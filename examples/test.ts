import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';

async function main() {
  try {
    // Notionクライアントの初期化
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // タスクの一覧を取得
    logger.info('タスク一覧を取得中...');
    const tasks = await client.listTasks();

    // 取得したタスクの情報を表示
    tasks.forEach(task => {
      logger.info('---Task---');
      logger.info(`Name: ${task.Name}`);
      logger.info(`完了: ${task['完了']}`);
      if (task['責任者'] && task['責任者'].length > 0) {
        logger.info(`責任者: ${task['責任者'].map(m => m.name).join(', ')}`);
      }
      if (task['日付']) {
        logger.info(`日付: ${task['日付']}`);
      }
    });

  } catch (error) {
    logger.error('エラーが発生しました:', error);
  }
}

main();