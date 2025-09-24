/**
 * @file websocketService.js
 * @description WebSocket connection and message handling for Simba client UI.
 * @author Aditya Shenoy
 * @copyright Simba (c) 2025
 * @date 2025-09-10
 *
 * Provides functions to initialize, send, and close WebSocket connections, and handle all protocol messages.
 * All exported functions are documented for clarity and maintainability.
 */
import { globalState } from "./state.js";
import { appendLog, updateStatus } from "./loggerService.js";
import {
    populateDeviceSelect,
    requestAdbDevices as refreshAdbDevicesSidebar,
} from "./ui/sidebarControls.js";
import {
    handleStreamingStarted,
    handleStreamingStopped,
    handleResolutionChange,
    handleDeviceName,
    handleAudioInfo,
    handleBatteryInfo,
    handleVolumeInfo,
    handleWifiStatusResponse,
    handleNavResponse,
    handleLauncherAppsList,
    handleLaunchAppResponse,
} from "./messageHandlers.js";
import { BINARY_PACKET_TYPES, DECODER_TYPES } from "./constants.js";
import {
    handleVideoData as processVideoData,
    handleVideoInfo as processVideoInfo,
    configureWebCodecsVideoDecoder,
} from "./services/videoPlaybackService.js";
import {
    handleAudioData as processAudioData,
    setupAudioPlayer as setupAudioDecoder,
} from "./services/audioPlaybackService.js";
import { elements } from "./domElements.js";

