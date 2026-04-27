import {
  COMPARISON_MODES,
  CONFIDENCE_LEVELS,
  SIGNAL_CATEGORIES,
  EVENT_TYPES
} from "../shared/constants.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countBySignal(signalMatches) {
  const counts = {};
  for (const match of asArray(signalMatches)) {
    const key = match?.signal || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function countByEventType(events) {
  const counts = {};
  for (const event of asArray(events)) {
    const key = event?.type || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function pickConfidence(score) {
  if (score >= 70) return CONFIDENCE_LEVELS.HIGH;
  if (score >= 35) return CONFIDENCE_LEVELS.MEDIUM;
  return CONFIDENCE_LEVELS.LOW;
}

function buildReasonList({ signalCounts, eventCounts, hasPersistentStorage }) {
  const reasons = [];

  if ((signalCounts[SIGNAL_CATEGORIES.PROBABLE_EXPERIMENT_ASSIGNMENT] || 0) > 0) {
    reasons.push("experiment assignment signals were observed");
  }

  if ((signalCounts[SIGNAL_CATEGORIES.PROBABLE_RECOMMENDATION_ACTIVITY] || 0) > 0) {
    reasons.push("recommendation or personalization signals were observed");
  }

  if ((signalCounts[SIGNAL_CATEGORIES.PROBABLE_PROFILING_ACTIVITY] || 0) > 0) {
    reasons.push("profiling-related storage or state signals were observed");
  }

  if ((eventCounts[EVENT_TYPES.CONTENT_REFRESH] || 0) > 0) {
    reasons.push("content refresh activity was observed");
  }

  if ((eventCounts[EVENT_TYPES.DOM_MUTATION] || 0) > 2) {
    reasons.push("multiple DOM mutations suggest adaptive content changes");
  }

  if (hasPersistentStorage) {
    reasons.push("persistent local state indicators were observed");
  }

  return reasons;
}

export function estimateFreshStateDifference({
  events = [],
  signalMatches = [],
  scores = null
}) {
  const signalCounts = countBySignal(signalMatches);
  const eventCounts = countByEventType(events);

  const hasPersistentStorage =
    (eventCounts[EVENT_TYPES.COOKIE_SET] || 0) > 0 ||
    (eventCounts[EVENT_TYPES.COOKIE_CHANGED] || 0) > 0 ||
    (eventCounts[EVENT_TYPES.STORAGE_WRITE] || 0) > 0;

  let estimateScore = 0;

  estimateScore += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_EXPERIMENT_ASSIGNMENT] || 0) * 20;
  estimateScore += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_RECOMMENDATION_ACTIVITY] || 0) * 20;
  estimateScore += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_PROFILING_ACTIVITY] || 0) * 15;
  estimateScore += (eventCounts[EVENT_TYPES.CONTENT_REFRESH] || 0) * 10;
  estimateScore += (eventCounts[EVENT_TYPES.DOM_MUTATION] || 0) * 3;

  if (hasPersistentStorage) {
    estimateScore += 15;
  }

  if (scores?.persistence?.value) {
    estimateScore += Math.round(scores.persistence.value * 0.2);
  }

  if (estimateScore > 100) {
    estimateScore = 100;
  }

  const confidence = pickConfidence(estimateScore);
  const reasons = buildReasonList({
    signalCounts,
    eventCounts,
    hasPersistentStorage
  });

  let explanation = "Current evidence does not strongly suggest a materially personalized persistent-state experience.";
  if (estimateScore >= 70) {
    explanation = "Observed evidence strongly suggests this site may present a meaningfully different experience to a fresh or reduced-profile visitor.";
  } else if (estimateScore >= 35) {
    explanation = "Observed evidence suggests this site may differ for a fresh or reduced-profile visitor, but the comparison remains bounded and partial.";
  }

  return {
    comparisonMode: COMPARISON_MODES.FRESH_STATE_ESTIMATE,
    estimateScore,
    confidence,
    explanation,
    reasons,
    limits: [
      "This is a rules-based estimate, not a perfect clean-account replay.",
      "Hidden server-side logic cannot be directly observed from the extension alone."
    ]
  };
}

export function createReducedProfileComparisonStub({ domain }) {
  return {
    comparisonMode: COMPARISON_MODES.REDUCED_PROFILE_COMPARISON,
    domain,
    available: false,
    explanation: "Reduced-profile comparison is not yet implemented in the current build.",
    limits: [
      "No controlled clean-state browser context has been executed yet."
    ]
  };
}