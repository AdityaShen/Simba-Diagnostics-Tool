/**
 * Unit tests for constants.js
 */
const constants = require("../../src-server/constants");

describe("Constants Module", () => {
    it("should export expected keys", () => {
        expect(constants).toHaveProperty("SERVER_PORT_BASE");
        expect(constants).toHaveProperty("WEBSOCKET_PORT");
        expect(constants).toHaveProperty("MESSAGE_TYPES");
    });
});
