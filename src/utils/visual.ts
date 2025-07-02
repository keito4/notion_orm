import chalk from "chalk";

// Color themes for different types of output
export const colors = {
  // Primary colors
  primary: chalk.blue,
  secondary: chalk.cyan,
  accent: chalk.magenta,
  
  // Status colors
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  
  // UI elements
  border: chalk.gray,
  highlight: chalk.bold.white,
  muted: chalk.gray,
  
  // Special states
  loading: chalk.cyan,
  progress: chalk.green,
  disabled: chalk.dim.gray,
  
  // Branding
  brand: chalk.bold.blue,
  logo: chalk.bold.magenta
};

// Icons and symbols
export const icons = {
  // Status icons
  success: chalk.green('✓'),
  error: chalk.red('✗'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),
  
  // Progress icons
  loading: chalk.cyan('⟳'),
  pending: chalk.yellow('○'),
  complete: chalk.green('●'),
  
  // UI icons
  arrow: chalk.gray('→'),
  bullet: chalk.gray('•'),
  check: chalk.green('✓'),
  cross: chalk.red('✗'),
  
  // Special icons
  rocket: '🚀',
  sparkles: '✨',
  gear: '⚙️',
  book: '📖',
  fire: '🔥',
  heart: '❤️',
  thumbsUp: '👍',
  party: '🎉',
  
  // Spinner frames
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['|', '/', '-', '\\']
};

// Box drawing characters
export const box = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  
  // Light box
  lightTopLeft: '┌',
  lightTopRight: '┐',
  lightBottomLeft: '└',
  lightBottomRight: '┘',
  lightHorizontal: '─',
  lightVertical: '│',
  
  // Double box
  doubleTopLeft: '╔',
  doubleTopRight: '╗',
  doubleBottomLeft: '╚',
  doubleBottomRight: '╝',
  doubleHorizontal: '═',
  doubleVertical: '║'
};

// Progress bar component
export class ProgressBar {
  private current: number = 0;
  private total: number;
  private width: number;
  private label: string;
  private startTime: number;

  constructor(total: number, options: {
    width?: number;
    label?: string;
    format?: string;
  } = {}) {
    this.total = total;
    this.width = options.width || 40;
    this.label = options.label || 'Progress';
    this.startTime = Date.now();
  }

  update(current: number, label?: string): void {
    this.current = current;
    if (label) this.label = label;
    this.render();
  }

  increment(label?: string): void {
    this.update(this.current + 1, label);
  }

  complete(label?: string): void {
    this.update(this.total, label || 'Complete');
    process.stdout.write('\n');
  }

  private render(): void {
    const percentage = Math.round((this.current / this.total) * 100);
    const filled = Math.round((this.current / this.total) * this.width);
    const empty = this.width - filled;
    
    // Create progress bar
    const filledBar = colors.progress('█'.repeat(filled));
    const emptyBar = colors.muted('░'.repeat(empty));
    const progressBar = `${filledBar}${emptyBar}`;
    
    // Calculate elapsed time and ETA
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / (elapsed / 1000);
    const eta = this.current > 0 ? Math.round((this.total - this.current) / rate) : 0;
    
    // Format time
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };
    
    // Build output line
    const percentageStr = colors.highlight(`${percentage.toString().padStart(3)}%`);
    const fraction = colors.muted(`${this.current}/${this.total}`);
    const etaStr = eta > 0 ? colors.muted(`ETA: ${formatTime(eta)}`) : '';
    
    const line = `${colors.info(this.label)} [${progressBar}] ${percentageStr} ${fraction} ${etaStr}`;
    
    // Clear line and write new content
    process.stdout.write(`\r${' '.repeat(process.stdout.columns || 80)}\r${line}`);
  }
}

// Enhanced spinner with progress tracking
export class EnhancedSpinner {
  private frames: string[];
  private interval: ReturnType<typeof setInterval> | null = null;
  private currentFrame: number = 0;
  private message: string;
  private color: (_text: string) => string;
  private isActive: boolean = false;

  constructor(message: string = 'Loading...', options: {
    frames?: string[];
    color?: (_text: string) => string;
    interval?: number;
  } = {}) {
    this.message = message;
    this.frames = options.frames || icons.spinner;
    this.color = options.color || colors.loading;
  }

  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.currentFrame = 0;
    
