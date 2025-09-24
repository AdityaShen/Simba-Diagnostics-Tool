/**
 * @file websocketHandlers.js
 * @description WebSocket server and action handlers for device control, diagnostics, metrics, and ADB operations.
 * @module websocketHandlers
 * @author Aditya Shenoy
 * @copyright Simba (c) 2025
 * @license MIT
 *
 * This module manages WebSocket connections, device diagnostics, metrics, and ADB shell interactions.
 * It provides handlers for client actions, device control, and system monitoring.
 */
const WebSocket = require("ws");
const crypto = require("crypto");
const { log } = require("./logger");
const C = require("./constants");
const adbService = require("./adbService");
const sessionManager = require("./scrcpySession");

const wsClients = new Map();

// Store running diagnostics processes per device
const diagnosticsProcesses = new Map();

const fs = require("fs");
const path = require("path");

/**
 * Starts WiFi diagnostics collection (logcat) and saves output to file.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing deviceId and diagnostics options.
 */
async function handleStartDiagnostics(clientId, ws, message) {
    const deviceId = message.deviceId;
    if (!deviceId) {
        ws.send(
            JSON.stringify({
                type: "diagnosticsResponse",
                success: false,
                error: "Device ID missing",
            }),
        );
        return;
    }
    if (diagnosticsProcesses.has(deviceId)) {
        ws.send(
            JSON.stringify({
                type: "diagnosticsResponse",
                success: false,
                error: "Diagnostics already running for this device",
            }),
        );
        return;
    }
    try {
        const device = adbService.adb.getDevice(deviceId);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const logFileName = `device_diagnostics_${deviceId}_${timestamp}.log`;
        const logFilePath = path.join(process.cwd(), "output", "diagnostics", logFileName);
        fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
        const logFileStream = fs.createWriteStream(logFilePath, { flags: "a" });

        // Map option keys to commands
        const diagnosticsMap = {
            deviceInfo: { title: "DEVICE INFO (getprop)", cmd: "getprop" },
            wifiInfo: { title: "WIFI INFO (dumpsys wifi)", cmd: "dumpsys wifi" },
            networkInterfaces: { title: "NETWORK INTERFACES (ip addr)", cmd: "ip addr" },
            batteryInfo: { title: "BATTERY INFO (dumpsys battery)", cmd: "dumpsys battery" },
            storageInfo: { title: "STORAGE INFO (df)", cmd: "df" },
            runningProcesses: { title: "RUNNING PROCESSES (ps)", cmd: "ps" },
        };

        // Get requested diagnostics from message
        const requestedDiagnostics = Array.isArray(message.diagnostics)
            ? message.diagnostics
            : Object.keys(diagnosticsMap);

        // Collect only selected diagnostics
        for (const key of requestedDiagnostics) {
            const diag = diagnosticsMap[key];
            if (!diag) continue;
            try {
                const stream = await device.shell(diag.cmd);
                const output = await adbService.streamToString(stream);
                logFileStream.write(`\n===== ${diag.title} =====\n`);
                logFileStream.write(output + "\n");
            } catch (err) {
                logFileStream.write(`\n===== ${diag.title} FAILED: ${err.message} =====\n`);
            }
        }

        logFileStream.write("\n===== LOGCAT OUTPUT =====\n");
        // Start logcat and stream output
        const logcatProc = device.shell("logcat -v time -b all");
        logcatProc.stdout.on("data", (data) => {
            logFileStream.write(data);
        });
        logcatProc.stderr?.on("data", (data) => {
            logFileStream.write(`ERROR: ${data}`);
        });
        logcatProc.on("close", (code) => {
            logFileStream.end();
            diagnosticsProcesses.delete(deviceId);
            ws.send(
                JSON.stringify({ type: "diagnosticsStopped", deviceId, code, file: logFilePath }),
            );
        });
        diagnosticsProcesses.set(deviceId, {
            proc: logcatProc,
            file: logFilePath,
            stream: logFileStream,
        });
        ws.send(
            JSON.stringify({
                type: "diagnosticsResponse",
                success: true,
                message: "Diagnostics started",
                file: logFilePath,
            }),
        );
    } catch (error) {
        ws.send(
            JSON.stringify({ type: "diagnosticsResponse", success: false, error: error.message }),
        );
    }
}

/**
 * Stops WiFi diagnostics collection and closes the log file.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing deviceId.
 */
async function handleStopDiagnostics(clientId, ws, message) {
    const deviceId = message.deviceId;
    if (!deviceId) {
        ws.send(
            JSON.stringify({
                type: "diagnosticsResponse",
                success: false,
                error: "Device ID missing",
            }),
        );
        return;
    }
    const entry = diagnosticsProcesses.get(deviceId);
    if (entry && entry.proc) {
        entry.proc.kill();
        entry.stream.end();
        diagnosticsProcesses.delete(deviceId);
        ws.send(
            JSON.stringify({
                type: "diagnosticsResponse",
                success: true,
                message: "Diagnostics stopped",
                file: entry.file,
            }),
        );
    } else {
        ws.send(
            JSON.stringify({
                type: "diagnosticsResponse",
                success: false,
                error: "No diagnostics running for this device",
            }),
        );
    }
}

