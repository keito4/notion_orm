# Select Options in Schema

NotionORMでは、スキーマ定義内でセレクタとマルチセレクタのオプションを指定できます。
これにより、Notionデータベースのセレクタ/マルチセレクタプロパティのオプションが自動的に設定されます。

## 基本的な使い方

セレクタオプションを指定するには、`@select_options`アノテーションを使用します：

```prisma
model Task {
  // id: abc123
  name        String    @title        @map("タスク名")
  status      String    @select       @map("ステータス")  @select_options(["新規", "進行中", "完了"])
  tags        String[]  @multi_select @map("タグ")        @select_options(["開発", "テスト", "バグ修正"])
}
```

## 色の指定

オプションに色を指定する場合は、オブジェクト形式を使用します：

```prisma
model Task {
  // id: abc123
  name        String    @title        @map("タスク名")
  priority    String    @select       @map("優先度")    @select_options([{name: "高", color: "red"}, {name: "中", color: "yellow"}, {name: "低", color: "green"}])
}
```

## 注意点

- 色の指定は Notion がサポートする値のみ使用できます（例：`default`, `gray`, `brown`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`）
- ORM 初期化時にセレクタオプションが自動的に設定されます
- 既存のオプションは維持され、新しいオプションのみが追加されます
```

## 実装の詳細

スキーマで指定されたセレクトオプションは、NotionORMの初期化時に自動的にNotionデータベースに適用されます。この処理は以下のように行われます：

1. スキーマパーサーが`@select_options`アノテーションを解析し、オプション情報をフィールドオブジェクトに保存
2. クライアントジェネレータがモデル設定ファイルにセレクトオプション情報を含める
3. NotionOrmClientの初期化時に、各モデルのセレクトオプションを自動的に設定

## APIの使用例

プログラムからセレクトオプションを追加する場合は、以下のAPIを使用できます：

```typescript
// QueryBuilderを使用してセレクトオプションを追加
const client = new NotionOrmClient(process.env.NOTION_API_KEY);
const taskQuery = client.queryTask();

// セレクトフィールドにオプションを追加
await taskQuery.addSelectOptions("status", [
  { name: "レビュー中", color: "purple" },
  { name: "保留", color: "gray" }
]);

// マルチセレクトフィールドにオプションを追加
await taskQuery.addSelectOptions("tags", [
  { name: "緊急", color: "red" },
  { name: "バグ", color: "orange" }
]);
```
