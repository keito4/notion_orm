/**
 * IDコメントをフォーマットする関数
 * スラッシュの前に適切なスペースを入れ、ハイフンを削除する
 */
export function formatIdComment(id: string): string {
  const sanitizedId = id.replace(/-/g, '');
  return `// id: ${sanitizedId}`;
}
