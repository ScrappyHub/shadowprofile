function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function n(value) {
  return Number(value || 0);
}

export function buildExplanation(signals) {
  const s = safeObject(signals);
  const reasons = [];

  if (n(s.tracking_pixel) > 0) reasons.push("Tracking pixel requests were observed");
  if (n(s.telemetry) > 0) reasons.push("Behavior telemetry endpoints were observed");
  if (n(s.recommendation) > 0) reasons.push("Recommendation or feed activity was observed");
  if (n(s.cart) > 0) reasons.push("Cart-related activity was detected");
  if (n(s.checkout) > 0) reasons.push("Checkout-related activity was detected");
  if (n(s.beacon) > 0) reasons.push("Beacon-style requests were detected");

  if (reasons.length === 0) {
    return "Profile inferred from baseline site activity and cookies.";
  }

  return reasons.join(". ") + ".";
}

export function buildSegments(signals, eventCounts) {
  const s = safeObject(signals);
  const e = safeObject(eventCounts);
  const segments = [];

  if (n(e.total_events) >= 300) segments.push("high_activity_session");
  if (n(s.recommendation) >= 5) segments.push("recommendation_feed_user");
  if (n(s.cart) >= 5) segments.push("active_shopper");
  if (n(s.checkout) > 0) segments.push("purchase_intent");
  if (n(s.telemetry) >= 5) segments.push("telemetry_heavy_session");
  if (n(s.tracking_pixel) >= 3 || n(s.beacon) >= 5) segments.push("tracking_surface_visible");

  return Array.from(new Set(segments));
}

export function buildValueEstimate(signals, eventCounts) {
  const s = safeObject(signals);
  const e = safeObject(eventCounts);

  const score =
    n(s.cart) * 2 +
    n(s.checkout) * 4 +
    n(s.recommendation) * 2 +
    n(s.telemetry) +
    n(s.tracking_pixel) +
    Math.floor(n(e.total_events) / 250);

  if (score >= 35) return "high";
  if (score >= 8) return "mid";
  return "low";
}

export function buildConfidence(signals, eventCounts) {
  const s = safeObject(signals);
  const e = safeObject(eventCounts);

  const signalCount =
    n(s.cart) +
    n(s.checkout) +
    n(s.recommendation) +
    n(s.telemetry) +
    n(s.tracking_pixel) +
    n(s.beacon);

  if (signalCount >= 15 || n(e.total_events) >= 300) return "high";
  if (signalCount >= 3 || n(e.total_events) >= 40) return "medium";
  return "low";
}
