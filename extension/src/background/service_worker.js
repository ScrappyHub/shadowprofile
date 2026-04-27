import { registerTabCapture } from "./capture_tabs.js";
import { registerCookieCapture } from "./capture_cookies.js";
import { registerRequestCapture, flushRequestCaptureBuffer } from "./capture_requests.js";
import { applyEventToStoredDomainState, clearDomainState, appendDomainRunLog, closeDeepInspectRun } from "../storage/domain_state.js";

const SHADOWPROFILE_RUNTIME_MODE = "PASSIVE_DEFAULT";

async function setRuntimeMode(mode = SHADOWPROFILE_RUNTIME_MODE, deepInspectDomain = null) {
  const expiresAt = mode === "DEEP_INSPECT"
    ? Date.now() + (1000 * 60 * 10)
    : null;

  await chrome.storage.local.set({
    shadowprofile_runtime_mode: mode,
    shadowprofile_deep_inspect_domain: deepInspectDomain,
    shadowprofile_deep_inspect_started_at: mode === "DEEP_INSPECT" ? Date.now() : null,
    shadowprofile_deep_inspect_expires_at: expiresAt
  });
}

function getHostname(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

function buildLightweightMessageEvent(tabUrl, domain, tabId, payload) {
  return {
    id: "evt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    ts: Date.now(),
    type: "user_action",
    url: tabUrl,
    domain,
    tabId: tabId ?? null,
    payload: payload || {}
  };
}

function registerMessageCapture() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    Promise.resolve().then(async () => {
      const tabUrl = sender?.tab?.url || "about:blank";
      const payloadDomain = message?.payload?.domain || null;
      const domain = payloadDomain || getHostname(tabUrl);
      const tabId = sender?.tab?.id ?? null;

      if (message?.type === "USER_ACTION") {
        const event = buildLightweightMessageEvent(tabUrl, domain, tabId, {
          capture_origin: "content_script",
          ...(message.payload || {})
        });

        await applyEventToStoredDomainState(domain, event);
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "CART_SIGNAL") {
        const event = buildLightweightMessageEvent(tabUrl + "#cart-signal", domain, tabId, {
          capture_origin: "content_script",
          kind: "cart_signal",
          ...(message.payload || {})
        });

        await applyEventToStoredDomainState(domain, event);
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "CONTROL_RESET_DOMAIN") {
        const targetDomain = message?.payload?.domain || domain;
        await flushRequestCaptureBuffer();
        await clearDomainState(targetDomain);
        await setRuntimeMode("PASSIVE_DEFAULT", null);
        sendResponse({ ok: true, domain: targetDomain, mode: "PASSIVE_DEFAULT" });
        return;
      }

      if (message?.type === "CONTROL_SET_MODE") {
        const mode = message?.payload?.mode || SHADOWPROFILE_RUNTIME_MODE;
        const targetDomain = message?.payload?.domain || domain;
        const deepInspectDomain = mode === "DEEP_INSPECT" ? targetDomain : null;

        if (mode === "DEEP_INSPECT") {
          await setRuntimeMode(mode, deepInspectDomain);
          await appendDomainRunLog(targetDomain, "Deep Inspect started");
        } else {
          await flushRequestCaptureBuffer();

          // Hard barrier before snapshotting Deep Inspect summary.
          await new Promise((resolve) => setTimeout(resolve, 100));

          await closeDeepInspectRun(targetDomain);
          await setRuntimeMode(mode, null);
        }

        sendResponse({ ok: true, mode, deepInspectDomain });
        return;
      }

      sendResponse({ ok: false, reason: "UNKNOWN_MESSAGE" });
    }).catch((err) => {
      console.error("MESSAGE_CAPTURE_FAIL", err);
      sendResponse({ ok: false, error: String(err) });
    });

    return true;
  });
}

async function boot() {
  registerTabCapture();
  registerCookieCapture();
  registerRequestCapture();
  registerMessageCapture();

  await setRuntimeMode();

  console.log("SHADOWPROFILE_BOOT_OK", {
    mode: SHADOWPROFILE_RUNTIME_MODE,
    request_capture_enabled: true
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setRuntimeMode().catch((err) => {
    console.error("SET_RUNTIME_MODE_FAIL_ON_INSTALL", err);
  });
});

chrome.runtime.onStartup.addListener(() => {
  setRuntimeMode().catch((err) => {
    console.error("SET_RUNTIME_MODE_FAIL_ON_STARTUP", err);
  });
});

boot().catch((err) => {
  console.error("SHADOWPROFILE_BOOT_FAIL", err);
});