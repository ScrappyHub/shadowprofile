const STORAGE_KEYS = Object.freeze({
  SITE_PROFILES: "shadowprofile_site_profiles"
});

export async function getObject(key, fallback = {}) {
  const result = await chrome.storage.local.get([key]);
  return result[key] && typeof result[key] === "object" ? result[key] : fallback;
}

export async function getSiteProfiles() {
  return await getObject(STORAGE_KEYS.SITE_PROFILES, {});
}

export async function upsertSiteProfile(profile) {
  const profiles = await getSiteProfiles();
  profiles[profile.domain] = profile;
  await chrome.storage.local.set({ [STORAGE_KEYS.SITE_PROFILES]: profiles });
  return profile;
}

/*
LIGHTWEIGHT MODE:
Hot-path event/session storage is disabled.
These are retained as no-op compatibility shims so the runtime does not crash.
*/

export async function appendEvent(event) {
  return null;
}

export async function upsertSession(session) {
  return session;
}

export async function getSessions() {
  return {};
}

export async function setLastActiveTab(tabId, sessionId) {
  return null;
}

export async function getLastActiveSessionIdForTab(tabId) {
  return null;
}