import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';
import { Document, Domain } from '../generated/types';

async function main() {
  try {
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // 特定のドメインに属するドキュメントを検索
    logger.info('技術ブログドメインのドキュメントを検索中...');
    const techDocs = await client.queryDocuments()
      .whereRelation('domain', domain => 
        domain.where('name', 'equals', '技術ブログ')
      )
      .orderBy('createdAt', 'desc')
      .execute();

    techDocs.forEach((doc: Document) => {
      logger.info('---Document---');
      logger.info(`Title: ${doc.title}`);
      logger.info(`Status: ${doc.status}`);
      logger.info(`Created At: ${doc.createdAt}`);
    });

    // ドメインとその関連ドキュメントを取得
    logger.info('\nアクティブなドメインとそのドキュメントを取得中...');
    const activeDomains = await client.queryDomains()
      .where('isActive', 'equals', true)
      .include('documents')
      .execute();

    activeDomains.forEach((domain: Domain) => {
      logger.info('---Domain---');
      logger.info(`Name: ${domain.name}`);
      logger.info(`Documents: ${domain.documents.length}`);
      domain.documents.forEach((doc: Document) => {
        logger.info(`  - ${doc.title}`);
      });
    });

  } catch (error) {
    logger.error('エラーが発生しました:', error);
  }
}

main();
