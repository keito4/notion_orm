import { colors, icons, VisualLogger } from "./visual";

type LogArgs = unknown[];
type LogLevel = "debug" | "info" | "warn" | "error" | "success";

// Legacy symbols kept for backwards compatibility (unused but maintained for reference)
// const _legacySymbols = {
//   debug: "🔍",
//   info: "ℹ",
//   warn: "⚠",
//   error: "✗",
//   success: "✓",
// };

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = getTimestamp();
  const colorFn = {
    debug: colors.muted,
    info: colors.info,
    warn: colors.warning,
    error: colors.error,
    success: colors.success,
  }[level];

  const icon = {
    debug: icons.info,
    info: icons.info,
    warn: icons.warning,
    error: icons.error,
    success: icons.success,
  }[level];

  return `${icon} [${colors.muted(timestamp)}] ${colorFn(message)}`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const errorDetails = [
      `Error: ${error.message}`,
      error.stack ? `Stack trace:\n${error.stack}` : '',
      error.cause ? `Caused by: ${error.cause}` : ''
    ].filter(Boolean).join('\n');
    return colors.error(errorDetails);
  }

  return colors.error(`Error details: ${String(error)}`);
}

export const logger = {
  debug: (message: string, ...args: LogArgs): void => {
    if (typeof process !== 'undefined' && process.env.DEBUG) {
      console.log(formatMessage("debug", message), ...args);
    }
  },

  success: (message: string, details?: string, ...args: LogArgs): void => {
    if (details) {
      VisualLogger.success(message, details);
    } else {
      console.log(formatMessage("success", message), ...args);
    }
  },

  error: (message: string, error?: unknown): void => {
    if (error) {
      console.error(formatMessage("error", message));
      console.error(formatError(error));
    } else {
      VisualLogger.error(message);
    }
  },

  info: (message: string, details?: string, ...args: LogArgs): void => {
    if (details) {
      VisualLogger.info(message, details);
    } else {
      console.log(formatMessage("info", message), ...args);
    }
  },

  warn: (message: string, details?: string, ...args: LogArgs): void => {
    if (details) {
      VisualLogger.warning(message, details);
    } else {
      console.log(formatMessage("warn", message), ...args);
    }
  },

  // New enhanced methods using VisualLogger
  visual: VisualLogger,
  
  // Specific visual methods for common use cases
  step: (stepNumber: number, message: string): void => {
    VisualLogger.step(stepNumber, message);
  },

  progress: (message: string): void => {
    VisualLogger.progress(message);
  },

  banner: (title: string, subtitle?: string): void => {
    VisualLogger.banner(title, subtitle);
  },

  divider: (title?: string): void => {
    VisualLogger.divider(title);
  },

  list: (items: string[], options?: { numbered?: boolean; color?: (_text: string) => string }): void => {
    VisualLogger.list(items, options);
  },

  table: (data: Array<Record<string, string>>, headers?: string[]): void => {
    VisualLogger.table(data, headers);
  }
};