    // Hide cursor
    process.stdout.write('\x1B[?25l');
    
    this.interval = setInterval(() => {
      const frame = this.color(this.frames[this.currentFrame]);
      process.stdout.write(`\r${frame} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  updateMessage(message: string): void {
    this.message = message;
  }

  succeed(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    console.log(`${icons.success} ${finalMessage}`);
  }

  fail(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    console.log(`${icons.error} ${finalMessage}`);
  }

  warn(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    console.log(`${icons.warning} ${finalMessage}`);
  }

  info(message?: string): void {
    this.stop();
    const finalMessage = message || this.message;
    console.log(`${icons.info} ${finalMessage}`);
  }

  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    // Clear line and show cursor
    process.stdout.write('\r' + ' '.repeat((this.message.length + 10)) + '\r');
    process.stdout.write('\x1B[?25h');
  }
}

// Status indicator for multi-step processes
export class StatusIndicator {
  private steps: Array<{
    label: string;
    status: 'pending' | 'running' | 'success' | 'error' | 'warning';
    message?: string;
  }>;

  constructor(steps: string[]) {
    this.steps = steps.map(label => ({ label, status: 'pending' as const }));
  }

  updateStep(index: number, status: 'pending' | 'running' | 'success' | 'error' | 'warning', message?: string): void {
    if (index >= 0 && index < this.steps.length) {
      this.steps[index].status = status;
      if (message) this.steps[index].message = message;
      this.render();
    }
  }

  private render(): void {
    console.clear();
    console.log(colors.brand('\n🚀 Notion ORM Setup Progress\n'));
    
    this.steps.forEach((step, index) => {
      const icon = this.getStatusIcon(step.status);
      const label = this.getStyledLabel(step.label, step.status);
      const message = step.message ? colors.muted(` - ${step.message}`) : '';
      
      console.log(`${(index + 1).toString().padStart(2)}. ${icon} ${label}${message}`);
    });
    
    console.log(); // Add spacing
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return icons.pending;
      case 'running': return colors.loading('⟳');
      case 'success': return icons.success;
      case 'error': return icons.error;
      case 'warning': return icons.warning;
      default: return icons.pending;
    }
  }

  private getStyledLabel(label: string, status: string): string {
    switch (status) {
      case 'pending': return colors.muted(label);
      case 'running': return colors.loading(label);
      case 'success': return colors.success(label);
      case 'error': return colors.error(label);
      case 'warning': return colors.warning(label);
      default: return label;
    }
  }

  complete(): void {
    console.log(colors.success('\n✨ Setup completed successfully!\n'));
  }

  error(message: string): void {
    console.log(colors.error(`\n💥 Setup failed: ${message}\n`));
  }
}

// Create beautiful boxes
export function createBox(content: string, options: {
  title?: string;
  style?: 'single' | 'double' | 'thick';
  color?: (_text: string) => string;
  padding?: number;
  align?: 'left' | 'center' | 'right';
} = {}): string {
  const lines = content.split('\n');
  const padding = options.padding || 1;
  const color = options.color || colors.border;
  const align = options.align || 'left';
  
  // Calculate box width
  const contentWidth = Math.max(...lines.map(line => line.length));
  const titleWidth = options.title ? options.title.length : 0;
  const width = Math.max(contentWidth, titleWidth) + (padding * 2);
  
  // Choose box characters
  let chars;
  switch (options.style) {
    case 'double':
      chars = {
        tl: box.doubleTopLeft, tr: box.doubleTopRight,
        bl: box.doubleBottomLeft, br: box.doubleBottomRight,
        h: box.doubleHorizontal, v: box.doubleVertical
      };
      break;
    case 'thick':
      chars = { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' };
      break;
    default:
      chars = {
        tl: box.lightTopLeft, tr: box.lightTopRight,
        bl: box.lightBottomLeft, br: box.lightBottomRight,
        h: box.lightHorizontal, v: box.lightVertical
      };
  }
  
  const result: string[] = [];
  
  // Top border
  if (options.title) {
    const titlePadding = Math.max(0, width - options.title.length - 2);
    const leftPad = Math.floor(titlePadding / 2);
    const rightPad = titlePadding - leftPad;
    result.push(color(chars.tl + chars.h.repeat(leftPad) + ` ${options.title} ` + chars.h.repeat(rightPad) + chars.tr));
  } else {
    result.push(color(chars.tl + chars.h.repeat(width) + chars.tr));
  }
  
  // Content lines
  lines.forEach(line => {
    const contentPadding = width - line.length - (padding * 2);
    let alignedLine = line;
    
    if (align === 'center') {
      const leftPad = Math.floor(contentPadding / 2);
      const rightPad = contentPadding - leftPad;
      alignedLine = ' '.repeat(leftPad) + line + ' '.repeat(rightPad);
    } else if (align === 'right') {
      alignedLine = ' '.repeat(contentPadding) + line;
    } else {
      alignedLine = line + ' '.repeat(contentPadding);
    }
    
    result.push(color(chars.v) + ' '.repeat(padding) + alignedLine + ' '.repeat(padding) + color(chars.v));
  });
  
  // Bottom border
  result.push(color(chars.bl + chars.h.repeat(width) + chars.br));
  
  return result.join('\n');
}

// Enhanced logger with visual feedback
export class VisualLogger {
  static success(message: string, details?: string): void {
    console.log(`${icons.success} ${colors.success(message)}`);
    if (details) {
      console.log(`   ${colors.muted(details)}`);
    }
  }

  static error(message: string, details?: string): void {
    console.log(`${icons.error} ${colors.error(message)}`);
    if (details) {
      console.log(`   ${colors.muted(details)}`);
    }
  }

  static warning(message: string, details?: string): void {
    console.log(`${icons.warning} ${colors.warning(message)}`);
    if (details) {
      console.log(`   ${colors.muted(details)}`);
    }
  }

  static info(message: string, details?: string): void {
    console.log(`${icons.info} ${colors.info(message)}`);
    if (details) {
      console.log(`   ${colors.muted(details)}`);
    }
  }

  static step(stepNumber: number, message: string): void {
    console.log(`${colors.accent(`Step ${stepNumber}:`)} ${colors.highlight(message)}`);
  }

  static progress(message: string): void {
    console.log(`${icons.loading} ${colors.loading(message)}`);
  }

  static banner(title: string, subtitle?: string): void {
    const box = createBox(
      subtitle ? `${title}\n${subtitle}` : title,
      {
        style: 'double',
        color: colors.brand,
        align: 'center',
        padding: 2
      }
    );
    console.log('\n' + box + '\n');
  }

  static divider(title?: string): void {
    const width = process.stdout.columns || 80;
    if (title) {
      const padding = Math.max(0, width - title.length - 4);
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      console.log(colors.border('─'.repeat(leftPad) + ` ${title} ` + '─'.repeat(rightPad)));
    } else {
      console.log(colors.border('─'.repeat(width)));
    }
  }

  static list(items: string[], options: {
    numbered?: boolean;
    color?: (_text: string) => string;
  } = {}): void {
    const color = options.color || colors.primary;
    items.forEach((item, index) => {
      const prefix = options.numbered ? `${index + 1}.` : icons.bullet;
      console.log(`  ${colors.muted(prefix)} ${color(item)}`);
    });
  }

  static table(data: Array<Record<string, string>>, headers?: string[]): void {
    if (data.length === 0) return;
    
    const keys = headers || Object.keys(data[0]);
    const columns = keys.map(key => ({
      key,
      width: Math.max(key.length, ...data.map(row => (row[key] || '').toString().length))
    }));
    
    // Header
    const headerRow = columns.map(col => colors.highlight(col.key.padEnd(col.width))).join(' │ ');
    console.log(`  ${headerRow}`);
    console.log(`  ${columns.map(col => '─'.repeat(col.width)).join('─┼─')}`);
    
    // Data rows
    data.forEach(row => {
      const dataRow = columns.map(col => (row[col.key] || '').toString().padEnd(col.width)).join(' │ ');
      console.log(`  ${dataRow}`);
    });
  }
}

// Export utility functions
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`;
}

export function formatPercentage(value: number, total: number): string {
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}