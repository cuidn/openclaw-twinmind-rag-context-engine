// Simple stderr logger with prefix. No external dependencies.
const PREFIX = "[TwinMindRAG]";
function format(level, prefix, msg, ...meta) {
    const parts = [`${prefix} [${level.toUpperCase()}] ${msg}`];
    for (const m of meta) {
        if (m instanceof Error) {
            parts.push(`${m.message}\n${m.stack}`);
        }
        else if (typeof m === "object") {
            parts.push(JSON.stringify(m));
        }
        else {
            parts.push(String(m));
        }
    }
    return parts.join(" ");
}
export function createLogger(prefix = PREFIX) {
    return {
        debug(msg, ...meta) {
            // eslint-disable-next-line no-console
            console.debug(format("debug", prefix, msg, ...meta));
        },
        info(msg, ...meta) {
            // eslint-disable-next-line no-console
            console.info(format("info", prefix, msg, ...meta));
        },
        warn(msg, ...meta) {
            // eslint-disable-next-line no-console
            console.warn(format("warn", prefix, msg, ...meta));
        },
        error(msg, ...meta) {
            // eslint-disable-next-line no-console
            console.error(format("error", prefix, msg, ...meta));
        },
    };
}
//# sourceMappingURL=logger.js.map