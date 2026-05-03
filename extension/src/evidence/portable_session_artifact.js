export function canonicalJson(value) {
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
  return value && typeof value === "object" ? value : {};
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

export async function buildPortableSessionArtifact({ domain, state, popupView, runtime }) {
  const now = Date.now();
  const artifact = {
    artifact_type: "shadowprofile.session_artifact.v1",
    generated_at: now,
    domain,
    runtime: safeObject(runtime),
    summary: {
      scores: cloneJson(popupView?.scores || {}),
      inferred_profile: cloneJson(popupView?.inferredProfile || {}),
      evidence: cloneJson(popupView?.evidence || {}),
      last_deep_inspect_summary: cloneJson(state?.last_deep_inspect_summary || {})
    },
    observations: {
      signal_breakdown: cloneJson(state?.signal_breakdown || state?.last_deep_inspect_summary?.signalBreakdown || {}),
      vendors: cloneJson(state?.request_classification?.vendors || state?.last_deep_inspect_summary?.vendors || {}),
      categories: cloneJson(state?.request_classification?.categories || state?.last_deep_inspect_summary?.categories || {}),
      endpoints: cloneJson(state?.endpoint_summary || state?.last_deep_inspect_summary?.endpoints || {}),
      tracker_domains: cloneJson(state?.tracker_domains || {}),
      timeline: cloneJson(
        Array.isArray(state?.request_timeline) && state.request_timeline.length > 0
          ? state.request_timeline.slice(-20)
          : (state?.last_deep_inspect_summary?.timeline || [])
      ),
      findings: cloneJson(state?.recent_findings || state?.last_deep_inspect_summary?.findings || []),
      run_log: cloneJson(state?.run_log || [])
    },
    integrity: {
      format: "canonical-json-sha256",
      hash_algorithm: "SHA-256",
      artifact_sha256: null
    }
  };

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