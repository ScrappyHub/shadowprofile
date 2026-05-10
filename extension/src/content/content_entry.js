(function () {
  if (!location || !/^https?:$/i.test(location.protocol)) {
    return;
  }
  function send(type, payload) {
    try {
      chrome.runtime.sendMessage({
        type,
        payload: payload || {}
      });
    } catch {
    }
  }

  function looksLikeCartText(text) {
    const t = String(text || "").toLowerCase();
    return (
      t.includes("add to cart") ||
      t.includes("add to bag") ||
      t.includes("add to basket") ||
      t.includes("buy now") ||
      t.includes("checkout")
    );
  }

  function extractElementText(el) {
    if (!el) return "";
    return (
      el.innerText ||
      el.textContent ||
      el.getAttribute?.("aria-label") ||
      el.getAttribute?.("title") ||
      ""
    ).trim();
  }

  function sendUserAction(kind, extra) {
    send("USER_ACTION", {
      kind,
      ...(extra || {})
    });
  }

  function sendCartSignal(source, extra) {
    send("CART_SIGNAL", {
      source,
      ...(extra || {})
    });
  }

  function registerClickSignals() {
    document.addEventListener("click", (event) => {
      const target = event.target && event.target.closest
        ? event.target.closest("button, a, input[type='button'], input[type='submit'], [role='button']")
        : null;

      const text = extractElementText(target || event.target);

      sendUserAction("click", {
        text: text.slice(0, 120)
      });

      if (looksLikeCartText(text)) {
        sendCartSignal("click_text_match", {
          text: text.slice(0, 120)
        });
      }
    }, true);
  }

  function registerInputSignals() {
    document.addEventListener("input", () => {
      sendUserAction("input", {});
    }, true);
  }

  function registerCartMutationSignals() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target;
        const text = extractElementText(target);

        if (looksLikeCartText(text)) {
          sendCartSignal("dom_mutation_match", {
            text: text.slice(0, 120)
          });
          return;
        }
      }
    });

    const root = document.documentElement || document.body || document;
    if (!root) return;

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function init() {
    registerClickSignals();
    registerInputSignals();
    registerCartMutationSignals();
    console.log("SHADOWPROFILE_CONTENT_OK");
  }

  init();
})();

/* SHADOWPROFILE_CAPTURE_COVERAGE_SIMPLE_V1 */
(() => {
  const seen = new Set();

  function category(url) {
    const u = String(url || "").toLowerCase();
    if (u.includes("youtubei/v1/player") || u.includes("youtubei/v1/next") || u.includes("youtubei/v1/browse")) return "recommendation";
    if (u.includes("googlevideo") || u.includes("videoplayback")) return "video_delivery";
    if (u.includes("analytics") || u.includes("/collect") || u.includes("/log")) return "telemetry";
    if (u.includes("beacon") || u.includes("ptracking")) return "beacon";
    if (u.includes("graphql") || u.includes("/api/")) return "app_api";
    return "site_activity";
  }

  function sendSignal(kind, url, extra = {}) {
    try {
      const key = kind + "|" + String(url || "");
      if (seen.has(key)) return;
      seen.add(key);

      chrome.runtime.sendMessage({
        type: "USER_ACTION",
        payload: {
          domain: location.hostname.toLowerCase(),
          kind: "deep_scan_signal",
          signal_source: kind,
          signal_category: category(url),
          signal_url: String(url || location.href).slice(0, 500),
          path: location.pathname || "/",
          ...extra
        }
      });
    } catch {}
  }

  if (window.fetch && !window.__spFetchCoverageV1) {
    window.__spFetchCoverageV1 = true;
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === "string" ? input : ((input && input.url) || "");
      sendSignal("fetch", url);
      return originalFetch.apply(this, arguments);
    };
  }

  if (window.XMLHttpRequest && !window.__spXhrCoverageV1) {
    window.__spXhrCoverageV1 = true;
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      sendSignal("xhr", url, { method: String(method || "GET") });
      return open.apply(this, arguments);
    };
  }

  try {
    const obs = new PerformanceObserver((list) => {
      for (const r of list.getEntries()) {
        sendSignal("performance", r.name || "", {
          initiatorType: r.initiatorType || "resource"
        });
      }
    });
    obs.observe({ entryTypes: ["resource"] });
  } catch {}

  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      sendSignal("spa_navigation", location.href);
    }
  }, 1000);

  let sentScroll = false;
  window.addEventListener("scroll", () => {
    if (!sentScroll && window.scrollY > 600) {
      sentScroll = true;
      sendSignal("engaged_scroll", location.href, { scrollY: window.scrollY });
    }
  }, { passive: true });

  document.addEventListener("click", (e) => {
    const target = e.target && e.target.closest ? e.target.closest("a,button,[role='button'],ytd-thumbnail,ytd-video-renderer") : null;
    if (!target) return;
    sendSignal("click", target.href || location.href, {
      text: String(target.innerText || target.ariaLabel || target.title || "").slice(0, 120)
    });
  }, true);

  console.log("SHADOWPROFILE_CAPTURE_COVERAGE_SIMPLE_V1");
})();
