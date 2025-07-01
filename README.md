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

## セットアップ

1. Notion APIキーを取得する
   - Notionの統合設定ページから新しい統合を作成
   - 生成されたAPIキーをコピー

2. 環境変数を設定
```bash
export NOTION_API_KEY='your-api-key'
```

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

  // クエリの実行
  const tasks = await client.queryTasks()
    .where('completed', 'equals', true)
    .orderBy('date', 'desc')
    .limit(5)
    .execute();

  // 結果の表示
  tasks.forEach(task => {
    logger.info(`タスク: ${task.Name}`);
  });
}
```

## APIリファレンス

### クエリビルダー

- `where()`: フィルター条件を指定
- `whereRelation()`: リレーションのフィルター条件を指定
- `orderBy()`: ソート順を指定
- `limit()`: 結果の数を制限
- `include()`: リレーションデータを含める

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

リリーススクリプトを使用して、パッケージの新しいバージョンを簡単にリリースできます：

```bash
./scripts/release.sh [バージョン]
```

例：
```bash
./scripts/release.sh 1.2.0
```

このスクリプトは以下の処理を自動的に実行します：
1. package.jsonのバージョン更新
2. テストの実行
3. リントチェック
4. ビルド
5. エクスポート機能のテスト
6. npmへのパッケージ公開
7. Gitタグの作成（オプション）

## トラブルシューティング

### 一般的な問題

1. APIキー認証エラー
   - APIキーが正しく設定されていることを確認
   - 統合がデータベースと共有されていることを確認

2. データベースIDが見つからない
   - データベースIDが正しいことを確認
   - 統合がデータベースにアクセスできることを確認

3. プロパティ名マッピングエラー
   - `@map`アノテーションで指定された名前がNotionプロパティ名と一致することを確認

### デバッグモード

詳細なログを有効にするには、`DEBUG`環境変数を設定します：

```bash
DEBUG=true notion-orm generate
```

## ライセンス

MITライセンスの下でリリースされています。詳細は[LICENSE](./LICENSE)ファイルを参照してください。
