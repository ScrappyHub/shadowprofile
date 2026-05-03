const DOMAIN_STATE_KEY = "shadowprofile_domain_state";
const MAX_RECENT_EVENTS = 15;
const MAX_TOP_TRACKERS = 8;
const FLUSH_DEBOUNCE_MS = 1000;
const MAX_TOTAL_EVENTS_PER_DOMAIN = 500;
const REQUEST_SAMPLE_RATE = 12;

const ROTATE_AFTER_MS = 1000 * 60 * 30;
const INACTIVITY_RESET_MS = 1000 * 60 * 10;

const memoryState = Object.create(null);
let flushTimer = null;

function safeObject(value) {
  return value && typeof value === "object" ? value : {};
}

function nowTs() {
  return Date.now();
}

function getEventType(event) {
  return String(event?.type || "unknown").toLowerCase();
}

function getEventUrl(event) {
  return String(event?.url || "");
}

function getEventDomain(event) {
  return String(event?.domain || "unknown").toLowerCase() || "unknown";
}

function getStorageArea(event) {
  return String(event?.payload?.storageArea || "").toLowerCase();
}

function getCookieKey(event) {
  const payload = safeObject(event?.payload);
  const cookieName = String(payload.cookieName || "");
  const cookieDomain = String(payload.cookieDomain || event?.domain || "");
  const path = String(payload.path || "/");
  return (cookieDomain + "|" + cookieName + "|" + path).toLowerCase();
}

function isTrackerDomain(domain, currentDomain) {
  return domain && domain !== "unknown" && domain !== currentDomain;
}

function shouldSampleRequest(state) {
  const nextCount = (state.request_total_seen || 0) + 1;
  return nextCount % REQUEST_SAMPLE_RATE === 0;
}

function createEmptyDomainState(domain, preserved = {}) {
  const now = nowTs();

  return {
    domain,
    updated_at: now,
    first_seen_at: preserved.first_seen_at || now,
    last_seen_at: now,
    last_reset_at: now,
    session_count: preserved.session_count || 0,

    counts: {
      total_events: 0,
      request_events: 0,
      response_events: 0,
      cookie_events: 0,
      storage_events: 0,
      dom_mutation_events: 0,
      user_action_events: 0,
      cart_signal_events: 0,
      checkout_signal_events: 0
    },

    storage_summary: {
      cookie_count: 0,
      local_storage_count: 0,
      session_storage_count: 0,
      indexeddb_count: 0
    },

    tracker_domains: {},
    endpoint_summary: {},
    request_timeline: [],
    request_classification: {
      categories: {},
      vendors: {},
      tracker_likelihood: {
        low: 0,
        medium: 0,
        high: 0
      },
      third_party_requests: 0,
      cart_requests: 0,
      checkout_requests: 0,
      recommendation_requests: 0,
      telemetry_requests: 0,
      tracking_pixel_requests: 0,
      beacon_requests: 0
    },

    markers: {
      cart_activity_likely: false,
      checkout_activity_likely: false,
      recommendation_activity_likely: false,
      persistence_activity_likely: false,
      high_request_activity: false
    },

    recent_notable_events: [],
    request_total_seen: 0,
    response_total_seen: 0,
    cookie_seen_keys: {}
  };
}

function pushRecentEvent(state, event) {
  const record = {
    ts: typeof event?.ts === "number" ? event.ts : nowTs(),
    type: getEventType(event),
    domain: getEventDomain(event),
    url: getEventUrl(event).slice(0, 180)
  };

  state.recent_notable_events.push(record);

  if (state.recent_notable_events.length > MAX_RECENT_EVENTS) {
    state.recent_notable_events = state.recent_notable_events.slice(-MAX_RECENT_EVENTS);
  }
}

function trimTrackerDomains(state) {
  const sorted = Object.entries(safeObject(state.tracker_domains))
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOP_TRACKERS);

  state.tracker_domains = Object.fromEntries(sorted);
}

function isDomainOverBudget(state) {
  return (state.counts.total_events || 0) >= MAX_TOTAL_EVENTS_PER_DOMAIN;
}

