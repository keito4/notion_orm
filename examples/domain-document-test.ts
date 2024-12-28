import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';
import { Document, Domain } from '../generated/types';
import { QueryBuilder } from '../src/query/builder';

async function main() {
  try {
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // Test 1: Query documents by domain name
    logger.info('Querying documents by domain name...');
    const techDocs = await client.queryDocuments()
      .whereRelation('Domain', (domain: QueryBuilder<Domain>) => 
        domain.where('Name', 'equals', '技術ブログ')
      )
      .include('Domain')
      .orderBy('CreatedAt', 'desc')
      .execute();

    logger.info(`Found ${techDocs.length} documents in 技術ブログ domain`);
    techDocs.forEach((doc: Document) => {
      logger.info('---Document---');
      logger.info(`Title: ${doc.Title}`);
      logger.info(`Status: ${doc.Status}`);
      logger.info(`Created At: ${doc.CreatedAt}`);
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

    // Test 3: Query documents with multiple domains
    logger.info('\nQuerying documents with multiple domains...');
    const multiDomainDocs = await client.queryDocuments()
      .where('Domain', 'is_not_empty', true)
      .include('Domain')
      .execute();

    logger.info(`Found ${multiDomainDocs.length} documents with domain relationships`);
    multiDomainDocs.forEach((doc: Document) => {
      logger.info('---Multi-Domain Document---');
      logger.info(`Title: ${doc.Title}`);
      logger.info(`Status: ${doc.Status}`);
      if (doc.Domain && doc.Domain.length > 0) {
        logger.info(`Number of associated domains: ${doc.Domain.length}`);
        doc.Domain.forEach(domain => {
          logger.info(`  - Domain ID: ${domain.id}`);
        });
      }
    });

  } catch (error) {
    logger.error('エラーが発生しました:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
      logger.error('Stack trace:', error.stack);
    }
  }
}

main();