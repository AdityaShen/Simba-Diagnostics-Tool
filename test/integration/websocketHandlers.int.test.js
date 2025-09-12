/**
 * Integration tests for websocketHandlers.js
 */
const { createWebSocketServer } = require("../../src-server/websocketHandlers");

describe("WebSocket Handlers Integration", () => {
    it("should create a WebSocket server instance", () => {
        const wss = createWebSocketServer();
        expect(wss).toBeDefined();
        expect(typeof wss.on).toBe("function");
        wss.close();
    });
});
