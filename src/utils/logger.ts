type LogArgs = unknown[];
type LogLevel = "debug" | "info" | "warn" | "error" | "success";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

const symbols = {
  debug: "🔍",
  info: "ℹ",
  warn: "⚠",
  error: "✗",
  success: "✓",
};

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = getTimestamp();
  const color = {
    debug: colors.magenta,
    info: colors.blue,
    warn: colors.yellow,
    error: colors.red,
    success: colors.green,
  }[level];

  return `${color}${symbols[level]}${colors.reset} [${timestamp}] ${color}${message}${colors.reset}`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const errorDetails = [
      `Error: ${error.message}`,
      error.stack ? `Stack trace:\n${error.stack}` : '',
      error.cause ? `Caused by: ${error.cause}` : ''
    ].filter(Boolean).join('\n');
    return `${colors.red}${errorDetails}${colors.reset}`;
  }

  return `${colors.red}Error details: ${String(error)}${colors.reset}`;
}

export const logger = {
  debug: (message: string, ...args: LogArgs): void => {
    if (process.env.DEBUG) {
      console.log(formatMessage("debug", message), ...args);
    }
  },

  success: (message: string, ...args: LogArgs): void => {
    console.log(formatMessage("success", message), ...args);
  },

  error: (message: string, error?: unknown): void => {
    console.error(formatMessage("error", message));
    if (error !== undefined) {
      console.error(formatError(error));
    }
  },

  info: (message: string, ...args: LogArgs): void => {
    console.log(formatMessage("info", message), ...args);
  },

  warn: (message: string, ...args: LogArgs): void => {
    console.log(formatMessage("warn", message), ...args);
  },
};