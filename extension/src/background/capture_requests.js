import { EVENT_TYPES, EVENT_SOURCES } from "../shared/constants.js";
import { createEvidenceEvent } from "../analysis/event_schema.js";
import { classifyRequest } from "../analysis/request_classifier.js";
import { applyEventToStoredDomainState } from "../storage/domain_state.js";

let DEBUG_REQUEST_COUNT = 0;
const REQUEST_BUFFER = Object.create(null);
const REQUEST_DEDUPE = Object.create(null);
let FLUSH_TIMER = null;
let flushInProgress = null;

const FLUSH_INTERVAL_MS = 2000;
const MAX_BUFFER_BATCH = 25;
const MAX_DEDUPE_KEYS_PER_DOMAIN = 180;
const REQUEST_DEDUPE_TTL_MS = 15000;

function getHostname(rawUrl) {
  try { return new URL(rawUrl).hostname.toLowerCase(); }
  catch { return "unknown"; }
}

function domainMatches(target, candidate) {
  if (!target || !candidate) return false;
  const t = String(target).toLowerCase();
  const c = String(candidate).toLowerCase();
  return c === t || c.endsWith("." + t);
}

function getNormalizedRequestKey(url, classification, phase) {
  try {
    const parsed = new URL(url);
    return [
      phase,
      parsed.hostname.toLowerCase(),
      classification?.category || "generic",
      parsed.pathname.toLowerCase()
    ].join("|");
  } catch {
    return phase + "|unknown|" + String(url || "");
  }
}

function shouldDropDuplicate(domain, key) {
  const now = Date.now();

  if (!REQUEST_DEDUPE[domain]) {
    REQUEST_DEDUPE[domain] = [];
  }

  REQUEST_DEDUPE[domain] = REQUEST_DEDUPE[domain].filter((entry) => {
    return now - entry.ts < REQUEST_DEDUPE_TTL_MS;
  });

  if (REQUEST_DEDUPE[domain].some((entry) => entry.key === key)) {
    return true;
  }

  REQUEST_DEDUPE[domain].push({ key, ts: now });

  if (REQUEST_DEDUPE[domain].length > MAX_DEDUPE_KEYS_PER_DOMAIN) {
    REQUEST_DEDUPE[domain] = REQUEST_DEDUPE[domain].slice(-MAX_DEDUPE_KEYS_PER_DOMAIN);
  }

  return false;
}

function enqueueRequestEvent(domain, event) {
  if (!REQUEST_BUFFER[domain]) REQUEST_BUFFER[domain] = [];
  REQUEST_BUFFER[domain].push(event);

  if (REQUEST_BUFFER[domain].length >= MAX_BUFFER_BATCH) {
    flushBufferedRequests().catch((err) => console.warn("REQUEST_FLUSH_FAIL", err));
    return;
  }

  if (!FLUSH_TIMER) {
    FLUSH_TIMER = setTimeout(() => {
      flushBufferedRequests().catch((err) => console.warn("REQUEST_FLUSH_FAIL", err));
    }, FLUSH_INTERVAL_MS);
  }
}

async function flushBufferedRequests() {
  if (FLUSH_TIMER) {
    clearTimeout(FLUSH_TIMER);
    FLUSH_TIMER = null;
  }

  const domains = Object.keys(REQUEST_BUFFER);

  for (const domain of domains) {
    const events = REQUEST_BUFFER[domain] || [];
    delete REQUEST_BUFFER[domain];

    for (const event of events) {
      await applyEventToStoredDomainState(domain, event);
    }
  }
}

