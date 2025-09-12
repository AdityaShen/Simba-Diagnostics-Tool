/**
 * @file headerControls.js
 * @description UI logic for header controls, theme toggling, and fullscreen in Simba client.
 * @author Aditya Shen
 * @copyright Simba3, AdityaShen
 * @date 2025-09-10
 *
 * All exported and key internal functions are documented for clarity and maintainability. Code is company-ready and easy to extend.
 */
import { elements } from "../domElements.js";
import { globalState } from "../state.js";
import { HIDE_HEADER_TIMEOUT_MS } from "../constants.js";

/**
 * Shows the page header if it is currently hidden.
 */
function showPageHeader() {
    if (elements.header?.classList.contains("hidden")) elements.header.classList.remove("hidden");
}

/**
 * Hides the page header unless the mouse is over it.
 */
function hidePageHeader() {
    if (
        !globalState.isHeaderMouseOver &&
        elements.header &&
        !elements.header.classList.contains("hidden")
    ) {
        elements.header.classList.add("hidden");
    }
}

/**
 * Resets the header hide timeout, delaying header auto-hide.
 */
function resetHeaderTimeout() {
    clearTimeout(globalState.headerScrollTimeout);
    globalState.headerScrollTimeout = setTimeout(hidePageHeader, HIDE_HEADER_TIMEOUT_MS);
}

/**
 * Initializes all event listeners and UI logic for the header controls, including theme and fullscreen.
 */
export function initHeaderControls() {
    if (elements.themeToggle) {
        // Apply theme from localStorage on page load
        const savedTheme = localStorage.getItem("theme") || "dark";
        document.body.setAttribute("data-theme", savedTheme);
        elements.themeToggle.setAttribute("aria-checked", savedTheme === "dark" ? "true" : "false");

        elements.themeToggle.addEventListener("click", () => {
            const body = document.body;
            const currentTheme = body.getAttribute("data-theme");
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            body.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            elements.themeToggle.setAttribute(
                "aria-checked",
                newTheme === "dark" ? "true" : "false",
            );
        });
    }

    if (elements.fullscreenBtn) {
        elements.fullscreenBtn.addEventListener("click", () => {
            const streamArea = elements.streamArea;
            if (!streamArea) return;

            let isStreamVisible = false;

            if (globalState.decoderType === "mse") {
                isStreamVisible = elements.videoElement?.classList.contains("visible");
            } else if (globalState.decoderType === "broadway") {
                isStreamVisible =
                    globalState.broadwayPlayer?.canvas?.classList.contains("visible") ||
                    elements.broadwayCanvas?.classList.contains("visible");
            } else if (globalState.decoderType === "webcodecs") {
                isStreamVisible = elements.webcodecCanvas?.classList.contains("visible");
            }

            if (!document.fullscreenElement) {
                if (globalState.isRunning && isStreamVisible) {
                    if (streamArea.requestFullscreen) {
                        streamArea.requestFullscreen().catch((err) => {
                            console.error(
                                `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
                            );
                        });
                    } else if (streamArea.mozRequestFullScreen) {
                        streamArea.mozRequestFullScreen();
                    } else if (streamArea.webkitRequestFullscreen) {
                        streamArea.webkitRequestFullscreen();
                    } else if (streamArea.msRequestFullscreen) {
                        streamArea.msRequestFullscreen();
                    }
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        });
    }

    document.addEventListener("fullscreenchange", () => {
        if (elements.streamArea) {
            elements.streamArea.classList.toggle(
                "in-fullscreen-mode",
                !!document.fullscreenElement,
            );
        }
    });
    document.addEventListener("webkitfullscreenchange", () => {
        if (elements.streamArea) {
            elements.streamArea.classList.toggle(
                "in-fullscreen-mode",
                !!document.webkitFullscreenElement,
            );
        }
    });
    document.addEventListener("mozfullscreenchange", () => {
        if (elements.streamArea) {
            elements.streamArea.classList.toggle(
                "in-fullscreen-mode",
                !!document.mozFullScreenElement,
            );
        }
    });
    document.addEventListener("MSFullscreenChange", () => {
        if (elements.streamArea) {
            elements.streamArea.classList.toggle(
                "in-fullscreen-mode",
                !!document.msFullscreenElement,
            );
        }
    });

    window.addEventListener("scroll", () => {
        showPageHeader();
        resetHeaderTimeout();
    });

    if (elements.header) {
        elements.header.addEventListener("mouseenter", () => {
            globalState.isHeaderMouseOver = true;
            clearTimeout(globalState.headerScrollTimeout);
            showPageHeader();
        });
        elements.header.addEventListener("mouseleave", () => {
            globalState.isHeaderMouseOver = false;
            resetHeaderTimeout();
        });
    }

    showPageHeader();
    resetHeaderTimeout();
}
