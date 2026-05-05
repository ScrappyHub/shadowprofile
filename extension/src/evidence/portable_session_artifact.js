export function canonicalJson(value) {
  if (value === undefined) return "null";

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
  }

  return "{" + Object.keys(value)
    .sort()
    .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
    .join(",") + "}";
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function hasValues(map) {
  return Object.values(safeObject(map)).some((v) => Number(v || 0) > 0);
}

function pickMap(...maps) {
  for (const map of maps) {
    if (hasValues(map)) return cloneJson(map);
  }
  return {};
}

function pickArray(...arrays) {
  for (const array of arrays) {
    if (Array.isArray(array) && array.length > 0) return cloneJson(array);
  }
  return [];
}

function buildObservations({ state, popupView, preferLastDeepInspect = false }) {
  const summary = safeObject(state?.last_deep_inspect_summary);
  const view = safeObject(popupView);
  const liveRequestClassification = safeObject(view.requestClassification);

  return {
    signal_breakdown: pickMap(
      preferLastDeepInspect ? summary.signalBreakdown : null,
      view.signalBreakdown,
      state?.signal_breakdown,
      summary.signalBreakdown
    ),

    vendors: pickMap(
      preferLastDeepInspect ? summary.vendors : null,
      liveRequestClassification.vendors,
      state?.request_classification?.vendors,
      summary.vendors
    ),

    categories: pickMap(
      preferLastDeepInspect ? summary.categories : null,
      liveRequestClassification.categories,
      state?.request_classification?.categories,
      summary.categories,
      summary.signalBreakdown
    ),

    endpoints: pickMap(
      preferLastDeepInspect ? summary.endpoints : null,
      view.endpointSummary,
      state?.endpoint_summary,
      summary.endpoints
    ),

    tracker_domains: pickMap(
      view.trackerDomains,
      state?.tracker_domains
    ),

    timeline: pickArray(
      preferLastDeepInspect ? summary.timeline : null,
      safeArray(view.requestTimeline).slice(-20),
      safeArray(state?.request_timeline).slice(-20),
      summary.timeline
    ),

    findings: pickArray(
      preferLastDeepInspect ? summary.findings : null,
      view.recentFindings,
      state?.recent_findings,
      summary.findings
    ),

    run_log: pickArray(
      preferLastDeepInspect ? [] : view.runLog,
      preferLastDeepInspect ? [] : state?.run_log
    )
  };
}

async function finalizeArtifact(artifact) {
  const canonicalWithoutHash = canonicalJson({
    ...artifact,
    integrity: {
      ...artifact.integrity,
      artifact_sha256: null
    }
  });

  artifact.integrity.artifact_sha256 = await sha256Hex(canonicalWithoutHash);
  return artifact;
}

export async function buildPortableSessionArtifact({ domain, state, popupView, runtime }) {
  const artifact = {
    artifact_type: "shadowprofile.session_artifact.v1",
    generated_at: Date.now(),
    domain,
    runtime: safeObject(runtime),
    summary: {
      scores: cloneJson(popupView?.scores || {}),
      inferred_profile: cloneJson(popupView?.inferredProfile || {}),
      evidence: cloneJson(popupView?.evidence || {}),
      last_deep_inspect_summary: cloneJson(state?.last_deep_inspect_summary || {})
    },
    observations: buildObservations({
      state,
      popupView,
      preferLastDeepInspect: false
    }),
    integrity: {
      format: "canonical-json-sha256",
      hash_algorithm: "SHA-256",
      artifact_sha256: null
    }
  };

  return await finalizeArtifact(artifact);
}

export async function buildLastDeepInspectArtifact({ domain, state, popupView, runtime }) {
  const summary = safeObject(state?.last_deep_inspect_summary);

  const artifact = {
    artifact_type: "shadowprofile.last_deep_inspect_artifact.v1",
    generated_at: Date.now(),
    domain,
    runtime: safeObject(runtime),
    summary: {
      scores: cloneJson(popupView?.scores || {}),
      inferred_profile: cloneJson(popupView?.inferredProfile || {}),
      evidence: cloneJson(popupView?.evidence || {}),
      last_deep_inspect_summary: cloneJson(summary)
    },
    observations: buildObservations({
      state,
      popupView,
      preferLastDeepInspect: true
    }),
    integrity: {
      format: "canonical-json-sha256",
      hash_algorithm: "SHA-256",
      artifact_sha256: null
    }
  };

  return await finalizeArtifact(artifact);
}