const BASELINE_KEY = "shadowprofile_browser_baseline_v1";

function $(id) {
  return document.getElementById(id);
}

function formatMap(map) {
  const entries = Object.entries(map || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 10);

  if (entries.length === 0) {
    return "No local evidence observed yet.";
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join("\n");
}

function downloadJson(filename, value) {
  const text = JSON.stringify(value, null, 2);
  const blob = new Blob([text + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function getBaseline() {
  const result = await chrome.storage.local.get(BASELINE_KEY);
  return result[BASELINE_KEY] || null;
}

async function refreshBaseline() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "CONTROL_REFRESH_BROWSER_BASELINE"
    });

    return response?.baseline || await getBaseline();
  } catch {
    return await getBaseline();
  }
}

function renderBaseline(profile) {
  if (!profile) {
    $("interests").textContent = "No baseline yet";
    $("confidence").textContent = "Click Refresh Baseline.";
    $("status").textContent = "No baseline profile found.";
    return;
  }

  const counts = profile.counts || {};
  const inferred = profile.inferred_profile || {};

  $("interests").textContent =
    Array.isArray(inferred.interests) && inferred.interests.length > 0
      ? inferred.interests.join(", ")
      : "No strong interests inferred yet";

  $("confidence").textContent = "Confidence: " + (inferred.confidence || "low");
  $("explanation").textContent =
    inferred.explanation || "Baseline inferred locally from browser-visible evidence.";

  $("cookies").textContent = String(counts.cookies || 0);
  $("history").textContent = String(counts.history_items_sampled_30d || 0);
  $("cookieDomains").textContent = String(counts.cookie_domains || 0);
  $("historyDomains").textContent = String(counts.history_domains || 0);

  $("categories").textContent = formatMap(profile.top_categories);
  $("cookieDomainList").textContent = formatMap(profile.top_cookie_domains);
  $("historyDomainList").textContent = formatMap(profile.top_history_domains);

  $("status").textContent =
    "Updated: " + new Date(profile.generated_at || Date.now()).toLocaleString();
}

async function boot() {
  let baseline = await getBaseline();

  if (!baseline) {
    baseline = await refreshBaseline();
  }

  renderBaseline(baseline);

  $("refresh").addEventListener("click", async () => {
    $("status").textContent = "Refreshingâ€¦";
    const next = await refreshBaseline();
    renderBaseline(next);
  });

  $("export").addEventListener("click", async () => {
    const latest = await getBaseline();

    if (!latest) {
      $("status").textContent = "No baseline available to export.";
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(`shadowprofile_browser_baseline_${stamp}.json`, latest);
    $("status").textContent = "Baseline JSON exported.";
  });
}

boot().catch((err) => {
  console.error("SHADOWPROFILE_DASHBOARD_FAIL", err);
  $("status").textContent = "ShadowProfile baseline failed to load.";
});
