#!/bin/bash

# Git履歴から機密情報を削除するスクリプト
# 注意: このスクリプトは不可逆的な変更を行います。必ずバックアップを取ってから実行してください。

set -e

echo "🚨 警告: このスクリプトはGit履歴を不可逆的に変更します"
echo "実行前に必ずリポジトリのバックアップを取得してください"
echo ""
echo "続行する場合は 'yes' と入力してください:"
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    echo "操作をキャンセルしました"
    exit 1
fi

# バックアップの作成
echo "📁 リポジトリのバックアップを作成中..."
cp -r .git .git.backup
echo "✅ バックアップを .git.backup に保存しました"

# 機密情報のリストを作成
echo "🔍 機密情報を特定中..."
cat > sensitive-data.txt << 'EOF'
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
***REMOVED***
Pasted-ts-node-src-index-ts-generate-
附属資産
attached_assets
CLEANUP_GIT_HISTORY.md
EOF

# BFG Repo-Cleanerのダウンロード（存在しない場合）
BFG_JAR="bfg-1.14.0.jar"
if [ ! -f "$BFG_JAR" ]; then
    echo "📥 BFG Repo-Cleanerをダウンロード中..."
    if command -v wget > /dev/null; then
        wget -q "https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar" -O "$BFG_JAR"
    elif command -v curl > /dev/null; then
        curl -sL "https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar" -o "$BFG_JAR"
    else
        echo "❌ エラー: wget または curl が必要です"
        exit 1
    fi
    echo "✅ BFG Repo-Cleanerをダウンロードしました"
fi

# 現在のHEADを保護
echo "🛡️ 現在のHEADを保護中..."
git add -A
git stash push -m "機密情報削除前の状態を保存"

# BFGを使用して機密情報を削除
echo "🧹 機密情報を削除中..."
java -jar "$BFG_JAR" --replace-text sensitive-data.txt --no-blob-protection .git

# Gitリポジトリをクリーンアップ
echo "🔧 Gitリポジトリをクリーンアップ中..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 削除されたファイルを確認
echo "🔍 変更を確認中..."
git log --oneline --all -10

echo ""
echo "✅ 機密情報の削除が完了しました"
echo ""
echo "次のステップ:"
echo "1. 変更内容を確認してください: git log --oneline"
echo "2. 問題がなければ強制プッシュしてください: git push --force-with-lease origin main"
echo "3. バックアップが不要であれば削除してください: rm -rf .git.backup"
echo ""
echo "⚠️  リモートリポジトリを更新する前に、チームメンバーに変更を通知してください"

# 一時ファイルをクリーンアップ
rm -f sensitive-data.txt
rm -f "$BFG_JAR"