/**
 * @file messageHandlers.js
 * @description WebSocket and backend message handler functions for Simba client UI.
 * @author Aditya Shenoy
 * @copyright Simba (c) 2025
 * @date 2025-09-10
 *
 * Each handler processes a specific message type and updates UI or state accordingly.
 * Extend these handlers to support new message types or custom logic.
 */

/**
 * Message handler functions for WebSocket and backend events.
 * Each handler processes a specific message type and updates UI or state accordingly.
 * Extend these handlers to support new message types or custom logic.
 */
import { globalState, resetStreamRelatedState } from "./state.js";
import { elements } from "./domElements.js";
import { appendLog, updateStatus } from "./loggerService.js";
import { sendWebSocketMessage } from "./websocketService.js";
import {
    setupAudioPlayer as setupAudioDecoder,
    closeAudio,
} from "./services/audioPlaybackService.js";
import {
    stopVideoPlayback,
    updateVideoResolutionInStream,
    checkForBadState,
    handleVideoInfo as processVideoInfoInternal,
} from "./services/videoPlaybackService.js";
import {
    updateDisplayOptionsOnStreamStop,
    updateDisplayOptionsOnStreamStart,
} from "./ui/sidebarControls.js";
import { renderAppDrawer } from "./ui/appDrawer.js";
import {
    updateSpeakerIconFromVolume,
    updateSliderBackground,
    updateWifiIndicatorUI,
    updateBatteryLevelUI,
} from "./ui/taskbarControls.js";
import { CHECK_STATE_INTERVAL_MS, CODEC_IDS, DECODER_TYPES } from "./constants.js";

/**
 * Handles device name message from backend.
 * @param {Object} message - Message containing device name.
 */
export function handleDeviceName(message) {
    updateStatus(`Streaming from ${message.name}`);
    appendLog(`Device Name: ${message.name}`);
}

/**
 * Handles video info message (resolution, etc.).
 * @param {Object} message - Message containing video info.
 */
export function handleVideoInfo(message) {
    processVideoInfoInternal(message.width, message.height);
    appendLog(`Video Info: ${message.width}x${message.height}`);
}

/**
 * Handles audio info message (codec, etc.).
 * @param {Object} message - Message containing audio info.
 */
export function handleAudioInfo(message) {
    if (
        message.codecId === CODEC_IDS.AAC &&
        message.metadata &&
        elements.enableAudioInput.checked
    ) {
        appendLog(
            `Received JSON audioInfo: Codec ${message.codecId}, Metadata: ${JSON.stringify(message.metadata)}`,
        );
        globalState.audioCodecId = message.codecId;
        globalState.audioMetadata = message.metadata;
        // Actual setupAudioDecoder will happen when WC_AUDIO_CONFIG_AAC binary message arrives
    }
}

export function handleStreamingStarted() {
    /**
     * Handles streaming started event from backend.
     * Sets up UI, polling, and requests device info.
     */
    let targetRenderElement = null;
    if (globalState.decoderType === DECODER_TYPES.MSE) {
        targetRenderElement = elements.videoElement;
    } else if (globalState.decoderType === DECODER_TYPES.BROADWAY) {
        targetRenderElement = globalState.broadwayPlayer
            ? globalState.broadwayPlayer.canvas
            : elements.broadwayCanvas;
    } else if (globalState.decoderType === DECODER_TYPES.WEBCODECS) {
        targetRenderElement = elements.webcodecCanvas;
    }

    if (targetRenderElement) {
        targetRenderElement.classList.toggle("control-enabled", globalState.controlEnabledAtStart);
    }

    if (globalState.decoderType === DECODER_TYPES.MSE) {
        if (globalState.checkStateIntervalId) clearInterval(globalState.checkStateIntervalId);
        globalState.checkStateIntervalId = setInterval(checkForBadState, CHECK_STATE_INTERVAL_MS);
    }

    sendWebSocketMessage({ action: "getBatteryLevel" });
    sendWebSocketMessage({ action: "getWifiStatus" });
    sendWebSocketMessage({ action: "getVolume" });
    updateDisplayOptionsOnStreamStart();
    appendLog("Streaming started handler executed.");
}

