/*
LIGHTWEIGHT MODE ENABLED

This file is intentionally reduced to no-op handlers
to prevent heavy background recomputation.

All analysis should move to on-demand popup/dashboard flows.
*/

export async function attachEventToSession(sessionId, event) {
  return null;
}

export async function endSession(sessionId) {
  return null;
}

export async function refreshSiteProfile(domain) {
  return null;
}