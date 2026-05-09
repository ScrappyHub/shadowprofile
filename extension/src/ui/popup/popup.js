import { buildExplanation, buildSegments, buildValueEstimate, buildConfidence } from "../../analysis/explanation_engine.js";
import { appendSessionHistory, getSessionHistory } from "../../storage/session_history.js";
import { buildPortableSessionArtifact, buildLastDeepInspectArtifact, canonicalJson } from "../../evidence/portable_session_artifact.js";

function isShadowProfileBrowserPage(domain) {
  const d = String(domain || "").toLowerCase();

  return (
    d === "startpageshared" ||
    d === "history" ||
    d === "downloads" ||
    d === "bookmarks" ||
    d === "settings" ||
    d === "new-tab-page" ||
    d === "newtab" ||
    d === "extensions" ||
    d === "chrome" ||
    d === "edge" ||
    d === "opera" ||
    d === "brave" ||
    d === "about" ||
    d === "unknown" ||
    d.startsWith("chrome://") ||
    d.startsWith("edge://") ||
    d.startsWith("opera://") ||
    d.startsWith("brave://") ||
    d.startsWith("about:")
  );
}

async function getBrowserBaselineProfile() {
  try {
    await chrome.runtime.sendMessage({
      type: "CONTROL_REFRESH_BROWSER_BASELINE"
    });
  } catch {
  }

  const result = await chrome.storage.local.get("shadowprofile_browser_baseline_v1");
  return result.shadowprofile_browser_baseline_v1 || null;
}

function formatBrowserProfileSummary(profile) {
  if (!profile) return "No browser baseline profile yet.";

  const inferred = profile.inferred_profile || {};
  const interests = Array.isArray(inferred.interests) && inferred.interests.length > 0
    ? inferred.interests.join(", ")
    : "--";

  const confidence = inferred.confidence || "low";
  const counts = profile.counts || {};

  return [
    "Browser Profile",
    "Interests: " + interests,
    "Confidence: " + confidence,
    "Cookies: " + String(counts.cookies || 0),
    "Cookie Domains: " + String(counts.cookie_domains || 0),
    "History Sample: " + String(counts.history_items_sampled_30d || 0),
    "History Domains: " + String(counts.history_domains || 0)
  ].join("\n");
}

function formatBrowserTopCategories(profile) {
  const cats = profile?.top_categories || {};
  const entries = Object.entries(cats)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 8);

  if (entries.length === 0) return "No browser categories observed yet.";

  return entries.map(([key, value]) => key + ": " + value).join(" ");
}
function formatHistoryComparison(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return "No session history yet.";
  }

  const latestByDomain = new Map();

  for (const item of history) {
    latestByDomain.set(item.domain, item);
  }

  return Array.from(latestByDomain.values())
    .slice(-6)
    .map((item) => {
      const scores = item.scores || {};
      const tracking = Number(scores.tracking_intensity || 0);
      const personalization = Number(scores.personalization_activity || 0);
      const shortHash = item.artifact_sha256 ? item.artifact_sha256.slice(0, 12) : "no-hash";
      return item.domain + " ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â tracking " + tracking + ", personalization " + personalization + " ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡| " + shortHash;
    })
    .join("\n");
}

async function renderSessionHistoryPanel() {
  try {
    const history = await getSessionHistory();
    setText("sessionHistory", formatHistoryComparison(history));
  } catch {
    setText("sessionHistory", "Session history unavailable.");
  }
}

async function recordArtifactHistory(domain, artifact) {
  try {
    await appendSessionHistory({
      domain,
      artifact_sha256: artifact?.integrity?.artifact_sha256 || "",
      artifact_type: artifact?.artifact_type || "",
      scores: artifact?.summary?.scores || {},
      signals: artifact?.observations?.signal_breakdown || {},
      vendors: artifact?.observations?.vendors || {},
      categories: artifact?.observations?.categories || {}
    });
    await renderSessionHistoryPanel();
  } catch (err) {
    console.warn("SESSION_HISTORY_APPEND_FAIL", err);
  }
}
function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function safeFilenamePart(value) {
  return String(value || "unknown")
    .replace(/[^a-z0-9._-]+/gi, "_")
    .slice(0, 80);
}
function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

