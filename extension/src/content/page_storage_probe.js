function wrapStorage(storage, type) {
  const originalSetItem = storage.setItem;

  storage.setItem = function (key, value) {
    chrome.runtime.sendMessage({
      type: "STORAGE_WRITE",
      payload: {
        key,
        storageArea: type
      }
    });

    return originalSetItem.apply(this, arguments);
  };
}

export function startStorageProbe() {
  try {
    wrapStorage(window.localStorage, "local_storage");
    wrapStorage(window.sessionStorage, "session_storage");
  } catch (err) {
    console.warn("Storage probe failed", err);
  }
}