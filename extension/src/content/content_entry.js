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