/**
 * @file controlWorker.js
 * @description Worker thread for processing control data and socket communication in scrcpy sessions.
 * @module controlWorker
 * @author Aditya Shenoy
 * @copyright Simba (c) 2025
 * @license MIT
 *
 * This worker receives control data messages, validates and forwards them to the main thread for socket writing.
 */
const { parentPort, workerData } = require("worker_threads");

const { scid, CURRENT_LOG_LEVEL } = workerData;

const LogLevel = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

/**
 * Logs messages from the worker thread with timestamp and log level.
 * @param {number} level - Log level (DEBUG, INFO, WARN, ERROR).
 * @param {string} message - Log message.
 * @param {...any} args - Additional arguments.
 */
function log(level, message, ...args) {
    if (level >= CURRENT_LOG_LEVEL) {
        const levelStr = Object.keys(LogLevel).find((key) => LogLevel[key] === level);
        const timestamp = new Date().toISOString();
        if (process.env.NODE_ENV !== "production") {
            console.log(`[${timestamp}] [${levelStr}] [Worker ${scid}]`, message, ...args);
        }
    }
}

/**
 * Handles messages from the parent thread, processes control data, and posts results.
 */
parentPort.on("message", (msg) => {
    const { type, data, scid: msgScid, clientId: msgClientId } = msg;
    if (type === "controlData") {
        try {
            let controlData = data;
            if (!Buffer.isBuffer(controlData)) {
                if (
                    data instanceof ArrayBuffer ||
                    ArrayBuffer.isView(data) ||
                    (data && data.type === "Buffer" && Array.isArray(data.data))
                ) {
                    controlData = Buffer.from(data.data ? data.data : data);
                } else {
                    throw new Error(`Received invalid data type for controlData: ${typeof data}`);
                }
            }
            if (controlData.length === 0) {
                throw new Error("Empty control data");
            }
            log(
                LogLevel.DEBUG,
                `Processing control data: ${controlData.length} bytes for SCID ${msgScid}`,
            );
            parentPort.postMessage({
                type: "writeToSocket",
                scid: msgScid,
                clientId: msgClientId,
                data: controlData,
            });
        } catch (error) {
            parentPort.postMessage({
                type: "error",
                scid: msgScid,
                clientId: msgClientId,
                error: error.message,
            });
        }
    } else if (type === "stop") {
        log(LogLevel.DEBUG, "Stopping");
        process.exit(0);
    }
});
