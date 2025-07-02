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

### 🚀 Quick Start

```bash
# Run the interactive setup wizard (recommended)
notion-orm init

# This will automatically handle:
# - API key setup guide
# - Database auto-detection
# - Schema file generation
# - .env file creation
```

## Setup

### Quick Start

1. **Get your Notion API key**
   - Visit [Notion Integrations Page](https://www.notion.so/my-integrations)
   - Click "Create new integration"
   - Enter integration name and select workspace
   - Enable "Read content", "Update content", "Insert content" capabilities
   - Copy the generated API key (starts with `secret_`)

2. **Share databases with integration**
   - Open the Notion database you want to use
   - Click the "⋯" menu in the top-right corner
   - Select "Add connections"
   - Choose your created integration

3. **Get database IDs**
   - Extract database ID from the database URL:
   ```
   https://www.notion.so/workspace/DATABASE_ID?v=view-id
                                ^^^^^^^^^^^^
   ```

4. **Set environment variables**
   ```bash
   # Create .env file
   echo "NOTION_API_KEY=your_api_key_here" > .env
   echo "DATABASE_ID=your_database_id_here" >> .env
   ```

📖 **Detailed Setup Guide**: See [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for complete instructions.

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

  try {
    // Query incomplete tasks
    const incompleteTasks = await client.queryTask()
      .where('completed', 'equals', false)
      .orderBy('dueDate', 'ascending')
      .limit(10)
      .execute();

    console.log(`Found ${incompleteTasks.length} incomplete tasks:`);
    incompleteTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} (Due: ${task.dueDate})`);
    });

    // Create a new task
    const newTask = await client.queryTask().createPage({
      title: 'Test Task from Notion ORM',
      completed: false,
      priority: 'High',
      dueDate: '2024-12-31'
    });

    console.log(`Created new task: ${newTask.id}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

🚀 **Complete Workflow Examples**: Check out [docs/examples/complete-workflow.md](./docs/examples/complete-workflow.md) for project management system implementation examples.

## API Reference

### Query Builder

- `where(field, operator, value)`: Specify filter conditions
- `whereRelation(field, operator, value)`: Specify relation filter conditions
- `orderBy(field, direction)`: Specify sort order
- `limit(count)`: Limit number of results
- `include(relations)`: Include relation data
- `execute()`: Execute query and return results
- `createPage(data)`: Create a new page

### Filter Operators

- `equals`: Equal to
- `contains`: Contains text
- `starts_with`: Starts with text
- `ends_with`: Ends with text
- `is_empty`: Is empty
- `is_not_empty`: Is not empty
- `before`: Before date
- `after`: After date
- `greater_than`: Greater than (numbers)
- `less_than`: Less than (numbers)

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

## Internationalization

Notion ORM supports both English and Japanese. Language is automatically detected, but you can explicitly set it using environment variables:

```bash
# Use Japanese
export NOTION_ORM_LANG=ja
notion-orm generate

# Use English
export NOTION_ORM_LANG=en
notion-orm generate
```

## Troubleshooting

### Common Issues

1. **API key authentication error**
   - Verify that the API key is correct and starts with `secret_`
   - Ensure the integration is shared with the databases
   - Check that the `NOTION_API_KEY` environment variable is properly loaded

2. **Database ID not found**
   - Verify the database ID is 32 characters and hexadecimal
   - Ensure the integration has access permissions to the database
   - Check that the database hasn't been deleted

3. **Property name mapping error**
   - Ensure the name in `@map()` exactly matches the Notion property name
   - Property names are case-sensitive
   - Include special characters and spaces exactly as they appear in Notion

4. **Type generation errors**
   - Verify schema file syntax is correct
   - Check that output directory exists and has write permissions
   - Ensure Node.js version is 16.0 or higher

### Debug Mode

To enable detailed logging, set the `DEBUG` environment variable:

```bash
DEBUG=true notion-orm generate
```

### Getting Help

```bash
notion-orm --help
notion-orm generate --help
notion-orm create-databases --help
```

## Related Documentation

- 📖 [Complete Setup Guide](./docs/SETUP_GUIDE.md)
- 🚀 [Complete Workflow Examples](./docs/examples/complete-workflow.md)
- 🌐 [日本語 README](./README.md)
- 📋 [GitHub Issues](https://github.com/your-org/notion-orm/issues) - Bug reports and feature requests

## Contributing

We welcome contributions to the project! You can contribute in the following ways:

1. **Bug Reports**: Report bugs through [Issues](https://github.com/your-org/notion-orm/issues)
2. **Feature Requests**: Suggest new feature ideas
3. **Pull Requests**: Improve code or update documentation
4. **Documentation**: Add usage examples or guides

## License

Released under the ISC License. See [LICENSE](./LICENSE) file for details.