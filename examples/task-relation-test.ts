import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';
import { Task } from '../generated/types';

async function main() {
  try {
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // サブタスクを持つタスクを検索
    logger.info('サブタスクを持つタスクを検索中...');
    const tasksWithSubItems = await client.queryTasks()
      .where('Sub-item', 'is_not_empty', true)
      .include('Sub-item')
      .orderBy('Name', 'ascending')
      .limit(5)
      .execute();

    tasksWithSubItems.forEach((task: Task) => {
      logger.info('---Task with Sub-items---');
      logger.info(`Name: ${task.Name}`);
      logger.info(`Sub-items: ${task['subItem']?.length || 0}`);
      if (task['subItem'] && task['subItem'].length > 0) {
        task['subItem'].forEach(subItem => {
          logger.info(`  - Sub-item ID: ${subItem.id}`);
        });
      }
    });

    // Parent itemを持つタスクを検索
    logger.info('\nParent itemを持つタスクを検索中...');
    const tasksWithParent = await client.queryTasks()
      .where('Parent item', 'is_not_empty', true)
      .include('Parent item')
      .orderBy('Name', 'ascending')
      .execute();

    tasksWithParent.forEach((task: Task) => {
      logger.info('---Task with Parent---');
      logger.info(`Name: ${task.Name}`);
      if (task['parentItem'] && task['parentItem'].length > 0) {
        task['parentItem'].forEach(parent => {
          logger.info(`  - Parent item ID: ${parent.id}`);
        });
      }
    });

    // アクションと関連付けられたタスクを検索
    logger.info('\nアクションと関連付けられたタスクを検索中...');
    const tasksWithActions = await client.queryTasks()
      .where('Action', 'is_not_empty', true)
      .where('completed', 'equals', false)
      .include('Action')
      .orderBy('Name', 'ascending')
      .execute();

    tasksWithActions.forEach((task: Task) => {
      logger.info('---Task with Actions---');
      logger.info(`Name: ${task.Name}`);
      logger.info(`Actions: ${task.action?.length || 0}`);
      if (task.action && task.action.length > 0) {
        task.action.forEach(action => {
          logger.info(`  - Action ID: ${action.id}`);
        });
      }
    });

  } catch (error) {
    logger.error('エラーが発生しました:', error);
  }
}

main();