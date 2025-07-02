// Internationalization utility
export type Language = 'en' | 'ja';

interface Messages {
  [key: string]: string | Messages;
}

interface LanguageMessages {
  en: Messages;
  ja: Messages;
}

const messages: LanguageMessages = {
  en: {
    cli: {
      loading_schema: 'Loading schema file... {filePath}',
      parsing_schema: 'Parsing schema...',
      initializing_notion_client: 'Initializing Notion client...',
      validating_sync: 'Validating and syncing with Notion...',
      generating_types: 'Generating TypeScript type definitions...',
      generating_client: 'Generating client code...',
      generation_success: 'Successfully generated type definitions and client code',
      loading_schema_file: 'Loading schema file {schemaPath}...',
      initializing_client: 'Initializing Notion client...',
      creating_databases: 'Creating databases from schema...',
      creating_model_database: 'Creating database for model {modelName}...',
      database_created: 'Created database "{modelName}". ID: {databaseId}',
      updating_relations: 'Updated relations for database "{modelName}"',
      generating_output_file: 'Generating output.prisma file...',
      output_file_generated: 'Generated {outputPath} file',
      all_databases_created: 'All databases created successfully',
      field_mapped: 'Field "{fieldName}" mapped to "{targetModelName}"',
      generating_prisma_schema: 'Generating Prisma schema with database IDs as comments...',
      prisma_schema_success: 'Successfully output Prisma schema'
    },
    errors: {
      api_key_required: 'NOTION_API_KEY environment variable is required',
      generation_failed: 'Failed to generate types:',
      database_creation_failed: 'Error occurred during database creation:',
      prisma_export_failed: 'Failed to export Prisma schema:'
    },
    commands: {
      init: {
        description: 'Interactive setup wizard for Notion ORM',
        force_option: 'Force overwrite existing files'
      },
      generate: {
        description: 'Generate TypeScript types and client from schema',
        schema_option: 'Schema file path'
      },
      create_databases: {
        description: 'Create Notion databases from schema',
        parent_option: 'Parent page ID to create databases in',
        schema_option: 'Schema file path',
        output_option: 'Output schema file path'
      },
      export: {
        description: 'Export Prisma schema with database IDs as comments',
        schema_option: 'Schema file path'
      }
    },
    init: {
      welcome: 'Welcome to Notion ORM!',
      description: 'This wizard will help you set up your project step by step.',
      step: 'Step',
      error: 'Setup failed:',
      api_key_setup: 'Notion API Key Setup',
      api_key_instructions: 'To use Notion ORM, you need a Notion integration API key.',
      visit_integrations: 'Visit',
      create_integration: 'Click "Create new integration"',
      enable_capabilities: 'Enable Read, Update, and Insert capabilities',
      copy_token: 'Copy the integration token',
      existing_key_found: 'Found existing API key in environment.',
      use_existing: 'Use it?',
      enter_api_key: 'Enter your Notion API key',
      invalid_api_key: 'API key should start with "secret_"',
      fetching_databases: 'Fetching Databases',
      connecting_notion: 'Connecting to Notion',
      fetching_databases_progress: 'Fetching your databases',
      found_databases: 'Found {count} databases',
      unauthorized_error: 'Invalid API key. Please check and try again.',
      select_databases: 'Select Databases',
      no_databases_found: 'No databases found.',
      create_sample_schema: 'Create sample schema?',
      available_databases: 'Available databases',
      id: 'ID',
      properties: 'Properties',
      select_databases_prompt: 'Select databases by number',
      selected_count: 'Selected {count} databases',
      generating_schema: 'Generating Schema',
      schema_exists: 'schema.prisma already exists.',
      overwrite: 'Overwrite?',
      skip_schema_generation: 'Skipping schema generation',
      schema_generated: 'Schema generated at {path}',
      creating_env_file: 'Creating Environment File',
      env_exists: '.env file already exists.',
      skip_env_creation: 'Skipping .env creation',
      env_created: 'Created .env file at {path}',
      gitignore_updated: 'Updated .gitignore',
      gitignore_created: 'Created .gitignore',
      setup_complete_message: 'Your Notion ORM project is ready!',
      next_steps: 'Next steps',
      share_databases: 'Share your databases with the integration',
      share_instructions: 'Go to each database → ⋯ menu → Add connections → Select your integration',
      generate_types: 'Generate TypeScript types',
      start_coding: 'Start coding!',
      import_client: 'import { NotionOrmClient } from "./generated/client"',
      learn_more: 'Learn more',
      documentation: 'Documentation',
      examples: 'Examples',
      support: 'Support',
      happy_coding: 'Happy coding!'
    }
  },
  ja: {
    cli: {
      loading_schema: 'スキーマファイルを読み込んでいます... {filePath}',
      parsing_schema: 'スキーマを解析しています...',
      initializing_notion_client: 'Notionクライアントを初期化しています...',
      validating_sync: 'Notionとスキーマの検証・同期をしています...',
      generating_types: 'TypeScript型定義を生成しています...',
      generating_client: 'クライアントコードを生成しています...',
      generation_success: '型定義とクライアントコードの生成に成功しました',
      loading_schema_file: 'スキーマファイル {schemaPath} を読み込んでいます...',
      initializing_client: 'Notion クライアントを初期化しています...',
      creating_databases: 'スキーマからデータベースを作成しています...',
      creating_model_database: 'モデル {modelName} のデータベースを作成しています...',
      database_created: 'データベース「{modelName}」を作成しました。ID: {databaseId}',
      updating_relations: 'データベース「{modelName}」のリレーションを更新しました',
      generating_output_file: 'output.prismaファイルを生成しています...',
      output_file_generated: '{outputPath}ファイルを生成しました',
      all_databases_created: 'すべてのデータベースを作成しました',
      field_mapped: 'フィールド "{fieldName}" が "{targetModelName}" にマップされました',
      generating_prisma_schema: 'データベースIDをコメントとして含むPrismaスキーマを生成しています...',
      prisma_schema_success: 'Prismaスキーマの出力に成功しました'
    },
    errors: {
      api_key_required: 'NOTION_API_KEY 環境変数が必要です',
      generation_failed: '型定義の生成に失敗しました:',
      database_creation_failed: 'データベース作成中にエラーが発生しました:',
      prisma_export_failed: 'Prismaスキーマの出力に失敗しました:'
    },
    commands: {
      init: {
        description: 'Notion ORMの対話型セットアップウィザード',
        force_option: '既存ファイルを強制的に上書き'
      },
      generate: {
        description: 'スキーマからTypeScript型とクライアントを生成',
        schema_option: 'スキーマファイルのパス'
      },
      create_databases: {
        description: 'スキーマからNotionデータベースを作成',
        parent_option: 'データベースを作成する親ページID',
        schema_option: 'スキーマファイルのパス',
        output_option: '出力スキーマファイルのパス'
      },
      export: {
        description: 'データベースIDをコメントとして含むPrismaスキーマを出力',
        schema_option: 'スキーマファイルのパス'
      }
    },
    init: {
      welcome: 'Notion ORMへようこそ！',
      description: 'このウィザードがプロジェクトのセットアップをお手伝いします。',
      step: 'ステップ',
      error: 'セットアップが失敗しました:',
      api_key_setup: 'Notion APIキーの設定',
      api_key_instructions: 'Notion ORMを使用するには、Notion統合のAPIキーが必要です。',
      visit_integrations: 'アクセス',
      create_integration: '「新しい統合を作成」をクリック',
      enable_capabilities: '読み取り、更新、挿入の機能を有効化',
      copy_token: '統合トークンをコピー',
      existing_key_found: '環境変数に既存のAPIキーが見つかりました。',
      use_existing: 'これを使用しますか？',
      enter_api_key: 'Notion APIキーを入力してください',
      invalid_api_key: 'APIキーは "secret_" で始まる必要があります',
      fetching_databases: 'データベースの取得',
      connecting_notion: 'Notionに接続中',
      fetching_databases_progress: 'データベースを取得中',
      found_databases: '{count}個のデータベースが見つかりました',
      unauthorized_error: '無効なAPIキーです。確認して再試行してください。',
      select_databases: 'データベースの選択',
      no_databases_found: 'データベースが見つかりませんでした。',
      create_sample_schema: 'サンプルスキーマを作成しますか？',
      available_databases: '利用可能なデータベース',
      id: 'ID',
      properties: 'プロパティ',
      select_databases_prompt: '番号でデータベースを選択してください',
      selected_count: '{count}個のデータベースを選択しました',
      generating_schema: 'スキーマの生成',
      schema_exists: 'schema.prismaは既に存在します。',
      overwrite: '上書きしますか？',
      skip_schema_generation: 'スキーマ生成をスキップします',
      schema_generated: '{path}にスキーマを生成しました',
      creating_env_file: '環境ファイルの作成',
      env_exists: '.envファイルは既に存在します。',
      skip_env_creation: '.env作成をスキップします',
      env_created: '{path}に.envファイルを作成しました',
      gitignore_updated: '.gitignoreを更新しました',
      gitignore_created: '.gitignoreを作成しました',
      setup_complete_message: 'Notion ORMプロジェクトの準備ができました！',
      next_steps: '次のステップ',
      share_databases: 'データベースを統合と共有',
      share_instructions: '各データベース → ⋯メニュー → 接続を追加 → 統合を選択',
      generate_types: 'TypeScript型を生成',
      start_coding: 'コーディング開始！',
      import_client: 'import { NotionOrmClient } from "./generated/client"',
      learn_more: '詳細情報',
      documentation: 'ドキュメント',
      examples: '例',
      support: 'サポート',
      happy_coding: 'Happy coding!'
    }
  }
};