function shouldRotateState(state) {
  const now = nowTs();
  const lastResetAt = typeof state.last_reset_at === "number" ? state.last_reset_at : now;
  const lastSeenAt = typeof state.last_seen_at === "number" ? state.last_seen_at : now;

  const ageExceeded = (now - lastResetAt) >= ROTATE_AFTER_MS;
  const inactiveTooLong = (now - lastSeenAt) >= INACTIVITY_RESET_MS;

  return ageExceeded || inactiveTooLong;
}

function rotateStateIfNeeded(state) {
  if (!shouldRotateState(state)) {
    return state;
  }

  return createEmptyDomainState(state.domain, {
    first_seen_at: state.first_seen_at,
    session_count: state.session_count,
    last_deep_inspect_summary: state.last_deep_inspect_summary,
    deep_inspect_closed_at: state.deep_inspect_closed_at
  });
}


function pushFinding(state, kind, label) {
  if (!state.recent_findings) state.recent_findings = [];

  const existing = state.recent_findings.find((item) => item.kind === kind);
  if (existing) {
    existing.ts = Date.now();
    existing.count = (existing.count || 1) + 1;
    return;
  }

  state.recent_findings.push({
    ts: Date.now(),
    kind,
    label,
    count: 1
  });

  if (state.recent_findings.length > 8) {
    state.recent_findings = state.recent_findings.slice(-8);
  }
}

