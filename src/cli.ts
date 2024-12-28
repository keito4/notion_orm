import { readFileSync } from 'fs';
import { parseSchema } from './parser';
import { generateTypeDefinitions } from './generator/typeGenerator';
import { generateClient } from './generator/clientGenerator';
import { NotionClient } from './notion/client';
import { logger } from './utils/logger';

export async function generateTypes(): Promise<void> {
  try {
    // Read schema file
    const schemaContent = readFileSync('schema.prisma', 'utf-8');
    
    // Parse schema
    const schema = parseSchema(schemaContent);
    
    // Initialize Notion client
    const notionClient = new NotionClient();
    
    // Validate schema against Notion database
    await notionClient.validateSchema(schema);
    
    // Generate TypeScript types
    await generateTypeDefinitions(schema);
    
    // Generate client code
    await generateClient(schema);
  } catch (error) {
    logger.error('Error generating types:', error);
    throw error;
  }
}
