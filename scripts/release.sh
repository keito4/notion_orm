

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

if [ -z "$1" ]; then
  echo "エラー: バージョン番号を指定してください"
  echo "使用方法: ./scripts/release.sh [バージョン]"
  echo "例: ./scripts/release.sh 1.2.0"
  exit 1
fi

NEW_VERSION="$1"

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "現在のバージョン: $CURRENT_VERSION"
echo "新しいバージョン: $NEW_VERSION"

read -p "リリースを続行しますか？ (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "リリースをキャンセルしました"
  exit 0
fi

echo "package.jsonのバージョンを更新しています..."
npm version "$NEW_VERSION" --no-git-tag-version

echo "テストを実行しています..."
npm test
if [ $? -ne 0 ]; then
  echo "テストに失敗しました。リリースを中止します。"
  exit 1
fi

echo "リントを実行しています..."
npm run lint
if [ $? -ne 0 ]; then
  echo "リントに失敗しました。リリースを中止します。"
  exit 1
fi

echo "ビルドを実行しています..."
npm run build
if [ $? -ne 0 ]; then
  echo "ビルドに失敗しました。リリースを中止します。"
  exit 1
fi

echo "エクスポート機能をテストしています..."
npm run test:export
if [ $? -ne 0 ]; then
  echo "エクスポート機能のテストに失敗しました。リリースを中止します。"
  exit 1
fi

echo "npmにパッケージを公開しています..."
npm publish
if [ $? -ne 0 ]; then
  echo "パッケージの公開に失敗しました。"
  exit 1
fi

echo "🎉 notion-orm v$NEW_VERSION が正常にリリースされました！"

read -p "Gitタグを作成しますか？ (y/n): " CREATE_TAG
if [ "$CREATE_TAG" = "y" ]; then
  git add package.json
  git commit -m "chore: バージョン $NEW_VERSION へ更新"
  git tag "v$NEW_VERSION"
  
  read -p "タグをリモートにプッシュしますか？ (y/n): " PUSH_TAG
  if [ "$PUSH_TAG" = "y" ]; then
    git push origin "v$NEW_VERSION"
    git push origin main
  fi
fi

echo "リリースプロセスが完了しました。"
