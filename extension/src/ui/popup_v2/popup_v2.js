function safeObject(value) {
  return value && typeof value === "object" ? value : {};
}

function getDomainFromUrl(rawUrl) {
  try { return new URL(rawUrl).hostname.toLowerCase(); }
  catch { return "unknown"; }
}

function humanMode(mode) {
  return mode === "DEEP_INSPECT" ? "Deep Scan" : "Eco Mode";
}

function pill(text) {
  const span = document.createElement("span");
  span.className = "pill";
  span.textContent = String(text || "").replaceAll("_", " ");
  return span;
}

function archetypeFor(domain, profile, state) {
  const interests = profile.interests || [];
  const text = [domain, ...interests, ...(profile.intent || [])].join(" ").toLowerCase();
  const signals = safeObject(state.signal_breakdown);

  if (text.includes("youtube") || text.includes("video") || signals.recommendation || signals.video_delivery) {
    return {
      title: "Video Recommendation Profile",
      badge: "play",
      summary: "This site may see you as a video viewer whose attention can be shaped by feeds, recommendations, and repeated engagement."
    };
  }

  if (text.includes("shopping") || signals.cart || signals.checkout) {
    return {
      title: "Shopping Interest Profile",
      badge: "bag",
      summary: "This site may see you as someone exploring products, comparing options, or likely to respond to shopping prompts."
    };
  }

  if (text.includes("news")) {
    return {
      title: "News Reader Profile",
      badge: "news",
      summary: "This site may see you as someone interested in information streams, current events, and reading behavior."
    };
  }

  if (profile.intent?.includes("engaged_session")) {
    return {
      title: "Engaged Session Profile",
      badge: "live",
      summary: "This site may see you as actively engaged based on repeated activity, navigation, scrolling, or interaction."
    };
  }

  return {
    title: "Low-Signal Profile",
    badge: "?",
    summary: "ShadowProfile does not see enough strong behavior yet. Deep Scan can build a clearer mirror on active sites."
  };
}

function renderPills(id, values, emptyText) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  if (!values || values.length === 0) {
    el.appendChild(pill(emptyText));
    return;
  }
  for (const value of values.slice(0, 8)) el.appendChild(pill(value));
}

function scoreSignals(state) {
  const s = safeObject(state.signal_breakdown);
  return Object.values(s).reduce((a,b) => a + Number(b || 0), 0);
}

function evidenceText(domain, state, runtimeMode) {
  const counts = safeObject(state.counts);
  const signals = safeObject(state.signal_breakdown);
  const findings = Array.isArray(state.recent_findings) ? state.recent_findings : [];

  return [
    "Site: " + domain,
    "Mode: " + humanMode(runtimeMode),
    "Total events: " + String(counts.total_events || 0),
    "Request events: " + String((counts.request_events || 0) + (counts.response_events || 0)),
    "Cookie events: " + String(counts.cookie_events || 0),
    "User actions: " + String(counts.user_action_events || 0),
    "",
    "Signals:",
    JSON.stringify(signals, null, 2),
    "",
    "Findings:",
    findings.slice(-8).map(f => "- " + (f.label || f.kind || "finding")).join("\n") || "None yet"
  ].join("\n");
}

async function currentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0] ? tabs[0] : null;
}

async function loadState(domain) {
  const result = await chrome.storage.local.get([
    "shadowprofile_domain_state",
    "shadowprofile_runtime_mode",
    "shadowprofile_deep_inspect_domain"
  ]);

  const all = result.shadowprofile_domain_state || {};
  return {
    state: all[domain] || {},
    runtimeMode: result.shadowprofile_runtime_mode || "PASSIVE_DEFAULT",
    deepDomain: result.shadowprofile_deep_inspect_domain || null
  };
}

async function send(type, payload) {
  return chrome.runtime.sendMessage({ type, payload });
}

