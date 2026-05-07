import { registerTabCapture } from "./capture_tabs.js";
import { registerCookieCapture } from "./capture_cookies.js";
import { registerRequestCapture, flushRequestCaptureBuffer } from "./capture_requests.js";
import { applyEventToStoredDomainState, clearDomainState, appendDomainRunLog, closeDeepInspectRun } from "../storage/domain_state.js";

const SHADOWPROFILE_RUNTIME_MODE = "PASSIVE_DEFAULT";
const BASELINE_KEY = "shadowprofile_browser_baseline_v1";

async function storageGet(keys) {
  return await chrome.storage.local.get(keys);
}

async function storageSet(obj) {
  await chrome.storage.local.set(obj);
}

function callbackApi(fn) {
  return new Promise((resolve) => {
    try {
      fn((result) => resolve(result || []));
    } catch {
      resolve([]);
    }
  });
}

async function safeGetCookies() {
  if (!chrome.cookies || !chrome.cookies.getAll) return [];
  return await callbackApi((done) => chrome.cookies.getAll({}, done));
}

async function safeGetHistory() {
  if (!chrome.history || !chrome.history.search) return [];
  return await callbackApi((done) => chrome.history.search({
    text: "",
    maxResults: 250,
    startTime: Date.now() - (1000 * 60 * 60 * 24 * 30)
  }, done));
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

function increment(map, key, by = 1) {
  const safe = key || "unknown";
  map[safe] = Number(map[safe] || 0) + by;
}

function inferCategoryFromHost(host) {
  const h = String(host || "").toLowerCase();

  if (h.includes("amazon") || h.includes("ebay") || h.includes("walmart") || h.includes("target") || h.includes("etsy")) return "shopping";
  if (h.includes("youtube") || h.includes("netflix") || h.includes("hulu") || h.includes("twitch") || h.includes("spotify")) return "entertainment";
  if (h.includes("github") || h.includes("gitlab") || h.includes("stackoverflow") || h.includes("npmjs") || h.includes("developer")) return "developer";
  if (h.includes("google") || h.includes("bing") || h.includes("duckduckgo") || h.includes("search")) return "search";
  if (h.includes("reddit") || h.includes("facebook") || h.includes("instagram") || h.includes("x.com") || h.includes("twitter") || h.includes("tiktok")) return "social";
  if (h.includes("news") || h.includes("cnn") || h.includes("bbc") || h.includes("nytimes") || h.includes("washingtonpost")) return "news";
  if (h.includes("bank") || h.includes("paypal") || h.includes("stripe") || h.includes("cashapp") || h.includes("venmo")) return "finance";

  return "general";
}

function topMap(map, limit = 10) {
  return Object.entries(map || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, limit)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

function buildInterestList(categories) {
  return Object.entries(categories || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 6)
    .map(([key]) => key);
}

async function collectBrowserBaselineProfile(reason = "scheduled") {
  const now = Date.now();
  const cookies = await safeGetCookies();
  const historyItems = await safeGetHistory();
  const allStorage = await storageGet(null);

  const cookieDomains = {};
  const historyDomains = {};
  const categories = {};

  for (const cookie of cookies) {
    const domain = String(cookie.domain || "unknown").replace(/^\./, "").toLowerCase();
    increment(cookieDomains, domain);
    increment(categories, inferCategoryFromHost(domain));
  }

  for (const item of historyItems) {
    const host = hostFromUrl(item.url || "");
    increment(historyDomains, host, Number(item.visitCount || 1));
    increment(categories, inferCategoryFromHost(host), Number(item.visitCount || 1));
  }

  const domainStateKeys = Object.keys(allStorage || {})
    .filter((key) => key.startsWith("shadowprofile_domain_state:"));

  const knownDomainStates = domainStateKeys.length;

  const inferredInterests = buildInterestList(categories);

  const baseline = {
    artifact_type: "shadowprofile.browser_baseline.v1",
    generated_at: now,
    reason,
    scope: "browser_local_profile",
    privacy_model: {
      local_only: true,
      remote_servers: false,
      analytics_sdk: false,
      cloud_processing: false
    },
    counts: {
      cookies: cookies.length,
      history_items_sampled_30d: historyItems.length,
      cookie_domains: Object.keys(cookieDomains).length,
      history_domains: Object.keys(historyDomains).length,
      known_shadowprofile_domain_states: knownDomainStates
    },
    inferred_profile: {
      interests: inferredInterests,
      confidence: inferredInterests.length >= 4 ? "high" : inferredInterests.length >= 2 ? "medium" : "low",
      explanation: "Browser baseline inferred locally from visible cookies, recent history metadata, and ShadowProfile-observed domain state."
    },
    top_cookie_domains: topMap(cookieDomains, 10),
    top_history_domains: topMap(historyDomains, 10),
    top_categories: topMap(categories, 10)
  };

  await storageSet({ [BASELINE_KEY]: baseline });

  return baseline;
}

async function setRuntimeMode(mode = SHADOWPROFILE_RUNTIME_MODE, deepInspectDomain = null) {
  const expiresAt = mode === "DEEP_INSPECT"
    ? Date.now() + (1000 * 60 * 10)
    : null;

  await storageSet({
    shadowprofile_runtime_mode: mode,
    shadowprofile_deep_inspect_domain: deepInspectDomain,
    shadowprofile_deep_inspect_started_at: mode === "DEEP_INSPECT" ? Date.now() : null,
    shadowprofile_deep_inspect_expires_at: expiresAt
  });
}

function buildLightweightMessageEvent(tabUrl, domain, tabId, payload) {
  return {
    id: "evt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    ts: Date.now(),
    type: "user_action",
    url: tabUrl,
    domain,
    tabId: tabId ?? null,
    payload: payload || {}
  };
}

function registerMessageCapture() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    Promise.resolve().then(async () => {
      const tabUrl = sender?.tab?.url || "about:blank";
      const payloadDomain = message?.payload?.domain || null;
      const domain = payloadDomain || getHostname(tabUrl);
      const tabId = sender?.tab?.id ?? null;

      if (message?.type === "USER_ACTION") {
        const event = buildLightweightMessageEvent(tabUrl, domain, tabId, {
          capture_origin: "content_script",
          ...(message.payload || {})
        });

        await applyEventToStoredDomainState(domain, event);
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "CART_SIGNAL") {
        const event = buildLightweightMessageEvent(tabUrl + "#cart-signal", domain, tabId, {
          capture_origin: "content_script",
          kind: "cart_signal",
          ...(message.payload || {})
        });

        await applyEventToStoredDomainState(domain, event);
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "CONTROL_FLUSH_REQUESTS") {
        await flushRequestCaptureBuffer();
        sendResponse({ ok: true, flushed: true });
        return;
      }

      if (message?.type === "CONTROL_REFRESH_BROWSER_BASELINE") {
        const baseline = await collectBrowserBaselineProfile("manual_refresh");
        sendResponse({ ok: true, baseline });
        return;
      }

      if (message?.type === "CONTROL_RESET_DOMAIN") {
        const targetDomain = message?.payload?.domain || domain;
        await flushRequestCaptureBuffer();
        await clearDomainState(targetDomain);
        await setRuntimeMode("PASSIVE_DEFAULT", null);
        sendResponse({ ok: true, domain: targetDomain, mode: "PASSIVE_DEFAULT" });
        return;
      }

      if (message?.type === "CONTROL_SET_MODE") {
        const mode = message?.payload?.mode || SHADOWPROFILE_RUNTIME_MODE;
        const targetDomain = message?.payload?.domain || domain;
        const deepInspectDomain = mode === "DEEP_INSPECT" ? targetDomain : null;

        if (mode === "DEEP_INSPECT") {
          await setRuntimeMode(mode, deepInspectDomain);
          await appendDomainRunLog(targetDomain, "Deep Inspect started");
        } else {
          await flushRequestCaptureBuffer();
          await new Promise((resolve) => setTimeout(resolve, 100));
          await closeDeepInspectRun(targetDomain);
          await setRuntimeMode(mode, null);
        }

        sendResponse({ ok: true, mode, deepInspectDomain });
        return;
      }

      sendResponse({ ok: false, reason: "UNKNOWN_MESSAGE" });
    }).catch((err) => {
      console.error("MESSAGE_CAPTURE_FAIL", err);
      sendResponse({ ok: false, error: String(err) });
    });

    return true;
  });
}

async function boot() {
  registerTabCapture();
  registerCookieCapture();
  registerRequestCapture();
  registerMessageCapture();

  await setRuntimeMode();
  await collectBrowserBaselineProfile("boot");

  console.log("SHADOWPROFILE_BOOT_OK", {
    mode: SHADOWPROFILE_RUNTIME_MODE,
    request_capture_enabled: true,
    browser_baseline_enabled: true
  });
}

chrome.runtime.onInstalled.addListener(() => {
  Promise.resolve()
    .then(() => setRuntimeMode())
    .then(() => collectBrowserBaselineProfile("installed"))
    .catch((err) => {
      console.error("SET_RUNTIME_MODE_FAIL_ON_INSTALL", err);
    });
});

chrome.runtime.onStartup.addListener(() => {
  Promise.resolve()
    .then(() => setRuntimeMode())
    .then(() => collectBrowserBaselineProfile("startup"))
    .catch((err) => {
      console.error("SET_RUNTIME_MODE_FAIL_ON_STARTUP", err);
    });
});

boot().catch((err) => {
  console.error("SHADOWPROFILE_BOOT_FAIL", err);
});
