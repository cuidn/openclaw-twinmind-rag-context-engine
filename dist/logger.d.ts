export type LogLevel = "debug" | "info" | "warn" | "error";
export interface Logger {
    debug(msg: string, ...meta: unknown[]): void;
    info(msg: string, ...meta: unknown[]): void;
    warn(msg: string, ...meta: unknown[]): void;
    error(msg: string, ...meta: unknown[]): void;
}
export declare function createLogger(prefix?: string): Logger;
//# sourceMappingURL=logger.d.ts.map