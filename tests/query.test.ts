import { QueryBuilder } from '../src/query/builder';
import { NotionClient } from '../src/notion/client';

describe('Query Builder', () => {
  let mockNotion: jest.Mocked<NotionClient>;

  beforeEach(() => {
    mockNotion = {
      databases: {
        query: jest.fn(),
      },
      pages: {
        retrieve: jest.fn(),
      },
    } as any;
  });

  test('whereRelation builds correct filter', async () => {
    const builder = new QueryBuilder<any>(mockNotion, 'test-db', 'Document');
    
    builder
      .whereRelation('domain', domain => 
        domain.where('name', 'equals', '技術ブログ')
      );

    const filters = builder.getFilters();
    expect(filters).toHaveLength(1);
    expect(filters[0]).toMatchObject({
      relationProperty: 'domain',
      filter: {
        property: 'name',
        operator: 'equals',
        value: '技術ブログ'
      }
    });
  });

  test('include loads relation data', async () => {
    mockNotion.databases.query.mockResolvedValueOnce({
      results: [{
        id: 'doc-1',
        properties: {
          domain: {
            type: 'relation',
            relation: [{ id: 'domain-1' }]
          }
        }
      }]
    });

    mockNotion.pages.retrieve.mockResolvedValueOnce({
      id: 'domain-1',
      properties: {
        name: {
          type: 'title',
          title: [{ plain_text: '技術ブログ' }]
        }
      }
    });

    const builder = new QueryBuilder<any>(mockNotion, 'test-db', 'Document');
    
    const results = await builder
      .include('domain')
      .execute();

    expect(results[0].domain).toBeDefined();
    expect(results[0].domain[0].name).toBe('技術ブログ');
  });

  test('complex query combines multiple conditions', async () => {
    const builder = new QueryBuilder<any>(mockNotion, 'test-db', 'Document');
    
    builder
      .whereRelation('domain', domain => 
        domain.where('name', 'equals', '技術ブログ')
      )
      .where('createdAt', 'after', '2024-01-01')
      .where('status', 'equals', 'published')
      .orderBy('createdAt', 'desc')
      .limit(5);

    const filters = builder.getFilters();
    expect(filters).toHaveLength(3);
    
    // リレーションフィルター
    expect(filters[0]).toMatchObject({
      relationProperty: 'domain'
    });
    
    // 日付フィルター
    expect(filters[1]).toMatchObject({
      property: 'createdAt',
      operator: 'after'
    });
    
    // ステータスフィルター
    expect(filters[2]).toMatchObject({
      property: 'status',
      operator: 'equals'
    });
  });
});
