/**
 * @file loggerService.js
 * @description Winston-based logging service for Simba backend modules.
 * @module loggerService
 * @author Aditya Shenoy
 * @copyright Simba (c) 2025
 * @license MIT
 *
 * Provides a configured Winston logger for console and file logging.
 */
const winston = require("winston");

const logger = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        }),
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "simba.log" }),
    ],
});

module.exports = logger;
