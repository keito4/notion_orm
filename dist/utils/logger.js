"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};
exports.logger = {
    success: (message, ...args) => {
        console.log(`${colors.green}✓${colors.reset}`, `${colors.green}${message}${colors.reset}`, ...args);
    },
    error: (message, error) => {
        console.error(`${colors.red}✗${colors.reset}`, `${colors.red}${message}${colors.reset}`);
        if (error instanceof Error) {
            console.error(`${colors.red}${error.stack}${colors.reset}`);
        }
        else if (error) {
            console.error(`${colors.red}${String(error)}${colors.reset}`);
        }
    },
    info: (message, ...args) => {
        console.log(`${colors.blue}ℹ${colors.reset}`, message, ...args);
    },
    warn: (message, ...args) => {
        console.log(`${colors.yellow}⚠${colors.reset}`, `${colors.yellow}${message}${colors.reset}`, ...args);
    }
};
