import { EVENT_TYPES, EVENT_SOURCES } from "../shared/constants.js";
import { createEvidenceEvent, createSessionRecord } from "../analysis/event_schema.js";
import { incrementDomainSession, applyEventToStoredDomainState, forceFlushDomainState } from "../storage/domain_state.js";
import { attachEventToSession, endSession } from "./aggregate_sessions.js";

function getHostname(rawUrl) {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname || "unknown";
  } catch {
    return "unknown";
  }
}

function createSessionId(tabId, url) {
  const domain = getHostname(url);
  return "sess_" + String(tabId) + "_" + domain + "_" + Date.now();
}

async function safeGetTab(tabId) {
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return null;
  }
}

export function registerTabCapture() {
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await safeGetTab(activeInfo.tabId);
      if (!tab) {
        return;
      }

      const url = tab.url || "about:blank";
      const domain = getHostname(url);
      const sessionId = createSessionId(activeInfo.tabId, url);

      createSessionRecord({
        sessionId,
        startUrl: url,
        domain
      });

      await incrementDomainSession(domain);

      const event = createEvidenceEvent({
        type: EVENT_TYPES.TAB_ACTIVATED,
        source: EVENT_SOURCES.BACKGROUND,
        url,
        domain,
        tabId: activeInfo.tabId,
        payload: {
          windowId: activeInfo.windowId
        }
      });

      await applyEventToStoredDomainState(domain, event);
      await attachEventToSession(sessionId, event);
    } catch (err) {
      console.warn("TAB_ACTIVATED_CAPTURE_FAIL", err);
    }
  });

  chrome.tabs.onRemoved.addListener(async (tabId) => {
    try {
      await forceFlushDomainState();
      const sessionId = null;
      if (sessionId) {
        await endSession(sessionId);
      }
    } catch (err) {
      console.warn("TAB_REMOVED_CAPTURE_FAIL", err);
    }
  });

  chrome.webNavigation.onCompleted.addListener(async (details) => {
    try {
      if (details.frameId !== 0) {
        return;
      }

      const tabId = details.tabId;
      const url = details.url || "about:blank";
      const domain = getHostname(url);
      const sessionId = createSessionId(tabId, url);

      createSessionRecord({
        sessionId,
        startUrl: url,
        domain
      });

      await incrementDomainSession(domain);

      const event = createEvidenceEvent({
        type: EVENT_TYPES.PAGE_VISIT,
        source: EVENT_SOURCES.BACKGROUND,
        url,
        domain,
        tabId,
        frameId: details.frameId,
        payload: {
          transitionType: details.transitionType || null,
          transitionQualifiers: details.transitionQualifiers || []
        }
      });

      await applyEventToStoredDomainState(domain, event);
      await attachEventToSession(sessionId, event);
    } catch (err) {
      console.warn("WEBNAV_COMPLETED_CAPTURE_FAIL", err);
    }
  });
}