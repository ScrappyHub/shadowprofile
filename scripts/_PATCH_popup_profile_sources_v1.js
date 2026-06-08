const fs = require("fs");

const root = "C:/dev/shadowprofile";
const htmlPath = root + "/extension/src/ui/popup_v2/popup_v2.html";
const jsPath = root + "/extension/src/ui/popup_v2/popup_v2.js";
const cssPath = root + "/extension/src/ui/popup_v2/popup_v2.css";

function write(path, text) {
  fs.writeFileSync(path, text.replace(/\r\n/g, "\n") + (text.endsWith("\n") ? "" : "\n"), "utf8");
}

let html = fs.readFileSync(htmlPath, "utf8");

if (!html.includes("quickStats")) {
  html = html.replace(
    /(<div[^>]*id="valueBadge"[\s\S]*?<\/div>)/,
    `$1
    <div id="quickStats" class="quick-stats">
      <div><strong id="quickEvents">--</strong><span>Events</span></div>
      <div><strong id="quickCookies">--</strong><span>Cookies</span></div>
      <div><strong id="quickSources">--</strong><span>Sources</span></div>
      <div><strong id="quickState">--</strong><span>State</span></div>
    </div>`
  );
}

html = html.replace(/At a glance/g, "What built this profile");

if (!html.includes("profileSources")) {
  html = html.replace(
    /(<[^>]*id="totalEvents"[\s\S]*?<[^>]*id="sessionTime"[\s\S]*?<\/[^>]+>)/,
    `<div id="profileSources" class="source-list"></div>`
  );
}

write(htmlPath, html);

let js = fs.readFileSync(jsPath, "utf8");

if (!js.includes("function renderProfileSources")) {
  const helper = `
function renderProfileSources(info, state){
  const el = document.getElementById("profileSources");
  if(!el) return;

  const counts = safeObject(state.counts);
  const signals = safeObject(state.signal_breakdown);
  const sources = Array.isArray(info.sources) ? info.sources : [];

  const rows = [];

  const add = (label, value, note) => {
    rows.push({ label, value, note });
  };

  add("Browser-visible memory", info.profile_state || "new", info.headline || "No strong browser-visible memory found yet.");

  for(const source of sources.slice(0,8)){
    add(pillText(source), "seen", "Used as evidence for this local mirror.");
  }

  if(Number(counts.cookie_events || 0) > 0){
    add("Cookies", String(counts.cookie_events), "This site left browser-visible cookie memory.");
  }

  if(Number(counts.storage_events || 0) > 0){
    add("Site storage", String(counts.storage_events), "This site used browser-visible storage.");
  }

  for(const [name,count] of Object.entries(signals)){
    if(Number(count || 0) > 0){
      add(pillText(name), String(count), "Behavior signal observed locally.");
    }
  }

  el.innerHTML = "";

  for(const row of rows.slice(0,10)){
    const item = document.createElement("div");
    item.className = "source-item";
    item.innerHTML = `<strong>${row.label}</strong><span>${row.value}</span><p>${row.note}</p>`;
    el.appendChild(item);
  }
}
`;
  js = js.replace("async function send(type,payload){ return chrome.runtime.sendMessage({type,payload}); }", helper + "\nasync function send(type,payload){ return chrome.runtime.sendMessage({type,payload}); }");
}

if (!js.includes("quickEvents")) {
  js = js.replace(
    `setTextSafe("sessionTime", fmtDuration(counts.duration_ms || 0));`,
    `setTextSafe("sessionTime", fmtDuration(counts.duration_ms || 0));

  setTextSafe("quickEvents", counts.total_events ?? 0);
  setTextSafe("quickCookies", counts.cookie_events ?? 0);
  setTextSafe("quickSources", Array.isArray(persistenceInfo.sources) ? persistenceInfo.sources.length : 0);
  setTextSafe("quickState", persistenceInfo.profile_state || "new");
  renderProfileSources(persistenceInfo,state);`
  );
}

write(jsPath, js);

let css = fs.readFileSync(cssPath, "utf8");

if (!css.includes("SHADOWPROFILE_PROFILE_SOURCES_V1")) {
  css += `

/* SHADOWPROFILE_PROFILE_SOURCES_V1 */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 14px;
}

.quick-stats div {
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  border-radius: 14px;
  padding: 9px 8px;
}

.quick-stats strong {
  display: block;
  font-size: 18px;
  color: #35d7ff;
  line-height: 1.1;
}

.quick-stats span {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  opacity: .72;
}

.source-list {
  display: grid;
  gap: 9px;
  margin-top: 10px;
}

.source-item {
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
  border-radius: 14px;
  padding: 10px 11px;
}

.source-item strong {
  display: inline-block;
  color: #fff;
  font-size: 13px;
}

.source-item span {
  float: right;
  color: #35d7ff;
  font-weight: 800;
  font-size: 12px;
  text-transform: capitalize;
}

.source-item p {
  clear: both;
  margin: 5px 0 0;
  opacity: .72;
  font-size: 12px;
  line-height: 1.35;
}
`;
}

write(cssPath, css);

console.log("PATCH_POPUP_PROFILE_SOURCES_V1_OK");
