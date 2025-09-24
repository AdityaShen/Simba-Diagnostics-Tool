/**
 * @file constants.js
 * @description Centralized global constants for streaming, decoding, protocol, and UI events in Simba client.
 * @author Aditya Shenoy
 * @copyright Simba (c) 2025
 * @date 2025-09-10
 *
 * All constants are documented for clarity and maintainability. Extend this file for new protocol or UI features.
 */

/**
 * Global constants for streaming, decoding, and control events.
 * These values are used throughout the client for timing, buffer management, and protocol definitions.
 */

/**
 * Interval (ms) for checking stream state.
 * Used to poll device and stream status.
 */
export const CHECK_STATE_INTERVAL_MS = 500;
/**
 * Max time (ms) to wait for seek operations.
 * Used for video playback synchronization.
 */
export const MAX_SEEK_WAIT_MS = 1000;
/**
 * Max time (ms) to recover from bad state.
 * Used for error recovery in streaming.
 */
export const MAX_TIME_TO_RECOVER = 200;
/**
 * Max buffer size (seconds) before dropping frames.
 * Prevents excessive latency in video playback.
 */
export const MAX_BUFFER = 0.2;
/**
 * Max allowed ahead time (seconds) for playback.
 * Used to keep playback in sync with real time.
 */
export const MAX_AHEAD = -0.2;
/**
 * Default video frames per second (FPS).
 * Used for video stream configuration.
 */
export const DEFAULT_FRAMES_PER_SECOND = 60;
/**
 * Default frames per video fragment.
 * Used for video packetization.
 */
export const DEFAULT_FRAMES_PER_FRAGMENT = 1;
/**
 * NALU type for IDR frames (H.264).
 * Used for keyframe detection in video streams.
 */
export const NALU_TYPE_IDR = 5;

/**
 * Packet types for binary streaming protocol.
 * Used for decoding and processing video/audio packets.
 */
export const BINARY_PACKET_TYPES = {
    LEGACY_VIDEO_H264: 0x00, // Legacy H.264 video
    LEGACY_AUDIO_AAC_ADTS: 0x01, // Legacy AAC audio
    WC_VIDEO_CONFIG_H264: 0x10, // WebCodecs H.264 config
    WC_VIDEO_KEY_FRAME_H264: 0x11, // WebCodecs H.264 key frame
    WC_VIDEO_DELTA_FRAME_H264: 0x12, // WebCodecs H.264 delta frame
    WC_AUDIO_CONFIG_AAC: 0x20, // WebCodecs AAC config
    WC_AUDIO_FRAME_AAC: 0x21, // WebCodecs AAC frame
};

/**
 * Supported decoder types for video playback.
 * Used for selecting video decoding backend.
 */
export const DECODER_TYPES = {
    WEBCODECS: "webcodecs",
    MSE: "mse",
    BROADWAY: "broadway",
};

/**
 * Codec IDs for protocol negotiation.
 * Used for identifying codecs in stream setup.
 */
export const CODEC_IDS = {
    H264: 0x68323634,
    AAC: 0x00616163,
};

/**
 * Control message types for touch and power events.
 * Used for client-to-device control protocol.
 */
export const CONTROL_MSG_TYPE_INJECT_TOUCH_EVENT = 2;
export const AMOTION_EVENT_ACTION_DOWN = 0;
export const AMOTION_EVENT_ACTION_UP = 1;
export const AMOTION_EVENT_ACTION_MOVE = 2;
export const AMOTION_EVENT_BUTTON_PRIMARY = 1;
export const AMOTION_EVENT_BUTTON_SECONDARY = 2;
export const AMOTION_EVENT_BUTTON_TERTIARY = 4;
/**
 * Pointer ID for mouse events.
 * Used for distinguishing mouse/touch input.
 */
export const POINTER_ID_MOUSE = -1n;

export const CONTROL_MSG_TYPE_SET_SCREEN_POWER_MODE_CLIENT = 10;
export const SCREEN_POWER_MODE_OFF_CLIENT = 0;

export const CONTROL_MSG_TYPE_BACK_OR_SCREEN_ON_CLIENT = 4;
export const CONTROL_MSG_TYPE_SCROLL_CLIENT = 3;

export const CONTROL_MSG_TYPE_EXPAND_NOTIFICATION_PANEL = 5;
export const CONTROL_MSG_TYPE_EXPAND_SETTINGS_PANEL = 6;

export const VOLUME_THROTTLE_MS = 150;
export const APPS_PER_PAGE = 9;
export const MAX_LOG_LINES = 509;
export const FRAME_CHECK_INTERVAL = 2;
export const HIDE_TASKBAR_TIMEOUT_MS = 2000;
export const DOUBLE_CLICK_THRESHOLD_MS = 200;
export const HIDE_HEADER_TIMEOUT_MS = 2500;
