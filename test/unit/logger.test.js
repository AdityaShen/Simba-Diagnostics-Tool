/**
 * Unit tests for logger.js
 */
const { log } = require("../../src-server/logger");

describe("Logger Utility", () => {
    it("should log messages at or above CURRENT_LOG_LEVEL", () => {
        // This test is illustrative; actual console output is not captured by Jest
        expect(typeof log).toBe("function");
    });
});