function isDeepInspectEvent(event) {
  return event?.payload?.capture_mode === "deep_inspect";
}
function applyEventToDomainState(state, event) {
  state.last_capture_mode = event?.payload?.capture_mode || "passive";
  state = rotateStateIfNeeded(state);

  const type = getEventType(event);
  const url = getEventUrl(event).toLowerCase();
  const eventDomain = getEventDomain(event);

  state.updated_at = nowTs();
  state.last_seen_at = nowTs();

  if (type === "request_sent") {
    state.request_total_seen = (state.request_total_seen || 0) + 1;

    const forceCapture = Boolean(event?.payload?.force_capture);

    if (!forceCapture && !shouldSampleRequest(state) && !url.includes("cart") && !url.includes("checkout")) {

    }
  }

  if (type === "response_received") {
    state.response_total_seen = (state.response_total_seen || 0) + 1;

    const forceCapture = Boolean(event?.payload?.force_capture);

    if (!forceCapture && (state.response_total_seen % REQUEST_SAMPLE_RATE) !== 0 && !url.includes("cart") && !url.includes("checkout")) {

    }
  }

  if (isDomainOverBudget(state)) {
    if (
      type !== "cookie_set" &&
      type !== "cookie_changed" &&
      type !== "cookie_deleted" &&
      !url.includes("cart") &&
      !url.includes("checkout")
    ) {

    }
  }

  state.counts.total_events += 1;

  if (type === "request_sent") {
    state.counts.request_events += 1;
  }

  if (type === "response_received") {
    state.counts.response_events += 1;
  }

  const requestClassification = event?.payload?.request_classification;
  if (requestClassification && typeof requestClassification === "object") {
    const category = String(requestClassification.category || "generic");
    const vendor = String(requestClassification.vendor || "unknown");
    const likelihood = String(requestClassification.trackerLikelihood || "low");

    state.request_classification = state.request_classification || {
      categories: {},
      vendors: {},
      tracker_likelihood: { low: 0, medium: 0, high: 0 },
      third_party_requests: 0,
      cart_requests: 0,
      recommendation_requests: 0,
      telemetry_requests: 0
    };

    state.request_classification.categories[category] = (state.request_classification.categories[category] || 0) + 1;
    state.request_classification.vendors[vendor] = (state.request_classification.vendors[vendor] || 0) + 1;

    try {
      const endpointPath = new URL(event.url || "").pathname || "/";
      const endpointKey = category + " " + endpointPath.slice(0, 120);
      state.endpoint_summary = state.endpoint_summary || {};
      state.endpoint_summary[endpointKey] = (state.endpoint_summary[endpointKey] || 0) + 1;

      state.request_timeline = state.request_timeline || [];
      state.request_timeline.push({
        ts: Date.now(),
        category,
        vendor,
        path: endpointPath.slice(0, 160),
        likelihood
      });

      if (state.request_timeline.length > 20) {
        state.request_timeline = state.request_timeline.slice(-20);
      }
    } catch {
      // ignore malformed URLs
    }

    if (likelihood === "high" || likelihood === "medium" || likelihood === "low") {
      state.request_classification.tracker_likelihood[likelihood] =
        (state.request_classification.tracker_likelihood[likelihood] || 0) + 1;
    }

    if (requestClassification.sameSite === false) {
      state.request_classification.third_party_requests += 1;
      state.tracker_domains[event.domain] = (state.tracker_domains[event.domain] || 0) + 1;
      trimTrackerDomains(state);
    }

    if (category === "cart") {
  state.request_classification.cart_requests += 1;
  state.markers.cart_activity_likely = true;
  pushFinding(state, "cart", "Cart activity observed");
      pushRunLog(state, "Cart activity observed");
}

    if (category === "checkout") {
  state.request_classification.checkout_requests += 1;
  state.markers.checkout_activity_likely = true;
  pushFinding(state, "checkout", "Checkout activity observed");
      pushRunLog(state, "Checkout activity observed");
}

    if (category === "recommendation") {
  state.request_classification.recommendation_requests += 1;
  state.markers.recommendation_activity_likely = true;
  pushFinding(state, "recommendation", "Recommendation activity observed");
      pushRunLog(state, "Recommendation activity observed");
}

    if (category === "telemetry") {
  state.request_classification.telemetry_requests += 1;
  pushFinding(state, "telemetry", "Behavior telemetry observed");
      pushRunLog(state, "Behavior telemetry observed");
}

    if (category === "tracking_pixel") {
  state.request_classification.tracking_pixel_requests += 1;
  pushFinding(state, "tracking_pixel", "Tracking pixel observed");
      pushRunLog(state, "Tracking pixel observed");
}

    if (category === "beacon") {
  state.request_classification.beacon_requests += 1;
  pushFinding(state, "beacon", "Beacon request observed");
      pushRunLog(state, "Beacon request observed");
}
  }

  if (type === "cookie_set" || type === "cookie_changed" || type === "cookie_deleted") {
    const cookieKey = getCookieKey(event);

    if (cookieKey && !state.cookie_seen_keys[cookieKey]) {
      state.cookie_seen_keys[cookieKey] = true;
      state.counts.cookie_events += 1;
      state.storage_summary.cookie_count += 1;
      state.markers.persistence_activity_likely = true;
    }
  }

  if (type === "storage_write" || type === "storage_delete") {
    state.counts.storage_events += 1;
    state.markers.persistence_activity_likely = true;

    const storageArea = getStorageArea(event);
    if (storageArea === "local_storage") {
      state.storage_summary.local_storage_count += 1;
    } else if (storageArea === "session_storage") {
      state.storage_summary.session_storage_count += 1;
    }
  }

  if (type === "indexeddb_detected") {
    state.counts.storage_events += 1;
    state.storage_summary.indexeddb_count += 1;
    state.markers.persistence_activity_likely = true;
  }

  if (type === "dom_mutation") {
    state.counts.dom_mutation_events += 1;
  }

  if (type === "user_action") {
    state.counts.user_action_events += 1;
  }

  if (url.includes("cart") || url.includes("basket") || url.includes("bag")) {
    state.counts.cart_signal_events += 1;
    state.markers.cart_activity_likely = true;
  }

  if (url.includes("checkout")) {
    state.counts.checkout_signal_events += 1;
    state.markers.checkout_activity_likely = true;
  }

  if (url.includes("recommend") || url.includes("personalize") || url.includes("feed")) {
    state.markers.recommendation_activity_likely = true;
  }

  if ((state.request_total_seen || 0) >= 100) {
    state.markers.high_request_activity = true;
  }

  if (isTrackerDomain(eventDomain, state.domain)) {
    state.tracker_domains[eventDomain] = (state.tracker_domains[eventDomain] || 0) + 1;
    trimTrackerDomains(state);
  }

  if (
    type === "request_sent" ||
    type === "cookie_set" ||
    type === "cookie_changed" ||
    type === "storage_write" ||
    type === "dom_mutation" ||
    type === "user_action"
  ) {
    pushRecentEvent(state, event);
  }

  forceBuildSignalBreakdown(state);
  return state;
}

