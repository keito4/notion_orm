import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';

async function main() {
  try {
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // ドメイン名からUUIDを取得
    logger.info('技術ブログドメインのUUIDを検索中...');
    const techBlogUuid = await client.getDomainUuidByName('技術ブログ');

    if (techBlogUuid) {
      logger.info(`技術ブログのUUID: ${techBlogUuid}`);

      // 取得したUUIDを使用してドメインの詳細を取得
      logger.info('ドメインの詳細情報を取得中...');
      const domainDetails = await client.getDomainById(techBlogUuid);
      if (domainDetails) {
        logger.info('---ドメインの詳細---');
        logger.info(`名前: ${domainDetails.Name}`);
        logger.info(`説明: ${domainDetails.Description || '説明なし'}`);
        logger.info(`アクティブ: ${domainDetails.IsActive ? 'はい' : 'いいえ'}`);
        logger.success('ドメイン情報の取得に成功しました');
      } else {
        logger.error('ドメイン詳細の取得に失敗しました');
      }
    } else {
      logger.warn('技術ブログドメインが見つかりませんでした');
    }

    // ドキュメントのタイトルからUUIDを取得
    logger.info('\nドキュメントをタイトルで検索中...');
    const sampleTitle = 'はじめに';  // 日本語のタイトルを使用
    const documentUuid = await client.getDocumentUuidByTitle(sampleTitle);

    if (documentUuid) {
      logger.info(`ドキュメント "${sampleTitle}" のUUID: ${documentUuid}`);

      // 取得したUUIDを使用してドキュメントの詳細を取得
      logger.info('ドキュメントの詳細情報を取得中...');
      const documentDetails = await client.getDocumentById(documentUuid);
      if (documentDetails) {
        logger.info('---ドキュメントの詳細---');
        logger.info(`タイトル: ${documentDetails.Title}`);
        logger.info(`ステータス: ${documentDetails.Status || '未設定'}`);
        logger.info(`作成日時: ${documentDetails['Created At'] || '未設定'}`);
        logger.success('ドキュメント情報の取得に成功しました');
      } else {
        logger.error('ドキュメント詳細の取得に失敗しました');
      }
    } else {
      logger.warn(`ドキュメント "${sampleTitle}" が見つかりませんでした`);
    }

    logger.success('UUIDテストが完了しました');

  } catch (error) {
    logger.error('テスト実行中にエラーが発生しました:', error);
    process.exit(1);
  }
}

main();