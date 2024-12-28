import { QueryBuilder } from '../src/query/builder';
import { Client } from '@notionhq/client';
import { NotionPropertyTypes } from '../src/types/notionTypes';

interface MockDocument {
  id: string;
  title?: string; // Added optional title property
  domain: {
    name: string;
  };
  createdAt?: string; // Added optional createdAt property
  status?: string; // Added optional status property

}

describe('Query Builder', () => {
  let mockNotion: jest.Mocked<Client>;

  beforeEach(() => {
    mockNotion = {
      databases: {
        query: jest.fn(),
        retrieve: jest.fn()
      },
      pages: {
        retrieve: jest.fn()
      }
    } as unknown as jest.Mocked<Client>;
  });

  test('whereRelation builds correct filter', async () => {
    const builder = new QueryBuilder<MockDocument>(mockNotion, 'test-db', 'Document');

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
            type: NotionPropertyTypes.Relation,
            relation: [{ id: 'domain-1' }]
          }
        }
      }]
    } as any);

    mockNotion.pages.retrieve.mockResolvedValueOnce({
      id: 'domain-1',
      properties: {
        name: {
          type: NotionPropertyTypes.Title,
          title: [{ plain_text: '技術ブログ' }]
        }
      }
    } as any);

    const builder = new QueryBuilder<MockDocument>(mockNotion, 'test-db', 'Document');

    const results = await builder
      .include('domain')
      .execute();

    expect(results[0].domain).toBeDefined();
    expect(results[0].domain.name).toBe('技術ブログ');
  });

  test('complex query combines multiple conditions', async () => {
    const builder = new QueryBuilder<MockDocument>(mockNotion, 'test-db', 'Document');

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