import {
  CONFIDENCE_LEVELS
} from "../shared/constants.js";

export function buildInferredProfile({ domain, signals, events }) {
  const now = Date.now();

  const context = {
    domain,
    signals: signals || {},
    events: events || []
  };

  const interests = inferInterests(context);
  const intent = inferIntent(context);
  const valueEstimate = inferValue(context);
  const segmentClues = inferSegments(context);

  const confidence = deriveConfidence({
    interests,
    intent,
    segmentClues,
    signals: context.signals
  });

  const reasoning = buildReasoning(context, {
    interests,
    intent,
    segmentClues
  });

  return {
    domain,
    generated_at: now,
    interests,
    intent,
    value_estimate: valueEstimate,
    segment_clues: segmentClues,
    confidence,
    reasoning,
    limits: [
      "Inference is based on browser-visible signals only.",
      "Server-side profile state is not directly observable.",
      "Value estimate is heuristic and coarse."
    ]
  };
}

function inferInterests(ctx) {
  const interests = new Set();

  if (!ctx.domain) {
    return [];
  }

  if (ctx.domain.includes("amazon") || ctx.domain.includes("ebay")) {
    interests.add("shopping");
  }

  if (ctx.domain.includes("youtube")) {
    interests.add("video_content");
  }

  if (ctx.domain.includes("cnn") || ctx.domain.includes("news")) {
    interests.add("news");
  }

  if ((ctx.signals.requests || []).some(r => String(r.url || "").includes("product"))) {
    interests.add("product_interest");
  }

  return Array.from(interests);
}

function inferIntent(ctx) {
  const intent = new Set();

  const hasCart = (ctx.signals.requests || []).some(r => {
    const url = String(r.url || "").toLowerCase();
    return url.includes("cart") || url.includes("checkout");
  });

  const hasFeed = (ctx.signals.requests || []).some(r => {
    const url = String(r.url || "").toLowerCase();
    return url.includes("feed") || url.includes("recommend");
  });

  if (hasCart) {
    intent.add("purchase_intent");
    intent.add("shopping");
  }

  if (hasFeed) {
    intent.add("content_consumption");
  }

  if ((ctx.events || []).length > 5) {
    intent.add("engaged_session");
  }

  return Array.from(intent);
}

function inferValue(ctx) {
  let score = 0;

  if (((ctx.signals.cookies || []).length) > 5) {
    score += 1;
  }

  if (((ctx.signals.storage || []).length) > 5) {
    score += 1;
  }

  if (((ctx.signals.requests || []).length) > 20) {
    score += 1;
  }

  if (score >= 3) {
    return "mid_high";
  }

  if (score === 2) {
    return "mid";
  }

  if (score === 1) {
    return "low_mid";
  }

  return "low";
}

function inferSegments(ctx) {
  const segments = new Set();

  const hasPersistence =
    ((ctx.signals.cookies || []).length > 0) ||
    ((ctx.signals.storage || []).length > 0);

  const hasRecommendation = (ctx.signals.requests || []).some(r => {
    const url = String(r.url || "").toLowerCase();
    return url.includes("recommend") || url.includes("personalize");
  });

  if (hasPersistence) {
    segments.add("returning_user");
  }

  if (hasRecommendation) {
    segments.add("recommendation_feed_user");
  }

  if ((ctx.signals.requests || []).length > 30) {
    segments.add("high_activity_session");
  }

  return Array.from(segments);
}

function deriveConfidence({ interests, intent, segmentClues, signals }) {
  let score = 0;

  if ((interests || []).length > 0) {
    score += 1;
  }

  if ((intent || []).length > 0) {
    score += 1;
  }

  if ((segmentClues || []).length > 0) {
    score += 1;
  }

  if (((signals?.requests) || []).length > 10) {
    score += 1;
  }

  if (score >= 3) {
    return CONFIDENCE_LEVELS.HIGH;
  }

  if (score === 2) {
    return CONFIDENCE_LEVELS.MEDIUM;
  }

  return CONFIDENCE_LEVELS.LOW;
}

function buildReasoning(ctx, outputs) {
  const supportingCategories = [];
  const supportingEvents = [];
  const rulesFired = [];

  if (((ctx.signals.requests || []).length) > 0) {
    supportingCategories.push("network_activity");
    supportingEvents.push("request_sent");
    rulesFired.push("rule_network_presence_v1");
  }

  if (((ctx.signals.cookies || []).length) > 0) {
    supportingCategories.push("cookie_presence");
    rulesFired.push("rule_cookie_persistence_v1");
  }

  if (((ctx.signals.storage || []).length) > 0) {
    supportingCategories.push("storage_presence");
    rulesFired.push("rule_storage_persistence_v1");
  }

  return {
    supporting_categories: supportingCategories,
    supporting_events: supportingEvents,
    rules_fired: rulesFired,
    explanation: "Profile inferred from observable network activity, storage persistence, and request patterns."
  };
}