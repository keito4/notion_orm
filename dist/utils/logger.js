"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};
const symbols = {
    debug: '🔍',
    info: 'ℹ',
    warn: '⚠',
    error: '✗',
    success: '✓'
};
function getTimestamp() {
    return new Date().toISOString();
}
function formatMessage(level, message) {
    const timestamp = getTimestamp();
    const color = {
        debug: colors.magenta,
        info: colors.blue,
        warn: colors.yellow,
        error: colors.red,
        success: colors.green
    }[level];
    return `${color}${symbols[level]}${colors.reset} [${timestamp}] ${color}${message}${colors.reset}`;
}
exports.logger = {
    debug: (message, ...args) => {
        if (process.env.DEBUG) {
            console.log(formatMessage('debug', message), ...args);
        }
    },
    success: (message, ...args) => {
        console.log(formatMessage('success', message), ...args);
    },
    error: (message, error) => {
        console.error(formatMessage('error', message));
        if (error instanceof Error) {
            console.error(`${colors.red}Stack trace:${colors.reset}`);
            console.error(`${colors.red}${error.stack}${colors.reset}`);
        }
        else if (error) {
            console.error(`${colors.red}Error details: ${String(error)}${colors.reset}`);
        }
    },
    info: (message, ...args) => {
        console.log(formatMessage('info', message), ...args);
    },
    warn: (message, ...args) => {
        console.log(formatMessage('warn', message), ...args);
    }
};