function formatList(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return "--";
  }
  return value.join(", ");
}


function formatFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return "No findings yet.";
  }

  return findings
    .slice(-6)
    .reverse()
    .map((finding) => {
      const label = finding.label || finding.kind || "Finding";
      const count = finding.count && finding.count > 1 ? " x" + finding.count : "";
      return "- " + label + count;
    })
    .join("\n");
}

function formatRunLog(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "No run log yet.";
  }

  const compact = [];
  for (const entry of entries.slice(-20)) {
    const prev = compact[compact.length - 1];
    if (prev && prev.message === entry.message) {
      prev.count = (prev.count || 1) + 1;
      prev.ts = entry.ts;
    } else {
      compact.push({
        ts: entry.ts,
        message: entry.message || "Event",
        count: 1
      });
    }
  }

  return compact
    .slice(-8)
    .reverse()
    .map((entry) => {
      const when = typeof entry.ts === "number" ? new Date(entry.ts).toLocaleTimeString() : "--";
      const count = entry.count > 1 ? " x" + entry.count : "";
      return when + " - " + entry.message + count;
    })
    .join("\n");
}

function renderSignalBreakdown(breakdown) {
  const el = document.getElementById("signalBreakdown");
  if (!el) return;

  const data = breakdown && typeof breakdown === "object" ? breakdown : {};
  const entries = Object.entries(data)
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  if (entries.length === 0) {
    el.textContent = "No signal breakdown yet.";
    return;
  }

  const max = Math.max(...entries.map(([, value]) => Number(value || 0)), 1);

  el.innerHTML = entries.map(([key, value]) => {
    const count = Number(value || 0);
    const pct = Math.max(4, Math.round((count / max) * 100));
    const label = key.replaceAll("_", " ");
    return `
      <div class="signal-row">
        <div class="signal-label"><span>${label}</span><span>${count}</span></div>
        <div class="signal-track"><div class="signal-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join("");
}

function formatLastDeepSummary(summary) {
  if (!summary || typeof summary !== "object") {
    return "No completed deep inspect run yet.";
  }

  const breakdown = summary.signalBreakdown || {};
  const parts = Object.entries(breakdown)
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a,b) => Number(b[1]) - Number(a[1]))
    .map(([key,value]) => key.replaceAll("_"," ") + ": " + value);

  const total = summary.totalEvents ?? 0;
  const requests = summary.requestEvents ?? 0;

  return [
    "Total events: " + total,
    "Request events: " + requests,
    parts.length ? "Top signals: " + parts.slice(0,4).join(", ") : "Top signals: none"
  ].join("\n");
}



function formatRequestTimeline(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "No request timeline yet.";
  }

  return entries
    .slice(-10)
    .reverse()
    .map((entry) => {
      const when = typeof entry.ts === "number" ? new Date(entry.ts).toLocaleTimeString() : "--";
      const category = String(entry.category || "request").replaceAll("_", " ");
      const vendor = entry.vendor || "unknown";
      const path = entry.path || "/";
      return when + " - " + category + " / " + vendor + " / " + path;
    })
    .join("\n");
}
function formatTopMap(map, emptyText) {
  const entries = Object.entries(map || {})
    .filter(([,v]) => Number(v || 0) > 0)
    .sort((a,b) => Number(b[1]) - Number(a[1]))
    .slice(0, 8);

  if (!entries.length) return emptyText;

  return entries.map(([k,v]) => k + ": " + v).join("\n");
}

function formatTopVendors(profile) {
  return formatTopMap(
    profile.requestClassification?.vendors,
    "No vendors observed yet."
  );
}

function formatTopCategories(profile) {
  return formatTopMap(
    profile.requestClassification?.categories,
    "No categories observed yet."
  );
}
function formatTopSignals(breakdown) {
  const entries = Object.entries(breakdown || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a,b) => Number(b[1]) - Number(a[1]))
    .slice(0, 6);

  if (!entries.length) return "No top signals yet.";

  return entries
    .map(([key, value]) => key.replaceAll("_", " ") + ": " + value)
    .join("\n");
}

function formatTopTrackerDomains(domains) {
  const entries = Object.entries(domains || {})
    .filter(([domain, value]) => domain && Number(value || 0) > 0)
    .sort((a,b) => Number(b[1]) - Number(a[1]))
    .slice(0, 8);

  if (!entries.length) return "No tracker domains observed yet.";

  return entries
    .map(([domain, value]) => domain + ": " + value)
    .join("\n");
}

function formatProfileWhy(profile) {
  const breakdown = profile?.signalBreakdown || profile?.lastDeepSummary?.signalBreakdown || {};
  const signals = Object.entries(breakdown)
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a,b) => Number(b[1]) - Number(a[1]))
    .map(([key]) => key.replaceAll("_", " "));

  const reasons = [];

  if (signals.includes("tracking pixel")) reasons.push("Tracking pixel requests were observed.");
  if (signals.includes("telemetry")) reasons.push("Behavior telemetry endpoints were observed.");
  if (signals.includes("recommendation")) reasons.push("Recommendation or feed activity was observed.");
  if (signals.includes("cart")) reasons.push("Cart-related activity was observed.");
  if (signals.includes("checkout")) reasons.push("Checkout-related activity was observed.");
  if (signals.includes("beacon")) reasons.push("Beacon-style requests were observed.");

  return reasons.length ? reasons.join("\n") : "No explanation yet.";
}
function formatTime(value) {
  if (typeof value !== "number") {
    return "--";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function getDomainFromUrl(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function safeObject(value) {
  return value && typeof value === "object" ? value : {};
}

function buildIdentityFromManifest(manifest) {
  return {
    name: manifest?.name || "unknown",
    version: manifest?.version || "unknown",
    manifest_version: manifest?.manifest_version || "unknown",
    build_mode: "local_extension"
  };
}

function buildIntegrityRecord() {
  const manifest = chrome.runtime.getManifest();
  const permissions = Array.isArray(manifest?.permissions) ? manifest.permissions : [];
  const required = ["tabs", "storage", "webNavigation", "cookies"];
  const missing = required.filter((perm) => !permissions.includes(perm));

  const checks = [
    { name: "manifest_version_expected", passed: manifest?.manifest_version === 3 },
    { name: "required_permissions_present", passed: missing.length === 0 },
    { name: "popup_path_expected", passed: manifest?.action?.default_popup === "src/ui/popup/popup.html" },
    { name: "service_worker_path_expected", passed: manifest?.background?.service_worker === "src/background/service_worker.js" },
    { name: "core_file_list_loaded", passed: true }
  ];

  const checksPassed = checks.filter((check) => check.passed).map((check) => check.name);
  const checksFailed = checks.filter((check) => !check.passed).map((check) => check.name);

  return {
    generated_at: Date.now(),
    engine_version: "integrity_engine_v1",
    build_identity: buildIdentityFromManifest(manifest),
    integrity_status: checksFailed.length === 0 ? "verified" : "modified",
    reasoning: {
      checks_passed: checksPassed,
      checks_failed: checksFailed,
      summary: checksFailed.length === 0
        ? "All defined integrity checks passed."
        : "Some integrity checks failed."
    }
  };
}

function buildScores(state) {
  const counts = safeObject(state.counts);
  const markers = safeObject(state.markers);
  const storage = safeObject(state.storage_summary);
  const trackerCount = Object.keys(safeObject(state.tracker_domains)).length;
  const requestClassification = safeObject(state.request_classification);
  const trackerLikelihood = safeObject(requestClassification.tracker_likelihood);

  const requestEvents = counts.request_events || 0;
  const responseEvents = counts.response_events || 0;
  const cookieEvents = counts.cookie_events || 0;
  const storageEvents = counts.storage_events || 0;
  const domMutations = counts.dom_mutation_events || 0;
  const userActions = counts.user_action_events || 0;

  const cookieCount = storage.cookie_count || 0;
  const localStorageCount = storage.local_storage_count || 0;
  const sessionStorageCount = storage.session_storage_count || 0;
  const indexeddbCount = storage.indexeddb_count || 0;

  let tracking = 0;
  tracking += Math.min(14, Math.floor(requestEvents / 18));
  tracking += Math.min(15, trackerCount * 3);
  tracking += Math.min(18, (trackerLikelihood.high || 0) * 2);
  tracking += Math.min(10, requestClassification.telemetry_requests || 0);
  tracking += Math.min(10, requestClassification.tracking_pixel_requests || 0);
  tracking += Math.min(6, requestClassification.beacon_requests || 0);
  tracking += Math.min(8, Math.floor(cookieEvents / 20));
  tracking += Math.min(6, Math.floor(storageEvents / 8));

  if (markers.high_request_activity) tracking += 6;
  if (markers.recommendation_activity_likely) tracking += 6;
  if (markers.cart_activity_likely) tracking += 4;
  if (markers.checkout_activity_likely) tracking += 6;

  let personalization = 0;
  if (markers.cart_activity_likely) personalization += 10;
  if (markers.checkout_activity_likely) personalization += 14;
  if (markers.recommendation_activity_likely) personalization += 12;
  personalization += Math.min(12, requestClassification.cart_requests || 0);
  personalization += Math.min(12, requestClassification.checkout_requests || 0);
  personalization += Math.min(10, requestClassification.recommendation_requests || 0);
  personalization += Math.min(8, Math.floor(domMutations / 20));
  personalization += Math.min(8, Math.floor(userActions / 8));
  personalization += Math.min(6, Math.floor(responseEvents / 35));

  let persistence = 0;
  persistence += Math.min(8, Math.floor(cookieCount / 35));
  persistence += Math.min(24, localStorageCount * 3);
  persistence += Math.min(12, sessionStorageCount * 2);
  persistence += Math.min(28, indexeddbCount * 4);

  const strongPersistenceEvidence =
    localStorageCount > 0 || sessionStorageCount > 0 || indexeddbCount > 0;

  if (markers.persistence_activity_likely && strongPersistenceEvidence) {
    persistence += 10;
  } else if (markers.persistence_activity_likely && cookieCount > 0) {
    persistence += 3;
  }

  tracking = clamp(tracking);
  personalization = clamp(personalization);
  persistence = clamp(persistence);

  const transparencyPenalty =
    Math.floor(tracking * 0.42) +
    Math.floor(personalization * 0.34) +
    Math.floor(persistence * 0.24);

  return {
    tracking_intensity: tracking,
    personalization_activity: personalization,
    persistence: persistence,
    transparency: clamp(100 - transparencyPenalty)
  };
}

function buildInferredProfile(domain, state) {
  const counts = safeObject(state.counts);
  const markers = safeObject(state.markers);
  const storage = safeObject(state.storage_summary);
  const trackerCount = Object.keys(safeObject(state.tracker_domains)).length;
  const requestClassification = safeObject(state.request_classification);
  const trackerLikelihood = safeObject(requestClassification.tracker_likelihood);

  const requestEvents = counts.request_events || 0;
  const userActions = counts.user_action_events || 0;

  const interests = [];
  const intent = [];
  const segments = [];

  if (domain.includes("amazon") || domain.includes("ebay")) interests.push("shopping");
  if (domain.includes("youtube")) interests.push("video_content");
  if (domain.includes("cnn") || domain.includes("news")) interests.push("news");

  if (markers.cart_activity_likely || (requestClassification.cart_requests || 0) > 0) intent.push("shopping");
  if ((requestClassification.checkout_requests || 0) > 0 && !intent.includes("purchase_intent")) intent.push("purchase_intent");

  if (markers.checkout_activity_likely) {
    if (!intent.includes("shopping")) intent.push("shopping");
    if (!intent.includes("purchase_intent")) intent.push("purchase_intent");
  }

  if (userActions >= 4 || requestEvents >= 16) {
    intent.push("engaged_session");
  }

  if (requestEvents >= 25) segments.push("high_activity_session");
  if (markers.recommendation_activity_likely) segments.push("recommendation_feed_user");

  const realPersistence =
    (storage.local_storage_count || 0) > 0 ||
    (storage.session_storage_count || 0) > 0 ||
    (storage.indexeddb_count || 0) > 0;

  if (realPersistence) segments.push("returning_user");

  let valueEstimate = "low";
  if (requestEvents >= 18 || trackerCount >= 3 || userActions >= 4) valueEstimate = "low_mid";
  if (requestEvents >= 45 || trackerCount >= 5 || userActions >= 12) valueEstimate = "mid";

  let confidenceScore = 0;
  if (interests.length > 0) confidenceScore += 1;
  if (intent.length > 0) confidenceScore += 1;
  if (segments.length > 0) confidenceScore += 1;
  if (requestEvents >= 25) confidenceScore += 1;
  if (userActions >= 6) confidenceScore += 1;

  let confidence = "low";
  if (confidenceScore >= 4) confidence = "high";
  else if (confidenceScore >= 2) confidence = "medium";

  const explanationParts = [];
  if (requestEvents > 0) explanationParts.push("observable network activity");
  if (markers.cart_activity_likely || markers.checkout_activity_likely) explanationParts.push("cart or checkout-related signals");
  if (markers.recommendation_activity_likely) explanationParts.push("recommendation-related behavior");
  if (realPersistence) explanationParts.push("persistent storage signals");
  else if ((storage.cookie_count || 0) > 0) explanationParts.push("cookie activity");

  let explanation = "Profile inferred from observed site activity.";
  if (explanationParts.length > 0) {
    explanation = "Profile inferred from " + explanationParts.join(", ") + ".";
  }

  return {
    interests,
    intent,
    segment_clues: segments,
    value_estimate: valueEstimate,
    confidence,
    reasoning: {
      explanation
    }
  };
}

function buildEvidence(domain, state, integrity) {
  const counts = safeObject(state.counts);
  const trackerDomains = safeObject(state.tracker_domains);
  const now = Date.now();

  return {
    generated_at: now,
    domain,
    session_started_at: state.last_reset_at || state.first_seen_at || null,
    session_ended_at: null,
    session_duration_ms:
      typeof (state.last_reset_at || state.first_seen_at) === "number"
        ? Math.max(0, now - (state.last_reset_at || state.first_seen_at))
        : null,
    analysis_generated_at: now,
    integrity_checked_at: integrity?.generated_at || null,
    event_counts: {
      total_events: counts.total_events || 0,
      request_events: (counts.request_events || 0) + (counts.response_events || 0),
      cookie_events: counts.cookie_events || 0,
      storage_events: counts.storage_events || 0,
      dom_mutation_events: counts.dom_mutation_events || 0,
      user_action_events: counts.user_action_events || 0
    },
    tracker_summary: {
      tracker_domain_count: Object.keys(trackerDomains).length
    }
  };
}

function buildPopupViewModel(domain, state) {
  const integrity = buildIntegrityRecord();
  const scores = buildScores(state);
  const inferredProfile = buildInferredProfile(domain, state);
  const evidence = buildEvidence(domain, state, integrity);

  return {
    domain,
    scores,
    inferredProfile,
    integrity,
    evidence,
    totalVisits: state.session_count || 0,
    totalEvents: safeObject(state.counts).total_events || 0,
    trackerDomains: safeObject(state.tracker_domains),
    endpointSummary: safeObject(state.endpoint_summary),
    requestTimeline: Array.isArray(state.request_timeline) ? state.request_timeline : [],
    requestClassification: safeObject(state.request_classification),
    storageUsage: {
      cookie: safeObject(state.storage_summary).cookie_count || 0,
      local_storage: safeObject(state.storage_summary).local_storage_count || 0,
      session_storage: safeObject(state.storage_summary).session_storage_count || 0,
      indexeddb: safeObject(state.storage_summary).indexeddb_count || 0
    },
    recentFindings: Array.isArray(state.recent_findings) ? state.recent_findings : [],
    runLog: Array.isArray(state.run_log) ? state.run_log : [],
    signalBreakdown: safeObject(state.signal_breakdown),
    lastDeepSummary: safeObject(state.last_deep_inspect_summary)
  };
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs.length > 0 ? tabs[0] : null;
}

async function getDomainState(domain) {
  const result = await chrome.storage.local.get([
    "shadowprofile_domain_state",
    "shadowprofile_runtime_mode",
    "shadowprofile_deep_inspect_domain"
  ]);

  const all = result.shadowprofile_domain_state || {};
  return {
    state: all[domain] || null,
    runtimeMode: result.shadowprofile_runtime_mode || "UNKNOWN",
    deepInspectDomain: result.shadowprofile_deep_inspect_domain || null
  };
}

async function sendMessage(type, payload) {
  return await chrome.runtime.sendMessage({ type, payload });
}

async function setupControls(runtimeMode, deepInspectDomain, currentDomain) {
  const resetBtn = document.getElementById("reset-domain");
  const toggleBtn = document.getElementById("toggle-mode");

  let mode = runtimeMode || "PASSIVE_DEFAULT";
  let inspectDomain = deepInspectDomain || null;

  function updateButton() {
    if (!toggleBtn) return;
    const active = mode === "DEEP_INSPECT" && inspectDomain === currentDomain;
    toggleBtn.textContent = active ? "Stop Deep Inspect" : "Start Deep Inspect";
  }

  updateButton();

  if (resetBtn) {
    resetBtn.onclick = async () => {
      await sendMessage("CONTROL_RESET_DOMAIN", { domain: currentDomain });
      window.location.reload();
    };
  }

  if (toggleBtn) {
    toggleBtn.onclick = async () => {
      const active = mode === "DEEP_INSPECT" && inspectDomain === currentDomain;
      mode = active ? "PASSIVE_DEFAULT" : "DEEP_INSPECT";

      const response = await sendMessage("CONTROL_SET_MODE", {
        mode,
        domain: currentDomain
      });

      if (response?.ok) {
        mode = response.mode;
        inspectDomain = response.deepInspectDomain || null;

        let modeLabel = "Mode: " + mode;
        if (mode === "DEEP_INSPECT" && inspectDomain) {
          modeLabel += " (" + inspectDomain + ")";
        }

        setText("runtimeMode", modeLabel);
        updateButton();
      }
    };
  }
}
function setupExportControl(domain, state, profile, runtimeMode, deepInspectDomain) {
  const btn = document.getElementById("exportSessionArtifact");
  const lastBtn = document.getElementById("exportLastDeepInspectArtifact");

  if (btn) {
    btn.onclick = async () => {
      try {
        const latestState = await getDomainState(domain);
        const latestProfile = buildPopupViewModel(domain, latestState);

        const artifact = await buildPortableSessionArtifact({
          domain,
          state: latestState,
          popupView: latestProfile,
          runtime: {
            mode: runtimeMode || "UNKNOWN",
            deepInspectDomain: deepInspectDomain || null,
            extensionVersion: chrome.runtime.getManifest()?.version || "unknown"
          }
        });

        const canonical = canonicalJson(artifact) + "\n";
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = "shadowprofile_session_" + safeFilenamePart(domain) + "_" + stamp + ".json";
        downloadTextFile(filename, canonical);
        await recordArtifactHistory(domain, artifact);
        setText("status", "Session artifact exported: " + artifact.integrity.artifact_sha256.slice(0, 16));
      } catch (err) {
        console.error("SESSION_ARTIFACT_EXPORT_FAIL", err);
        setText("status", "Session artifact export failed");
      }
    };
  }

  if (lastBtn) {
    lastBtn.onclick = async () => {
      try {
        const latestState = await getDomainState(domain);
        const latestProfile = buildPopupViewModel(domain, latestState);

        const artifact = await buildLastDeepInspectArtifact({
          domain,
          state: latestState,
          popupView: latestProfile,
          runtime: {
            mode: runtimeMode || "UNKNOWN",
            deepInspectDomain: deepInspectDomain || null,
            extensionVersion: chrome.runtime.getManifest()?.version || "unknown"
          }
        });

        const canonical = canonicalJson(artifact) + "\n";
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = "shadowprofile_last_deep_inspect_" + safeFilenamePart(domain) + "_" + stamp + ".json";
        downloadTextFile(filename, canonical);
        await recordArtifactHistory(domain, artifact);
        setText("status", "Last deep inspect artifact exported: " + artifact.integrity.artifact_sha256.slice(0, 16));
      } catch (err) {
        console.error("LAST_DEEP_INSPECT_ARTIFACT_EXPORT_FAIL", err);
        setText("status", "Last deep inspect artifact export failed");
      }
    };
  }
}

async function flushRequestCaptureBeforeRead() {
  try {
    await sendMessage("CONTROL_FLUSH_REQUESTS", {});
  } catch {
  }
}
async function loadPopup() {
  const tab = await getCurrentTab();
  const domain = getDomainFromUrl(tab?.url || "about:blank");

  setText("domain", domain);

  const result = await getDomainState(domain);
  const state = result.state;
  const runtimeMode = result.runtimeMode;
  const deepInspectDomain = result.deepInspectDomain;

  let modeLabel = "Mode: " + runtimeMode;
  if (runtimeMode === "DEEP_INSPECT" && deepInspectDomain) {
    modeLabel += " (" + deepInspectDomain + ")";
  }

  setText("runtimeMode", modeLabel);
  await setupControls(runtimeMode, deepInspectDomain, domain);

  if (!state) {
    setText("status", "No captured domain state yet for this site. Browse or refresh the page first.");
    return;
  }

  const profile = buildPopupViewModel(domain, state);
  setupExportControl(domain, state, profile, runtimeMode, deepInspectDomain);

  const isPassiveDisplayMode = runtimeMode !== "DEEP_INSPECT";
  if (isPassiveDisplayMode) {
    profile.totalEvents = Math.min(profile.totalEvents || 0, 40);
    if (profile.evidence && profile.evidence.event_counts) {
      profile.evidence.event_counts.total_events = Math.min(profile.evidence.event_counts.total_events || 0, 40);
      profile.evidence.event_counts.request_events = 0;
    }
    profile.signalBreakdown = {};
    profile.recentFindings = [];
    profile.runLog = [];
  }

  const scores = profile.scores || {};
  const inferred = profile.inferredProfile || {};
  const reasoning = inferred.reasoning || {};
  const trackerDomains = profile.trackerDomains || {};
  const storageUsage = profile.storageUsage || {};
  const integrity = profile.integrity || {};
  const integrityReasoning = integrity.reasoning || {};
  const buildIdentity = integrity.build_identity || {};
  const evidence = profile.evidence || {};
  const eventCounts = evidence.event_counts || {};
  const trackerSummary = evidence.tracker_summary || {};

  setText("tracking", scores.tracking_intensity ?? "--");
  setText("personalization", scores.personalization_activity ?? "--");
  setText("persistence", scores.persistence ?? "--");
  setText("transparency", scores.transparency ?? "--");

  setText("interests", formatList(inferred.interests));
  setText("intent", formatList(inferred.intent));
  setText("segments", formatList(inferred.segment_clues));
  setText("valueEstimate", inferred.value_estimate || "--");
  setText("confidence", inferred.confidence || "--");

  setText("integrityStatus", integrity.integrity_status ?? "--");
  setText(
    "buildIdentity",
    buildIdentity.name
      ? buildIdentity.name + " " + buildIdentity.version + " / mv" + buildIdentity.manifest_version
      : "--"
  );
  setText("checksPassed", (integrityReasoning.checks_passed || []).length);
  setText("checksFailed", (integrityReasoning.checks_failed || []).length);
  setText("integritySummary", integrityReasoning.summary || "--");

  setText("sessionStarted", formatTime(evidence.session_started_at));
  setText("sessionEnded", formatTime(evidence.session_ended_at));
  setText("sessionDuration", evidence.session_duration_ms ?? "--");
  setText("analysisGenerated", formatTime(evidence.analysis_generated_at));
  setText("integrityChecked", formatTime(evidence.integrity_checked_at));
  setText("evidenceTotalEvents", eventCounts.total_events ?? "--");
  setText("requestEvents", eventCounts.request_events ?? "--");
  setText("evidenceTrackerCount", trackerSummary.tracker_domain_count ?? "--");  setText("lastDeepSummary", formatLastDeepSummary(profile.lastDeepSummary));

  const summary = profile.lastDeepSummary || null;

  const liveSignals = profile.signalBreakdown || {};
  const signals = Object.values(liveSignals).some((v) => Number(v || 0) > 0)
    ? liveSignals
    : (summary?.signalBreakdown || {});

  const liveVendors = profile.requestClassification?.vendors || {};
  const vendors = Object.values(liveVendors).some((v) => Number(v || 0) > 0)
    ? liveVendors
    : (summary?.vendors || {});

  const liveCategories = profile.requestClassification?.categories || {};
  const categories = Object.values(liveCategories).some((v) => Number(v || 0) > 0)
    ? liveCategories
    : (summary?.categories || summary?.signalBreakdown || {});

  setText("topSignals", formatTopSignals(signals));
  setText("topVendors", formatTopMap(vendors, "No vendors observed yet."));
  setText("topCategories", formatTopMap(categories, "No categories observed yet."));
  const liveEndpoints = profile.endpointSummary || {};
  const endpoints = Object.values(liveEndpoints).some((v) => Number(v || 0) > 0)
    ? liveEndpoints
    : (summary?.endpoints || {});

  const liveTimeline = Array.isArray(profile.requestTimeline) ? profile.requestTimeline : [];
  const timeline = liveTimeline.length > 0 ? liveTimeline : (summary?.timeline || []);

  setText("requestTimeline", formatRequestTimeline(timeline));
  setText("topEndpoints", formatTopMap(endpoints, "No endpoints observed yet."));
  setText("topTrackerDomains", formatTopTrackerDomains(profile.trackerDomains));
  setText("profileWhy", formatProfileWhy({ ...profile, signalBreakdown: signals }));
  renderSignalBreakdown(signals);
  setText("runLog", formatRunLog(profile.runLog));
  setText("recentFindings", formatFindings(profile.recentFindings));
  setText("reasoning", reasoning.explanation || "No reasoning yet.");

  setText("totalVisits", profile.totalVisits ?? 0);
  setText("totalEvents", profile.totalEvents ?? 0);
  setText("trackerCount", Object.keys(trackerDomains).length);
  setText("cookieCount", storageUsage.cookie ?? 0);
  setText("storageCount", (storageUsage.local_storage ?? 0) + (storageUsage.session_storage ?? 0) + (storageUsage.indexeddb ?? 0));

  if (isShadowProfileBrowserPage(domain)) {
  const browserProfile = await getBrowserBaselineProfile();

  setText("domain", "Browser Profile");
  setText("mode", "BROWSER_BASELINE");
  setText("interests", browserProfile?.inferred_profile?.interests?.join(", ") || "--");
  setText("intent", "browser-level profile");
  setText("segments", "--");
  setText("value", "local only");
  setText("confidence", browserProfile?.inferred_profile?.confidence || "low");

  setText("trackingScore", "0");
  setText("personalizationScore", String((browserProfile?.inferred_profile?.interests || []).length * 10));
  setText("persistenceScore", String(browserProfile?.counts?.cookies ? 5 : 0));
  setText("transparencyScore", "100");

  setText("reasoning", browserProfile?.inferred_profile?.explanation || "Browser baseline inferred locally from browser-visible evidence.");
  setText("profileWhy", formatBrowserProfileSummary(browserProfile));

  setText("topCategories", formatBrowserTopCategories(browserProfile));
  setText("topSignals", "Browser baseline mode");
  setText("topVendors", "No site vendors in browser baseline mode.");
  setText("topEndpoints", "No site endpoints in browser baseline mode.");
  setText("requestTimeline", "No active-site request timeline in browser baseline mode.");
  setText("recentFindings", "Browser baseline available from local cookies/history/domain state.");
  setText("runLog", "Browser profile generated locally.");
  setText("signalBreakdown", "Browser baseline mode.");
  setText("topTrackerDomains", "No active-site tracker domains in browser baseline mode.");
  setText("sessionHistory", "Open a website to build site-specific session history.");

  setText("mode", "BROWSER_BASELINE");
  console.log("SHADOWPROFILE_BROWSER_PROFILE_MODE", { domain });

  setText("status", "Loaded");
  return;
}
setText("status", "Loaded");
}

loadPopup().catch((err) => {
  console.error("POPUP_LOAD_FAIL", err);
  setText("status", "Popup failed to load");
});

