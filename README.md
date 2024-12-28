# Notion ORM

NotionデータベースのスキーマをPrismaライクなDSLで管理し、TypeScript型とクライアントを自動生成するCLIツール。

## 概要

Notion ORMは、以下の機能を提供します：

- Prismaライクな`.prisma`ファイルでNotionデータベースのスキーマを定義
- TypeScript型の自動生成
- Notionクライアントコードの自動生成
- スキーマとNotionデータベースの整合性検証

## インストール

```bash
npm install notion-orm
```

## 使い方

1. 環境変数の設定:
```bash
export NOTION_API_KEY="your-notion-api-key"
```

2. スキーマファイルの作成:
`schema.prisma`ファイルを作成し、以下のようにモデルを定義します：

```prisma
model Task @notionDatabase("your-database-id") {
  name        String    @title
  date        Date?     @map("日付")
  completed   Boolean   @map("完了") @checkbox
  emphasized  Boolean   @map("注力") @checkbox
  archived    Boolean   @map("アーカイブ") @checkbox
  manager     String?   @map("責任者")
}
```

3. 型とクライアントの生成:
```bash
npx notion-orm generate
```

生成されたファイルは`generated`ディレクトリに出力されます。

## スキーマ定義

### サポートされる型

- `String`: テキストフィールド
- `Number`: 数値フィールド
- `Boolean`: チェックボックス
- `Date`: 日付フィールド
- `Select`: セレクトフィールド
- `MultiSelect`: マルチセレクトフィールド

### 属性

- `@title`: タイトルフィールドを指定（各モデルに1つ必要）
- `@map("name")`: Notionデータベース上の実際のプロパティ名を指定
- `@checkbox`: チェックボックスフィールドを指定
- `@rich_text`: リッチテキストフィールドを指定
- `@select`: セレクトフィールドを指定
- `@notionDatabase("id")`: NotionデータベースのIDを指定

### オプショナルフィールド

フィールド名の後に`?`を付けることで、オプショナルフィールドとして定義できます：

```prisma
model Task {
  title    String
  dueDate  Date?    // オプショナルフィールド
}
```

## トラブルシューティング

### スキーマ検証エラー

スキーマ検証エラーが発生した場合：

1. Notionデータベースのプロパティ名とスキーマ定義が一致しているか確認
2. プロパティの型が正しいか確認
3. 必須フィールドが設定されているか確認
4. データベースIDが正しいか確認

### 型生成エラー

型生成に失敗する場合：

1. `NOTION_API_KEY`が正しく設定されているか確認
2. スキーマファイルの構文が正しいか確認
3. 必要なプロパティがすべて定義されているか確認

## ライセンス

MIT
