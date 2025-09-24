/**
 * Centralized DOM element references for UI controls and containers.
 * Use these to access and manipulate UI components throughout the client codebase.
 * This improves maintainability and reduces querySelector/getElementById duplication.
 *
 * Example usage:
 *   elements.startButton.addEventListener('click', ...)
 */
export const elements = {
    /** Main header element */
    header: document.querySelector("header"),
    /** Start streaming button */
    startButton: document.getElementById("startBtn"),
    /** Stop streaming button */
    stopButton: document.getElementById("stopBtn"),
    /** Device selection dropdown */
    adbDevicesSelect: document.getElementById("devices"),
    /** Refresh device list button */
    refreshButton: document.getElementById("refreshButton"),
    /** Video resolution dropdown */
    resolutionSelect: document.getElementById("resolution"),
    /** Custom resolution input */
    customResolutionInput: document.getElementById("customResolution"),
    /** DPI selection dropdown */
    dpiSelect: document.getElementById("dpi"),
    /** Custom DPI input */
    customDpiInput: document.getElementById("customDpi"),
    /** Resolution label */
    resolutionLabel: document.getElementById("resolutionLabel"),
    /** DPI label */
    dpiLabel: document.getElementById("dpiLabel"),
    /** Rotation lock dropdown */
    rotationLockSelect: document.getElementById("rotationLock"),
    /** Rotation lock label */
    rotationLockLabel: document.getElementById("rotationLockLabel"),
    /** Bitrate selection dropdown */
    bitrateSelect: document.getElementById("bitrate"),
    /** Custom bitrate input */
    customBitrateInput: document.getElementById("customBitrate"),
    /** Max FPS selection dropdown */
    maxFpsSelect: document.getElementById("maxFps"),
    /** Power options */
    noPowerOnInput: document.getElementById("noPowerOn"),
    turnScreenOffInput: document.getElementById("turnScreenOff"),
    powerOffOnCloseInput: document.getElementById("powerOffOnClose"),
    /** Audio and control toggles */
    enableAudioInput: document.getElementById("enableAudio"),
    enableControlInput: document.getElementById("enableControl"),
    /** Theme toggle button */
    themeToggle: document.getElementById("themeToggle"),
    /** Fullscreen button */
    fullscreenBtn: document.getElementById("fullscreenBtn"),
    /** Main streaming area */
    streamArea: document.getElementById("streamArea"),
    /** Video placeholder element */
    videoPlaceholder: document.getElementById("videoPlaceholder"),
    /** Main video element */
    videoElement: document.getElementById("screen"),
    /** Broadway decoder canvas */
    broadwayCanvas: document.getElementById("broadwayCanvas"),
    /** WebCodec decoder canvas */
    webcodecCanvas: document.getElementById("webcodecCanvas"),
    /** Video border element */
    videoBorder: document.getElementById("videoBorder"),
    /** Log area container */
    logArea: document.getElementById("logArea"),
    /** Log content element */
    logContent: document.getElementById("logContent"),
    /** Toggle log button */
    toggleLogBtn: document.getElementById("toggleLogBtn"),
    /** App drawer container */
    appDrawer: document.getElementById("appDrawer"),
    /** App drawer content */
    appDrawerContent: document.querySelector(".app-drawer-content"),
    /** App drawer button */
    appDrawerButton: document.querySelector(".app-drawer-button"),
    /** App grid container */
    appGridContainer: document.getElementById("appGridContainer"),
    /** Drawer pagination container */
    paginationContainer: document.querySelector(".drawer-pagination"),
    /** Add wireless device button */
    addWirelessDeviceBtn: document.getElementById("addWirelessDeviceBtn"),
    /** Wireless device IP address input */
    ipAddressInput: document.getElementById("ipAddressInput"),
    connectByIpBtn: document.getElementById("connectByIpBtn"),
    ipConnectStatus: document.getElementById("ipConnectStatus"),
    displayModeCheckboxes: document.querySelectorAll('input[name="displayMode"]'),
    rotateAdbButton: document.getElementById("rotateButton"),
    screenOffButton: document.getElementById("screenOffButton"),
    notificationPanelButton: document.getElementById("notificationPanelButton"),
    settingsPanelButton: document.getElementById("settingsPanelButton"),
    noPowerOnLabel: document.getElementById("noPowerOnLabel"),
    turnScreenOffLabel: document.getElementById("turnScreenOffLabel"),
    powerOffOnCloseLabel: document.getElementById("powerOffOnCloseLabel"),
    enableAudioLabel: document.querySelector("label[for=enableAudio]"),
    enableControlLabel: document.querySelector("label[for=enableControl]"),
    taskbar: document.querySelector(".custom-taskbar"),
    backButton: document.querySelector(".custom-taskbar .back-button"),
    homeButton: document.querySelector(".custom-taskbar .home-button"),
    recentsButton: document.querySelector(".custom-taskbar .recents-button"),
    speakerButton: document.getElementById("speakerButton"),
    quickSettingsTrigger: document.getElementById("quickSettingsTrigger"),
    batteryLevelSpan: document.getElementById("batteryLevel"),
    clockSpan: document.querySelector(".quick-settings-trigger .clock"),
    pinToggleButton: document.getElementById("pinToggleButton"),
    audioPanel: document.getElementById("audioPanel"),
    quickSettingsPanel: document.getElementById("quickSettingsPanel"),
    mediaVolumeSlider: document.getElementById("mediaVolume"),
    wifiToggleBtn: document.getElementById("wifiToggleBtn"),
    wifiIndicator: document.querySelector(".quick-settings-trigger .wifi-indicator"),
    batteryFill: document.querySelector(".battery-fill"),
    batteryIcon: document.querySelector(".battery-icon"),
    decoderTypeSelect: document.getElementById("decoderType"),
    // Diagnostics controls
    startDiagnosticsButton: document.getElementById("startDiagnosticsBtn"),
    stopDiagnosticsButton: document.getElementById("stopDiagnosticsBtn"),
    diagnosticsStatus: document.getElementById("diagnosticsStatus"), // Keep this line unchanged
    harTraceBtn: document.getElementById("startHarTraceBtn"),
    stopHarTraceBtn: document.getElementById("stopHarTraceBtn"),
    harTraceStatus: document.getElementById("harTraceStatus"),
};