async function flushToStorage() {
  flushTimer = null;
  await chrome.storage.local.set({ [DOMAIN_STATE_KEY]: memoryState });
}

function scheduleFlush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushToStorage().catch((err) => {
      console.error("DOMAIN_STATE_FLUSH_FAIL", err);
    });
  }, FLUSH_DEBOUNCE_MS);
}



export async function getAllDomainStates() {
  const fromStorage = await chrome.storage.local.get([DOMAIN_STATE_KEY]);
  const stored = safeObject(fromStorage[DOMAIN_STATE_KEY]);

  for (const [domain, value] of Object.entries(stored)) {
    if (!memoryState[domain]) {
      memoryState[domain] = value;
    }
  }

  return memoryState;
}


function compactDomainState(state) {
  if (!state || typeof state !== "object") return state;

  if (!state.counts) state.counts = {};
  if (!state.recent_findings) state.recent_findings = [];

  const maxTotal = isDeepInspectEvent({ payload: { capture_mode: state.active_mode === "DEEP_INSPECT" ? "deep_inspect" : "" } })
    ? DEEP_MAX_TOTAL_EVENTS
    : PASSIVE_MAX_TOTAL_EVENTS;

  if ((state.counts.total_events || 0) > maxTotal) {
    state.counts.total_events = maxTotal;
  }

  if (!state.request_classification) {
    state.request_classification = {
      categories: {},
      vendors: {},
      tracker_likelihood: { low: 0, medium: 0, high: 0 },
      third_party_requests: 0,
      cart_requests: 0,
      checkout_requests: 0,
      recommendation_requests: 0,
      telemetry_requests: 0,
      tracking_pixel_requests: 0,
      beacon_requests: 0
    };
  }

  state.recent_notable_events = Array.isArray(state.recent_notable_events)
    ? state.recent_notable_events.slice(-15)
    : [];

  state.recent_findings = Array.isArray(state.recent_findings)
    ? state.recent_findings.slice(-8)
    : [];

  forceBuildSignalBreakdown(state);
  return state;
}

function hardCompactDomainState(state) {
  if (!state || typeof state !== "object") return state;

  if (!state.counts) state.counts = {};
  if (!state.recent_findings) state.recent_findings = [];

  const isDeep = state.last_capture_mode === "deep_inspect";
  const maxTotal = isDeep ? 260 : 40;

  state.counts.total_events = Math.min(state.counts.total_events || 0, maxTotal);

  if (!isDeep) {
    state.counts.request_events = 0;
    state.counts.response_events = 0;
    state.request_classification = {
      categories: {},
      vendors: {},
      tracker_likelihood: { low: 0, medium: 0, high: 0 },
      third_party_requests: 0,
      cart_requests: 0,
      checkout_requests: 0,
      recommendation_requests: 0,
      telemetry_requests: 0,
      tracking_pixel_requests: 0,
      beacon_requests: 0
    };
    state.recent_findings = [];
  } else {
    state.recent_findings = Array.isArray(state.recent_findings)
      ? state.recent_findings.slice(-8)
      : [];
  }

  state.recent_notable_events = Array.isArray(state.recent_notable_events)
    ? state.recent_notable_events.slice(-12)
    : [];

  forceBuildSignalBreakdown(state);
  return state;
}

function pushRunLog(state, message) {
  if (!state.run_log) state.run_log = [];

  state.run_log.push({
    ts: Date.now(),
    message
  });

  if (state.run_log.length > 30) {
    state.run_log = state.run_log.slice(-30);
  }
}


function forceBuildSignalBreakdown(state) {
  const rc = state.request_classification || {};
  state.signal_breakdown = {
    cart: rc.cart_requests || 0,
    checkout: rc.checkout_requests || 0,
    recommendation: rc.recommendation_requests || 0,
    telemetry: rc.telemetry_requests || 0,
    tracking_pixel: rc.tracking_pixel_requests || 0,
    beacon: rc.beacon_requests || 0,
    third_party: rc.third_party_requests || 0
  };
  return state.signal_breakdown;
}
function buildSignalBreakdown(state) {
  const rc = state.request_classification || {};
  return {
    cart: rc.cart_requests || 0,
    checkout: rc.checkout_requests || 0,
    recommendation: rc.recommendation_requests || 0,
    telemetry: rc.telemetry_requests || 0,
    tracking_pixel: rc.tracking_pixel_requests || 0,
    beacon: rc.beacon_requests || 0,
    third_party: rc.third_party_requests || 0
  };
}

