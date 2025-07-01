# Git履歴から機密情報を削除する手順

このファイルは、リポジトリを一般公開する前にGit履歴から機密情報を安全に削除するための手順書です。

## ⚠️ 重要な注意事項

- **不可逆的な操作**: この操作はGit履歴を永続的に変更します
- **バックアップ必須**: 実行前に必ずリポジトリの完全なバックアップを作成してください
- **チーム連携**: リモートリポジトリを更新する前に、すべてのチームメンバーに通知してください

## 🔍 削除対象の機密情報

以下の情報がGit履歴に含まれており、削除が必要です：

### APIキー・トークン
- `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` (Notion APIキー)

### データベースID
- `398ed17368ec497e9638af2c4d53bec9`
- `aac810fcb3414dbb9c46ce485bc6449b` 
- `13f70a52207f80d58f64cdc627123f87`
- `f6e300b8598e42208a2c163444655842`

### 不要なファイル・フォルダ
- `attached_assets/` フォルダとその中身
- `CLEANUP_GIT_HISTORY.md`
- 開発時のログファイル

## 🛠️ 削除手順

### 方法1: 自動スクリプト（推奨）

```bash
# スクリプトを実行
./cleanup-git-history.sh
```

### 方法2: 手動実行

1. **バックアップの作成**
```bash
cp -r .git .git.backup
```

2. **BFG Repo-Cleanerのダウンロード**
```bash
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
```

3. **機密情報リストの作成**
```bash
cat > passwords.txt << 'EOF'
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
398ed17368ec497e9638af2c4d53bec9
aac810fcb3414dbb9c46ce485bc6449b
13f70a52207f80d58f64cdc627123f87
f6e300b8598e42208a2c163444655842
EOF
```

4. **BFGを実行**
```bash
java -jar bfg-1.14.0.jar --replace-text passwords.txt --no-blob-protection .git
```

5. **Gitリポジトリのクリーンアップ**
```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

6. **変更の確認**
```bash
git log --oneline -20
```

7. **リモートリポジトリへの反映**
```bash
git push --force-with-lease origin main
```

## 📋 実行後のチェックリスト

- [ ] Git履歴に機密情報が含まれていないことを確認
- [ ] アプリケーションが正常に動作することを確認
- [ ] 必要なファイルが削除されていないことを確認
- [ ] チームメンバーに変更を通知
- [ ] 古いAPIキーを無効化（該当する場合）
- [ ] 新しいAPIキーを生成・設定（該当する場合）

## 🚨 トラブルシューティング

### 問題が発生した場合

1. **バックアップからの復元**
```bash
rm -rf .git
mv .git.backup .git
```

2. **別の方法として**
- 新しいリポジトリを作成
- クリーンなコードのみをコピー
- 新しいGit履歴で開始

## 📞 サポート

このプロセスで問題が発生した場合は、以下を確認してください：

1. JavaがインストールされているかJavaがインストールされているか
2. 十分なディスク容量があるか
3. ネットワーク接続が安定しているか

## 🔒 セキュリティベストプラクティス

今後、機密情報がGit履歴に含まれることを防ぐために：

1. `.env`ファイルを`.gitignore`に追加
2. 機密情報は環境変数で管理
3. Pre-commitフックで機密情報をチェック
4. 定期的なセキュリティ監査の実施