export function initializeWebSocket() {
    /**
     * Initializes the WebSocket connection to the backend server.
     * Sets up all event handlers for message, open, close, and error events.
     * Handles both text and binary protocol messages.
     */
    if (
        globalState.ws &&
        (globalState.ws.readyState === WebSocket.OPEN ||
            globalState.ws.readyState === WebSocket.CONNECTING)
    ) {
        if (globalState.ws.readyState === WebSocket.OPEN) {
            refreshAdbDevicesSidebar();
        }
        return;
    }

    const currentPagePort = window.location.port;
    const wsPort = currentPagePort === "8001" ? "8081" : "8080";
    globalState.ws = new WebSocket(`ws://${window.location.hostname}:${wsPort}`);
    // globalState.ws = new WebSocket(`ws://${window.location.hostname}:8080`);
    globalState.ws.binaryType = "arraybuffer";

    globalState.ws.onopen = () => {
        appendLog("WebSocket connection established.");
        if (process.env.NODE_ENV !== "production") {
            console.log("[FRONTEND DEBUG] WebSocket connection established:", globalState.ws);
        }
        if (elements.refreshButton) elements.refreshButton.disabled = false;
        refreshAdbDevicesSidebar();
    };

    globalState.ws.onmessage = (event) => {
        if (process.env.NODE_ENV !== "production") {
            console.log("[FRONTEND DEBUG] WebSocket message received:", event.data);
        }
        if (typeof event.data === "string") {
            const message = JSON.parse(event.data);
            if (process.env.NODE_ENV !== "production") {
                console.log("[FRONTEND DEBUG] Parsed message:", message);
            }

            // --- ADB Shell Output Handling ---
            const adbShellOutput = document.getElementById("adbShellOutput");
            let adbShellSessionActive = window.adbShellSessionActive || false;
            if (message.type === "adbShellOutput" && adbShellOutput) {
                if (message.output.startsWith("$ ")) {
                    adbShellOutput.innerHTML += `<span style='color:#7fffd4;'>${message.output}</span><br>`;
                } else if (message.output.startsWith("[")) {
                    adbShellOutput.innerHTML += `<span style='color:#ffa07a;'>${message.output}</span><br>`;
                } else {
                    adbShellOutput.innerHTML += `${message.output}<br>`;
                }
                adbShellOutput.scrollTop = adbShellOutput.scrollHeight;
                window.adbShellSessionActive = true;
                return;
            }
            if (message.type === "adbShellClosed") {
                if (adbShellOutput)
                    adbShellOutput.innerHTML +=
                        "<br><span style='color:#ffa07a;'>[Shell session closed]</span>";
                window.adbShellSessionActive = false;
                return;
            }

            if (message.commandId && globalState.pendingAdbCommands.has(message.commandId)) {
                const cmdPromise = globalState.pendingAdbCommands.get(message.commandId);
                if (message.type === `${cmdPromise.commandType}Response`) {
                    if (message.success) {
                        cmdPromise.resolve(message);
                    } else {
                        cmdPromise.reject(
                            new Error(
                                message.error || `ADB command ${cmdPromise.commandType} failed.`,
                            ),
                        );
                    }
                    globalState.pendingAdbCommands.delete(message.commandId);
                    return;
                }
            }

            if (message.type === "adbDevicesList") {
                if (elements.refreshButton) elements.refreshButton.disabled = false;
                if (message.success) populateDeviceSelect(message.devices);
                else populateDeviceSelect([]);
                return;
            }

            switch (message.type) {
                case "diagnosticsStatus":
                    if (elements.diagnosticsStatus) {
                        elements.diagnosticsStatus.textContent = message.status || "";
                    }
                    if (elements.startDiagnosticsButton && elements.stopDiagnosticsButton) {
                        if (message.status && message.status.toLowerCase().includes("collecting")) {
                            elements.startDiagnosticsButton.disabled = true;
                            elements.stopDiagnosticsButton.disabled = false;
                        } else {
                            elements.startDiagnosticsButton.disabled = false;
                            elements.stopDiagnosticsButton.disabled = true;
                        }
                    }
                    break;
                case "deviceName":
                    handleDeviceName(message);
                    break;
                case "videoInfo":
                    processVideoInfo(message.width, message.height);
                    break;
                case "audioInfo":
                    handleAudioInfo(message);
                    break;
                case "status":
                    updateStatus(message.message);
                    if (message.message === "Streaming started") handleStreamingStarted();
                    else if (message.message === "Streaming stopped") handleStreamingStopped(false);
                    else if (message.message.startsWith("Audio disabled")) {
                        if (elements.enableAudioInput) elements.enableAudioInput.checked = false;
                        updateStatus(message.message);
                    }
                    break;
                case "error":
                    updateStatus(`Stream Error: ${message.message}`);
                    handleStreamingStopped(false);
                    break;
                case "resolutionChange":
                    handleResolutionChange(message.width, message.height);
                    break;
                case "volumeResponse":
                    if (message.success) updateStatus(`Volume set to ${message.requestedValue}%`);
                    else updateStatus(`Volume Error: ${message.error}`);
                    break;
                case "volumeInfo":
                    handleVolumeInfo(message);
                    break;
                case "navResponse":
                    handleNavResponse(message);
                    break;
                case "wifiResponse":
                    handleWifiStatusResponse(message);
                    break;
                case "wifiStatus":
                    handleWifiStatusResponse(message);
                    break;
                case "batteryInfo":
                    handleBatteryInfo(message);
                    break;
                case "launcherAppsList":
                    handleLauncherAppsList(message.apps);
                    break;
                case "launchAppResponse":
                    handleLaunchAppResponse(message);
                    break;

                default:
                    if (globalState.isRunning)
                        appendLog(`Unhandled message type: ${message.type}`, true);
                    else updateStatus(`Server message: ${message.message || message.type}`);
                    break;
            }
        } else if (event.data instanceof ArrayBuffer && globalState.isRunning) {
            const arrayBuffer = event.data;
            const dataView = new DataView(arrayBuffer);
            if (dataView.byteLength < 1) return;
            const packetType = dataView.getUint8(0);

            let payload, timestamp, frameTypeStr;
            const HEADER_LENGTH_TIMESTAMPED = 1 + 8;
            const HEADER_LENGTH_SPS_INFO = 1 + 1 + 1 + 1; // type + profile + compat + level

            switch (packetType) {
                case BINARY_PACKET_TYPES.LEGACY_VIDEO_H264:
                    payload = arrayBuffer.slice(1);
                    if (
                        globalState.decoderType === DECODER_TYPES.MSE ||
                        globalState.decoderType === DECODER_TYPES.BROADWAY
                    ) {
                        processVideoData(payload);
                    }
                    break;
                case BINARY_PACKET_TYPES.LEGACY_AUDIO_AAC_ADTS:
                    payload = arrayBuffer.slice(1);
                    break;
                case BINARY_PACKET_TYPES.WC_VIDEO_CONFIG_H264:
                    if (arrayBuffer.byteLength < HEADER_LENGTH_SPS_INFO) {
                        appendLog("WebCodecs video config packet too short.", true);
                        return;
                    }
                    const spsProfile = dataView.getUint8(1);
                    const spsCompat = dataView.getUint8(2);
                    const spsLevel = dataView.getUint8(3);
                    payload = arrayBuffer.slice(HEADER_LENGTH_SPS_INFO);
                    if (globalState.decoderType === DECODER_TYPES.WEBCODECS) {
                        configureWebCodecsVideoDecoder(spsProfile, spsCompat, spsLevel, payload);
                    }
                    break;
                case BINARY_PACKET_TYPES.WC_VIDEO_KEY_FRAME_H264:
                case BINARY_PACKET_TYPES.WC_VIDEO_DELTA_FRAME_H264:
                    if (arrayBuffer.byteLength < HEADER_LENGTH_TIMESTAMPED) {
                        appendLog("WebCodecs video frame too short for header.", true);
                        return;
                    }
                    timestamp = dataView.getBigUint64(1, false);
                    payload = arrayBuffer.slice(HEADER_LENGTH_TIMESTAMPED);
                    frameTypeStr =
                        packetType === BINARY_PACKET_TYPES.WC_VIDEO_KEY_FRAME_H264
                            ? "key"
                            : "delta";
                    if (globalState.decoderType === DECODER_TYPES.WEBCODECS) {
                        processVideoData(payload, Number(timestamp), frameTypeStr);
                    }
                    break;
                case BINARY_PACKET_TYPES.WC_AUDIO_CONFIG_AAC:
                    payload = arrayBuffer.slice(1);
                    if (elements.enableAudioInput.checked) {
                        setupAudioDecoder(
                            globalState.audioCodecId || 0x00616163,
                            globalState.audioMetadata,
                            payload,
                        );
                    }
                    break;
                case BINARY_PACKET_TYPES.WC_AUDIO_FRAME_AAC:
                    if (arrayBuffer.byteLength < HEADER_LENGTH_TIMESTAMPED) {
                        appendLog("WebCodecs audio frame too short for header.", true);
                        return;
                    }
                    timestamp = dataView.getBigUint64(1, false);
                    payload = arrayBuffer.slice(HEADER_LENGTH_TIMESTAMPED);
                    if (elements.enableAudioInput.checked) {
                        processAudioData(payload, Number(timestamp));
                    }
                    break;
                default:
                    appendLog(`Unknown binary packet type: ${packetType}`, true);
            }
        }
    };

    globalState.ws.onclose = (event) => {
        appendLog(
            `WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || "N/A"}`,
        );
        if (globalState.isRunning) {
            handleStreamingStopped(false);
        }
        globalState.ws = null;
        if (elements.refreshButton) elements.refreshButton.disabled = true;
        if (elements.startButton) elements.startButton.disabled = true;
        populateDeviceSelect([]);
        globalState.pendingAdbCommands.forEach((cmd) =>
            cmd.reject(new Error("WebSocket connection closed.")),
        );
        globalState.pendingAdbCommands.clear();
    };

    globalState.ws.onerror = (error) => {
        appendLog("WebSocket error. Check console.", true);
        if (globalState.isRunning) {
            handleStreamingStopped(false);
        }
        globalState.ws = null;
        if (elements.refreshButton) elements.refreshButton.disabled = true;
        if (elements.startButton) elements.startButton.disabled = true;
        populateDeviceSelect([]);
        globalState.pendingAdbCommands.forEach((cmd) => cmd.reject(new Error("WebSocket error.")));
        globalState.pendingAdbCommands.clear();
    };
}

