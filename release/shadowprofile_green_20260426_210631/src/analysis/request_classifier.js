function safeUrl(rawUrl) {
  try {
    return new URL(rawUrl || "about:blank");
  } catch {
    return new URL("about:blank");
  }
}

function normalizeHost(host) {
  return String(host || "").trim().toLowerCase();
}

function hostMatches(baseDomain, candidateDomain) {
  const base = normalizeHost(baseDomain);
  const candidate = normalizeHost(candidateDomain);

  if (!base || !candidate) return false;
  if (base === candidate) return true;
  return candidate.endsWith("." + base);
}

function pathIncludes(urlObj, value) {
  return urlObj.pathname.toLowerCase().includes(String(value).toLowerCase());
}

export function classifyRequest(requestUrl, baseDomain) {
  const urlObj = safeUrl(requestUrl);
  const host = normalizeHost(urlObj.hostname);
  const sameSite = hostMatches(baseDomain, host);

  let category = "generic";
  let vendor = "unknown";
  let trackerLikelihood = "low";
  let signalWeight = 0;
  const signals = [];

  if (pathIncludes(urlObj, "/cart/add-to-cart") || pathIncludes(urlObj, "/cart/ewc/compact") || pathIncludes(urlObj, "/gp/cart/view")) {
    category = "cart";
    vendor = "amazon_cart";
    trackerLikelihood = "medium";
    signalWeight = 8;
    signals.push("cart_activity");
  } else if (pathIncludes(urlObj, "/checkout/entry/cart") || pathIncludes(urlObj, "/hz/payment-options") || pathIncludes(urlObj, "/checkout/p/")) {
    category = "checkout";
    vendor = "amazon_checkout";
    trackerLikelihood = "medium";
    signalWeight = 9;
    signals.push("checkout_activity");
  } else if (pathIncludes(urlObj, "/rd/uedata")) {
    category = "telemetry";
    vendor = "amazon_telemetry";
    trackerLikelihood = "high";
    signalWeight = 9;
    signals.push("behavior_telemetry");
  } else if (pathIncludes(urlObj, "/tt/i")) {
    category = "tracking_pixel";
    vendor = "amazon_tracking_pixel";
    trackerLikelihood = "high";
    signalWeight = 10;
    signals.push("tracking_pixel");
  } else if (pathIncludes(urlObj, "/rufus/cl/render") || pathIncludes(urlObj, "/rufus/cl/history") || pathIncludes(urlObj, "/rufus/cl/streaming")) {
    category = "recommendation";
    vendor = "amazon_rufus";
    trackerLikelihood = "medium";
    signalWeight = 7;
    signals.push("recommendation_activity");
  } else if (pathIncludes(urlObj, "/nav/ajax/")) {
    category = "navigation_api";
    vendor = "amazon_navigation";
    trackerLikelihood = "low";
    signalWeight = 2;
    signals.push("navigation_activity");
  } else if (pathIncludes(urlObj, "/hz/profilepicker")) {
    category = "profile_api";
    vendor = "amazon_profile";
    trackerLikelihood = "medium";
    signalWeight = 5;
    signals.push("profile_activity");
  } else if (pathIncludes(urlObj, "/customer-preferences/api/")) {
    category = "preferences_api";
    vendor = "amazon_preferences";
    trackerLikelihood = "medium";
    signalWeight = 5;
    signals.push("preferences_activity");
  } else if (pathIncludes(urlObj, "/empty.gif")) {
    category = "beacon";
    vendor = "amazon_beacon";
    trackerLikelihood = "medium";
    signalWeight = 4;
    signals.push("beacon_activity");
  } else if (pathIncludes(urlObj, "/service-worker.js")) {
    category = "service_worker";
    vendor = "site_runtime";
    trackerLikelihood = "low";
    signalWeight = 1;
    signals.push("runtime_asset");
  }

  if (!sameSite) {
    signals.push("third_party_request");
    if (trackerLikelihood === "low") {
      trackerLikelihood = "medium";
    }
    signalWeight += 3;
  }

  if (signalWeight > 10) {
    signalWeight = 10;
  }

  const isImportant =
    category === "cart" ||
    category === "checkout" ||
    category === "telemetry" ||
    category === "tracking_pixel" ||
    category === "beacon" ||
    category === "recommendation" ||
    (!sameSite);

  return {
    host,
    sameSite,
    category,
    vendor,
    trackerLikelihood,
    signalWeight,
    signals,
    isImportant
  };
}