// HAR Trace Handler
const { spawn } = require("child_process");
/**
 * Starts a HAR trace by spawning a Python script to collect network traffic.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing deviceId, url, and options.
 */
async function handleStartHarTrace(clientId, ws, message) {
    const deviceId = message.deviceId;
    const url = message.url;
    const harFilename = message.harFilename || `chrome_har_output_${Date.now()}.har`;
    const captureTime = message.captureTime || 10000;
    if (!deviceId || !url) {
        ws.send(
            JSON.stringify({
                type: "harTraceResponse",
                success: false,
                error: "Missing deviceId or url",
            }),
        );
        return;
    }
    // Spawn Python script with correct binary for platform
    const pyArgs = ["har_collection.py", url, harFilename, String(captureTime), deviceId];
    let output = "";
    let error = "";
    let pyProc = null;
    let pythonBinary = "python";
    if (process.platform === "darwin") {
        pythonBinary = path.join(
            process.cwd(),
            "resources",
            "python",
            "mac",
            "simba-python",
            "bin",
            "python3",
        );
    }
    try {
        pyProc = spawn(pythonBinary, pyArgs, {
            cwd: process.cwd(),
            stdio: ["pipe", "pipe", "pipe"],
        });
    } catch (err) {
        error += `Failed to spawn Python process: ${err.message}\n`;
    }
    if (!pyProc) {
        ws.send(
            JSON.stringify({
                type: "harTraceResponse",
                success: false,
                error: error || "Could not start Python process",
                output,
            }),
        );
        console.error("[HAR TRACE] Could not start Python process:", error);
        return;
    }
    ws._harTraceProc = pyProc; // Attach to ws for stop
    pyProc.stdout.on("data", (data) => {
        output += data.toString();
        ws.send(JSON.stringify({ type: "harTraceStatus", status: data.toString() }));
    });
    pyProc.stderr.on("data", (data) => {
        error += data.toString();
        ws.send(JSON.stringify({ type: "harTraceStatus", status: data.toString(), isError: true }));
        console.error("[HAR TRACE] Python stderr:", data.toString());
    });
    pyProc.on("error", (err) => {
        error += `Python process error: ${err.message}\n`;
        ws.send(
            JSON.stringify({
                type: "harTraceStatus",
                status: `Python process error: ${err.message}`,
                isError: true,
            }),
        );
        console.error("[HAR TRACE] Python process error:", err);
    });
    pyProc.on("close", (code) => {
        ws._harTraceProc = null;
        const srcPath = path.join(process.cwd(), harFilename);
        const destPath = path.join(process.cwd(), "output", "har_files", harFilename);
        let moved = false;
        try {
            if (fs.existsSync(srcPath)) {
                fs.renameSync(srcPath, destPath);
                moved = true;
            }
        } catch (moveErr) {
            error += `\nFailed to move HAR file: ${moveErr.message}`;
            console.error("[HAR TRACE] Failed to move HAR file:", moveErr);
        }
        if (code === 0 && moved) {
            ws.send(
                JSON.stringify({
                    type: "harTraceResponse",
                    success: true,
                    file: harFilename,
                    output,
                }),
            );
        } else {
            ws.send(
                JSON.stringify({
                    type: "harTraceResponse",
                    success: false,
                    error: error || "Python script failed",
                    output,
                }),
            );
            console.error("[HAR TRACE] Python script failed or HAR file not moved:", error, output);
        }
    });
}

/**
 * Stops the HAR trace process for the client.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message object (unused).
 */
function handleStopHarTrace(clientId, ws) {
    if (ws._harTraceProc) {
        // Remove verbose logs and status message for frontend
        try {
            ws._harTraceProc.stdin.write("STOP\n");
        } catch (err) {
            // Only log errors server-side
            console.error("[HAR TRACE] Failed to send STOP to Python process:", err);
        }
        // Fallback: send SIGTERM after 1 second if process still running
        setTimeout(() => {
            if (ws._harTraceProc && !ws._harTraceProc.killed) {
                try {
                    ws._harTraceProc.kill("SIGTERM");
                } catch (sigErr) {
                    console.error("[HAR TRACE] Failed to send SIGTERM to Python process:", sigErr);
                }
            }
        }, 1000);
        // Do not send any harTraceStatus message to frontend for stop
    } else {
        ws.send(JSON.stringify({ type: "harTraceStatus", status: "No HAR trace running." }));
    }
}

/**
 * Starts a device session and sets up scrcpy streaming.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing deviceId and session options.
 */
