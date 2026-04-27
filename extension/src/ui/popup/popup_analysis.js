import { generateIntegrityRecord } from "../../integrity/runtime_integrity.js";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function safeObject(value) {
  return value && typeof value === "object" ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildScores(state) {
  const counts = safeObject(state.counts);
  const markers = safeObject(state.markers);
  const storage = safeObject(state.storage_summary);
  const trackerCount = Object.keys(safeObject(state.tracker_domains)).length;

  let tracking = 0;
  tracking += (counts.request_events || 0) >= 25 ? 15 : Math.min(10, Math.floor((counts.request_events || 0) / 5));
  tracking += trackerCount * 4;
  tracking += (counts.cookie_events || 0) * 2;
  tracking += (counts.storage_events || 0) * 2;
  if (markers.high_request_activity) tracking += 10;
  if (markers.recommendation_activity_likely) tracking += 6;

  let personalization = 0;
  if (markers.cart_activity_likely) personalization += 8;
  if (markers.checkout_activity_likely) personalization += 8;
  if (markers.recommendation_activity_likely) personalization += 10;
  personalization += Math.min(12, Math.floor((counts.dom_mutation_events || 0) / 10));
  personalization += Math.min(12, Math.floor((counts.user_action_events || 0) / 5));

  let persistence = 0;
  persistence += (storage.cookie_count || 0) * 2;
  persistence += (storage.local_storage_count || 0) * 3;
  persistence += (storage.session_storage_count || 0) * 2;
  persistence += (storage.indexeddb_count || 0) * 4;
  if (markers.persistence_activity_likely) persistence += 10;

  const transparency = clamp(100 - Math.floor((tracking + personalization + persistence) / 2));

  return {
    tracking_intensity: clamp(tracking),
    personalization_activity: clamp(personalization),
    persistence: clamp(persistence),
    transparency
  };
}

function buildInferredProfile(domain, state) {
  const counts = safeObject(state.counts);
  const markers = safeObject(state.markers);
  const trackerCount = Object.keys(safeObject(state.tracker_domains)).length;

  const interests = [];
  const intent = [];
  const segments = [];

  if (domain.includes("amazon") || domain.includes("ebay")) {
    interests.push("shopping");
  }

  if (domain.includes("youtube")) {
    interests.push("video_content");
  }

  if (domain.includes("cnn") || domain.includes("news")) {
    interests.push("news");
  }

  if (markers.cart_activity_likely) {
    intent.push("shopping");
  }

  if (markers.checkout_activity_likely) {
    intent.push("purchase_intent");
    if (!intent.includes("shopping")) {
      intent.push("shopping");
    }
  }

  if ((counts.user_action_events || 0) >= 5 || (counts.request_events || 0) >= 20) {
    intent.push("engaged_session");
  }

  if ((counts.request_events || 0) >= 30) {
    segments.push("high_activity_session");
  }

  if (markers.recommendation_activity_likely) {
    segments.push("recommendation_feed_user");
  }

  if (markers.persistence_activity_likely) {
    segments.push("returning_user");
  }

  let valueEstimate = "low";
  if ((counts.request_events || 0) >= 15 || trackerCount >= 3) {
    valueEstimate = "low_mid";
  }
  if ((counts.request_events || 0) >= 40 || trackerCount >= 5) {
    valueEstimate = "mid";
  }

  let confidence = "low";
  let confidenceScore = 0;
  if (interests.length > 0) confidenceScore += 1;
  if (intent.length > 0) confidenceScore += 1;
  if (segments.length > 0) confidenceScore += 1;
  if ((counts.request_events || 0) >= 20) confidenceScore += 1;

  if (confidenceScore >= 3) confidence = "high";
  else if (confidenceScore === 2) confidence = "medium";

  const explanationParts = [];
  if ((counts.request_events || 0) > 0) {
    explanationParts.push("observable network activity");
  }
  if (markers.cart_activity_likely || markers.checkout_activity_likely) {
    explanationParts.push("cart or checkout-related signals");
  }
  if (markers.recommendation_activity_likely) {
    explanationParts.push("recommendation-related behavior");
  }
  if (markers.persistence_activity_likely) {
    explanationParts.push("persistence-related state changes");
  }

  let explanation = "Profile inferred from observed site activity.";
  if (explanationParts.length > 0) {
    explanation = "Profile inferred from " + explanationParts.join(", ") + ".";
  }

  return {
    interests,
    intent,
    segment_clues: segments,
    value_estimate: valueEstimate,
    confidence,
    reasoning: {
      explanation
    }
  };
}

function buildEvidence(domain, state, integrity) {
  const counts = safeObject(state.counts);
  const storage = safeObject(state.storage_summary);
  const trackerDomains = safeObject(state.tracker_domains);
  const now = Date.now();

  return {
    generated_at: now,
    domain,
    session_started_at: state.first_seen_at || null,
    session_ended_at: null,
    session_duration_ms:
      typeof state.first_seen_at === "number"
        ? Math.max(0, now - state.first_seen_at)
        : null,
    analysis_generated_at: now,
    integrity_checked_at: integrity?.generated_at || null,
    event_counts: {
      total_events: counts.total_events || 0,
      request_events: (counts.request_events || 0) + (counts.response_events || 0),
      cookie_events: counts.cookie_events || 0,
      storage_events: counts.storage_events || 0,
      dom_mutation_events: counts.dom_mutation_events || 0,
      user_action_events: counts.user_action_events || 0
    },
    storage_summary: {
      cookie_count: storage.cookie_count || 0,
      local_storage_count: storage.local_storage_count || 0,
      session_storage_count: storage.session_storage_count || 0,
      indexeddb_count: storage.indexeddb_count || 0
    },
    tracker_summary: {
      tracker_domain_count: Object.keys(trackerDomains).length,
      top_tracker_domains: Object.entries(trackerDomains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([trackerDomain, count]) => ({ domain: trackerDomain, count }))
    }
  };
}

export function buildPopupViewModel(domain, state) {
  const integrity = generateIntegrityRecord();
  const scores = buildScores(state);
  const inferredProfile = buildInferredProfile(domain, state);
  const evidence = buildEvidence(domain, state, integrity);

  return {
    domain,
    scores,
    inferredProfile,
    integrity,
    evidence,
    totalVisits: state.session_count || 0,
    totalEvents: safeObject(state.counts).total_events || 0,
    trackerDomains: safeObject(state.tracker_domains),
    storageUsage: {
      cookie: safeObject(state.storage_summary).cookie_count || 0,
      local_storage: safeObject(state.storage_summary).local_storage_count || 0,
      session_storage: safeObject(state.storage_summary).session_storage_count || 0,
      indexeddb: safeObject(state.storage_summary).indexeddb_count || 0
    }
  };
}