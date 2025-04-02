import { parseSchema } from './src/parser/schemaParser';
import { generateTypeDefinitions } from './src/generator/typeGenerator';
import { readFileSync } from 'fs';

async function testFormatter() {
  try {
    const schemaContent = readFileSync('./test-schema.prisma', 'utf8');
    
    const schema = parseSchema(schemaContent);
    
    console.log('Parsed schema:', JSON.stringify(schema, null, 2));
    
    await generateTypeDefinitions(schema);
    
    console.log('Type definitions generated successfully!');
    console.log('Check the generated/types.ts file to verify ID comment formatting.');
  } catch (error) {
    console.error('Error:', error);
  }
}

testFormatter();