async function handleStart(clientId, ws, message) {
    const client = wsClients.get(clientId);
    if (!client || client.session) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.ERROR,
                message: client ? "Session already active" : "Internal error",
            }),
        );
        return;
    }
    const deviceId = message.deviceId;
    const decoderType = message.decoderType || "mse";

    if (!deviceId) {
        ws.send(JSON.stringify({ type: C.MESSAGE_TYPES.ERROR, message: "No device selected." }));
        return;
    }
    let scid = null;
    try {
        const devices = await adbService.getAdbDevices();
        const selectedDevice = devices.find((d) => d.id === deviceId && d.type === "device");
        if (!selectedDevice) {
            const allDevicesFullStatus = await adbService.adb.listDevices();
            const status = allDevicesFullStatus.find((d) => d.id === deviceId)?.type || "not found";
            ws.send(
                JSON.stringify({
                    type: C.MESSAGE_TYPES.ERROR,
                    message: `Device "${deviceId}" not available (status: ${status}).`,
                }),
            );
            return;
        }
        try {
            const launcherApps = await adbService.getLauncherApps(deviceId);
            ws.send(
                JSON.stringify({ type: C.MESSAGE_TYPES.LAUNCHER_APPS_LIST, apps: launcherApps }),
            );
        } catch (appError) {
            ws.send(
                JSON.stringify({
                    type: C.MESSAGE_TYPES.LAUNCHER_APPS_LIST,
                    apps: [],
                    error: `Failed to get apps: ${appError.message}`,
                }),
            );
        }
        const device = adbService.adb.getDevice(deviceId);
        const versionStream = await device.shell("getprop ro.build.version.release");
        const versionOutput = await adbService.streamToString(versionStream);
        const versionMatch = versionOutput.trim().match(/^(\d+)/);
        const androidVersion = versionMatch ? parseInt(versionMatch[1], 10) : NaN;
        if (isNaN(androidVersion))
            throw new Error(`Invalid Android version: ${versionOutput.trim()}`);

        const runOptions = { ...C.BASE_SCRCPY_OPTIONS };
        const maxFps = parseInt(message.maxFps);
        if (!isNaN(maxFps) && maxFps > 0) runOptions.max_fps = String(maxFps);
        const bitrate = parseInt(message.bitrate);
        if (!isNaN(bitrate) && bitrate > 0) runOptions.video_bit_rate = String(bitrate);
        const audioEnabled = message.enableAudio || false;
        runOptions.audio = androidVersion < 11 ? "false" : String(audioEnabled);
        const videoEnabled = !(message.video === false || message.video === "false");
        runOptions.video = String(videoEnabled);
        const controlEnabled = message.enableControl || false;
        runOptions.control = String(controlEnabled);
        if (message.noPowerOn) runOptions.power_on = "false";
        if (message.powerOffOnClose) runOptions.power_off_on_close = "true";
        if (message.displayMode === "overlay" && message.overlayDisplayId !== undefined)
            runOptions.display_id = String(message.overlayDisplayId);
        else if (message.displayMode === "native_taskbar") runOptions.display_id = "0";
        else if (message.displayMode === "dex") runOptions.display_id = "2";
        else if (
            message.displayMode === "virtual" &&
            message.resolution !== "reset" &&
            message.dpi !== "reset"
        )
            runOptions.new_display = `${message.resolution}/${message.dpi}`;
        if (
            message.displayMode !== "native_taskbar" &&
            message.displayMode !== "dex" &&
            message.rotationLock
        )
            runOptions.capture_orientation = String(message.rotationLock);

        scid = (crypto.randomBytes(4).readUInt32BE(0) & 0x7fffffff).toString(16).padStart(8, "0");
        const port = C.SERVER_PORT_BASE + (sessionManager.sessions.size % 1000);
        const session = await sessionManager.setupScrcpySession(
            deviceId,
            scid,
            port,
            runOptions,
            clientId,
            message.displayMode,
            message.turnScreenOff || false,
            wsClients,
            decoderType,
        );
        if (session) session.androidVersion = androidVersion;
        client.session = scid;
        if (androidVersion < 11 && audioEnabled)
            ws.send(
                JSON.stringify({
                    type: C.MESSAGE_TYPES.STATUS,
                    message: "Audio disabled (Android < 11)",
                }),
            );
    } catch (err) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.ERROR,
                message: `Setup failed: ${err.message}`,
            }),
        );
        const clientData = wsClients.get(clientId);
        if (clientData?.session) await sessionManager.cleanupSession(clientData.session, wsClients);
        else if (scid && sessionManager.sessions.has(scid))
            await sessionManager.cleanupSession(scid, wsClients);
        if (clientData) clientData.session = null;
    }
}

/**
 * Handles client disconnect command and cleans up session.
 * @param {string} clientId - Unique client identifier.
 */
