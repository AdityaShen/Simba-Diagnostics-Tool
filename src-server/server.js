/**
 * @file server.js
 * @description Main Express server and WebSocket entry point for Simba backend.
 * @author Aditya Shen
 * @copyright Simba3, AdityaShen
 * @date 2025-09-10
 *
 * All exported functions and main logic are documented for clarity and maintainability. Code is company-ready and easy to extend.
 */
const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const C = require("./constants");
const { log } = require("./logger");
const adbService = require("./adbService"); // ✅ Correct single import
const { checkAdbAvailability, getAdbDevices } = adbService;
const adb = adbService.adb;
const { readAll } = require("@devicefarmer/adbkit"); // ✅ for shell output
const { createWebSocketServer } = require("./websocketHandlers");
const sessionManager = require("./scrcpySession");

const RECORD_DURATION = 170; // seconds, just under 3 min
const RECORD_DIR = path.resolve(__dirname, "../public/recordings");
if (!fs.existsSync(RECORD_DIR)) fs.mkdirSync(RECORD_DIR);

let recordingState = {
    isRecording: false,
    files: [],
    deviceId: null,
};
async function start() {
    let httpServer, mainWss;
    try {
        await checkAdbAvailability();
        mainWss = createWebSocketServer();

        const app = express();
        app.use(express.json());

        // Serve static files
        app.use(express.static(path.resolve(__dirname, "../public/dist")));
        app.use("/landing.html", express.static(path.resolve(__dirname, "../public/landing.html")));
        app.use("/recordings", express.static(RECORD_DIR));

        const { Readable } = require("stream");

        async function readAll(stream) {
            return new Promise((resolve, reject) => {
                const chunks = [];
                stream.on("data", (chunk) => chunks.push(chunk));
                stream.on("end", () => resolve(Buffer.concat(chunks)));
                stream.on("error", reject);
            });
        }

        app.get("/api/device-count", async (req, res) => {
            try {
                const devices = await adbService.getAdbDevices();
                const connectedDevices = devices.filter((d) => d.type === "device");
                res.json({ count: connectedDevices.length });
            } catch (err) {
                res.status(500).json({ error: "Failed to fetch device count" });
            }
        });

        app.get("/list-devices", async (req, res) => {
            try {
                const devices = await getAdbDevices();
                const detailedDevices = await Promise.all(
                    devices.map(async (device) => {
                        const d = adb.getDevice(device.id);

                        async function shell(cmd) {
                            const stream = await d.shell(cmd);
                            const output = await readAll(stream);
                            const text = output.toString().trim();
                            if (process.env.NODE_ENV !== "production") {
                                console.log(`[${device.id}] ${cmd} => "${text}"`);
                            }
                            return text;
                        }

                        let model = "N/A",
                            brand = "N/A",
                            name = "N/A",
                            androidVersion = "N/A",
                            resolution = "Unknown",
                            battery = "Unknown%",
                            wifi = "Disabled";

                        try {
                            model = await shell("getprop ro.product.model");
                        } catch (e) {
                            console.error("Model error:", e);
                        }
                        try {
                            brand = await shell("getprop ro.product.brand");
                        } catch (e) {
                            console.error("Brand error:", e);
                        }
                        try {
                            name = await shell("getprop ro.product.name");
                        } catch (e) {
                            console.error("Name error:", e);
                        }
                        try {
                            androidVersion = await shell("getprop ro.build.version.release");
                        } catch (e) {
                            console.error("Android Version error:", e);
                        }
                        try {
                            const res = await shell("wm size");
                            resolution = res.match(/Physical size:\s*(\S+)/)?.[1] || "Unknown";
                        } catch (e) {
                            console.error("Resolution error:", e);
                        }

                        try {
                            const level = await adbService.getBatteryLevel(device.id);
                            battery = `${level}%`;
                        } catch (e) {
                            console.error("Battery error:", e);
                        }

                        try {
                            const wifiStatus = await shell("dumpsys wifi");
                            wifi = wifiStatus.includes("Wi-Fi is enabled") ? "Enabled" : "Disabled";
                        } catch (e) {
                            console.error("Wi-Fi error:", e);
                        }

                        return {
                            id: device.id,
                            model,
                            brand,
                            name,
                            androidVersion,
                            resolution,
                            battery,
                            wifi,
                        };
                    }),
                );

                res.json({ success: true, devices: detailedDevices });
            } catch (err) {
                console.error("Final /list-devices error:", err);
                res.status(500).json({ success: false, message: err.message });
            }
        });

        // Removed server-side screen recording endpoints. Recording is now handled client-side using MediaRecorder API.

        httpServer = app.listen(C.HTTP_PORT, "0.0.0.0", () => {
            log(C.LogLevel.INFO, `[System] HTTP server listening on port ${C.HTTP_PORT}`);
            log(C.LogLevel.INFO, `[System] Access UI at http://localhost:${C.HTTP_PORT}`);
        });

        httpServer.on("error", (err) => {
            log(C.LogLevel.ERROR, `[System] HTTP server error: ${err.message}`);
            process.exit(1);
        });

        const gracefulShutdownHandler = async () => {
            log(C.LogLevel.INFO, "[System] Initiating graceful shutdown...");

            const activeSessions = Array.from(sessionManager.sessions.keys());
            log(
                C.LogLevel.INFO,
                `[System] Cleaning up ${activeSessions.length} active sessions...`,
            );
            await Promise.allSettled(
                activeSessions.map((scid) => sessionManager.cleanupSession(scid, new Map())),
            );

            if (mainWss) {
                log(C.LogLevel.INFO, "[System] Closing main WebSocket server...");
                await new Promise((resolve) => mainWss.close(resolve));
                log(C.LogLevel.INFO, "[System] Main WebSocket server closed.");
            }

            if (httpServer) {
                log(C.LogLevel.INFO, "[System] Closing HTTP server...");
                await new Promise((resolve) => httpServer.close(resolve));
                log(C.LogLevel.INFO, "[System] HTTP server closed.");
            }

            log(C.LogLevel.INFO, "[System] All services closed. Exiting.");
            process.exit(0);
            setTimeout(() => {
                log(C.LogLevel.WARN, "[System] Force exiting after timeout.");
                process.exit(1);
            }, 5000);
        };

        process.on("SIGINT", gracefulShutdownHandler);
        process.on("SIGTERM", gracefulShutdownHandler);
        process.on("uncaughtException", (err, origin) => {
            log(
                C.LogLevel.ERROR,
                `[System] Uncaught Exception: ${err.message} at ${origin}. Stack: ${err.stack}`,
            );
            process.exit(1);
        });
        process.on("unhandledRejection", (reason, promise) => {
            log(
                C.LogLevel.ERROR,
                `[System] Unhandled Rejection at: ${promise}, reason: ${reason instanceof Error ? reason.stack : reason}`,
            );
            process.exit(1);
        });
    } catch (error) {
        log(C.LogLevel.ERROR, `[System] Startup error: ${error.message}`);
        process.exit(1);
    }
}

start();
