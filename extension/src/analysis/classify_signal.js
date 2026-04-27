import {
  SIGNAL_CATEGORIES,
  CONFIDENCE_LEVELS,
  EVENT_TYPES
} from "../shared/constants.js";

const SIGNAL_RULES = Object.freeze([
  {
    id: "fp_script_fingerprint",
    signal: SIGNAL_CATEGORIES.PROBABLE_FINGERPRINTING,
    confidence: CONFIDENCE_LEVELS.HIGH,
    match: (e) =>
      e?.type === EVENT_TYPES.SCRIPT_LOADED &&
      String(e?.url || "").toLowerCase().includes("fingerprint")
  },
  {
    id: "fp_script_entropy",
    signal: SIGNAL_CATEGORIES.PROBABLE_FINGERPRINTING,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    match: (e) =>
      e?.type === EVENT_TYPES.SCRIPT_LOADED &&
      (
        String(e?.url || "").toLowerCase().includes("entropy") ||
        String(e?.url || "").toLowerCase().includes("device")
      )
  },
  {
    id: "exp_keywords",
    signal: SIGNAL_CATEGORIES.PROBABLE_EXPERIMENT_ASSIGNMENT,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    match: (e) => {
      const text = String(e?.url || "").toLowerCase();
      return text.includes("experiment") || text.includes("variant") || text.includes("bucket");
    }
  },
  {
    id: "rec_keywords",
    signal: SIGNAL_CATEGORIES.PROBABLE_RECOMMENDATION_ACTIVITY,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    match: (e) => {
      const text = String(e?.url || "").toLowerCase();
      return text.includes("recommend") || text.includes("feed") || text.includes("personalize");
    }
  },
  {
    id: "profile_storage",
    signal: SIGNAL_CATEGORIES.PROBABLE_PROFILING_ACTIVITY,
    confidence: CONFIDENCE_LEVELS.HIGH,
    match: (e) =>
      e?.type === EVENT_TYPES.STORAGE_WRITE ||
      e?.type === EVENT_TYPES.COOKIE_SET ||
      e?.type === EVENT_TYPES.COOKIE_CHANGED
  },
  {
    id: "replay_keywords",
    signal: SIGNAL_CATEGORIES.PROBABLE_SESSION_REPLAY,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    match: (e) => {
      const text = String(e?.url || "").toLowerCase();
      return text.includes("replay") || text.includes("session") || text.includes("record");
    }
  }
]);

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
    } catch {
    }
  }

  if (matches.length === 0) {
    return {
      signals: [],
      matches: [],
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