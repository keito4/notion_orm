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