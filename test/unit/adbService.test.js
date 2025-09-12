/**
 * Unit tests for adbService.js
 */
const adbService = require("../../src-server/adbService");

describe("adbService", () => {
    it("should export adb client", () => {
        expect(adbService).toHaveProperty("adb");
    });
    it("should have a function to check ADB availability", () => {
        expect(typeof adbService.checkAdbAvailability).toBe("function");
    });
    it("should have a function to get devices", () => {
        expect(typeof adbService.getAdbDevices).toBe("function");
    });
});
