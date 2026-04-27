import {
  SCORE_TYPES,
  SIGNAL_CATEGORIES,
  VENDOR_CATEGORIES,
  EVENT_TYPES,
  DEFAULTS
} from "../shared/constants.js";

function clampScore(value) {
  const min = DEFAULTS.SCORE_MIN;
  const max = DEFAULTS.SCORE_MAX;
  return Math.max(min, Math.min(max, value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countEventsByType(events) {
  const counts = {};
  for (const event of asArray(events)) {
    const type = event?.type || "unknown";
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

function countSignalMatches(signalMatches) {
  const counts = {};
  for (const match of asArray(signalMatches)) {
    const key = match?.signal || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function countVendorCategories(vendorMatches) {
  const counts = {};
  for (const match of asArray(vendorMatches)) {
    const key = match?.category || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function uniqueThirdPartyDomains(events) {
  const domains = new Set();
  for (const event of asArray(events)) {
    if (event?.payload?.thirdPartyDomain) {
      domains.add(String(event.payload.thirdPartyDomain).toLowerCase());
    }
    if (event?.third_party === true && event?.domain) {
      domains.add(String(event.domain).toLowerCase());
    }
  }
  return domains.size;
}

function collectScoreContributors(items, max = 3) {
  return Object.entries(items)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([key, value]) => ({ key, value }));
}

export function calculateTrackingIntensityScore({
  events = [],
  vendorMatches = [],
  signalMatches = []
}) {
  const eventCounts = countEventsByType(events);
  const vendorCounts = countVendorCategories(vendorMatches);
  const signalCounts = countSignalMatches(signalMatches);
  const thirdPartyCount = uniqueThirdPartyDomains(events);

  let score = 0;

  score += (eventCounts[EVENT_TYPES.COOKIE_SET] || 0) * 2;
  score += (eventCounts[EVENT_TYPES.COOKIE_CHANGED] || 0) * 2;
  score += (eventCounts[EVENT_TYPES.STORAGE_WRITE] || 0) * 2;
  score += thirdPartyCount * 4;
  score += (vendorCounts[VENDOR_CATEGORIES.ANALYTICS] || 0) * 3;
  score += (vendorCounts[VENDOR_CATEGORIES.ADVERTISING] || 0) * 5;
  score += (vendorCounts[VENDOR_CATEGORIES.RETARGETING] || 0) * 5;
  score += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_FINGERPRINTING] || 0) * 8;
  score += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_SESSION_REPLAY] || 0) * 8;

  const clamped = clampScore(score);

  return {
    scoreType: SCORE_TYPES.TRACKING_INTENSITY,
    value: clamped,
    explanation: "Tracking intensity is based on storage activity, third-party spread, analytics/advertising signals, and higher-risk tracking behaviors.",
    contributors: {
      eventTypes: collectScoreContributors(eventCounts),
      vendorCategories: collectScoreContributors(vendorCounts),
      signals: collectScoreContributors(signalCounts),
      thirdPartyCount
    }
  };
}

export function calculatePersonalizationActivityScore({
  events = [],
  vendorMatches = [],
  signalMatches = []
}) {
  const eventCounts = countEventsByType(events);
  const vendorCounts = countVendorCategories(vendorMatches);
  const signalCounts = countSignalMatches(signalMatches);

  let score = 0;

  score += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_RECOMMENDATION_ACTIVITY] || 0) * 8;
  score += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_EXPERIMENT_ASSIGNMENT] || 0) * 7;
  score += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_PROFILING_ACTIVITY] || 0) * 5;
  score += (vendorCounts[VENDOR_CATEGORIES.RECOMMENDATION] || 0) * 5;
  score += (vendorCounts[VENDOR_CATEGORIES.EXPERIMENTATION] || 0) * 5;
  score += (eventCounts[EVENT_TYPES.CONTENT_REFRESH] || 0) * 4;
  score += (eventCounts[EVENT_TYPES.DOM_MUTATION] || 0) * 2;

  const clamped = clampScore(score);

  return {
    scoreType: SCORE_TYPES.PERSONALIZATION_ACTIVITY,
    value: clamped,
    explanation: "Personalization activity is based on recommendation, experimentation, profiling, and dynamic content-change evidence.",
    contributors: {
      eventTypes: collectScoreContributors(eventCounts),
      vendorCategories: collectScoreContributors(vendorCounts),
      signals: collectScoreContributors(signalCounts)
    }
  };
}

export function calculatePersistenceScore({
  events = [],
  signalMatches = []
}) {
  const eventCounts = countEventsByType(events);
  const signalCounts = countSignalMatches(signalMatches);

  let score = 0;

  score += (eventCounts[EVENT_TYPES.COOKIE_SET] || 0) * 3;
  score += (eventCounts[EVENT_TYPES.COOKIE_CHANGED] || 0) * 2;
  score += (eventCounts[EVENT_TYPES.STORAGE_WRITE] || 0) * 3;
  score += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_IDENTITY_PERSISTENCE] || 0) * 8;

  const clamped = clampScore(score);

  return {
    scoreType: SCORE_TYPES.PERSISTENCE,
    value: clamped,
    explanation: "Persistence score is based on repeated state storage and evidence of identity or session continuity.",
    contributors: {
      eventTypes: collectScoreContributors(eventCounts),
      signals: collectScoreContributors(signalCounts)
    }
  };
}

export function calculateTransparencyScore({
  vendorMatches = [],
  signalMatches = []
}) {
  const vendorCounts = countVendorCategories(vendorMatches);
  const signalCounts = countSignalMatches(signalMatches);

  let penalty = 0;

  penalty += (vendorCounts[VENDOR_CATEGORIES.ADVERTISING] || 0) * 4;
  penalty += (vendorCounts[VENDOR_CATEGORIES.RETARGETING] || 0) * 5;
  penalty += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_FINGERPRINTING] || 0) * 8;
  penalty += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_SESSION_REPLAY] || 0) * 8;
  penalty += (signalCounts[SIGNAL_CATEGORIES.PROBABLE_PROFILING_ACTIVITY] || 0) * 4;

  const score = clampScore(100 - penalty);

  return {
    scoreType: SCORE_TYPES.TRANSPARENCY,
    value: score,
    explanation: "Transparency score starts high and decreases when stronger covert tracking, profiling, replay, or ad-tech patterns are observed.",
    contributors: {
      vendorCategories: collectScoreContributors(vendorCounts),
      signals: collectScoreContributors(signalCounts)
    }
  };
}

export function calculateAllScores({
  events = [],
  vendorMatches = [],
  signalMatches = []
}) {
  const trackingIntensity = calculateTrackingIntensityScore({
    events,
    vendorMatches,
    signalMatches
  });

  const personalizationActivity = calculatePersonalizationActivityScore({
    events,
    vendorMatches,
    signalMatches
  });

  const persistence = calculatePersistenceScore({
    events,
    signalMatches
  });

  const transparency = calculateTransparencyScore({
    vendorMatches,
    signalMatches
  });

  return {
    trackingIntensity,
    personalizationActivity,
    persistence,
    transparency
  };
}