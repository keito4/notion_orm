# Notion ORM

Prismaライクなスキーマ定義でNotionデータベースを管理し、TypeScriptの型を生成するCLIツール。

## 概要

Notion ORMは、Prismaに似たDSL（ドメイン固有言語）を使用してNotionデータベースのスキーマを管理し、型安全なTypeScriptクライアントを生成するツールです。このツールを使用すると、開発プロセス全体で型安全性を維持しながら、Notionデータベースと簡単にやり取りすることができます。

## 特徴

- 📝 PrismaライクなDSLを使用してNotionデータベーススキーマを定義
- 🔄 TypeScript型の自動生成
- 🔍 型安全なクエリビルダー
- 🔗 リレーションのサポート
- 🎯 直感的なAPI

## インストール

```bash
# グローバルインストール
npm install -g notion-orm

# または、プロジェクトローカルにインストール
npm install notion-orm
```

### 🚀 クイックスタート

```bash
# 対話型セットアップウィザードを実行（推奨）
notion-orm init

# すべての設定を自動で行います：
# - APIキーの設定ガイド
# - データベースの自動検出
# - スキーマファイルの生成
# - .envファイルの作成
```

## セットアップ

### クイックスタート

1. **Notion APIキーを取得**
   - [Notion統合ページ](https://www.notion.so/my-integrations)にアクセス
   - 「新しい統合を作成」をクリック
   - 統合名を入力し、ワークスペースを選択
   - 「コンテンツを読む」「コンテンツを更新」「コンテンツを挿入」を有効化
   - 生成されたAPIキー（`secret_`で始まる）をコピー

2. **データベースを統合と共有**
   - 使用したいNotionデータベースを開く
   - 右上の「⋯」メニューから「接続を追加」
   - 作成した統合を選択

3. **データベースIDを取得**
   - データベースのURLからIDを取得：
   ```
   https://www.notion.so/workspace/DATABASE_ID?v=view-id
                                ^^^^^^^^^^^^
   ```

4. **環境変数を設定**
   ```bash
   # .envファイルを作成
   echo "NOTION_API_KEY=your_api_key_here" > .env
   echo "DATABASE_ID=your_database_id_here" >> .env
   ```

📖 **詳細なセットアップガイド**: [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)を参照してください。

## 使用方法

### スキーマの定義

`schema.prisma`ファイルを作成し、スキーマを定義します：

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

### クライアントの生成

```bash
notion-orm generate
```

### クライアントの使用

```typescript
import { NotionOrmClient } from './generated/client';
import { logger } from './utils/logger';

async function main() {
  const client = new NotionOrmClient(process.env.NOTION_API_KEY!);

  try {
    // 未完了タスクを検索
    const incompleteTasks = await client.queryTask()
      .where('completed', 'equals', false)
      .orderBy('dueDate', 'ascending')
      .limit(10)
      .execute();

    console.log(`${incompleteTasks.length}件の未完了タスクが見つかりました：`);
    incompleteTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} (期限: ${task.dueDate})`);
    });

    // 新しいタスクを作成
    const newTask = await client.queryTask().createPage({
      title: 'Notion ORMからのテストタスク',
      completed: false,
      priority: 'High',
      dueDate: '2024-12-31'
    });

    console.log(`新しいタスクを作成しました: ${newTask.id}`);
  } catch (error) {
    console.error('エラー:', error);
  }
}

