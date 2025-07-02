# Interactive Setup Wizard / 対話型セットアップウィザード

[English](#english) | [日本語](#japanese)

## English

### Overview

The `notion-orm init` command provides an interactive setup wizard that guides you through the initial configuration of your Notion ORM project. This wizard automates many of the manual setup steps and helps you get started quickly.

### Features

1. **API Key Configuration**
   - Automatic detection of existing API keys
   - Secure password-style input for API keys
   - Validation of API key format

2. **Database Auto-Discovery**
   - Automatically fetches all accessible databases
   - Displays database information (title, ID, property count)
   - Supports multi-selection or select all

3. **Schema Generation**
   - Generates Prisma schema from selected databases
   - Maps Notion property types to appropriate field types
   - Includes database IDs and helpful comments

4. **Environment Setup**
   - Creates `.env` file with API key and database IDs
   - Generates `.env.example` for sharing
   - Updates `.gitignore` automatically

### Usage

```bash
# Run the interactive setup wizard
notion-orm init

# Force overwrite existing files
notion-orm init --force
```

### Step-by-Step Process

#### Step 1: API Key Setup

```
📌 Step 1: Notion API Key Setup
────────────────────────────────────────────────────────────

To use Notion ORM, you need a Notion integration API key.

1. Visit https://www.notion.so/my-integrations
2. Click "Create new integration"
3. Enable Read, Update, and Insert capabilities
4. Copy the integration token

Enter your Notion API key: ****************************************
```

#### Step 2: Fetching Databases

```
📌 Step 2: Fetching Databases
────────────────────────────────────────────────────────────

Connecting to Notion ✓
Fetching your databases ✓

Found 5 databases
```

#### Step 3: Select Databases

```
📌 Step 3: Select Databases
────────────────────────────────────────────────────────────

Available databases:

  1. Task Management
     ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
     Properties: 10

  2. Project Tracker
     ID: b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7
     Properties: 8

  3. User Directory
     ID: c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8
     Properties: 6

Select databases by number (e.g., 1,3,5 or 'all'): 1,2,3
```

#### Step 4: Schema Generation

The wizard generates a `schema.prisma` file with proper type mappings:

```prisma
generator client {
  provider = "notion-orm"
  output   = "./generated"
  types    = "types.ts"
  client   = "client.ts"
}

// Database: Task Management
// ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
model TaskManagement @notionDatabase("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6") {
  title         String     @title @map("Title")
  description   String?    @richText @map("Description")
  status        String?    @select @map("Status")
  priority      String?    @select @map("Priority")
  dueDate       DateTime?  @date @map("Due Date")
  completed     Boolean    @checkbox @map("Completed")
  assignee      Json[]     @people @map("Assignee")
  tags          String[]   @multiSelect @map("Tags")
  attachments   String[]   @files @map("Attachments")
  createdAt     DateTime?  @createdTime @map("Created Time")
}
```

#### Step 5: Environment File Creation

The wizard creates a `.env` file:

```env
# Notion API Configuration
NOTION_API_KEY=secret_your_actual_api_key_here

# Database IDs
TASK_MANAGEMENT_DATABASE_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
PROJECT_TRACKER_DATABASE_ID=b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7
USER_DIRECTORY_DATABASE_ID=c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8
```

### Property Type Mappings

| Notion Type | Prisma Type | Decorator |
|-------------|-------------|-----------|
| title | String | @title |
| rich_text | String? | @richText |
| number | Float? | @number |
| select | String? | @select |
| multi_select | String[] | @multiSelect |
| date | DateTime? | @date |
| checkbox | Boolean | @checkbox |
| people | Json[] | @people |
| files | String[] | @files |
| email | String? | @email |
| phone_number | String? | @phoneNumber |
| url | String? | @url |
| created_time | DateTime? | @createdTime |
| last_edited_time | DateTime? | @lastEditedTime |

### Error Handling

The wizard includes comprehensive error handling:

- **Invalid API Key**: Prompts for re-entry with format validation
- **No Databases Found**: Offers to create a sample schema
- **Connection Errors**: Clear error messages with troubleshooting tips
- **File Conflicts**: Asks before overwriting existing files

### Next Steps

After running the wizard:

1. **Share databases with integration**
   - Go to each database in Notion
   - Click ⋯ menu → Add connections
   - Select your integration

2. **Generate TypeScript types**
   ```bash
   notion-orm generate
   ```

3. **Start using the client**
   ```typescript
   import { NotionOrmClient } from './generated/client';
   
   const client = new NotionOrmClient(process.env.NOTION_API_KEY!);
   ```

## Japanese

### 概要

`notion-orm init`コマンドは、Notion ORMプロジェクトの初期設定を案内する対話型セットアップウィザードを提供します。このウィザードは多くの手動セットアップ手順を自動化し、素早く開始できるようにします。

### 機能

1. **APIキー設定**
   - 既存のAPIキーの自動検出
   - APIキーのパスワード形式での安全な入力
   - APIキー形式の検証

2. **データベース自動検出**
   - アクセス可能なすべてのデータベースを自動取得
   - データベース情報（タイトル、ID、プロパティ数）を表示
   - 複数選択または全選択をサポート

3. **スキーマ生成**
   - 選択したデータベースからPrismaスキーマを生成
   - Notionプロパティタイプを適切なフィールドタイプにマッピング
   - データベースIDと役立つコメントを含む

4. **環境設定**
   - APIキーとデータベースIDを含む`.env`ファイルを作成
   - 共有用の`.env.example`を生成
   - `.gitignore`を自動更新

### 使用方法

```bash
# 対話型セットアップウィザードを実行
notion-orm init

# 既存ファイルを強制的に上書き
notion-orm init --force
```

### プロセスの詳細

完全なウィザードのフローと各ステップの詳細は英語版を参照してください。ウィザードは日本語にも対応しており、システムの言語設定に基づいて自動的に切り替わります。

### エラーハンドリング

ウィザードには包括的なエラーハンドリングが含まれています：

- **無効なAPIキー**: 形式検証付きで再入力を促す
- **データベースが見つからない**: サンプルスキーマの作成を提案
- **接続エラー**: トラブルシューティングのヒント付きの明確なエラーメッセージ
- **ファイルの競合**: 既存ファイルを上書きする前に確認

### 次のステップ

ウィザード実行後：

1. **データベースを統合と共有**
   - Notionで各データベースに移動
   - ⋯メニュー → 接続を追加をクリック
   - 統合を選択

2. **TypeScript型を生成**
   ```bash
   notion-orm generate
   ```

3. **クライアントの使用開始**
   ```typescript
   import { NotionOrmClient } from './generated/client';
   
   const client = new NotionOrmClient(process.env.NOTION_API_KEY!);
   ```