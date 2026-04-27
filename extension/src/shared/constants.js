export const EVENT_TYPES = Object.freeze({
  PAGE_VISIT: "page_visit",
  TAB_ACTIVATED: "tab_activated",
  TAB_CLOSED: "tab_closed",
  SCRIPT_LOADED: "script_loaded",
  COOKIE_SET: "cookie_set",
  COOKIE_CHANGED: "cookie_changed",
  COOKIE_DELETED: "cookie_deleted",
  STORAGE_WRITE: "storage_write",
  STORAGE_DELETE: "storage_delete",
  INDEXEDDB_DETECTED: "indexeddb_detected",
  REQUEST_SENT: "request_sent",
  RESPONSE_RECEIVED: "response_received",
  TRACKER_DETECTED: "tracker_detected",
  FINGERPRINTING_SIGNAL: "fingerprinting_signal",
  SESSION_REPLAY_SIGNAL: "session_replay_signal",
  EXPERIMENT_SIGNAL: "experiment_signal",
  RECOMMENDATION_SIGNAL: "recommendation_signal",
  PROFILE_SIGNAL: "profile_signal",
  USER_ACTION: "user_action",
  DOM_MUTATION: "dom_mutation",
  CONTENT_REFRESH: "content_refresh",
  COMPARISON_RUN: "comparison_run",
  COMPARISON_DIFF: "comparison_diff",
  FINDING_EMITTED: "finding_emitted"
});

export const EVENT_SOURCES = Object.freeze({
  BACKGROUND: "background",
  CONTENT_SCRIPT: "content_script"
});

export const USER_ACTION_TYPES = Object.freeze({
  CLICK: "click",
  INPUT: "input",
  NAVIGATION: "navigation",
  SUBMIT: "submit",
  SCROLL: "scroll",
  CHANGE: "change",
  UNKNOWN: "unknown"
});

export const SIGNAL_CATEGORIES = Object.freeze({
  PROBABLE_FINGERPRINTING: "probable_fingerprinting",
  PROBABLE_RECOMMENDATION_ACTIVITY: "probable_recommendation_activity",
  PROBABLE_EXPERIMENT_ASSIGNMENT: "probable_experiment_assignment",
  PROBABLE_PROFILING_ACTIVITY: "probable_profiling_activity",
  PROBABLE_SESSION_REPLAY: "probable_session_replay",
  PROBABLE_HEATMAP_CAPTURE: "probable_heatmap_capture",
  PROBABLE_RETARGETING: "probable_retargeting",
  PROBABLE_IDENTITY_PERSISTENCE: "probable_identity_persistence"
});

export const CONFIDENCE_LEVELS = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
});

export const SEVERITY_LEVELS = Object.freeze({
  INFO: "info",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
});

export const COMPARISON_MODES = Object.freeze({
  FRESH_STATE_ESTIMATE: "fresh_state_estimate",
  REDUCED_PROFILE_COMPARISON: "reduced_profile_comparison",
  CONTROLLED_CLEAN_STATE_COMPARISON: "controlled_clean_state_comparison"
});

export const VENDOR_CATEGORIES = Object.freeze({
  ANALYTICS: "analytics",
  ADVERTISING: "advertising",
  RETARGETING: "retargeting",
  EXPERIMENTATION: "experimentation",
  RECOMMENDATION: "recommendation",
  SESSION_REPLAY: "session_replay",
  HEATMAP: "heatmap",
  FINGERPRINTING: "fingerprinting",
  CONSENT_MANAGEMENT: "consent_management",
  IDENTITY_MANAGEMENT: "identity_management",
  CDN_INFRASTRUCTURE: "cdn_infrastructure",
  PAYMENT: "payment",
  SOCIAL_EMBED: "social_embed",
  VIDEO_MEDIA: "video_media",
  UNKNOWN: "unknown"
});

export const SCORE_TYPES = Object.freeze({
  TRACKING_INTENSITY: "tracking_intensity",
  PERSONALIZATION_ACTIVITY: "personalization_activity",
  PERSISTENCE: "persistence",
  TRANSPARENCY: "transparency"
});

export const RESOURCE_TYPES = Object.freeze({
  MAIN_FRAME: "main_frame",
  SUB_FRAME: "sub_frame",
  SCRIPT: "script",
  IMAGE: "image",
  STYLESHEET: "stylesheet",
  XHR: "xmlhttprequest",
  FETCH: "fetch",
  WEBSOCKET: "websocket",
  PING: "ping",
  MEDIA: "media",
  FONT: "font",
  OTHER: "other",
  UNKNOWN: "unknown"
});

export const DEFAULTS = Object.freeze({
  SCORE_MIN: 0,
  SCORE_MAX: 100,
  UNKNOWN_DOMAIN: "unknown",
  UNKNOWN_URL: "about:blank"
});