export function handleStreamingStopped(sendDisconnect = true) {
    /**
     * Handles streaming stopped event from backend.
     * Cleans up UI, resets state, and disconnects.
     * @param {boolean} [sendDisconnect=true] - Whether to send disconnect status.
     */
    const wasRunning = globalState.isRunning;
    appendLog(
        `Handle streaming stopped. Was running: ${wasRunning}, Send disconnect: ${sendDisconnect}`,
    );

    if (globalState.checkStateIntervalId) {
        clearInterval(globalState.checkStateIntervalId);
        globalState.checkStateIntervalId = null;
    }
    closeAudio();
    stopVideoPlayback();

    if (elements.videoElement) {
        elements.videoElement.classList.remove("visible");
        elements.videoElement.classList.remove("control-enabled");
    }
    if (elements.broadwayCanvas) {
        elements.broadwayCanvas.classList.remove("visible");
        elements.broadwayCanvas.classList.remove("control-enabled");
        if (globalState.broadwayPlayer && globalState.broadwayPlayer.canvas) {
            const ctx = globalState.broadwayPlayer.canvas.getContext("2d");
            if (ctx)
                ctx.clearRect(
                    0,
                    0,
                    globalState.broadwayPlayer.canvas.width,
                    globalState.broadwayPlayer.canvas.height,
                );
        } else if (elements.broadwayCanvas.getContext) {
            const ctx = elements.broadwayCanvas.getContext("2d");
            if (ctx)
                ctx.clearRect(0, 0, elements.broadwayCanvas.width, elements.broadwayCanvas.height);
        }
    }
    if (elements.webcodecCanvas) {
        elements.webcodecCanvas.classList.remove("visible");
        elements.webcodecCanvas.classList.remove("control-enabled");
        if (globalState.webCodecCanvasCtx) {
            globalState.webCodecCanvasCtx.clearRect(
                0,
                0,
                elements.webcodecCanvas.width,
                elements.webcodecCanvas.height,
            );
        }
    }

    if (elements.videoPlaceholder) elements.videoPlaceholder.classList.remove("hidden");
    if (elements.videoBorder) elements.videoBorder.style.display = "none";
    if (elements.streamArea) elements.streamArea.style.aspectRatio = "9 / 16";

    if (wasRunning || sendDisconnect === false) {
        globalState.isRunning = false;
        updateStatus("Disconnected");
        updateDisplayOptionsOnStreamStop();
    }
    resetStreamRelatedState();
    appendLog("Streaming stopped handler completed.");
}

export function handleResolutionChange(width, height) {
    /**
     * Handles resolution change event from backend.
     * Updates video resolution in UI and logs change.
     * @param {number} width - New video width.
     * @param {number} height - New video height.
     */
    if (!globalState.isRunning) return;
    updateVideoResolutionInStream(width, height);
    appendLog(`Resolution changed to: ${width}x${height}`);
}

export function handleVolumeInfo(message) {
    /**
     * Handles volume info message from backend.
     * Updates volume slider, speaker icon, and logs status.
     * @param {Object} message - Message containing volume info.
     */
    if (message.success) {
        if (elements.mediaVolumeSlider) {
            elements.mediaVolumeSlider.value = message.volume;
            updateSliderBackground(elements.mediaVolumeSlider);
        }
        updateSpeakerIconFromVolume(message.volume);
        updateStatus(`Volume: ${message.volume}%`);
    } else updateStatus(`Get Volume Error: ${message.error}`);
    appendLog(`Volume info: ${JSON.stringify(message)}`);
}

export function handleNavResponse(message) {
    /**
     * Handles navigation response from backend.
     * Updates status and logs navigation result.
     * @param {Object} message - Message containing navigation response.
     */
    if (message.success) updateStatus(`Nav ${message.key} OK`);
    else updateStatus(`Nav ${message.key} Error: ${message.error}`);
    appendLog(`Nav response: ${JSON.stringify(message)}`);
}

export function handleWifiStatusResponse(message) {
    /**
     * Handles Wi-Fi status response from backend.
     * Updates Wi-Fi indicator, status, and logs result.
     * @param {Object} message - Message containing Wi-Fi status.
     */
    const wifiToggleBtn = elements.wifiToggleBtn;
    if (wifiToggleBtn) wifiToggleBtn.classList.remove("pending");
    if (message.success) {
        globalState.isWifiOn =
            message.isWifiOn !== undefined ? message.isWifiOn : message.currentState;
        globalState.wifiSsid = message.ssid;
        updateWifiIndicatorUI();
        updateStatus(
            `Wi-Fi ${globalState.isWifiOn ? "On" : "Off"}${globalState.wifiSsid ? ` (${globalState.wifiSsid})` : ""}`,
        );
    } else updateStatus(`Wi-Fi Error: ${message.error}`);
    appendLog(`WiFi status response: ${JSON.stringify(message)}`);
}

export function handleBatteryInfo(message) {
    /**
     * Handles battery info message from backend.
     * Updates battery UI and logs battery status.
     * @param {Object} message - Message containing battery info.
     */
    if (message.success) updateBatteryLevelUI(message.batteryLevel);
    else updateStatus(`Battery Error: ${message.error}`);
    appendLog(`Battery info: ${JSON.stringify(message)}`);
}

export function handleLauncherAppsList(apps) {
    /**
     * Handles launcher apps list from backend.
     * Renders app drawer and logs app count.
     * @param {Array} apps - List of launcher apps.
     */
    if (Array.isArray(apps)) {
        renderAppDrawer(apps);
    }
    appendLog(`Launcher apps list received. Count: ${apps?.length || 0}`);
}

export function handleLaunchAppResponse(message) {
    /**
     * Handles launch app response from backend.
     * Updates status and logs launch result.
     * @param {Object} message - Message containing app launch response.
     */
    if (message.success) updateStatus(`App ${message.packageName} launched successfully.`);
    else updateStatus(`App Launch Error: ${message.error}`);
    appendLog(`Launch app response: ${JSON.stringify(message)}`);
}
