/**
 * @file main.js
 * @description Simba Client Main Entry Point
 * @author Aditya Shenoy
 * @copyright Simba (c) 2025
 * @date 2025-09-09
 *
 * This file initializes the Simba client application, sets up UI event handlers,
 * manages device selection, ADB shell, HAR tracing, notifications, logging, and screen recording.
 * All critical UI and service logic is documented for maintainability and industry standards.
 */
import { globalState } from "./state.js";
import { elements } from "./domElements.js";

import { initializeWebSocket, sendWebSocketMessage, closeWebSocket } from "./websocketService.js";
import { initGlobalErrorHandling, appendLog } from "./loggerService.js";
import { initInputService } from "./services/inputService.js";
import { stopVideoPlayback } from "./services/videoPlaybackService.js";
import { closeAudio } from "./services/audioPlaybackService.js";

import { initSidebarControls } from "./ui/sidebarControls.js";
import { initTaskbarControls } from "./ui/taskbarControls.js";
import { initAppDrawer } from "./ui/appDrawer.js";
import { initHeaderControls } from "./ui/headerControls.js";

document.addEventListener("DOMContentLoaded", () => {
    /**
     * Main entry point for Simba client UI. Initializes error handling, device selection,
     * UI controls, and sets up all event listeners and services.
     */

    /**
     * Initializes global error handling for the client app.
     */
    initGlobalErrorHandling();

    // 🔹 Extract deviceId from URL query param
    const params = new URLSearchParams(window.location.search);
    const deviceId = params.get("deviceId");

    if (deviceId) {
        globalState.selectedDeviceId = deviceId;
        appendLog(`Selected device from URL: ${deviceId}`);
    } else {
        appendLog("No device ID found in URL. Redirecting to landing page...", true);
        window.location.href = "/landing.html"; // ⬅ Redirect to landing page
        return;
    }

    initHeaderControls();
    initSidebarControls();
    initTaskbarControls();
    initAppDrawer();

    // --- HAR tracing UI with custom modal ---
    const harTraceBtn = document.getElementById("startHarTraceBtn");
    const harTraceUrlModal = document.getElementById("harTraceUrlModal");
    const harTraceUrlInput = document.getElementById("harTraceUrlInput");
    const harTraceUrlSubmit = document.getElementById("harTraceUrlSubmit");
    const harTraceUrlCancel = document.getElementById("harTraceUrlCancel");

    // --- ADB Shell UI ---
    const openAdbShellBtn = document.getElementById("openAdbShellBtn");
    const adbShellModal = document.getElementById("adbShellModal");
    const adbShellOutput = document.getElementById("adbShellOutput");
    const adbShellInput = document.getElementById("adbShellInput");
    const adbShellSendBtn = document.getElementById("adbShellSendBtn");
    const adbShellCloseBtn = document.getElementById("adbShellCloseBtn");
    let adbShellSessionActive = false;

    /**
     * Displays the ADB shell modal and starts a shell session.
     */
    function showAdbShellModal() {
        /**
         * Displays the ADB shell modal and starts a shell session for the selected device.
         */
        if (adbShellModal) {
            adbShellModal.style.display = "flex";
            adbShellOutput.textContent = "";
            adbShellInput.value = "";
            adbShellInput.focus();
            adbShellSessionActive = true;
            // Start shell session
            sendWebSocketMessage({
                action: "startAdbShell",
                deviceId: globalState.selectedDeviceId,
            });
        }
    }
    /**
     * Hides the ADB shell modal and stops the shell session.
     */
    function hideAdbShellModal() {
        /**
         * Hides the ADB shell modal and stops the shell session for the selected device.
         */
        if (adbShellModal) adbShellModal.style.display = "none";
        adbShellSessionActive = false;
        sendWebSocketMessage({ action: "stopAdbShell", deviceId: globalState.selectedDeviceId });
    }

    if (openAdbShellBtn) {
        /**
         * Handles click event to open the ADB shell modal.
         */
        /**
         * Handles click event to open ADB shell modal.
         */
        openAdbShellBtn.addEventListener("click", () => {
            if (!globalState.selectedDeviceId) {
                showNotification("Select a device first.");
                return;
            }
            showAdbShellModal();
        });
    }
    if (adbShellSendBtn && adbShellInput) {
        /**
         * Handles click event to send ADB shell command input.
         */
        /**
         * Handles Enter key to send ADB shell command.
         */
        /**
         * Handles click event to send ADB shell command input.
         */
        adbShellSendBtn.addEventListener("click", () => {
            const cmd = adbShellInput.value.trim();
            if (cmd && adbShellSessionActive) {
                sendWebSocketMessage({
                    action: "adbShellInput",
                    deviceId: globalState.selectedDeviceId,
                    input: cmd,
                });
                adbShellInput.value = "";
            }
        });
        /**
         * Handles Enter key to send ADB shell command.
         */
        adbShellInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                adbShellSendBtn.click();
            }
        });
    }
    if (adbShellCloseBtn) {
        /**
         * Handles click event to close the ADB shell modal.
         */
        /**
         * Handles click event to close ADB shell modal.
         */
        adbShellCloseBtn.addEventListener("click", hideAdbShellModal);
    }

    // Listen for ADB shell output
    if (globalState.ws) {
        /**
         * Listens for ADB shell output and session events from the backend.
         */
        globalState.ws.addEventListener("message", (event) => {
            try {
                const message = JSON.parse(event.data);
                // Debug log for ADB shell output
                if (message.type === "adbShellOutput" && process.env.NODE_ENV !== "production") {
                    console.log("[ADB SHELL OUTPUT HANDLER]", message.output);
                }
                // Always handle ADB shell output, even if not in session
                if (message.type === "adbShellOutput" && adbShellOutput) {
                    if (message.output.startsWith("$ ")) {
                        adbShellOutput.innerHTML += `<span style='color:#7fffd4;'>${message.output}</span><br>`;
                    } else if (message.output.startsWith("[")) {
                        adbShellOutput.innerHTML += `<span style='color:#ffa07a;'>${message.output}</span><br>`;
                    } else {
                        adbShellOutput.innerHTML += `${message.output}<br>`;
                    }
                    adbShellOutput.scrollTop = adbShellOutput.scrollHeight;
                }
                if (message.type === "adbShellClosed") {
                    if (adbShellOutput)
                        adbShellOutput.innerHTML +=
                            "<br><span style='color:#ffa07a;'>[Shell session closed]</span>";
                    adbShellSessionActive = false;
                }
                // ...existing code for other message types...
            } catch (e) {
                // Ignore parse errors for non-shell messages
            }
        });
    }

    function showHarTraceModal() {
        /**
         * Displays the HAR trace modal for user input.
         */
        if (harTraceUrlModal) {
            harTraceUrlModal.style.display = "flex";
            harTraceUrlInput.value = "https://";
            harTraceUrlInput.focus();
            // Select after https:// for convenience
            setTimeout(() => {
                harTraceUrlInput.setSelectionRange(
                    harTraceUrlInput.value.length,
                    harTraceUrlInput.value.length,
                );
            }, 0);
        }
    }
    function hideHarTraceModal() {
        /**
         * Hides the HAR trace modal.
         */
        if (harTraceUrlModal) harTraceUrlModal.style.display = "none";
    }

    if (harTraceBtn && elements.harTraceStatus) {
        harTraceBtn.addEventListener("click", () => {
            if (!globalState.selectedDeviceId) {
                showNotification("Select a device first.");
                return;
            }
            showHarTraceModal();
        });
        // --- Notification Modal ---
        function showNotification(message) {
            /**
             * Displays a notification modal with the given message.
             * @param {string} message - The message to display.
             */
            let modal = document.getElementById("notificationModal");
            let modalMsg = document.getElementById("notificationMessage");
            let modalClose = document.getElementById("notificationClose");
            if (!modal) {
                modal = document.createElement("div");
                modal.id = "notificationModal";
                modal.style.position = "fixed";
                modal.style.top = "0";
                modal.style.left = "0";
                modal.style.width = "100vw";
                modal.style.height = "100vh";
                modal.style.background = "rgba(0,0,0,0.4)";
                modal.style.display = "flex";
                modal.style.alignItems = "center";
                modal.style.justifyContent = "center";
                modal.style.zIndex = "9999";
                modal.innerHTML = `<div style="background:#222;padding:2em 3em;border-radius:8px;box-shadow:0 2px 12px #000;min-width:300px;text-align:center;">
            <div id="notificationMessage" style="color:#fff;font-size:1.2em;margin-bottom:1em;"></div>
            <button id="notificationClose" style="padding:0.5em 2em;border:none;border-radius:4px;background:#7fffd4;color:#222;font-weight:bold;cursor:pointer;">OK</button>
        </div>`;
                document.body.appendChild(modal);
                modalMsg = document.getElementById("notificationMessage");
                modalClose = document.getElementById("notificationClose");
            }
            modalMsg.textContent = message;
            modal.style.display = "flex";
            modalClose.onclick = () => {
                modal.style.display = "none";
            };
        }
    }
    function submitHarTrace() {
        /**
         * Submits the HAR trace request to the backend via WebSocket.
         */
        /**
         * Handles click event to open HAR trace modal.
         */
        const url = harTraceUrlInput.value.trim();
        if (!url) return;
        hideHarTraceModal();
        elements.harTraceStatus.textContent = "";
        if (harTraceBtn) harTraceBtn.disabled = true;
        if (elements.stopHarTraceBtn) elements.stopHarTraceBtn.disabled = false;
        sendWebSocketMessage({
            action: "startHarTrace",
            deviceId: globalState.selectedDeviceId,
            url,
            harFilename: `chrome_har_output_${Date.now()}.har`,
            captureTime: 100,
        });
    }
    if (harTraceUrlSubmit) {
        /**
         * Handles click event to submit HAR trace URL.
         */
        harTraceUrlSubmit.addEventListener("click", submitHarTrace);
    }
    if (harTraceUrlInput) {
        /**
         * Handles Enter key to submit HAR trace URL.
         */
        harTraceUrlInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                submitHarTrace();
            }
        });
    }
    if (harTraceUrlCancel) {
        /**
         * Handles click event to cancel HAR trace modal.
         */
        harTraceUrlCancel.addEventListener("click", () => {
            hideHarTraceModal();
        });
    }
    if (elements.stopHarTraceBtn && elements.harTraceStatus) {
        /**
         * Handles click event to stop HAR trace and update UI.
         */
        /**
         * Listens for HAR trace status/results from the backend and updates UI.
         */
        elements.stopHarTraceBtn.addEventListener("click", () => {
            sendWebSocketMessage({ action: "stopHarTrace" });
            // Immediately re-enable Start button and disable Stop button
            if (elements.harTraceBtn) elements.harTraceBtn.disabled = false;
            elements.stopHarTraceBtn.disabled = true;
        });
    }

    // Listen for HAR trace status/results
    if (globalState.ws) {
        globalState.ws.addEventListener("message", (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === "harTraceStatus" && elements.harTraceStatus) {
                    elements.harTraceStatus.textContent = message.status;
                    // Always re-enable Start button after stop
                    if (elements.harTraceBtn) elements.harTraceBtn.disabled = false;
                    if (elements.stopHarTraceBtn) elements.stopHarTraceBtn.disabled = true;
                }
                if (message.type === "harTraceResponse" && elements.harTraceStatus) {
                    if (message.success) {
                        // If running in Electron, prompt user to save HAR file
                        // Always show HAR trace complete and Save As button
                        elements.harTraceStatus.innerHTML =
                            "HAR trace complete.<br><button id=\"saveHarFileBtn\">Save As...</button>";
                        const saveBtn = document.getElementById("saveHarFileBtn");
                        if (saveBtn && window && window.require) {
                            saveBtn.addEventListener("click", () => {
                                try {
                                    const { ipcRenderer } = window.require("electron");
                                    ipcRenderer
                                        .invoke("save-har-file", message.file)
                                        .then((result) => {
                                            if (result.success) {
                                                elements.harTraceStatus.innerHTML = `HAR trace saved to: <b>${result.filePath}</b>`;
                                            } else {
                                                elements.harTraceStatus.textContent = `HAR trace save canceled or failed: ${result.error}`;
                                            }
                                        });
                                } catch (err) {
                                    elements.harTraceStatus.textContent =
                                        "HAR trace complete, but save dialog failed.";
                                }
                            });
                        }
                    } else {
                        elements.harTraceStatus.textContent = `HAR trace failed: ${message.error}`;
                    }
                    // Always re-enable Start button and disable Stop button after any harTraceResponse
                    if (elements.harTraceBtn) elements.harTraceBtn.disabled = false;
                    if (elements.stopHarTraceBtn) elements.stopHarTraceBtn.disabled = true;
                }
                // Always log unhandled message types for debugging
                if (message.type !== "harTraceStatus" && message.type !== "harTraceResponse") {
                    appendLog(`[Unhandled message type: ${message.type}]`, true);
                }
            } catch (e) {
                appendLog(`[HAR Trace] Error parsing message: ${e}`, true);
            }
        });
    }
    initInputService();

    initializeWebSocket();

    appendLog("Simba Client Initialized.");

    window.addEventListener("beforeunload", () => {
        if (
            globalState.isRunning ||
            (globalState.ws && globalState.ws.readyState === WebSocket.OPEN)
        ) {
            sendWebSocketMessage({ action: "disconnect" });

            if (globalState.checkStateIntervalId) {
                clearInterval(globalState.checkStateIntervalId);
                globalState.checkStateIntervalId = null;
            }
            closeAudio();
            stopVideoPlayback();

            closeWebSocket();
            appendLog("Attempted cleanup on page unload.");
        }
    });

    if (elements.toggleLogBtn && elements.logContent) {
        elements.toggleLogBtn.addEventListener("click", () => {
            const isExpanded = elements.toggleLogBtn.getAttribute("aria-expanded") === "true";
            elements.toggleLogBtn.setAttribute("aria-expanded", (!isExpanded).toString());
            elements.toggleLogBtn.textContent = isExpanded ? "Show Logs" : "Hide Logs";
            elements.logContent.classList.toggle("hidden", isExpanded);
        });
    }

    // --- Client-side screen recording using MediaRecorder API ---
    const startBtn = document.getElementById("startRecordingBtn");
    const stopBtn = document.getElementById("stopRecordingBtn");
    const statusSpan = document.getElementById("recordingStatus");
    let mediaRecorder = null;
    let recordedChunks = [];

    // Try to get the main video/canvas element for recording
    function getStreamSource() {
        /**
         * Attempts to get the main video or canvas element for recording.
         * @returns {MediaStream|null} The media stream to record, or null if unavailable.
         */
        // Try video first
        const video = document.getElementById("screen");
        if (video && video.readyState >= 2 && video.captureStream) {
            return video.captureStream(30);
        }
        // Try canvas (webcodec or broadway)
        const webcodecCanvas = document.getElementById("webcodecCanvas");
        if (webcodecCanvas && webcodecCanvas.style.display !== "none") {
            return webcodecCanvas.captureStream(30);
        }
        const broadwayCanvas = document.getElementById("broadwayCanvas");
        if (broadwayCanvas && broadwayCanvas.style.display !== "none") {
            return broadwayCanvas.captureStream(30);
        }
        return null;
    }

    if (startBtn && stopBtn && statusSpan) {
        /**
         * Handles click event to start screen recording using MediaRecorder API.
         */
        startBtn.addEventListener("click", () => {
            const stream = getStreamSource();
            if (!stream) {
                statusSpan.textContent = "No video/canvas stream available to record.";
                return;
            }
            recordedChunks = [];
            try {
                mediaRecorder = new window.MediaRecorder(stream, {
                    mimeType: "video/webm; codecs=vp9",
                });
            } catch (e) {
                try {
                    mediaRecorder = new window.MediaRecorder(stream, { mimeType: "video/webm" });
                } catch (err) {
                    statusSpan.textContent = "MediaRecorder not supported or no suitable codec.";
                    return;
                }
            }
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunks.push(e.data);
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                statusSpan.innerHTML = `Saved: <a href="${url}" download="recording.webm" target="_blank">Download recording</a>`;
                recordedChunks = [];
            };
            mediaRecorder.start();
            startBtn.disabled = true;
            stopBtn.disabled = false;
            statusSpan.textContent = "Recording...";
        });

        stopBtn.addEventListener("click", () => {
            /**
             * Handles click event to stop screen recording and provide download link.
             */
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
                stopBtn.disabled = true;
                startBtn.disabled = false;
                statusSpan.textContent = "Processing...";
            }
        });
    }
});
