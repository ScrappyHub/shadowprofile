import {
  SIGNAL_CATEGORIES,
  CONFIDENCE_LEVELS,
  EVENT_TYPES
} from "../shared/constants.js";

// -----------------------------
// Signal Rules
// -----------------------------
const SIGNAL_RULES = Object.freeze([

  // Fingerprinting signals
  {
    id: "fp_canvas",
    signal: SIGNAL_CATEGORIES.PROBABLE_FINGERPRINTING,
    confidence: CONFIDENCE_LEVELS.HIGH,
    match: (e) => e.type === EVENT_TYPES.SCRIPT_LOADED && e.url.includes("fingerprint")
  },

  {
    id: "fp_device_probe",
    signal: SIGNAL_CATEGORIES.PROBABLE_FINGERPRINTING,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    match: (e) =>
      e.type === EVENT_TYPES.SCRIPT_LOADED &&
      (e.url.includes("device") || e.url.includes("entropy"))
  },

  // Experiment signals
  {
    id: "exp_variant",
    signal: SIGNAL_CATEGORIES.PROBABLE_EXPERIMENT_ASSIGNMENT,
    confidence: CONFIDENCE_LEVELS.HIGH,
    match: (e) =>
      e.url.includes("variant") ||
      e.url.includes("experiment") ||
      e.url.includes("bucket")
  },

  // Recommendation signals
  {
    id: "rec_feed",
    signal: SIGNAL_CATEGORIES.PROBABLE_RECOMMENDATION_ACTIVITY,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    match: (e) =>
      e.url.includes("recommend") ||
      e.url.includes("feed") ||
      e.url.includes("personalize")
  },

  // Profiling signals
  {
    id: "profile_storage",
    signal: SIGNAL_CATEGORIES.PROBABLE_PROFILING_ACTIVITY,
    confidence: CONFIDENCE_LEVELS.HIGH,
    match: (e) =>
      e.type === EVENT_TYPES.STORAGE_WRITE ||
      e.type === EVENT_TYPES.COOKIE_SET
  },

  // Session replay signals
  {
    id: "session_replay",
    signal: SIGNAL_CATEGORIES.PROBABLE_SESSION_REPLAY,
    confidence: CONFIDENCE_LEVELS.HIGH,
    match: (e) =>
      e.url.includes("replay") ||
      e.url.includes("session") ||
      e.url.includes("record")
  }

]);

// -----------------------------
// Classifier
// -----------------------------
export function classifySignals(event) {
  const matches = [];

  for (const rule of SIGNAL_RULES) {
    try {
      if (rule.match(event)) {
        matches.push({
          signal: rule.signal,
          confidence: rule.confidence,
          ruleId: rule.id
        });
      }
    } catch (err) {
      // deterministic safety: ignore rule errors
    }
  }

  if (matches.length === 0) {
    return {
      signals: [],
      primarySignal: null
    };
  }

  const signals = [...new Set(matches.map((m) => m.signal))];

  return {
    signals,
    matches,
    primarySignal: signals[0]
  };
}

export function getSignalRules() {
  return SIGNAL_RULES.slice();
}