async function handleClientDisconnectCommand(clientId) {
    const client = wsClients.get(clientId);
    if (!client) {
        log(C.LogLevel.WARN, `[ClientDisconnectCommand] Client ${clientId} not found.`);
        return;
    }
    if (client.session) {
        const scidToStop = client.session;
        log(
            C.LogLevel.INFO,
            `[ClientDisconnectCommand] Client ${clientId} stopping session ${scidToStop}.`,
        );
        client.session = null;
        if (client.ws?.readyState === WebSocket.OPEN)
            client.ws.send(
                JSON.stringify({ type: C.MESSAGE_TYPES.STATUS, message: "Streaming stopped" }),
            );
        await sessionManager.cleanupSession(scidToStop, wsClients);
        log(
            C.LogLevel.INFO,
            `[ClientDisconnectCommand] Session ${scidToStop} cleaned up for client ${clientId}.`,
        );
    } else {
        log(
            C.LogLevel.INFO,
            `[ClientDisconnectCommand] Client ${clientId} sent disconnect, no active session.`,
        );
        if (client.ws?.readyState === WebSocket.OPEN)
            client.ws.send(
                JSON.stringify({
                    type: C.MESSAGE_TYPES.STATUS,
                    message: "No active stream to stop.",
                }),
            );
    }
}

/**
 * Retrieves the list of available ADB devices.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 */
async function handleGetAdbDevices(clientId, ws) {
    try {
        const devices = await adbService.getAdbDevices();
        ws.send(JSON.stringify({ type: C.MESSAGE_TYPES.ADB_DEVICES_LIST, success: true, devices }));
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.ADB_DEVICES_LIST,
                success: false,
                error: error.message,
            }),
        );
    }
}

/**
 * Sets the media volume on the device for the active session.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing volume value.
 */
async function handleVolumeCommand(clientId, ws, message) {
    const client = wsClients.get(clientId);
    if (!client || !client.session) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.VOLUME_RESPONSE,
                success: false,
                value: message.value,
                error: "No active session",
            }),
        );
        return;
    }
    const session = sessionManager.sessions.get(client.session);
    if (!session || !session.deviceId) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.VOLUME_RESPONSE,
                success: false,
                value: message.value,
                error: "No device found",
            }),
        );
        return;
    }
    try {
        const value = parseInt(message.value, 10);
        if (isNaN(value) || value < 0 || value > 100)
            throw new Error(`Invalid volume value: ${message.value}`);
        await adbService.setMediaVolume(session.deviceId, value, sessionManager.sessions);
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.VOLUME_RESPONSE,
                success: true,
                requestedValue: value,
            }),
        );
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.VOLUME_RESPONSE,
                success: false,
                value: message.value,
                error: error.message,
            }),
        );
    }
}

/**
 * Gets the current media volume for the active session device.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message object.
 */
async function handleGetVolumeCommand(clientId, ws) {
    const client = wsClients.get(clientId);
    if (!client || !client.session) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.VOLUME_INFO,
                success: false,
                error: "No active session",
            }),
        );
        return;
    }
    const session = sessionManager.sessions.get(client.session);
    if (!session || !session.deviceId) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.VOLUME_INFO,
                success: false,
                error: "No device found",
            }),
        );
        return;
    }
    try {
        const { maxVolume, currentVolume } = await adbService.getMediaVolumeInfo(
            session.deviceId,
            sessionManager.sessions,
        );
        const volumePercentage = Math.round((currentVolume / maxVolume) * 100);
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.VOLUME_INFO,
                success: true,
                volume: volumePercentage,
            }),
        );
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.VOLUME_INFO,
                success: false,
                error: error.message,
            }),
        );
    }
}

/**
 * Handles navigation actions (key events) for the device.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing navigation key.
 */
async function handleNavAction(clientId, ws, message) {
    const client = wsClients.get(clientId);
    if (!client?.session) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.NAV_RESPONSE,
                success: false,
                key: message.key,
                error: "No active session",
            }),
        );
        return;
    }
    const session = sessionManager.sessions.get(client.session);
    if (!session?.deviceId) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.NAV_RESPONSE,
                success: false,
                key: message.key,
                error: "No device found",
            }),
        );
        return;
    }
    const keycode = C.NAV_KEYCODES[message.key];
    if (!keycode) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.NAV_RESPONSE,
                success: false,
                key: message.key,
                error: "Invalid navigation key",
            }),
        );
        return;
    }
    try {
        await adbService.adb.getDevice(session.deviceId).shell(`input keyevent ${keycode}`);
        ws.send(
            JSON.stringify({ type: C.MESSAGE_TYPES.NAV_RESPONSE, success: true, key: message.key }),
        );
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.NAV_RESPONSE,
                success: false,
                key: message.key,
                error: error.message,
            }),
        );
    }
}

/**
 * Toggles Wi-Fi on the device and returns status/SSID.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing enable flag.
 */