async function getDeepInspectState() {
  const result = await chrome.storage.local.get([
    "shadowprofile_runtime_mode",
    "shadowprofile_deep_inspect_domain",
    "shadowprofile_deep_inspect_expires_at"
  ]);

  const now = Date.now();
  const mode = result.shadowprofile_runtime_mode || "PASSIVE_DEFAULT";
  const expiresAt = result.shadowprofile_deep_inspect_expires_at || null;

  if (mode === "DEEP_INSPECT" && expiresAt && now > expiresAt) {
    await chrome.storage.local.set({
      shadowprofile_runtime_mode: "PASSIVE_DEFAULT",
      shadowprofile_deep_inspect_domain: null,
      shadowprofile_deep_inspect_expires_at: null
    });

    return {
      mode: "PASSIVE_DEFAULT",
      deepInspectDomain: null
    };
  }

  return {
    mode,
    deepInspectDomain: result.shadowprofile_deep_inspect_domain || null
  };
}

async function shouldCaptureRequestForDomain(domain) {
  const state = await getDeepInspectState();

  if (state.mode !== "DEEP_INSPECT") {
    return { allow: false, reason: "MODE_NOT_DEEP", deepInspectDomain: null };
  }

  if (!state.deepInspectDomain) {
    return { allow: false, reason: "NO_DEEP_DOMAIN", deepInspectDomain: null };
  }

  const allow = domainMatches(state.deepInspectDomain, domain);
  return {
    allow,
    reason: allow ? "DOMAIN_MATCH" : "DOMAIN_MISMATCH",
    deepInspectDomain: state.deepInspectDomain
  };
}

function buildRequestEvent(type, details, classification) {
  const url = details.url || "about:blank";
  const domain = getHostname(url);

  return createEvidenceEvent({
    type,
    source: EVENT_SOURCES.BACKGROUND,
    url,
    domain,
    tabId: details.tabId,
    frameId: details.frameId,
    payload: {
      force_capture: true,
      method: details.method || "GET",
      requestId: details.requestId || null,
      initiator: details.initiator || null,
      statusCode: details.statusCode || null,
      fromCache: details.fromCache || false,
      capture_mode: "deep_inspect",
      request_classification: classification
    }
  });
}

async function handleRequestPhase(details, phase, type) {
  const url = details.url || "about:blank";
  const domain = getHostname(url);
  const decision = await shouldCaptureRequestForDomain(domain);

  if (!decision.allow) return;

  const classification = classifyRequest(url, decision.deepInspectDomain);
  if (!classification.isImportant) return;

  const key = getNormalizedRequestKey(url, classification, phase);
  if (shouldDropDuplicate(decision.deepInspectDomain, key)) return;

  DEBUG_REQUEST_COUNT += 1;

  console.log("[SP][REQUEST_CAPTURE][ALLOW][" + phase.toUpperCase() + "]", {
    count: DEBUG_REQUEST_COUNT,
    domain,
    deepInspectDomain: decision.deepInspectDomain,
    category: classification.category,
    trackerLikelihood: classification.trackerLikelihood
  });

  enqueueRequestEvent(
    decision.deepInspectDomain,
    buildRequestEvent(type, details, classification)
  );
}

export async function flushRequestCaptureBuffer() {
  if (flushInProgress) {
    return await flushInProgress;
  }

  flushInProgress = (async () => {
    await flushBufferedRequests();

    // MV3 async/storage barrier: allow queued state writes to settle.
    await new Promise((resolve) => setTimeout(resolve, 75));
  })();

  try {
    return await flushInProgress;
  } finally {
    flushInProgress = null;
  }
}

export function registerRequestCapture() {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      handleRequestPhase(details, "before", EVENT_TYPES.REQUEST_SENT)
        .catch((err) => console.warn("REQUEST_CAPTURE_FAIL", err));
    },
    { urls: ["<all_urls>"] }
  );

  chrome.webRequest.onCompleted.addListener(
    (details) => {
      handleRequestPhase(details, "done", EVENT_TYPES.RESPONSE_RECEIVED)
        .catch((err) => console.warn("RESPONSE_CAPTURE_FAIL", err));
    },
    { urls: ["<all_urls>"] }
  );
}