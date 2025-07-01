# Notion ORM

A CLI tool that manages Notion databases with Prisma-like schema definitions and generates TypeScript types.

## Overview

Notion ORM is a tool that uses a Prisma-like DSL (Domain Specific Language) to manage Notion database schemas and generate type-safe TypeScript clients. This tool allows you to easily interact with Notion databases while maintaining type safety throughout your development process.

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

1. Get your Notion API key
   - Create a new integration from Notion's integration settings page
   - Copy the generated API key

2. Set environment variables
```bash
export NOTION_API_KEY='your-api-key'
```

## Usage

### Schema Definition

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

  // Execute queries
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
- `whereRelation()`: Specify relation filter conditions
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
- `@people`: People
- `@relation`: Relation
- `@formula`: Formula

## Release

You can easily release new versions of the package using the release script:

```bash
./scripts/release.sh [version]
```

Example:
```bash
./scripts/release.sh 1.2.0
```

This script automatically performs the following:
1. Update package.json version
2. Run tests
3. Run lint checks
4. Build
5. Test export functionality
6. Publish package to npm
7. Create Git tag (optional)

## Troubleshooting

### Common Issues

1. API key authentication error
   - Verify that the API key is set correctly
   - Ensure the integration is shared with the database

2. Database ID not found
   - Verify the database ID is correct
   - Ensure the integration has access to the database

3. Property name mapping error
   - Ensure the name specified in `@map` annotation matches the Notion property name

### Debug Mode

To enable detailed logging, set the `DEBUG` environment variable:

```bash
DEBUG=true notion-orm generate
```

## License

Released under the ISC License. See [LICENSE](./LICENSE) file for details.