async function handleWifiToggleCommand(clientId, ws, message) {
    const client = wsClients.get(clientId);
    if (!client || !client.session) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.WIFI_RESPONSE,
                success: false,
                error: "No active session",
            }),
        );
        return;
    }
    const session = sessionManager.sessions.get(client.session);
    if (!session || !session.deviceId) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.WIFI_RESPONSE,
                success: false,
                error: "No device found",
            }),
        );
        return;
    }
    const enableWifi = message.enable;
    if (typeof enableWifi !== "boolean") {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.WIFI_RESPONSE,
                success: false,
                error: "Invalid Wi-Fi toggle value",
            }),
        );
        return;
    }
    try {
        const device = adbService.adb.getDevice(session.deviceId);
        const command = enableWifi ? "svc wifi enable" : "svc wifi disable";
        await device.shell(command);
        let isWifiOn = false,
            ssid = null;
        if (enableWifi) {
            const maxAttemptsWifiOn = 10,
                maxAttemptsSsid = 15,
                pollInterval = 500;
            let attempts = 0;
            while (attempts < maxAttemptsWifiOn) {
                const statusOutput = await adbService.streamToString(
                    await device.shell('dumpsys wifi | grep "Wi-Fi is"'),
                );
                isWifiOn = statusOutput.includes("Wi-Fi is enabled");
                if (isWifiOn) break;
                attempts++;
                if (attempts < maxAttemptsWifiOn)
                    await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
            if (!isWifiOn) {
                ws.send(
                    JSON.stringify({
                        type: C.MESSAGE_TYPES.WIFI_RESPONSE,
                        success: false,
                        error: "Wi-Fi failed to enable",
                    }),
                );
                return;
            }
            attempts = 0;
            while (attempts < maxAttemptsSsid) {
                const ssidOutput = await adbService.streamToString(
                    await device.shell(
                        "dumpsys wifi | grep 'Supplicant state: COMPLETED' | tail -n 1 | grep -Eo 'SSID: [^,]+' | sed 's/SSID: //' | sed 's/\"//g' | head -n 1",
                    ),
                );
                ssid = ssidOutput.trim();
                if (ssid && ssid !== "" && ssid !== "<unknown ssid>") break;
                attempts++;
                if (attempts < maxAttemptsSsid)
                    await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
            if (!ssid || ssid === "" || ssid === "<unknown ssid>") {
                ws.send(
                    JSON.stringify({
                        type: C.MESSAGE_TYPES.WIFI_RESPONSE,
                        success: false,
                        error: "Failed to connect to SSID",
                    }),
                );
                return;
            }
        } else {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const statusOutput = await adbService.streamToString(
                await device.shell('dumpsys wifi | grep "Wi-Fi is"'),
            );
            isWifiOn = statusOutput.includes("Wi-Fi is enabled");
        }
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.WIFI_RESPONSE,
                success: true,
                enable: enableWifi,
                currentState: isWifiOn,
                ssid,
            }),
        );
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.WIFI_RESPONSE,
                success: false,
                error: `Failed to toggle Wi-Fi: ${error.message}`,
            }),
        );
    }
}

/**
 * Gets the current Wi-Fi status and SSID for the device.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message object.
 */
async function handleGetWifiStatusCommand(clientId, ws) {
    const client = wsClients.get(clientId);
    if (!client || !client.session) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.WIFI_STATUS,
                success: false,
                error: "No active session",
            }),
        );
        return;
    }
    const session = sessionManager.sessions.get(client.session);
    if (!session || !session.deviceId) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.WIFI_STATUS,
                success: false,
                error: "No device found",
            }),
        );
        return;
    }
    try {
        const device = adbService.adb.getDevice(session.deviceId);
        const statusOutput = await adbService.streamToString(
            await device.shell('dumpsys wifi | grep "Wi-Fi is"'),
        );
        const isWifiOn = statusOutput.includes("Wi-Fi is enabled");
        let ssid = null;
        if (isWifiOn) {
            const ssidOutput = await adbService.streamToString(
                await device.shell(
                    "dumpsys wifi | grep 'Supplicant state: COMPLETED' | tail -n 1 | grep -Eo 'SSID: [^,]+' | sed 's/SSID: //' | sed 's/\"//g' | head -n 1",
                ),
            );
            ssid = ssidOutput.trim();
        }
        ws.send(
            JSON.stringify({ type: C.MESSAGE_TYPES.WIFI_STATUS, success: true, isWifiOn, ssid }),
        );
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.WIFI_STATUS,
                success: false,
                error: `Failed to get Wi-Fi status: ${error.message}`,
            }),
        );
    }
}

/**
 * Gets the battery level for the device in the active session.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message object.
 */
async function handleGetBatteryLevelCommand(clientId, ws) {
    const client = wsClients.get(clientId);
    if (!client || !client.session) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.BATTERY_INFO,
                success: false,
                error: "No active session",
            }),
        );
        return;
    }
    const session = sessionManager.sessions.get(client.session);
    if (!session || !session.deviceId) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.BATTERY_INFO,
                success: false,
                error: "No device found",
            }),
        );
        return;
    }
    try {
        const batteryLevel = await adbService.getBatteryLevel(session.deviceId);
        ws.send(
            JSON.stringify({ type: C.MESSAGE_TYPES.BATTERY_INFO, success: true, batteryLevel }),
        );
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.BATTERY_INFO,
                success: false,
                error: error.message,
            }),
        );
    }
}

/**
 * Launches an app on the device using the provided package name.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing packageName.
 */
