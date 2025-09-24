/**
 * Expanded integration tests for scrcpySession.js
 */
const scrcpySession = require("../../src-server/scrcpySession");
const adbService = require("../../src-server/adbService");

jest.mock("../../src-server/adbService");

describe("scrcpySession Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        scrcpySession.sessions.clear();
    });

    it("should setup and cleanup a session with valid device", async () => {
        adbService.adbPushServer.mockResolvedValue();
        adbService.checkReverseTunnelExists.mockResolvedValue(false);
        adbService.executeCommand.mockResolvedValue({ success: true });
        const wsClientsRef = new Map();
        const session = await scrcpySession.setupScrcpySession(
            "test-device",
            "test-scid",
            12345,
            { video: "true", audio: "false", control: "true" },
            "client-1",
            "overlay",
            false,
            wsClientsRef,
            "webcodecs",
        );
        expect(session).toBeDefined();
        await scrcpySession.cleanupSession("test-scid", wsClientsRef);
        expect(scrcpySession.sessions.has("test-scid")).toBe(false);
    });

    it("should throw error for missing streams", async () => {
        await expect(
            scrcpySession.setupScrcpySession(
                "test-device",
                "test-scid",
                12345,
                {},
                "client-1",
                "overlay",
                false,
                new Map(),
                "webcodecs",
            ),
        ).rejects.toThrow("No streams enabled.");
    });

    // Add more integration scenarios as needed
});