export async function appendDomainRunLog(domain, message) {
  const result = await chrome.storage.local.get([DOMAIN_STATE_KEY]);
  const all = result[DOMAIN_STATE_KEY] || {};
  let state = all[domain];

  if (!state) {
    state = createEmptyDomainState(domain);
  }

  pushRunLog(state, message);

if (state.run_log && state.run_log.length > 50) {
  state.run_log = state.run_log.slice(-50);
}
  state.signal_breakdown = buildSignalBreakdown(state);
  state.updated_at = Date.now();

  all[domain] = state;
  await chrome.storage.local.set({ [DOMAIN_STATE_KEY]: all });

  forceBuildSignalBreakdown(state);
  return state;
}

export async function closeDeepInspectRun(domain) {
  const all = await getAllDomainStates();
  let state = all[domain] || createEmptyDomainState(domain);

  forceBuildSignalBreakdown(state);

  const counts = state.counts || {};
  const summary = {
    closedAt: Date.now(),
    totalEvents: counts.total_events || 0,
    requestEvents: (counts.request_events || 0) + (counts.response_events || 0),
    signalBreakdown: buildSignalBreakdown(state),
    vendors: { ...(state.request_classification?.vendors || {}) },
    categories: { ...(state.request_classification?.categories || {}) },
    endpoints: { ...(state.endpoint_summary || {}) },
    timeline: Array.isArray(state.request_timeline) ? state.request_timeline.slice(-20) : [],
    findings: Array.isArray(state.recent_findings) ? state.recent_findings.slice(-8) : []
  };

  state.last_deep_inspect_summary = summary;
  state.last_capture_mode = "passive";
  state.deep_inspect_closed_at = Date.now();

  state.counts.request_events = 0;
  state.counts.response_events = 0;
  state.request_classification = {
    categories: {},
    vendors: {},
    tracker_likelihood: { low: 0, medium: 0, high: 0 },
    third_party_requests: 0,
    cart_requests: 0,
    checkout_requests: 0,
    recommendation_requests: 0,
    telemetry_requests: 0,
    tracking_pixel_requests: 0,
    beacon_requests: 0
  };
  state.signal_breakdown = {};
  state.endpoint_summary = {};
  state.request_timeline = [];
  state.recent_findings = [];

  pushRunLog(state, "Deep Inspect stopped");
  state.updated_at = Date.now();

  all[domain] = state;
  scheduleFlush();
  await flushToStorage();

  return state;
}


export async function getDomainState(domain) {
  const all = await getAllDomainStates();
  const state = all[domain] || null;
  return state ? hardCompactDomainState((forceBuildSignalBreakdown(state), state)) : null;
}

export async function incrementDomainSession(domain) {
  const all = await getAllDomainStates();
  let state = all[domain] || createEmptyDomainState(domain);
  state = rotateStateIfNeeded(state);
  state.session_count += 1;
  state.updated_at = nowTs();
  state.last_seen_at = nowTs();
  all[domain] = state;
  scheduleFlush();
  forceBuildSignalBreakdown(state);
  return state;
}

export async function applyEventToStoredDomainState(domain, event) {
  const all = await getAllDomainStates();
  let state = all[domain] || createEmptyDomainState(domain);
  state = applyEventToDomainState(state, event);
  all[domain] = state;
  scheduleFlush();
  forceBuildSignalBreakdown(state);
  return state;
}

export async function forceFlushDomainState() {
  await flushToStorage();
}

export async function clearDomainState(domain) {
  const fromStorage = await chrome.storage.local.get([DOMAIN_STATE_KEY]);
  const all = fromStorage[DOMAIN_STATE_KEY] || {};

  if (all[domain]) {
    delete all[domain];
  }

  await chrome.storage.local.set({
    [DOMAIN_STATE_KEY]: all
  });

  if (memoryState[domain]) {
    delete memoryState[domain];
  }
}
