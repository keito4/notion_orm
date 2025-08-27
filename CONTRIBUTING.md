# 貢献ガイドライン

Notion ORMへの貢献をご検討いただきありがとうございます！このガイドラインは、プロジェクトへの貢献をスムーズに行うための指針を提供します。

## 目次

- [行動規範](#行動規範)
- [貢献の方法](#貢献の方法)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発ワークフロー](#開発ワークフロー)
- [コーディング規約](#コーディング規約)
- [コミットメッセージ規約](#コミットメッセージ規約)
- [プルリクエストのプロセス](#プルリクエストのプロセス)
- [テスト](#テスト)
- [ドキュメント](#ドキュメント)

## 行動規範

すべての貢献者は、相互に敬意を持って接することを期待されています。差別的な言動、ハラスメント、その他の不適切な行為は容認されません。

## 貢献の方法

### 1. バグ報告

- [GitHub Issues](https://github.com/keito4/notion_orm/issues)で既存のissueを確認
- 新規issueを作成する際は、以下の情報を含める：
  - 環境情報（Node.js/pnpmバージョン）
  - 再現手順
  - 期待される動作
  - 実際の動作
  - エラーメッセージ（ある場合）

### 2. 機能提案

- 新機能の提案は[GitHub Issues](https://github.com/keito4/notion_orm/issues)で「Feature Request」ラベルを付けて作成
- 提案には以下を含める：
  - ユースケース
  - 期待される動作
  - 実装案（可能であれば）

### 3. コード貢献

- 作業前にissueで議論することを推奨
- 小さな変更から始めることを推奨

## 開発環境のセットアップ

### 前提条件

- Node.js >= 18.12.0
- pnpm >= 9.14.4

### セットアップ手順

```bash
# 1. リポジトリをフォーク

# 2. フォークをクローン
git clone https://github.com/<your-username>/notion_orm.git
cd notion_orm

# 3. 依存関係をインストール
pnpm install

# 4. 環境変数を設定（テスト実行に必要）
cp .env.example .env
# .envファイルにNotion APIキーとデータベースIDを設定

# 5. テストを実行して環境を確認
pnpm test
```

### DevContainer使用（推奨）

VS Codeを使用している場合、DevContainerを使用することで統一された開発環境を構築できます：

1. Docker Desktopをインストール
2. VS Codeで「Dev Containers」拡張機能をインストール
3. コマンドパレット（F1）から「Dev Containers: Reopen in Container」を選択

## 開発ワークフロー

### ブランチ戦略

```bash
# 新機能
git checkout -b feat/issue-123-new-feature

# バグ修正
git checkout -b fix/issue-456-bug-description

# リファクタリング
git checkout -b refactor/improve-parser

# ドキュメント
git checkout -b docs/update-readme
```

### 開発サイクル

1. **コードを書く前に**
   ```bash
   # 最新のmainブランチを取得
   git fetch upstream
   git rebase upstream/main
   ```

2. **開発中**
   ```bash
   # フォーマットをチェック
   pnpm format:check
   
   # コードを自動フォーマット
   pnpm format
   
   # Lintを実行
   pnpm lint
   
   # テストを実行
   pnpm test
   
   # カバレッジを確認
   pnpm test:coverage
   ```

3. **コミット前**
   ```bash
   # ビルドを確認
   pnpm build
   ```

## コーディング規約

### TypeScript

- Strict modeを有効にする
- 型定義を明示的に記述
- anyの使用を避ける
- エラーハンドリングを適切に行う

### 命名規則

- 変数/関数: camelCase
- クラス/型: PascalCase
- 定数: UPPER_SNAKE_CASE
- ファイル名: camelCase

### ファイル構造

```
src/
├── cli.ts            # CLIエントリーポイント
├── commands/         # CLIコマンド
├── generator/        # コード生成
├── notion/           # Notion API統合
├── parser/           # スキーマパーサー
├── query/            # クエリビルダー
├── sync/             # 同期マネージャー
├── types/            # 型定義
└── utils/            # ユーティリティ
```

## コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/)に従います：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマット等）
- `refactor`: バグ修正や機能追加を含まないコード変更
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

### 例

```bash
feat(parser): add support for JSON field type

Add JSON field type support to schema parser to enable
storing structured data in Notion databases.

Closes #123
```

## プルリクエストのプロセス

### PRチェックリスト

- [ ] コードは正常に動作する
- [ ] すべてのテストがパス
- [ ] カバレッジが低下していない
- [ ] Lintエラーがない
- [ ] ドキュメントを更新した（必要な場合）
- [ ] コミットメッセージがConventional Commitsに従っている
- [ ] PRの説明に関連するissue番号を含む

### PRテンプレート

```markdown
## 概要
変更の簡潔な説明

## 変更内容
- 変更点1
- 変更点2

## テスト
実施したテストの説明

## 関連Issue
Closes #<issue-number>

## チェックリスト
- [ ] テストを追加/更新
- [ ] ドキュメントを更新
- [ ] CHANGELOGを更新（必要な場合）
```

## テスト

### テストの実行

```bash
# すべてのテストを実行
pnpm test

# 特定のファイルをテスト
pnpm test src/parser/schemaParser.test.ts

# ウォッチモードでテスト
pnpm test -- --watch

# カバレッジ付きでテスト
pnpm test:coverage
```

### テスト作成のガイドライン

- 各機能に対してユニットテストを作成
- エッジケースをカバー
- モックは最小限に
- テストファイルは`*.test.ts`の命名規則に従う

### カバレッジ要件

現在のカバレッジ目標：
- Lines: 45%以上
- Functions: 45%以上
- Branches: 35%以上
- Statements: 45%以上

## ドキュメント

### ドキュメントの種類

1. **コードコメント**: JSDocスタイルでTypeScript関数にコメント
2. **README.md**: プロジェクトの概要と基本的な使用方法
3. **API ドキュメント**: TypeDocで自動生成（将来実装）
4. **ガイド**: docs/ディレクトリ内の詳細なガイド

### ドキュメント作成時の注意

- 明確で簡潔に
- コード例を含める
- 日本語と英語の両方を提供（可能な場合）

## リリース

このプロジェクトはSemantic Releaseを使用しています。mainブランチへのマージ時に自動的にバージョンが決定され、リリースが作成されます。

## 質問・サポート

- GitHub Issuesで質問
- ディスカッションはGitHub Discussionsで

## ライセンス

貢献したコードはISCライセンスの下でリリースされることに同意したものとみなされます。

---

ご協力ありがとうございます！ 🎉