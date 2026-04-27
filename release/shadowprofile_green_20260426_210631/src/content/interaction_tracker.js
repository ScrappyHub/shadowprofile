export function startInteractionTracker() {
  document.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "USER_CLICK",
      payload: {}
    });
  });

  document.addEventListener("input", () => {
    chrome.runtime.sendMessage({
      type: "USER_INPUT",
      payload: {}
    });
  });
}