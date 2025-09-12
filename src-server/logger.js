/**
 * @file logger.js
 * @description Logging utility for Simba backend modules.
 * @module logger
 * @author Simba Team
 * @copyright Simba (c) 2025
 * @license MIT
 *
 * Provides a log function for timestamped, leveled logging.
 */
const { LogLevel, CURRENT_LOG_LEVEL } = require("./constants");

/**
 * Logs a message with timestamp and log level if above CURRENT_LOG_LEVEL.
 * @param {number} level - Log level (DEBUG, INFO, WARN, ERROR).
 * @param {string} message - Log message.
 * @param {...any} args - Additional arguments.
 */
function log(level, message, ...args) {
    if (level >= CURRENT_LOG_LEVEL) {
        const levelStr = Object.keys(LogLevel).find((key) => LogLevel[key] === level);
        const timestamp = new Date().toISOString();
        if (process.env.NODE_ENV !== "production") {
            console.log(`[${timestamp}] [${levelStr}]`, message, ...args);
        }
    }
}

module.exports = { log };