let currentLanguage: Language = 'en';

// Detect language from environment or system locale
function detectLanguage(): Language {
  // Check environment variable first
  const envLang = process.env.NOTION_ORM_LANG || process.env.LANG || process.env.LANGUAGE;
  
  if (envLang) {
    if (envLang.toLowerCase().includes('ja')) {
      return 'ja';
    }
  }

  // Check system locale
  if (typeof Intl !== 'undefined') {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale.startsWith('ja')) {
      return 'ja';
    }
  }

  return 'en'; // Default to English
}

// Initialize language
currentLanguage = detectLanguage();

// Set language manually
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

// Get current language
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

// Get nested message by key path
function getNestedMessage(obj: Messages, path: string[]): string | undefined {
  let current: any = obj;
  
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

// Template interpolation
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}

// Main translation function
export function t(key: string, params: Record<string, string | number> = {}): string {
  const keys = key.split('.');
  const langMessages = messages[currentLanguage];
  
  let message = getNestedMessage(langMessages, keys);
  
  // Fallback to English if message not found in current language
  if (!message && currentLanguage !== 'en') {
    message = getNestedMessage(messages.en, keys);
  }
  
  // Fallback to key if message not found
  if (!message) {
    message = key;
  }
  
  // Interpolate parameters
  return Object.keys(params).length > 0 ? interpolate(message, params) : message;
}

// Convenience functions for common use cases
export const i18n = {
  t,
  setLanguage,
  getCurrentLanguage,
  detectLanguage
};

export default i18n;