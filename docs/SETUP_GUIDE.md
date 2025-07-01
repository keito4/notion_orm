# 完全セットアップガイド / Complete Setup Guide

[English](#english) | [日本語](#japanese)

## English

### Prerequisites

- Node.js 16.0 or higher
- npm or pnpm
- A Notion account with workspace access

### Step 1: Install Notion ORM

Choose one of the following installation methods:

```bash
# Option 1: Global installation (recommended for CLI usage)
npm install -g notion-orm

# Option 2: Local project installation
npm install notion-orm

# Option 3: Using pnpm
pnpm add notion-orm
```

### Step 2: Create Notion Integration

1. **Go to Notion Integrations Page**
   - Visit [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Click "Create new integration"

2. **Configure Integration**
   - **Name**: Choose a descriptive name (e.g., "My App Notion Integration")
   - **Workspace**: Select your workspace
   - **Capabilities**: Enable "Read content", "Update content", "Insert content"
   - Click "Submit"

3. **Copy API Key**
   - After creation, you'll see an "Internal Integration Token"
   - Copy this token (starts with `secret_`)
   - **⚠️ Keep this secret! Never commit it to version control**

### Step 3: Share Databases with Integration

For each database you want to use:

1. **Open the database in Notion**
2. **Click the "⋯" (three dots) menu** in the top-right
3. **Select "Add connections"**
4. **Find and select your integration** from the list
5. **Click "Confirm"**

### Step 4: Get Database IDs

For each database you want to use:

1. **Open the database in Notion**
2. **Copy the URL** from your browser's address bar
3. **Extract the Database ID** from the URL:

```
https://www.notion.so/workspace-name/DATABASE_ID?v=view-id
                                   ^^^^^^^^^^^
                              This is your Database ID
```

**Example:**
```
URL: https://www.notion.so/myworkspace/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6?v=12345
Database ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Alternative method:**
- Use the "Copy link" option from the database's "⋯" menu
- The link will contain the database ID

### Step 5: Create Environment Configuration

1. **Create `.env` file** in your project root:

```env
# Notion API Configuration
NOTION_API_KEY=secret_your_integration_token_here

# Database IDs (replace with your actual database IDs)
USER_DATABASE_ID=your_user_database_id_here
PROJECT_DATABASE_ID=your_project_database_id_here
TASK_DATABASE_ID=your_task_database_id_here
```

2. **Add `.env` to `.gitignore`** (if not already):

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

### Step 6: Create Schema File

Create a `schema.prisma` file in your project root:

```prisma
generator client {
  provider = "notion-orm"
  output   = "./generated"
  types    = "types.ts"
  client   = "client.ts"
}

model Task @notionDatabase("your-task-database-id") {
  name        String    @title @map("Name")
  completed   Boolean?  @checkbox @map("Completed")
  dueDate     DateTime? @date @map("Due Date")
  assignee    Json?     @people @map("Assignee")
  priority    String?   @select @map("Priority")
}
```

**Replace `your-task-database-id`** with the actual database ID from Step 4.

### Step 7: Generate Client Code

Run the generation command:

```bash
# If installed globally
notion-orm generate

# If installed locally
npx notion-orm generate

# With custom schema file
notion-orm generate --schema ./custom-schema.prisma
```

### Step 8: Use the Generated Client

Create a test file (e.g., `test-client.ts`):

```typescript
import { NotionOrmClient } from './generated/client';

async function main() {
  // Initialize client with API key
  const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

  try {
    // Query tasks
    const tasks = await client.queryTask()
      .where('completed', 'equals', false)
      .orderBy('dueDate', 'ascending')
      .limit(10)
      .execute();

    console.log(`Found ${tasks.length} incomplete tasks:`);
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.name} (Due: ${task.dueDate})`);
    });

    // Create a new task
    const newTask = await client.queryTask().createPage({
      name: 'Test Task from Notion ORM',
      completed: false,
      priority: 'Medium'
    });

    console.log(`Created new task: ${newTask.id}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

### Step 9: Run Your Application

```bash
# Set environment variables and run
NOTION_API_KEY=your_api_key node test-client.js

# Or if using .env file with dotenv
npm install dotenv
node -r dotenv/config test-client.js
```

### Troubleshooting

#### Common Issues

1. **"Unauthorized" Error**
   - Check if your API key is correct and starts with `secret_`
   - Ensure the integration is shared with your databases

2. **"Database not found" Error**
   - Verify the database ID is correct (32 characters, hexadecimal)
   - Ensure the integration has access to the database

3. **Property mapping errors**
   - Check that property names in `@map()` exactly match Notion property names
   - Property names are case-sensitive

4. **Import/Module errors**
   - Ensure you've run `notion-orm generate` after creating your schema
   - Check that the output path in your schema matches your import statements

#### Debug Mode

Enable detailed logging:

```bash
DEBUG=true notion-orm generate
```

## Japanese

### 前提条件

- Node.js 16.0以上
- npmまたはpnpm
- ワークスペースアクセス権限を持つNotionアカウント

### ステップ1: Notion ORMのインストール

以下のいずれかの方法でインストールしてください：

```bash
# オプション1: グローバルインストール（CLI使用に推奨）
npm install -g notion-orm

# オプション2: プロジェクトローカルインストール
npm install notion-orm

# オプション3: pnpmを使用
pnpm add notion-orm
```

### ステップ2: Notion統合の作成

1. **Notion統合ページにアクセス**
   - [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) にアクセス
   - 「新しい統合を作成」をクリック

2. **統合の設定**
   - **名前**: 分かりやすい名前を選択（例：「マイアプリNotion統合」）
   - **ワークスペース**: ワークスペースを選択
   - **機能**: 「コンテンツを読む」「コンテンツを更新」「コンテンツを挿入」を有効化
   - 「送信」をクリック

3. **APIキーのコピー**
   - 作成後、「内部統合トークン」が表示されます
   - このトークンをコピー（`secret_`で始まる）
   - **⚠️ 秘密にしてください！バージョン管理にコミットしないでください**

### ステップ3: データベースと統合の共有

使用する各データベースで：

1. **Notionでデータベースを開く**
2. **右上の「⋯」（3点メニュー）をクリック**
3. **「接続を追加」を選択**
4. **リストから統合を見つけて選択**
5. **「確認」をクリック**

### ステップ4: データベースIDの取得

使用する各データベースで：

1. **Notionでデータベースを開く**
2. **ブラウザのアドレスバーからURLをコピー**
3. **URLからデータベースIDを抽出**：

```
https://www.notion.so/workspace-name/DATABASE_ID?v=view-id
                                   ^^^^^^^^^^^
                              これがデータベースID
```

**例:**
```
URL: https://www.notion.so/myworkspace/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6?v=12345
データベースID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**代替方法:**
- データベースの「⋯」メニューから「リンクをコピー」オプションを使用
- リンクにデータベースIDが含まれています

### ステップ5: 環境設定の作成

1. **プロジェクトルートに`.env`ファイルを作成**：

```env
# Notion API設定
NOTION_API_KEY=secret_your_integration_token_here

# データベースID（実際のデータベースIDに置き換え）
USER_DATABASE_ID=your_user_database_id_here
PROJECT_DATABASE_ID=your_project_database_id_here
TASK_DATABASE_ID=your_task_database_id_here
```

2. **`.gitignore`に`.env`を追加**（まだ追加されていない場合）：

```gitignore
# 環境変数
.env
.env.local
.env.*.local
```

### ステップ6: スキーマファイルの作成

プロジェクトルートに`schema.prisma`ファイルを作成：

```prisma
generator client {
  provider = "notion-orm"
  output   = "./generated"
  types    = "types.ts"
  client   = "client.ts"
}

model Task @notionDatabase("your-task-database-id") {
  name        String    @title @map("名前")
  completed   Boolean?  @checkbox @map("完了")
  dueDate     DateTime? @date @map("期限")
  assignee    Json?     @people @map("担当者")
  priority    String?   @select @map("優先度")
}
```

**`your-task-database-id`を**ステップ4で取得した実際のデータベースIDに置き換えてください。

### ステップ7: クライアントコードの生成

生成コマンドを実行：

```bash
# グローバルインストールの場合
notion-orm generate

# ローカルインストールの場合
npx notion-orm generate

# カスタムスキーマファイルを使用
notion-orm generate --schema ./custom-schema.prisma
```

### ステップ8: 生成されたクライアントの使用

テストファイルを作成（例：`test-client.ts`）：

```typescript
import { NotionOrmClient } from './generated/client';

async function main() {
  // APIキーでクライアントを初期化
  const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

  try {
    // タスクを検索
    const tasks = await client.queryTask()
      .where('completed', 'equals', false)
      .orderBy('dueDate', 'ascending')
      .limit(10)
      .execute();

    console.log(`${tasks.length}件の未完了タスクが見つかりました：`);
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.name} (期限: ${task.dueDate})`);
    });

    // 新しいタスクを作成
    const newTask = await client.queryTask().createPage({
      name: 'Notion ORMからのテストタスク',
      completed: false,
      priority: 'Medium'
    });

    console.log(`新しいタスクを作成しました: ${newTask.id}`);
  } catch (error) {
    console.error('エラー:', error);
  }
}

main();
```

### ステップ9: アプリケーションの実行

```bash
# 環境変数を設定して実行
NOTION_API_KEY=your_api_key node test-client.js

# または.envファイルとdotenvを使用
npm install dotenv
node -r dotenv/config test-client.js
```

### トラブルシューティング

#### よくある問題

1. **「Unauthorized」エラー**
   - APIキーが正しく、`secret_`で始まることを確認
   - 統合がデータベースと共有されていることを確認

2. **「Database not found」エラー**
   - データベースIDが正しいことを確認（32文字、16進数）
   - 統合がデータベースにアクセスできることを確認

3. **プロパティマッピングエラー**
   - `@map()`のプロパティ名がNotionのプロパティ名と完全に一致することを確認
   - プロパティ名は大文字小文字を区別します

4. **インポート/モジュールエラー**
   - スキーマ作成後に`notion-orm generate`を実行したことを確認
   - スキーマの出力パスがインポート文と一致することを確認

#### デバッグモード

詳細なログを有効化：

```bash
DEBUG=true notion-orm generate
```