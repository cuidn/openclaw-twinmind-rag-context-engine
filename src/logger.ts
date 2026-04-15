// Simple stderr logger with prefix. No external dependencies.

export type LogLevel = "debug" | "info" | "warn" | "error";

const PREFIX = "[TwinMindRAG]";

export interface Logger {
  debug(msg: string, ...meta: unknown[]): void;
  info(msg: string, ...meta: unknown[]): void;
  warn(msg: string, ...meta: unknown[]): void;
  error(msg: string, ...meta: unknown[]): void;
}

function format(level: LogLevel, prefix: string, msg: string, ...meta: unknown[]): string {
  const parts = [`${prefix} [${level.toUpperCase()}] ${msg}`];
  for (const m of meta) {
    if (m instanceof Error) {
      parts.push(`${m.message}\n${m.stack}`);
    } else if (typeof m === "object") {
      parts.push(JSON.stringify(m));
    } else {
      parts.push(String(m));
    }
  }
  return parts.join(" ");
}

export function createLogger(prefix = PREFIX): Logger {
  return {
    debug(msg: string, ...meta: unknown[]) {
      // eslint-disable-next-line no-console
      console.debug(format("debug", prefix, msg, ...meta));
    },
    info(msg: string, ...meta: unknown[]) {
      // eslint-disable-next-line no-console
      console.info(format("info", prefix, msg, ...meta));
    },
    warn(msg: string, ...meta: unknown[]) {
      // eslint-disable-next-line no-console
      console.warn(format("warn", prefix, msg, ...meta));
    },
    error(msg: string, ...meta: unknown[]) {
      // eslint-disable-next-line no-console
      console.error(format("error", prefix, msg, ...meta));
    },
  };
}
