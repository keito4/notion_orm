import chalk from 'chalk';

type LogArgs = unknown[];

export const logger = {
  success: (message: string, ...args: LogArgs): void => {
    console.log(chalk.green('✓'), chalk.green(message), ...args);
  },

  error: (message: string, error?: unknown): void => {
    console.error(chalk.red('✗'), chalk.red(message));
    if (error instanceof Error) {
      console.error(chalk.red(error.stack));
    } else if (error) {
      console.error(chalk.red(String(error)));
    }
  },

  info: (message: string, ...args: LogArgs): void => {
    console.log(chalk.blue('ℹ'), message, ...args);
  },

  warn: (message: string, ...args: LogArgs): void => {
    console.log(chalk.yellow('⚠'), chalk.yellow(message), ...args);
  }
};