async function handleLaunchApp(clientId, ws, message) {
    const client = wsClients.get(clientId);
    if (!client?.session) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.LAUNCH_APP_RESPONSE,
                success: false,
                packageName: message.packageName,
                error: "No active session",
            }),
        );
        return;
    }
    const session = sessionManager.sessions.get(client.session);
    if (!session?.deviceId) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.LAUNCH_APP_RESPONSE,
                success: false,
                packageName: message.packageName,
                error: "No device found",
            }),
        );
        return;
    }
    const packageName = message.packageName;
    if (!packageName) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.LAUNCH_APP_RESPONSE,
                success: false,
                error: "Package name missing",
            }),
        );
        return;
    }
    try {
        await adbService.adb
            .getDevice(session.deviceId)
            .shell(`monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.LAUNCH_APP_RESPONSE,
                success: true,
                packageName,
            }),
        );
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: C.MESSAGE_TYPES.LAUNCH_APP_RESPONSE,
                success: false,
                packageName,
                error: error.message,
            }),
        );
    }
}

/**
 * Handles various ADB commands for device control and configuration.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing commandType and deviceId.
 */
async function handleAdbCommand(clientId, ws, message) {
    const { commandType, deviceId, commandId } = message;
    if (!deviceId) {
        ws.send(
            JSON.stringify({
                type: `${commandType}Response`,
                commandId,
                success: false,
                error: "Device ID missing",
            }),
        );
        return;
    }
    let result;
    try {
        switch (commandType) {
            case "getDisplayList":
                result = await adbService.adbListDisplays(deviceId);
                break;
            case "setOverlay":
                result = await adbService.executeAdbShellCommand(
                    deviceId,
                    `settings put global overlay_display_devices ${message.resolution}/${message.dpi}`,
                );
                break;
            case "setWmSize":
                result = await adbService.executeAdbShellCommand(
                    deviceId,
                    `wm size ${message.resolution}`,
                );
                if (result.success) log(C.LogLevel.INFO, `WM Size set to: ${message.resolution}`);
                break;
            case "setWmDensity":
                result = await adbService.executeAdbShellCommand(
                    deviceId,
                    `wm density ${message.dpi}`,
                );
                if (result.success) log(C.LogLevel.INFO, `WM Density set to: ${message.dpi}`);
                break;
            case "adbRotateScreen": {
                if (!adbService.rotationStates) adbService.rotationStates = {};
                if (!adbService.rotationStates[deviceId]) {
                    const initialUserRot = await adbService.executeAdbShellCommand(
                        deviceId,
                        "settings get system user_rotation",
                    );
                    const initialAccelRot = await adbService.executeAdbShellCommand(
                        deviceId,
                        "settings get system accelerometer_rotation",
                    );
                    adbService.rotationStates[deviceId] = {
                        user_rotation:
                            initialUserRot.success && !isNaN(parseInt(initialUserRot.output))
                                ? parseInt(initialUserRot.output)
                                : 0,
                        accelerometer_rotation:
                            initialAccelRot.success && !isNaN(parseInt(initialAccelRot.output))
                                ? parseInt(initialAccelRot.output)
                                : 1,
                    };
                }
                const currentRotationResult = await adbService.executeAdbShellCommand(
                    deviceId,
                    "settings get system user_rotation",
                );
                const currentRotation =
                    currentRotationResult.success && !isNaN(parseInt(currentRotationResult.output))
                        ? parseInt(currentRotationResult.output)
                        : 0;
                await adbService.executeAdbShellCommand(
                    deviceId,
                    "settings put system accelerometer_rotation 0",
                );
                const nextRotation = (currentRotation + 1) % 4;
                result = await adbService.executeAdbShellCommand(
                    deviceId,
                    `settings put system user_rotation ${nextRotation}`,
                );
                if (result.success)
                    result.message = `Screen rotated to ${nextRotation * 90} degrees.`;
                break;
            }
            case "cleanupAdb": {
                const mode = message.mode;
                let cleanupMessages = [];
                if (mode === "native_taskbar") {
                    let res = await adbService.executeAdbShellCommand(deviceId, "wm size reset");
                    cleanupMessages.push(`WM Size Reset: ${res.success ? "OK" : res.error}`);
                    res = await adbService.executeAdbShellCommand(deviceId, "wm density reset");
                    cleanupMessages.push(`WM Density Reset: ${res.success ? "OK" : res.error}`);
                }
                if (mode === "overlay") {
                    let res = await adbService.executeAdbShellCommand(
                        deviceId,
                        "settings put global overlay_display_devices none",
                    );
                    cleanupMessages.push(`Overlay Reset: ${res.success ? "OK" : res.error}`);
                }
                if (
                    mode === "native_taskbar" &&
                    adbService.rotationStates &&
                    adbService.rotationStates[deviceId]
                ) {
                    const originalUser =
                        adbService.rotationStates[deviceId].user_rotation !== undefined
                            ? adbService.rotationStates[deviceId].user_rotation
                            : 0;
                    const originalAccel =
                        adbService.rotationStates[deviceId].accelerometer_rotation !== undefined
                            ? adbService.rotationStates[deviceId].accelerometer_rotation
                            : 1;
                    let res = await adbService.executeAdbShellCommand(
                        deviceId,
                        `settings put system user_rotation ${originalUser}`,
                    );
                    cleanupMessages.push(
                        `User Rotation Restore (${originalUser}): ${res.success ? "OK" : res.error}`,
                    );
                    res = await adbService.executeAdbShellCommand(
                        deviceId,
                        `settings put system accelerometer_rotation ${originalAccel}`,
                    );
                    cleanupMessages.push(
                        `Accel Rotation Restore (${originalAccel}): ${res.success ? "OK" : res.error}`,
                    );
                    delete adbService.rotationStates[deviceId];
                }
                result = {
                    success: true,
                    message: `Cleanup for ${mode} mode: ${cleanupMessages.join("; ")}`,
                };
                break;
            }
            default:
                result = { success: false, error: `Unknown ADB commandType: ${commandType}` };
        }
    } catch (error) {
        result = { success: false, error: error.message };
    }
    ws.send(JSON.stringify({ type: `${commandType}Response`, commandId, ...result }));
}

const actionHandlers = {
    startMetrics: handleStartMetrics,
    stopMetrics: handleStopMetrics,
    start: handleStart,
    disconnect: handleClientDisconnectCommand,
    getAdbDevices: handleGetAdbDevices,
    volume: handleVolumeCommand,
    getVolume: handleGetVolumeCommand,
    navAction: handleNavAction,
    wifiToggle: handleWifiToggleCommand,
    getWifiStatus: handleGetWifiStatusCommand,
    getBatteryLevel: handleGetBatteryLevelCommand,
    launchApp: handleLaunchApp,
    adbCommand: handleAdbCommand,
    startDiagnostics: handleStartDiagnostics,
    stopDiagnostics: handleStopDiagnostics,
    startHarTrace: handleStartHarTrace,
    stopHarTrace: handleStopHarTrace,
    startAdbShell: handleStartAdbShell,
    adbShellInput: handleAdbShellInput,
    stopAdbShell: handleStopAdbShell,
};

// ...existing code...

// --- Device Metrics Handlers ---
const metricsIntervals = new Map(); // clientId -> interval

/**
 * Starts periodic device metrics collection and sends results to client.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing deviceId.
 */
async function handleStartMetrics(clientId, ws, message) {
    const deviceId = message.deviceId;
    if (!deviceId) {
        ws.send(JSON.stringify({ type: "metricsError", error: "Device ID missing" }));
        return;
    }
    // Clear any previous interval
    handleStopMetrics(clientId, ws, message);
    // Start periodic metrics collection
    const interval = setInterval(async () => {
        try {
            const device = adbService.adb.getDevice(deviceId);
            // Memory
            const memOut = await adbService.streamToString(
                await device.shell('dumpsys meminfo | grep "Used RAM"'),
            );
            // CPU
            const cpuOut = await adbService.streamToString(
                await device.shell('top -n 1 | grep "CPU"'),
            );
            // Network
            const netOut = await adbService.streamToString(await device.shell("cat /proc/net/dev"));
            // Battery
            const batteryOut = await adbService.streamToString(
                await device.shell("dumpsys battery"),
            );
            // Temperature
            const tempOut = await adbService.streamToString(
                await device.shell("dumpsys battery | grep temperature"),
            );
            ws.send(
                JSON.stringify({
                    type: "deviceMetrics",
                    memory: memOut,
                    cpu: cpuOut,
                    network: netOut,
                    battery: batteryOut,
                    temperature: tempOut,
                }),
            );
        } catch (err) {
            ws.send(JSON.stringify({ type: "metricsError", error: err.message }));
        }
    }, 3000); // every 3 seconds
    metricsIntervals.set(clientId, interval);
    ws.send(JSON.stringify({ type: "metricsStarted" }));
}

/**
 * Stops periodic device metrics collection for the client.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message object.
 */
function handleStopMetrics(clientId, ws) {
    const interval = metricsIntervals.get(clientId);
    if (interval) {
        clearInterval(interval);
        metricsIntervals.delete(clientId);
        ws.send(JSON.stringify({ type: "metricsStopped" }));
    }
}

// --- Interactive ADB Shell Handlers ---
const activeShells = new Map(); // clientId -> { proc, ws }

/**
 * Starts an interactive ADB shell session for the client.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing deviceId.
 */
async function handleStartAdbShell(clientId, ws, message) {
    const deviceId = message.deviceId;
    if (!deviceId) {
        ws.send(JSON.stringify({ type: "adbShellOutput", output: "[Error] Device ID missing." }));
        return;
    }
    try {
        const device = adbService.adb.getDevice(deviceId);
        const shellProc = await device.shell("sh");
        activeShells.set(clientId, { proc: shellProc, ws });
        let buffer = "";
        shellProc.on("data", (data) => {
            buffer += data.toString();
            // Split output by newlines and send each line
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop(); // Save incomplete line
            lines.forEach((line) => {
                ws.send(JSON.stringify({ type: "adbShellOutput", output: line }));
            });
        });
        shellProc.on("end", () => {
            if (buffer) ws.send(JSON.stringify({ type: "adbShellOutput", output: buffer }));
            ws.send(JSON.stringify({ type: "adbShellClosed" }));
            activeShells.delete(clientId);
        });
        shellProc.on("error", (err) => {
            ws.send(JSON.stringify({ type: "adbShellOutput", output: `[Error] ${err.message}` }));
        });
        // Show current directory on start
        shellProc.write("pwd\n");
        ws.send(
            JSON.stringify({
                type: "adbShellOutput",
                output: "[ADB Shell started. Type commands below.]",
            }),
        );
    } catch (err) {
        ws.send(JSON.stringify({ type: "adbShellOutput", output: `[Error] ${err.message}` }));
    }
}

/**
 * Handles input for the interactive ADB shell session.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message containing shell input.
 */
function handleAdbShellInput(clientId, ws, message) {
    const shell = activeShells.get(clientId);
    if (!shell || !shell.proc) {
        ws.send(
            JSON.stringify({ type: "adbShellOutput", output: "[Error] No active shell session." }),
        );
        return;
    }
    try {
        // Echo command before sending
        ws.send(JSON.stringify({ type: "adbShellOutput", output: `$ ${message.input}` }));
        shell.proc.write(message.input + "\n");
    } catch (err) {
        ws.send(JSON.stringify({ type: "adbShellOutput", output: `[Error] ${err.message}` }));
    }
}

/**
 * Stops the interactive ADB shell session for the client.
 * @param {string} clientId - Unique client identifier.
 * @param {WebSocket} ws - WebSocket connection.
 * @param {Object} message - Message object.
 */
function handleStopAdbShell(clientId, ws) {
    const shell = activeShells.get(clientId);
    if (shell && shell.proc) {
        shell.proc.end();
        activeShells.delete(clientId);
        ws.send(JSON.stringify({ type: "adbShellClosed" }));
    }
}

/**
 * Creates and configures the WebSocket server for device control and monitoring.
 * @returns {WebSocket.Server} The configured WebSocket server instance.
 */
function createWebSocketServer() {
    const wss = new WebSocket.Server({ port: C.WEBSOCKET_PORT, perMessageDeflate: false });
    wss.on("connection", (ws) => {
        const clientId = crypto.randomUUID();
        wsClients.set(clientId, { ws, session: null });
        log(C.LogLevel.INFO, `[WebSocket] Client connected: ${clientId}`);

        ws.on("message", async (data, isBinary) => {
            const client = wsClients.get(clientId);
            if (!client) return;

            if (isBinary) {
                if (client.session) {
                    const session = sessionManager.sessions.get(client.session);
                    if (session?.controlSocket && !session.controlSocket.destroyed) {
                        const worker = sessionManager.workers.get(client.session);
                        if (worker) {
                            const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
                            worker.postMessage({
                                type: "controlData",
                                data: bufferData,
                                scid: client.session,
                                clientId,
                            });
                        }
                    }
                }
            } else {
                let message;
                try {
                    message = JSON.parse(data.toString());
                    log(
                        C.LogLevel.DEBUG,
                        `[WebSocket] Parsed command from ${clientId}: ${message.action}`,
                    );
                    const handler = actionHandlers[message.action];
                    if (handler) {
                        await handler(clientId, ws, message);
                    } else {
                        log(
                            C.LogLevel.WARN,
                            `[WebSocket] Unknown action from ${clientId}: ${message.action}`,
                        );
                        ws.send(
                            JSON.stringify({
                                type: C.MESSAGE_TYPES.ERROR,
                                message: `Unknown action: ${message.action}`,
                            }),
                        );
                    }
                } catch (err) {
                    log(
                        C.LogLevel.ERROR,
                        `[WebSocket] Invalid JSON from ${clientId}: ${err.message}.`,
                    );
                    ws.send(
                        JSON.stringify({
                            type: C.MESSAGE_TYPES.ERROR,
                            message: "Invalid message format",
                        }),
                    );
                }
            }
        });

        ws.on("close", async (code, reason) => {
            log(
                C.LogLevel.INFO,
                `[WebSocket] Client WS closed: ${clientId} (Code: ${code}, Reason: ${reason?.toString()})`,
            );
            const clientOnClose = wsClients.get(clientId);
            if (clientOnClose?.session) {
                await sessionManager.cleanupSession(clientOnClose.session, wsClients);
            }
            wsClients.delete(clientId);
        });

        ws.on("error", async (error) => {
            log(C.LogLevel.ERROR, `[WebSocket] Error for client ${clientId}: ${error.message}`);
            const clientOnError = wsClients.get(clientId);
            if (clientOnError?.session) {
                await sessionManager.cleanupSession(clientOnError.session, wsClients);
            }
            if (
                clientOnError?.ws &&
                (clientOnError.ws.readyState === WebSocket.OPEN ||
                    clientOnError.ws.readyState === WebSocket.CONNECTING)
            ) {
                clientOnError.ws.terminate();
            }
        });
    });

    log(C.LogLevel.INFO, `[System] WebSocket server listening on port ${C.WEBSOCKET_PORT}`);
    return wss;
}

module.exports = { createWebSocketServer, wsClients };
