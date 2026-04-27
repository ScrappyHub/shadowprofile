function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countEvents(events, predicate) {
  return safeArray(events).filter(predicate).length;
}

function getSessionStartedAt(sessions) {
  const starts = safeArray(sessions)
    .map((session) => session?.startTs)
    .filter((value) => typeof value === "number");

  if (starts.length === 0) {
    return null;
  }

  return Math.min(...starts);
}

function getSessionEndedAt(sessions) {
  const ends = safeArray(sessions)
    .map((session) => session?.endTs)
    .filter((value) => typeof value === "number");

  if (ends.length === 0) {
    return null;
  }

  return Math.max(...ends);
}

function getSessionDurationMs(startedAt, endedAt) {
  if (typeof startedAt !== "number") {
    return null;
  }

  if (typeof endedAt !== "number") {
    return null;
  }

  return Math.max(0, endedAt - startedAt);
}

function getTopTrackerDomains(trackerDomains, max = 5) {
  const entries = Object.entries(trackerDomains || {});
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([domain, count]) => ({ domain, count }));
}

export function buildEvidenceRecord({
  domain,
  sessions = [],
  events = [],
  profile = {},
  integrity = {}
}) {
  const generatedAt = Date.now();
  const sessionStartedAt = getSessionStartedAt(sessions);
  const sessionEndedAt = getSessionEndedAt(sessions);
  const sessionDurationMs = getSessionDurationMs(sessionStartedAt, sessionEndedAt);

  const eventCounts = {
    total_events: safeArray(events).length,
    request_events: countEvents(events, (event) =>
      event?.type === "request_sent" || event?.type === "response_received"
    ),
    cookie_events: countEvents(events, (event) =>
      event?.type === "cookie_set" ||
      event?.type === "cookie_changed" ||
      event?.type === "cookie_deleted"
    ),
    storage_events: countEvents(events, (event) =>
      event?.type === "storage_write" ||
      event?.type === "storage_delete" ||
      event?.type === "indexeddb_detected"
    ),
    dom_mutation_events: countEvents(events, (event) =>
      event?.type === "dom_mutation"
    ),
    user_action_events: countEvents(events, (event) =>
      event?.type === "user_action"
    )
  };

  const storageSummary = {
    cookie_count: profile?.storageUsage?.cookie ?? 0,
    local_storage_count: profile?.storageUsage?.local_storage ?? 0,
    session_storage_count: profile?.storageUsage?.session_storage ?? 0,
    indexeddb_count: profile?.storageUsage?.indexeddb ?? 0
  };

  const trackerSummary = {
    tracker_domain_count: Object.keys(profile?.trackerDomains || {}).length,
    top_tracker_domains: getTopTrackerDomains(profile?.trackerDomains || {})
  };

  return {
    generated_at: generatedAt,
    domain,
    session_started_at: sessionStartedAt,
    session_ended_at: sessionEndedAt,
    session_duration_ms: sessionDurationMs,
    analysis_generated_at: generatedAt,
    integrity_checked_at: integrity?.generated_at ?? null,
    event_counts: eventCounts,
    storage_summary: storageSummary,
    tracker_summary: trackerSummary,
    scores: profile?.scores || {},
    inferred_profile: profile?.inferredProfile || {},
    integrity: integrity || {},
    reasoning: {
      summary: "This evidence record summarizes the current observed session/domain state for " + domain + ".",
      analysis_basis: "Scores, inferred profile, and integrity state were generated from captured request, interaction, and persistence summaries."
    },
    limits: [
      "Evidence is based on captured runtime state available to the extension.",
      "The popup shows compact summaries rather than a full raw forensic dump.",
      "Session timing may be partial if browser lifecycle events were interrupted."
    ]
  };
}