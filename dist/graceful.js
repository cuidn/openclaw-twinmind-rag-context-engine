/**
 * graceful.ts — Error handling utilities for TwinMind RAG Context Engine.
 *
 * All public API methods in this plugin use these utilities to ensure
 * they NEVER throw — failures always return a safe empty result.
 */
/**
 * Wraps an async function. On any error (thrown, rejected, or abnormal)
 * logs the error at WARN level and returns the provided fallback value.
 *
 * @param fn - The function to protect
 * @param fallback - The value to return on failure
 * @param logger - Logger instance for warning messages
 * @param context - Human-readable description of what failed (for the log message)
 */
export function withGracefulFailure(fn, fallback, logger, context) {
    try {
        return fn();
    }
    catch (err) {
        logger.warn(`Graceful failure in ${context}`, err);
        return fallback;
    }
}
/**
 * Wraps an async function. On any rejection or thrown error,
 * logs the error at WARN level and returns the provided fallback value.
 */
export async function withGracefulFailureAsync(fn, fallback, logger, context) {
    try {
        return await fn();
    }
    catch (err) {
        logger.warn(`Graceful failure in ${context}`, err);
        return fallback;
    }
}
//# sourceMappingURL=graceful.js.map