async function boot() {
  const tab = await currentTab();
  const domain = getDomainFromUrl(tab?.url || "");
  const loaded = await loadState(domain);
  const state = loaded.state;
  const counts = safeObject(state.counts);
  const profile = buildProfile(domain, state);
  const archetype = archetypeFor(domain, profile, state);

  document.getElementById("siteLabel").textContent = domain;
  document.getElementById("modeLabel").textContent = humanMode(loaded.runtimeMode);
  document.getElementById("profileTitle").textContent = archetype.title;
  document.getElementById("profileSummary").textContent = archetype.summary;
  document.getElementById("avatarBadge").textContent = archetype.badge;

  document.getElementById("confidence").textContent = profile.confidence || "low";
  document.getElementById("value").textContent = profile.value_estimate || "low";
  document.getElementById("signals").textContent = String(scoreSignals(state));
  document.getElementById("activity").textContent = String(counts.total_events || 0);

  renderPills("interestPills", profile.interests || [], "No strong interests yet");
  renderPills("intentPills", profile.intent || [], "No clear intent yet");

  document.getElementById("whyText").textContent =
    profile.reasoning?.explanation || "No explanation yet.";

  document.getElementById("evidenceText").textContent =
    evidenceText(domain, state, loaded.runtimeMode);

  const toggle = document.getElementById("toggleScan");
  const active = loaded.runtimeMode === "DEEP_INSPECT" && loaded.deepDomain === domain;
  toggle.textContent = active ? "Stop Deep Scan" : "Start Deep Scan";
  toggle.onclick = async () => {
    await send("CONTROL_SET_MODE", {
      mode: active ? "PASSIVE_DEFAULT" : "DEEP_INSPECT",
      domain
    });
    window.location.reload();
  };

  document.getElementById("resetProfile").onclick = async () => {
    await send("CONTROL_RESET_DOMAIN", { domain });
    window.location.reload();
  };

  document.getElementById("exportProfile").onclick = () => {
    const blob = new Blob([document.getElementById("evidenceText").textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shadowprofile_" + domain.replace(/[^a-z0-9.-]+/gi, "_") + ".txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
}

function buildProfile(domain, state) {
  const counts = safeObject(state.counts);
  const signals = safeObject(state.signal_breakdown);
  const markers = safeObject(state.markers);

  const interests = [];
  const intent = [];
  const segments = [];

  if (domain.includes("youtube") || signals.recommendation || signals.video_delivery) interests.push("video_content");
  if (domain.includes("amazon") || domain.includes("ebay") || signals.cart || signals.checkout) interests.push("shopping");
  if (domain.includes("news") || domain.includes("cnn")) interests.push("news");

  if ((counts.user_action_events || 0) > 2 || signals.engaged_scroll || signals.user_action) intent.push("engaged_session");
  if (signals.recommendation) segments.push("recommendation_feed_user");

  let confidence = "low";
  const signalCount = Object.values(signals).reduce((a,b) => a + Number(b || 0), 0);
  if (signalCount > 12 || (counts.total_events || 0) > 80) confidence = "high";
  else if (signalCount > 3 || (counts.total_events || 0) > 20) confidence = "medium";

  let value = "low";
  if ((counts.total_events || 0) > 40 || intent.length) value = "mid";

  const reasons = [];
  if (signals.recommendation) reasons.push("recommendation behavior");
  if (signals.video_delivery) reasons.push("video delivery");
  if (signals.telemetry) reasons.push("telemetry");
  if (signals.app_api) reasons.push("application API activity");
  if ((counts.cookie_events || 0) > 0) reasons.push("cookie activity");
  if ((counts.user_action_events || 0) > 0) reasons.push("user interaction");

  return {
    interests,
    intent,
    segment_clues: segments,
    confidence,
    value_estimate: value,
    reasoning: {
      explanation: reasons.length
        ? "Profile inferred from " + reasons.join(", ") + "."
        : "Profile inferred from observed site activity."
    }
  };
}

boot().catch((err) => {
  document.getElementById("profileTitle").textContent = "ShadowProfile could not load";
  document.getElementById("profileSummary").textContent = String(err);
  console.error("POPUP_V2_BOOT_FAIL", err);
});