export function sendWebSocketMessage(messageObject) {
    /**
     * Sends a JSON message to the backend server via WebSocket.
     * @param {Object} messageObject - The message object to send.
     * @returns {boolean} True if sent successfully, false otherwise.
     */
    if (globalState.ws && globalState.ws.readyState === WebSocket.OPEN) {
        try {
            globalState.ws.send(JSON.stringify(messageObject));
            return true;
        } catch (e) {
            appendLog(`Error sending WebSocket message: ${e.message}`, true);
            return false;
        }
    } else {
        appendLog("WebSocket not open. Cannot send message.", true);
        return false;
    }
}

export function sendControlMessageToServer(buffer) {
    /**
     * Sends a binary control message to the backend server via WebSocket.
     * @param {ArrayBuffer|Uint8Array} buffer - The binary buffer to send.
     */
    if (
        globalState.ws &&
        globalState.ws.readyState === WebSocket.OPEN &&
        globalState.controlEnabledAtStart
    ) {
        try {
            globalState.ws.send(buffer);
        } catch (e) {
            appendLog(`Error sending control buffer: ${e.message}`, true);
        }
    }
}

export function closeWebSocket() {
    /**
     * Closes the WebSocket connection to the backend server.
     */
    if (globalState.ws) {
        globalState.ws.close();
    }
}
