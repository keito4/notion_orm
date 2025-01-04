import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';
import { Document, Domain } from '../generated/types';

async function main() {
  try {
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // まず技術ブログドメインを名前で検索
    logger.info('技術ブログドメインを検索中...');
    const techDomain = await client.findDomainByName('技術ブログ');

    if (!techDomain) {
      logger.warn('技術ブログドメインが見つかりませんでした');
      return;
    }

    const techDomainId = techDomain.id;
    logger.info(`技術ブログドメインのID: ${techDomainId}`);

    // 取得したドメインIDを使用してドキュメントを検索
    logger.info('技術ブログドメインのドキュメントを検索中...');
    const techDocs = await client.queryDocuments()
      .where('Domain', 'contains', techDomainId)
      .include('Domain')
      .orderBy('Created At', 'descending')
      .execute();

    logger.info(`Found ${techDocs.length} documents in 技術ブログ domain`);
    techDocs.forEach((doc: Document) => {
      logger.info('---Document---');
      logger.info(`Title: ${doc.Title}`);
      logger.info(`Status: ${doc.Status}`);
      logger.info(`Created At: ${doc['Created At']}`);
      if (doc.Domain && doc.Domain.length > 0) {
        doc.Domain.forEach(domain => {
          logger.info(`Domain ID: ${domain.id}`);
        });
      }
    });

    // Test 2: Query active domains and their documents
    logger.info('\nQuerying active domains and their documents...');
    const activeDomains = await client.queryDomains()
      .where('IsActive', 'equals', true)
      .include('Documents')
      .execute();

    logger.info(`Found ${activeDomains.length} active domains`);
    activeDomains.forEach((domain: Domain) => {
      logger.info('---Domain---');
      logger.info(`Name: ${domain.Name}`);
      logger.info(`Description: ${domain.Description}`);
      if (domain.Documents && domain.Documents.length > 0) {
        logger.info(`Documents: ${domain.Documents.length}`);
        domain.Documents.forEach((doc) => {
          logger.info(`  - Document ID: ${doc.id}`);
        });
      }
    });

  } catch (error) {
    logger.error('エラーが発生しました:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
    }
  }
}

main();