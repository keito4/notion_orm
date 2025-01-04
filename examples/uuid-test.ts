import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';

async function main() {
  try {
    logger.info('Notionクライアントを初期化中...');
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // テスト用のドメイン名の配列（複数のバリエーションをテスト）
    const testDomainNames = ['技術ブログ', 'Tech Blog', 'TechBlog'];

    // 各ドメイン名でテストを実行
    for (const domainName of testDomainNames) {
      logger.info(`\nドメイン "${domainName}" のUUID検索を実行中...`);
      const uuid = await client.getDomainUuidByName(domainName);

      if (uuid) {
        logger.success(`ドメイン "${domainName}" のUUID取得に成功: ${uuid}`);

        // UUIDを使用してドメインの詳細情報を取得
        logger.info('ドメインの詳細情報を取得中...');
        const domainDetails = await client.getDomainById(uuid);
        if (domainDetails) {
          logger.info('---ドメインの詳細---');
          logger.info(`名前: ${domainDetails.Name}`);
          logger.info(`説明: ${domainDetails.Description || '説明なし'}`);
          logger.info(`アクティブ: ${domainDetails.IsActive ? 'はい' : 'いいえ'}`);
        } else {
          logger.error('ドメイン詳細の取得に失敗しました');
        }
      } else {
        logger.warn(`ドメイン "${domainName}" が見つかりませんでした`);
      }
    }

    // ドキュメントのタイトル検索のテスト
    logger.info('\nドキュメントの検索テストを実行中...');
    const testDocumentTitles = ['はじめに', 'Getting Started', '概要'];

    for (const title of testDocumentTitles) {
      logger.info(`\nドキュメント "${title}" のUUID検索を実行中...`);
      const documentUuid = await client.getDocumentUuidByTitle(title);

      if (documentUuid) {
        logger.success(`ドキュメント "${title}" のUUID取得に成功: ${documentUuid}`);

        // UUIDを使用してドキュメントの詳細情報を取得
        logger.info('ドキュメントの詳細情報を取得中...');
        const documentDetails = await client.getDocumentById(documentUuid);
        if (documentDetails) {
          logger.info('---ドキュメントの詳細---');
          logger.info(`タイトル: ${documentDetails.Title}`);
          logger.info(`ステータス: ${documentDetails.Status || '未設定'}`);
          logger.info(`作成日時: ${documentDetails['Created At'] || '未設定'}`);
        } else {
          logger.error('ドキュメント詳細の取得に失敗しました');
        }
      } else {
        logger.warn(`ドキュメント "${title}" が見つかりませんでした`);
      }
    }

    logger.success('UUIDテストが完了しました');

  } catch (error) {
    logger.error('テスト実行中にエラーが発生しました:', error);
    if (error instanceof Error) {
      logger.error('エラーの詳細:', error.message);
      logger.error('スタックトレース:', error.stack);
      if ('code' in error) {
        logger.error('エラーコード:', (error as any).code);
      }
    }
    process.exit(1);
  }
}

main();