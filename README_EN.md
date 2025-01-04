# Notion ORM

A CLI tool for managing Notion database schemas with Prisma-like DSL and generating TypeScript types.

[日本語](./README.md)

## Overview

Notion ORM is a tool that allows you to manage your Notion database schemas using a Prisma-like DSL and generates type-safe TypeScript clients. This tool makes it easy to interact with Notion databases while maintaining type safety throughout your development process.

## Features

- 📝 Define Notion database schemas using Prisma-like DSL
- 🔄 Automatic TypeScript type generation
- 🔍 Type-safe query builder
- 🔗 Relation support
- 🎯 Intuitive API

## Installation

```bash
# Global installation
npm install -g notion-orm

# Or install locally in your project
npm install notion-orm
```

## Setup

1. Get Notion API Key
   - Create a new integration from Notion's integration settings page
   - Copy the generated API key

2. Set Environment Variable
```bash
export NOTION_API_KEY='your-api-key'
```

## Usage

### Define Schema

Create a `schema.prisma` file and define your schema:

```prisma
generator client {
  provider = "notion-orm"
  output   = "./generated"
  types    = "types.ts"
  client   = "client.ts"
}

model Task @notionDatabase("your-database-id") {
  Name        String    @title @map("Name")
  completed   Boolean?  @checkbox @map("Completed")
  date        String?   @date @map("Date")
  manager     Json?     @people @map("Manager")
}
```

### Generate Client

```bash
notion-orm generate
```

### Use Client

```typescript
import { NotionOrmClient } from './generated/client';
import { logger } from './utils/logger';

async function main() {
  const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

  // Execute query
  const tasks = await client.queryTasks()
    .where('completed', 'equals', true)
    .orderBy('date', 'desc')
    .limit(5)
    .execute();

  // Display results
  tasks.forEach(task => {
    logger.info(`Task: ${task.Name}`);
  });
}
```

## API Reference

### Query Builder

- `where()`: Specify filter conditions
- `whereRelation()`: Specify filter conditions for relations
- `orderBy()`: Specify sort order
- `limit()`: Limit number of results
- `include()`: Include relation data

### Supported Notion Property Types

- `@title`: Title field
- `@richText`: Rich text
- `@number`: Number
- `@select`: Select
- `@multiSelect`: Multi-select
- `@date`: Date
- `@checkbox`: Checkbox
- `@people`: User
- `@relation`: Relation
- `@formula`: Formula

## Troubleshooting

### Common Issues

1. API Key Authentication Error
   - Verify that the API key is correctly set
   - Check if the integration is shared with the database

2. Database ID Not Found
   - Verify that the database ID is correct
   - Check if the integration has access to the database

3. Property Name Mapping Error
   - Verify that the names specified in `@map` annotations match the Notion property names

### Debug Mode

To enable detailed logging, set the `DEBUG` environment variable:

```bash
DEBUG=true notion-orm generate
```

## License

Released under the MIT License. See [LICENSE](./LICENSE) file for details.
