import {
  EVENT_TYPES,
  EVENT_SOURCES,
  CONFIDENCE_LEVELS,
  SEVERITY_LEVELS
} from "../shared/constants.js";

function assertEnum(v, allowed, name) {
  if (!allowed.includes(v)) {
    throw new Error("INVALID_ENUM:" + name + ":" + v);
  }
}

function nowTs() {
  return Date.now();
}

function genId(prefix = "evt") {
  return prefix + "_" + nowTs() + "_" + Math.random().toString(36).slice(2, 8);
}

function normalizeUrl(value) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "about:blank";
}

function normalizeDomain(value, url) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().toLowerCase();
  }

  try {
    const parsed = new URL(normalizeUrl(url));
    const hostname = String(parsed.hostname || "").trim().toLowerCase();
    return hostname.length > 0 ? hostname : "unknown";
  } catch {
    return "unknown";
  }
}

export function createEvidenceEvent({
  type,
  source,
  url,
  domain,
  tabId = null,
  frameId = null,
  payload = {}
}) {
  assertEnum(type, Object.values(EVENT_TYPES), "type");
  assertEnum(source, Object.values(EVENT_SOURCES), "source");

  return {
    id: genId("evt"),
    ts: nowTs(),
    type,
    source,
    url: normalizeUrl(url),
    domain: normalizeDomain(domain, url),
    tabId,
    frameId,
    payload: payload && typeof payload === "object" ? payload : {}
  };
}

export function createSessionRecord({ sessionId, startUrl, domain }) {
  const normalizedSessionId =
    typeof sessionId === "string" && sessionId.trim().length > 0
      ? sessionId.trim()
      : genId("sess");

  const normalizedUrl = normalizeUrl(startUrl);
  const normalizedDomain = normalizeDomain(domain, normalizedUrl);

  return {
    sessionId: normalizedSessionId,
    domain: normalizedDomain,
    startUrl: normalizedUrl,
    startTs: nowTs(),
    endTs: null,
    events: [],
    findings: []
  };
}

export function appendEvent(session, event) {
  if (!Array.isArray(session.events)) {
    session.events = [];
  }
  session.events.push(event);
}

export function createSiteProfile({ domain }) {
  return {
    domain: normalizeDomain(domain, "about:blank"),
    totalVisits: 0,
    totalEvents: 0,
    trackerDomains: {},
    storageUsage: {
      cookie: 0,
      local_storage: 0,
      session_storage: 0,
      indexeddb: 0
    },
    scores: {
      tracking_intensity: 0,
      personalization_activity: 0,
      persistence: 0,
      transparency: 100
    }
  };
}

export function createFinding({
  type,
  severity,
  confidence,
  summary,
  relatedEventIds = []
}) {
  return {
    id: genId("find"),
    ts: nowTs(),
    type: typeof type === "string" && type.length > 0 ? type : "unknown",
    severity: Object.values(SEVERITY_LEVELS).includes(severity) ? severity : SEVERITY_LEVELS.INFO,
    confidence: Object.values(CONFIDENCE_LEVELS).includes(confidence) ? confidence : CONFIDENCE_LEVELS.LOW,
    summary: typeof summary === "string" && summary.length > 0 ? summary : "No summary provided.",
    relatedEventIds: Array.isArray(relatedEventIds) ? relatedEventIds : []
  };
}

export function createComparisonRecord({
  domain,
  mode,
  baselineScore,
  currentScore,
  diff
}) {
  return {
    id: genId("cmp"),
    ts: nowTs(),
    domain: normalizeDomain(domain, "about:blank"),
    mode: mode || "unknown",
    baselineScore,
    currentScore,
    diff
  };
}