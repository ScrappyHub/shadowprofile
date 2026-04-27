export function startDomObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      chrome.runtime.sendMessage({
        type: "DOM_MUTATION",
        payload: {
          addedNodes: mutation.addedNodes?.length || 0,
          removedNodes: mutation.removedNodes?.length || 0,
          attributeName: mutation.attributeName || null
        }
      });
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true
  });
}