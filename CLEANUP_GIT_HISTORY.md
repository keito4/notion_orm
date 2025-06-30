# Git履歴から機密情報を削除する方法

このリポジトリには以下の機密情報がGit履歴に含まれています：
- `sample.ts`のNotion APIキー（244行目）
- `schema.prisma`の実際のデータベースID

## 方法1: BFG Repo-Cleaner（推奨）

```bash
# 1. リポジトリのバックアップを作成
cp -r notion_orm notion_orm_backup

# 2. BFG Repo-Cleanerをダウンロード
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# 3. 削除する文字列を含むファイルを作成
echo '***REMOVED***' > passwords.txt
echo '***REMOVED***' >> passwords.txt
echo '***REMOVED***' >> passwords.txt
echo '***REMOVED***' >> passwords.txt
echo '***REMOVED***' >> passwords.txt
echo '353adc9979f641559ae12fb91660beeb' >> passwords.txt

# 4. BFGを実行
java -jar bfg-1.14.0.jar --replace-text passwords.txt notion_orm

# 5. リポジトリをクリーンアップ
cd notion_orm
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# 6. 強制プッシュ（注意：これにより履歴が書き換わります）
git push --force-with-lease origin main
```

## 方法2: git filter-branch

```bash
# 1. リポジトリのバックアップを作成
cp -r notion_orm notion_orm_backup

# 2. filter-branchを実行
cd notion_orm

# APIキーを削除
git filter-branch --tree-filter "sed -i '' 's/***REMOVED***/your-notion-api-key-here/g' sample.ts || true" HEAD

# データベースIDを削除
git filter-branch -f --tree-filter "
  sed -i '' 's/***REMOVED***/your-action-database-id/g' schema.prisma || true
  sed -i '' 's/***REMOVED***/your-objective-database-id/g' schema.prisma || true
  sed -i '' 's/***REMOVED***/your-document-database-id/g' schema.prisma || true
  sed -i '' 's/***REMOVED***/your-domain-database-id/g' schema.prisma || true
  sed -i '' 's/353adc9979f641559ae12fb91660beeb/your-timeline-database-id/g' schema.prisma || true
" HEAD

# 3. クリーンアップ
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# 4. 強制プッシュ
git push --force-with-lease origin main
```

## 重要な注意事項

1. **必ずバックアップを作成してください**
2. **共同作業者への通知**: 履歴の書き換えは、他の開発者のローカルリポジトリに影響します
3. **強制プッシュ後の対応**: 他の開発者は以下を実行する必要があります：
   ```bash
   git fetch --all
   git reset --hard origin/main
   ```

4. **Notion APIキーの無効化**: 既に公開されたAPIキーは無効化し、新しいキーを生成してください

## 実行後の確認

```bash
# 履歴を確認
git log --all --full-history -- sample.ts | grep -i "ntn_"
git log --all --full-history -- schema.prisma | grep -E "(398ed17|aac810f|13f70a5|f6e300b|353adc9)"
```

検索結果が空であれば、機密情報は正常に削除されています。