main();
```

🚀 **完全なワークフロー例**: [docs/examples/complete-workflow.md](./docs/examples/complete-workflow.md)でプロジェクト管理システムの実装例を確認できます。

## APIリファレンス

### クエリビルダー

- `where(field, operator, value)`: フィルター条件を指定
- `whereRelation(field, operator, value)`: リレーションのフィルター条件を指定
- `orderBy(field, direction)`: ソート順を指定
- `limit(count)`: 結果の数を制限
- `include(relations)`: リレーションデータを含める
- `execute()`: クエリを実行して結果を取得
- `createPage(data)`: 新しいページを作成

### フィルター演算子

- `equals`: 等しい
- `contains`: 含む
- `starts_with`: で始まる
- `ends_with`: で終わる
- `is_empty`: 空である
- `is_not_empty`: 空でない
- `before`: より前（日付）
- `after`: より後（日付）
- `greater_than`: より大きい（数値）
- `less_than`: より小さい（数値）

### サポートされているNotionプロパティタイプ

- `@title`: タイトルフィールド
- `@richText`: リッチテキスト
- `@number`: 数値
- `@select`: セレクト
- `@multiSelect`: マルチセレクト
- `@date`: 日付
- `@checkbox`: チェックボックス
- `@people`: ユーザー
- `@relation`: リレーション
- `@formula`: 数式

## リリース

このプロジェクトは **Semantic Release** を使用した自動リリースシステムを採用しています。

### 🤖 自動リリース（推奨）

コミット規約に従ってコミットするだけで自動的にリリースされます：

```bash
# 新機能追加 → マイナーバージョンアップ (1.1.7 → 1.2.0)
git commit -m "feat: 新しい機能を追加"

# バグ修正 → パッチバージョンアップ (1.2.0 → 1.2.1)  
git commit -m "fix: バグを修正"

# 破壊的変更 → メジャーバージョンアップ (1.2.1 → 2.0.0)
git commit -m "feat!: 破壊的変更を含む新機能"

git push origin main  # 自動リリース実行
```

### 🚨 緊急時リリース

緊急時のみ手動リリーススクリプトを使用できます：

```bash
./scripts/release.sh 1.2.1
```

**注意**: 通常は自動リリースを使用してください。

## 国際化対応

Notion ORMは日本語と英語に対応しています。言語は自動検出されますが、環境変数で明示的に設定することも可能です：

```bash
# 日本語を使用
export NOTION_ORM_LANG=ja
notion-orm generate

# 英語を使用
export NOTION_ORM_LANG=en
notion-orm generate
```

## トラブルシューティング

### 一般的な問題

1. **APIキー認証エラー**
   - APIキーが正しく設定されていることを確認（`secret_`で始まる）
   - 統合がデータベースと共有されていることを確認
   - 環境変数`NOTION_API_KEY`が正しく読み込まれていることを確認

2. **データベースIDが見つからない**
   - データベースIDが32文字の16進数であることを確認
   - 統合がデータベースにアクセス権限を持っていることを確認
   - データベースが削除されていないことを確認

3. **プロパティ名マッピングエラー**
   - `@map()`で指定された名前がNotionプロパティ名と完全に一致することを確認
   - プロパティ名は大文字小文字を区別します
   - 特殊文字やスペースが含まれる場合は正確に入力

4. **型生成エラー**
   - スキーマファイルの構文が正しいことを確認
   - 出力ディレクトリが存在し、書き込み権限があることを確認
   - Node.jsのバージョンが16.0以上であることを確認

### デバッグモード

詳細なログを有効にするには、`DEBUG`環境変数を設定します：

```bash
DEBUG=true notion-orm generate
```

### ヘルプの表示

```bash
notion-orm --help
notion-orm generate --help
notion-orm create-databases --help
```

## 関連ドキュメント

- 📖 [完全セットアップガイド](./docs/SETUP_GUIDE.md)
- 🚀 [完全なワークフロー例](./docs/examples/complete-workflow.md)
- 🌐 [English README](./README.en.md)
- 📋 [GitHub Issues](https://github.com/your-org/notion-orm/issues) - バグ報告や機能要求

## 貢献

プロジェクトへの貢献を歓迎します！以下の方法で貢献できます：

1. **バグ報告**: [Issues](https://github.com/your-org/notion-orm/issues)でバグを報告
2. **機能要求**: 新機能のアイデアを提案
3. **プルリクエスト**: コードの改善やドキュメントの更新
4. **ドキュメント**: 使用例やガイドの追加

## ライセンス

ISCライセンスの下でリリースされています。詳細は[LICENSE](./LICENSE)ファイルを参照してください。
