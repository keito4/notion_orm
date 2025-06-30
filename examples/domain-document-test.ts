import { NotionOrmClient } from '../generated/client';
import { logger } from '../src/utils/logger';
import { Document, Category } from '../generated/types';

async function main() {
  try {
    const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

    // Search for Technology category by name
    logger.info('Searching for Technology category...');
    const techCategory = await client.findCategoryByName('Technology');

    if (!techCategory) {
      logger.warn('Technology category not found');
      return;
    }

    const techCategoryId = techCategory.id;
    logger.info(`Technology category ID: ${techCategoryId}`);

    // Search for documents using the retrieved category ID
    logger.info('Searching for documents in Technology category...');
    const techDocs = await client.queryDocuments()
      .where('Category', 'contains', techCategoryId)
      .include('Category')
      .orderBy('Created At', 'descending')
      .execute();

    logger.info(`Found ${techDocs.length} documents in Technology category`);
    techDocs.forEach((doc: Document) => {
      logger.info('---Document---');
      logger.info(`Title: ${doc.Title}`);
      logger.info(`Status: ${doc.Status}`);
      logger.info(`Created At: ${doc['Created At']}`);
      if (doc.Category && doc.Category.length > 0) {
        doc.Category.forEach(category => {
          logger.info(`Category ID: ${category.id}`);
        });
      }
    });

    // Test 2: Query active categories and their documents
    logger.info('\nQuerying active categories and their documents...');
    const activeCategories = await client.queryCategories()
      .where('IsActive', 'equals', true)
      .include('Documents')
      .execute();

    logger.info(`Found ${activeCategories.length} active categories`);
    activeCategories.forEach((category: Category) => {
      logger.info('---Category---');
      logger.info(`Name: ${category.Name}`);
      logger.info(`Description: ${category.Description}`);
      if (category.Documents && category.Documents.length > 0) {
        logger.info(`Documents: ${category.Documents.length}`);
        category.Documents.forEach((doc) => {
          logger.info(`  - Document ID: ${doc.id}`);
        });
      }
    });

  } catch (error) {
    logger.error('An error occurred:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
    }
  }
}

main();