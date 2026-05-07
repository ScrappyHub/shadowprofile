const HISTORY_KEY = "shadowprofile_session_history_v1";
const MAX_HISTORY_ITEMS = 100;

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

export async function appendSessionHistory(entry) {
  const current = await chrome.storage.local.get([HISTORY_KEY]);
  const history = Array.isArray(current[HISTORY_KEY]) ? current[HISTORY_KEY] : [];

  history.push({
    ts: Date.now(),
    domain: String(entry?.domain || "unknown"),
    artifact_sha256: String(entry?.artifact_sha256 || ""),
    artifact_type: String(entry?.artifact_type || ""),
    scores: cloneJson(safeObject(entry?.scores)),
    signals: cloneJson(safeObject(entry?.signals)),
    vendors: cloneJson(safeObject(entry?.vendors)),
    categories: cloneJson(safeObject(entry?.categories))
  });

  const trimmed = history.slice(-MAX_HISTORY_ITEMS);
  await chrome.storage.local.set({ [HISTORY_KEY]: trimmed });
  return trimmed;
}

export async function getSessionHistory() {
  const current = await chrome.storage.local.get([HISTORY_KEY]);
  return Array.isArray(current[HISTORY_KEY]) ? current[HISTORY_KEY] : [];
}

export async function clearSessionHistory() {
  await chrome.storage.local.set({ [HISTORY_KEY]: [] });
  return [];
}
