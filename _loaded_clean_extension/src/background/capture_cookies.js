import { EVENT_TYPES, EVENT_SOURCES } from "../shared/constants.js";
import { createEvidenceEvent } from "../analysis/event_schema.js";
import { applyEventToStoredDomainState } from "../storage/domain_state.js";

function domainFromCookie(changeInfo) {
  return String(changeInfo?.cookie?.domain || "").replace(/^\./, "").toLowerCase() || "unknown";
}

function eventTypeFromCookieChange(changeInfo) {
  if (changeInfo.removed) {
    return EVENT_TYPES.COOKIE_DELETED;
  }
  if (changeInfo.cause === "overwrite") {
    return EVENT_TYPES.COOKIE_CHANGED;
  }
  return EVENT_TYPES.COOKIE_SET;
}

export function registerCookieCapture() {
  chrome.cookies.onChanged.addListener(async (changeInfo) => {
    try {
      const domain = domainFromCookie(changeInfo);
      const cookie = changeInfo.cookie || {};

      const event = createEvidenceEvent({
        type: eventTypeFromCookieChange(changeInfo),
        source: EVENT_SOURCES.BACKGROUND,
        url: "https://" + domain + "/",
        domain,
        payload: {
          cookieName: cookie.name || null,
          cookieDomain: cookie.domain || null,
          path: cookie.path || null,
          secure: Boolean(cookie.secure),
          httpOnly: Boolean(cookie.httpOnly),
          sameSite: cookie.sameSite || null,
          expirationDate: cookie.expirationDate || null,
          cause: changeInfo.cause || null,
          removed: Boolean(changeInfo.removed),
          storageArea: "cookie"
        }
      });

      await applyEventToStoredDomainState(domain, event);
    } catch (err) {
      console.warn("COOKIE_CAPTURE_FAIL", err);
    }
  });
}