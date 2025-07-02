# Visual Feedback System / ビジュアルフィードバックシステム

[English](#english) | [日本語](#japanese)

## English

### Overview

The Visual Feedback System provides a comprehensive set of tools for creating beautiful, informative, and user-friendly command-line interfaces. It enhances the user experience with colorful output, progress indicators, and clear status messaging.

### Features

#### 1. **Progress Bars**
Advanced progress tracking for long-running operations:

```typescript
import { ProgressBar } from './utils/visual';

const progress = new ProgressBar(100, {
  label: 'Processing databases',
  width: 50
});

progress.update(25, 'Fetching data');
progress.update(50, 'Processing records');
progress.update(75, 'Generating output');
progress.complete('All done!');
```

**Output:**
```
Processing databases [████████████░░░░░░░░] 75% 75/100 ETA: 30s
```

#### 2. **Enhanced Spinners**
Beautiful animated spinners with success/failure states:

```typescript
import { EnhancedSpinner } from './utils/visual';

const spinner = new EnhancedSpinner('Connecting to Notion...');
spinner.start();

// On success
spinner.succeed('Connected successfully!');

// On failure
spinner.fail('Connection failed');

// With warnings
spinner.warn('Connected with warnings');
```

**Features:**
- Customizable animation frames
- Color themes
- Automatic cursor management
- Clear success/failure indication

#### 3. **Colorful Output System**
Comprehensive color palette for consistent theming:

```typescript
import { colors, icons } from './utils/visual';

console.log(colors.success('Operation completed!'));
console.log(colors.error('Something went wrong'));
console.log(colors.warning('Please check your settings'));
console.log(colors.info('Processing...'));

// With icons
console.log(`${icons.success} Task completed`);
console.log(`${icons.error} Task failed`);
console.log(`${icons.loading} Task in progress`);
```

**Color Palette:**
- **Status**: Success (green), Error (red), Warning (yellow), Info (blue)
- **UI Elements**: Highlight, Muted, Border, Accent
- **States**: Loading, Progress, Disabled
- **Branding**: Primary brand colors

#### 4. **Status Indicators**
Multi-step process tracking:

```typescript
import { StatusIndicator } from './utils/visual';

const status = new StatusIndicator([
  'Initialize connection',
  'Fetch databases',
  'Generate schema',
  'Create files'
]);

status.updateStep(0, 'running');
status.updateStep(0, 'success', 'Connected to Notion');
status.updateStep(1, 'running');
status.updateStep(1, 'success', 'Found 5 databases');
// ... continue with other steps

status.complete();
```

#### 5. **Beautiful Boxes**
Create attention-grabbing bordered content:

```typescript
import { createBox } from './utils/visual';

const welcomeBox = createBox(
  'Welcome to Notion ORM!\nSetup wizard will guide you through configuration.',
  {
    title: 'Setup Wizard',
    style: 'double',
    color: colors.brand,
    align: 'center',
    padding: 2
  }
);

console.log(welcomeBox);
```

**Output:**
```
╔═══════════════════════════════════════╗
║               Setup Wizard            ║
╠═══════════════════════════════════════╣
║                                       ║
║    Welcome to Notion ORM!             ║
║    Setup wizard will guide you        ║
║    through configuration.             ║
║                                       ║
╚═══════════════════════════════════════╝
```

#### 6. **Enhanced Logger**
Advanced logging with visual elements:

```typescript
import { logger } from './utils/logger';

// Basic logging with enhanced visuals
logger.success('Operation completed', 'All 5 files processed');
logger.error('Failed to connect', error);
logger.warning('Deprecated API usage', 'Please update your code');
logger.info('Processing started', '100 items to process');

// Advanced visual methods
logger.banner('Notion ORM', 'Type Generation System');
logger.divider('Configuration Phase');
logger.step(1, 'Initialize project');
logger.progress('Loading configuration...');

// Data presentation
logger.list([
  'Connect to Notion API',
  'Fetch database schemas',
  'Generate TypeScript types',
  'Create client code'
], { numbered: true });

logger.table([
  { Database: 'Tasks', ID: 'abc123', Properties: '8' },
  { Database: 'Projects', ID: 'def456', Properties: '12' },
  { Database: 'Users', ID: 'ghi789', Properties: '6' }
]);
```

### Integration Examples

#### In CLI Commands

```typescript
// Enhanced generate command
export async function generateTypes(filePath: string): Promise<void> {
  logger.banner("Type Generation", "Generating TypeScript types from Notion schema");
  
  const steps = [
    'Loading schema file',
    'Parsing schema',
    'Initializing Notion client',
    'Validating schema',
    'Generating types',
    'Writing files'
  ];

  for (let i = 0; i < steps.length; i++) {
    logger.progress(steps[i]);
    // ... perform operation
  }

  logger.success('Generation complete', `Generated types for ${modelCount} models`);
}
```

#### In Setup Wizard

```typescript
// Beautiful setup workflow
private printBanner() {
  const banner = createBox(
    '🚀 Notion ORM Setup Wizard\n\nWelcome! This wizard will help you configure your project.',
    {
      style: 'double',
      color: colors.brand,
      align: 'center',
      padding: 2
    }
  );
  console.log('\n' + banner + '\n');
}

private async fetchDatabases(): Promise<void> {
  const spinner = new EnhancedSpinner('Connecting to Notion...');
  spinner.start();

  try {
    await connectToNotion();
    spinner.succeed('Connected successfully!');

    const fetchSpinner = new EnhancedSpinner('Fetching databases...');
    fetchSpinner.start();
    
    const databases = await fetchDatabases();
    fetchSpinner.succeed(`Found ${databases.length} databases`);
    
  } catch (error) {
    spinner.fail('Connection failed');
    throw error;
  }
}
```

### Utility Functions

#### Time and Data Formatting

```typescript
import { formatDuration, formatBytes, formatPercentage } from './utils/visual';

console.log(formatDuration(125000)); // "2m 5s"
console.log(formatBytes(1536)); // "1.5KB"
console.log(formatPercentage(75, 100)); // "75.0%"
```

### Best Practices

1. **Consistent Color Usage**
   - Use semantic colors (success = green, error = red)
   - Maintain consistent theming across all outputs
   - Use muted colors for secondary information

2. **Progressive Disclosure**
   - Start with high-level progress indicators
   - Provide detailed information only when needed
   - Use spinners for indeterminate operations

3. **Error Communication**
   - Always provide clear error messages
   - Include actionable next steps
   - Use consistent error formatting

4. **Performance Considerations**
   - Update progress indicators efficiently
   - Avoid excessive console output
   - Use appropriate update frequencies

## Japanese

### 概要

ビジュアルフィードバックシステムは、美しく、情報豊富で、ユーザーフレンドリーなコマンドラインインターフェースを作成するための包括的なツールセットを提供します。カラフルな出力、進捗インジケーター、明確なステータスメッセージでユーザー体験を向上させます。

### 主な機能

#### 1. **プログレスバー**
長時間実行される操作の高度な進捗追跡：

```typescript
import { ProgressBar } from './utils/visual';

const progress = new ProgressBar(100, {
  label: 'データベース処理中',
  width: 50
});

progress.update(25, 'データ取得中');
progress.update(50, 'レコード処理中');
progress.update(75, '出力生成中');
progress.complete('完了！');
```

#### 2. **拡張スピナー**
成功/失敗状態を持つ美しいアニメーションスピナー：

```typescript
import { EnhancedSpinner } from './utils/visual';

const spinner = new EnhancedSpinner('Notionに接続中...');
spinner.start();

// 成功時
spinner.succeed('接続に成功しました！');

// 失敗時
spinner.fail('接続に失敗しました');

// 警告付き
spinner.warn('警告付きで接続しました');
```

#### 3. **カラフル出力システム**
一貫したテーマ設定のための包括的なカラーパレット：

```typescript
import { colors, icons } from './utils/visual';

console.log(colors.success('操作が完了しました！'));
console.log(colors.error('問題が発生しました'));
console.log(colors.warning('設定を確認してください'));
console.log(colors.info('処理中...'));

// アイコン付き
console.log(`${icons.success} タスク完了`);
console.log(`${icons.error} タスク失敗`);
console.log(`${icons.loading} タスク実行中`);
```

#### 4. **ステータスインジケーター**
マルチステップ処理の追跡：

```typescript
import { StatusIndicator } from './utils/visual';

const status = new StatusIndicator([
  '接続の初期化',
  'データベース取得',
  'スキーマ生成',
  'ファイル作成'
]);

status.updateStep(0, 'running');
status.updateStep(0, 'success', 'Notionに接続しました');
status.updateStep(1, 'running');
status.updateStep(1, 'success', '5個のデータベースを発見');
// ... 他のステップも続行

status.complete();
```

### 統合例

詳細な統合例と使用方法については英語版を参照してください。システムは日本語環境でも完全に動作し、適切な文字エンコーディングとレイアウトをサポートしています。

### ベストプラクティス

1. **一貫した色の使用**
   - セマンティックカラーを使用（成功=緑、エラー=赤）
   - すべての出力で一貫したテーマを維持
   - 副次的な情報にはミュート色を使用

2. **段階的な情報開示**
   - 高レベルの進捗インジケーターから開始
   - 必要な時のみ詳細情報を提供
   - 不確定な操作にはスピナーを使用

3. **エラーコミュニケーション**
   - 常に明確なエラーメッセージを提供
   - 実行可能な次のステップを含める
   - 一貫したエラー形式を使用

このビジュアルフィードバックシステムにより、Notion ORMのコマンドライン体験が格段に向上し、ユーザーにとってより直感的で快適なツールとなります。