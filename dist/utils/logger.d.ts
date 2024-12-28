type LogArgs = unknown[];
export declare const logger: {
    success: (message: string, ...args: LogArgs) => void;
    error: (message: string, error?: unknown) => void;
    info: (message: string, ...args: LogArgs) => void;
    warn: (message: string, ...args: LogArgs) => void;
};
export {};
