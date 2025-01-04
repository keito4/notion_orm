import { NotionClient } from '../src/notion/client';
import { Schema } from '../src/types';

describe('Notion Connection', () => {
  let client: NotionClient;

  beforeAll(() => {
    client = new NotionClient();
  });

  test('should successfully connect to Notion API', async () => {
    const isConnected = await client.validateConnection();
    expect(isConnected).toBe(true);
  });

  test('should validate database existence', async () => {
    const schema: Schema = {
      models: [
        {
          name: 'Document',
          fields: [],
          notionDatabaseId: '13f70a52207f80d58f64cdc627123f87'
        },
        {
          name: 'Domain',
          fields: [],
          notionDatabaseId: 'f6e300b8598e42208a2c163444655842'
        }
      ]
    };

    await expect(client.validateSchema(schema)).resolves.not.toThrow();
  });
});
