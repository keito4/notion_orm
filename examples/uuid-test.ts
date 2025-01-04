import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';

async function main() {
  try {
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // ドメイン名からUUIDを取得
    logger.info('技術ブログドメインのUUIDを検索中...');
    const techBlogUuid = await client.getDomainUuidByName('技術ブログ');
    
    if (techBlogUuid) {
      logger.info(`Found UUID for 技術ブログ: ${techBlogUuid}`);

      // 取得したUUIDを使用してドメインの詳細を取得
      const domainDetails = await client.getDomainById(techBlogUuid);
      if (domainDetails) {
        logger.info('---Domain Details---');
        logger.info(`Name: ${domainDetails.Name}`);
        logger.info(`Description: ${domainDetails.Description}`);
        logger.info(`Is Active: ${domainDetails.IsActive}`);
      }
    } else {
      logger.warn('技術ブログドメインが見つかりませんでした');
    }

    // ドキュメントのタイトルからUUIDを取得
    logger.info('\nドキュメントをタイトルで検索中...');
    const sampleTitle = 'Getting Started';
    const documentUuid = await client.getDocumentUuidByTitle(sampleTitle);

    if (documentUuid) {
      logger.info(`Found UUID for document "${sampleTitle}": ${documentUuid}`);

      // 取得したUUIDを使用してドキュメントの詳細を取得
      const documentDetails = await client.getDocumentById(documentUuid);
      if (documentDetails) {
        logger.info('---Document Details---');
        logger.info(`Title: ${documentDetails.Title}`);
        logger.info(`Status: ${documentDetails.Status}`);
        logger.info(`Created At: ${documentDetails['Created At']}`);
      }
    } else {
      logger.warn(`ドキュメント "${sampleTitle}" が見つかりませんでした`);
    }

  } catch (error) {
    logger.error('エラーが発生しました:', error);
  }
}

main();
