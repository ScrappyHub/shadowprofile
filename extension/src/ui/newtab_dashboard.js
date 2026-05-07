async function renderBaseline() {
  let result = await chrome.storage.local.get("baseline_profile");
  let profile = result.baseline_profile || {};

  let container = document.getElementById("profile-summary");
  container.innerHTML = `
    <p>Timestamp: ${profile.timestamp || "N/A"}</p>
    <p>Total Cookies: ${profile.total_cookies || 0}</p>
    <p>Total History Items: ${profile.total_history_items || 0}</p>
    <p>LocalStorage Keys: ${profile.local_storage_keys ? profile.local_storage_keys.length : 0}</p>
    <p>Inferred Interests: ${profile.inferred_interests ? profile.inferred_interests.join(', ') : "none"}</p>
  `;
}

renderBaseline();