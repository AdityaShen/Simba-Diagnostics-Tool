/**
 * @file loggerService.js
 * @description Centralized logging and error handling for Simba client UI.
 * @author Aditya Shenoy
 * @copyright Simba (c) 2025
 * @date 2025-09-10
 *
 * Provides appendLog, updateStatus, and global error handling for UI and debugging.
 * All log messages are timestamped and displayed in the client log panel.
 */
import { elements } from "./domElements.js";
import { MAX_LOG_LINES } from "./constants.js";

/**
 * Internal log message buffer for UI display.
 * @type {Array<{message: string, isError: boolean}>}
 */
const logMessages = [];

/**
 * Appends a log message to the UI log panel.
 * @param {string} message - The log message to display.
 * @param {boolean} [isError=false] - Whether the message is an error.
 */
/**
 * Appends a log message to the UI log panel.
 * Suppresses known benign error logs (e.g., HAR trace start/stop errors that do not affect functionality).
 * @param {string} message - The log message to display.
 * @param {boolean} [isError=false] - Whether the message is an error.
 */
export function appendLog(message, isError = false) {
    // Suppress known benign error logs (customize patterns as needed)
    const benignErrorPatterns = [
        /Error:.*(har|HAR).*trace.*(start|stop)/i,
        /Failed to stop HAR trace/i,
        /Failed to start HAR trace/i,
        /Error sending WebSocket message:.*(har|HAR)/i,
        /WebSocket error. Check console./i,
        /Unknown binary packet type: [0-9]+/i,
        /Error decoding audio data: .+/i,
        /Error playing audio data: .+/i,
        /AudioDecoder error: .+/i,
        /VideoDecoder error: .+/i,
        /Video play error: .+/i,
        /Video element error: .+/i,
        /Broadway: Error during decode\(\): .+/i,
        /Error cleaning source buffer: .+/i,
        /Error resetting video element: .+/i,
        /Error stopping MSE converter: .+/i,
        /Error resetting decoder: .+/i,
        /WebCodecs Video: Error decoding chunk: .+/i,
        /WebCodecs Video: Error configuring decoder: .+/i,
    ];
    if (isError && benignErrorPatterns.some((pat) => pat.test(message))) {
        return; // Suppress benign error log
    }
    const timestamp = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    logMessages.push({ message: `[${timestamp}] ${message}`, isError });
    if (logMessages.length > MAX_LOG_LINES) logMessages.shift();
    updateLogDisplay();
}

/**
 * Updates the log panel in the UI with all buffered log messages.
 * Called automatically after each appendLog.
 * @private
 */
function updateLogDisplay() {
    if (elements.logContent) {
        elements.logContent.innerHTML = logMessages
            .map(
                ({ message, isError }) =>
                    `<div style="${isError ? "color: #ff4444;" : ""}">${message}</div>`,
            )
            .join("");
        elements.logContent.scrollTop = elements.logContent.scrollHeight;
    }
}

/**
 * Updates the status log with a message (alias for appendLog).
 * @param {string} message - The status message to display.
 */
export function updateStatus(message) {
    appendLog(message);
}

/**
 * Installs global error handling for the client UI.
 * All console.error calls are logged to the UI log panel as errors.
 */
export function initGlobalErrorHandling() {
    const originalConsoleError = console.error;
    console.error = (message, ...args) => {
        const formattedMessage = [message, ...args].join(" ");
        appendLog(formattedMessage, true);
        originalConsoleError(message, ...args);
    };
}
