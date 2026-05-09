import { getBrowserProfileData } from "../storage/browser_baseline.js";
async function renderBrowserBaselineDashboard() {
    const baseline = await getBrowserProfileData();
    const container = document.getElementById("browser-baseline-dashboard");
    container.innerHTML = `
      <h2>Browser Profile Overview</h2>
      <ul>
        <li><strong>Interests:</strong> ${baseline.interests.join(", ")}</li>
        <li><strong>Cookies:</strong> ${baseline.totalCookies} (${baseline.cookieDomains} domains)</li>
        <li><strong>History Sample:</strong> ${baseline.historySample} (${baseline.historyDomains} domains)</li>
        <li><strong>Confidence:</strong> ${baseline.confidence}</li>
        <li><strong>Total Visits Recorded:</strong> ${baseline.totalVisits}</li>
        <li><strong>Total Events:</strong> ${baseline.totalEvents}</li>
      </ul>
    `;
}
document.addEventListener("DOMContentLoaded", renderBrowserBaselineDashboard);
