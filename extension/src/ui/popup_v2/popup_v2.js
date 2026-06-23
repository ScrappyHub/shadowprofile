const SIGNAL_LABELS = {
  beacon: "Background telemetry requests",
  telemetry: "Usage measurement activity",
  tracking_pixel: "Tracking pixels",
  recommendation: "Recommendation activity",
  cart: "Shopping/cart activity",
  checkout: "Checkout activity",
  search: "Search behavior",
  ai: "AI interaction patterns",
  news: "News reading activity",
  video_delivery: "Video delivery activity",
  video: "Video engagement activity",
  third_party: "Third-party network activity"
};

function friendlySignalName(name){
  const key = String(name || "");
  return SIGNAL_LABELS[key] || pillText(key);
}

function profileMaturity(counts){
  const c = safeObject(counts);
  const totalEvents = Number(c.total_events || 0);
  const cookieEvents = Number(c.cookie_events || 0);
  if(cookieEvents > 0 && totalEvents > 500) return "Established";
  if(totalEvents > 50) return "Developing";
  return "Emerging";
}

function renderReasons(mirror, persistenceInfo){
  const el = document.getElementById("profileReasons");
  if(!el) return;

  const reasons = Array.isArray(mirror.reasons) ? mirror.reasons : [];
  const rendered = [];

  for(const reason of reasons){
    const label = friendlyReason(reason);
    if(label && !rendered.includes(label)) rendered.push(label);
  }

  if(persistenceInfo && persistenceInfo.profile_state === "existing" && !rendered.includes("Existing browser-visible memory found")){
    rendered.push("Existing browser-visible memory found");
  }

  if(rendered.length === 0){
    rendered.push("ShadowProfile is waiting for stronger browser-visible evidence.");
  }

  el.innerHTML = "";

  for(const reason of rendered.slice(0,7)){
    const item = document.createElement("div");
    item.className = "reason-item";
    item.textContent = "- " + reason;
    el.appendChild(item);
  }
}

function friendlyReason(reason){
  const r = String(reason || "").toLowerCase();

  if(r.includes("ai") || r.includes("assistant")) return "AI-related interaction patterns detected";
  if(r.includes("repeated interaction")) return "Repeated interaction patterns observed";
  if(r.includes("cookie") || r.includes("browser memory")) return "Existing browser-visible memory found";
  if(r.includes("telemetry")) return "Background telemetry activity detected";
  if(r.includes("cart") || r.includes("shopping") || r.includes("purchase")) return "Shopping and purchase-intent behavior observed";
  if(r.includes("recommendation")) return "Recommendation systems were active";
  if(r.includes("news") || r.includes("media")) return "News or media-reading activity detected";
  if(r.includes("search")) return "Search and information-gathering behavior detected";
  if(r.includes("education") || r.includes("coursework")) return "Learning or coursework activity detected";
  if(r.includes("developer") || r.includes("documentation")) return "Developer or technical research activity detected";
  if(r.includes("home improvement")) return "Home project research activity detected";
  if(r.includes("reference")) return "Reference or learning behavior detected";
  if(r.includes("early")) return "Early browser-visible activity detected";
  if(r.includes("no strong")) return "No strong browser-visible evidence yet";

  return reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : "";
}

import { inferMirrorProfile, inspectPersistenceSources } from "./mirror_reasoning.js";
function setAvatarProfileClass(badge){
  const avatar = document.querySelector(".avatar");
  if(!avatar) return;

  avatar.classList.remove(
    "avatar-profile-ai",
    "avatar-profile-shopping",
    "avatar-profile-video",
    "avatar-profile-news",
    "avatar-profile-care",
    "avatar-profile-gear",
    "avatar-profile-home",
    "avatar-profile-search",
    "avatar-profile-mail",
    "avatar-profile-dev",
    "avatar-profile-social",
    "avatar-profile-ref",
    "avatar-profile-build",
    "avatar-profile-quiet"
  );

  const b = String(badge || "").toLowerCase();

  if(b === "ai") avatar.classList.add("avatar-profile-ai");
  else if(b === "bag") avatar.classList.add("avatar-profile-shopping");
  else if(b === "play") avatar.classList.add("avatar-profile-video");
  else if(b === "news") avatar.classList.add("avatar-profile-news");
  else if(b === "care") avatar.classList.add("avatar-profile-care");
  else if(b === "gear") avatar.classList.add("avatar-profile-gear");
  else if(b === "home") avatar.classList.add("avatar-profile-home");
  else if(b === "search") avatar.classList.add("avatar-profile-search");
  else if(b === "mail") avatar.classList.add("avatar-profile-mail");
  else if(b === "dev") avatar.classList.add("avatar-profile-dev");
  else if(b === "social") avatar.classList.add("avatar-profile-social");
  else if(b === "ref") avatar.classList.add("avatar-profile-ref");
  else if(b === "build") avatar.classList.add("avatar-profile-build");
  else avatar.classList.add("avatar-profile-quiet");
}
function setTextSafe(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHtmlSafe(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}
function safeObject(v){ return v && typeof v === "object" ? v : {}; }
function domainFromUrl(u){ try { return new URL(u).hostname.toLowerCase(); } catch { return "browser profile"; } }
function modeText(m){ return m === "DEEP_INSPECT" ? "Deep Scan" : "Eco Mode"; }
function fmtDuration(ms){ if(!ms) return "--"; const m=Math.max(1,Math.round(ms/60000)); return m>=60 ? Math.floor(m/60)+"h "+(m%60)+"m" : m+"m"; }
function pillText(x){ return String(x || "").replaceAll("_"," "); }

async function currentTab(){
  const tabs = await chrome.tabs.query({active:true,currentWindow:true});
  return tabs && tabs[0] ? tabs[0] : null;
}

async function getState(domain){
  const r = await chrome.storage.local.get(["shadowprofile_domain_state","shadowprofile_runtime_mode","shadowprofile_deep_inspect_domain"]);
  const all = r.shadowprofile_domain_state || {};
  return {
    state: all[domain] || {},
    mode: r.shadowprofile_runtime_mode || "PASSIVE_DEFAULT",
    deepDomain: r.shadowprofile_deep_inspect_domain || null
  };
}

function buildMirror(domain,state){
  return inferMirrorProfile(domain,state);
}

function setPills(id, values){
  const el=document.getElementById(id);
  el.innerHTML="";
  for(const v of values.slice(0,6)){
    const s=document.createElement("span");
    s.className="pill";
    s.textContent=pillText(v);
    el.appendChild(s);
  }
}

function setList(id, values){
  const el=document.getElementById(id);
  el.innerHTML="";
  for(const v of values.slice(0,5)){
    const d=document.createElement("div");
    d.textContent = "- " + pillText(v);
    el.appendChild(d);
  }
}

function evidence(domain,state,mode,mirror){
  const c = safeObject(state.counts);
  const s = safeObject(state.signal_breakdown);

  const visibleSignals = Object.entries(s)
    .filter(([k,v]) => Number(v || 0) > 0)
    .map(([k,v]) => "- " + pillText(k) + ": " + String(v));

  return [
    "ShadowProfile Export",
    "",
    "Site: " + domain,
    "Mode: " + modeText(mode),
    "Profile: " + mirror.title,
    "Site Familiarity: " + mirror.confidence,
    "Profile Confidence: " + mirror.value,
    "",
    "What you look like:",
    mirror.interests.map(x => "- " + pillText(x)).join("\n"),
    "",
    "What you may be doing:",
    mirror.doing.map(x => "- " + pillText(x)).join("\n"),
    "",
    "Why ShadowProfile thinks this:",
    mirror.reasons.length
      ? mirror.reasons.map(x => "- " + pillText(x)).join("\n")
      : "- observed site activity",
    "",
    "Activity snapshot:",
    "- Total events: " + (c.total_events || 0),
    "- Cookie events: " + (c.cookie_events || 0),
    "- User actions: " + (c.user_action_events || 0),
    "",
    "Visible behavior signals:",
    visibleSignals.length ? visibleSignals.join("\n") : "- no strong categorized signals yet",
    "",
    "Privacy note:",
    "This export is generated locally. ShadowProfile does not need remote servers to explain this profile."
  ].join("\n");
}

function renderProfileSources(info, state){
  const el = document.getElementById("profileSources");
  if(!el) return;

  const counts = safeObject(state.counts);
  const signals = safeObject(state.signal_breakdown);

  const cookieCount = Number(counts.cookie_events || 0);
  const storageCount = Number(counts.storage_events || 0);
  const eventCount = Number(counts.total_events || 0);
  const actionCount = Number(counts.user_action_events || 0);

  const plural = (n,singular,pluralText) => Number(n) === 1 ? singular : (pluralText || singular + "s");

  const signalRows = Object.entries(signals)
    .filter(([name,count]) => Number(count || 0) > 0)
    .map(([name,count]) => ({
      label: friendlySignalName(name),
      value: String(count)
    }));

  const stateLabel =
    info.profile_state === "existing"
      ? "Existing browser memory"
      : info.profile_state === "building"
        ? "Building profile"
        : "Watching for evidence";

  const rows = [];

  rows.push({
    label: "Profile state",
    value: stateLabel,
    note: info.headline || "ShadowProfile is checking browser-visible evidence."
  });

  rows.push({
    label: "Cookies found",
    value: String(cookieCount),
    note: cookieCount > 0 ? cookieCount + " " + plural(cookieCount, "browser-visible cookie observation") + " detected." : "No browser-visible cookie evidence yet."
  });

  rows.push({
    label: "Observed activity",
    value: eventCount + " " + plural(eventCount, "event"),
    note: eventCount > 0 ? eventCount + " " + plural(eventCount, "event") + " observed locally." : "No observed activity yet."
  });

  rows.push({
    label: "Interaction history",
    value: actionCount + " " + plural(actionCount, "action"),
    note: actionCount > 0 ? actionCount + " " + plural(actionCount, "interaction") + " observed locally." : "No interaction pattern observed yet."
  });

  if(storageCount > 0){
    rows.push({
      label: "Site storage",
      value: storageCount + " records",
      note: "Browser-visible site storage helped build this profile."
    });
  }

  if(signalRows.length > 0){
    rows.push({
      label: "Behavior signals",
      value: String(signalRows.length),
      note: signalRows.map(x => x.label + " (" + x.value + ")").join(", ")
    });
  }

  rows.push({
    label: "What wiping changes",
    value: "Local only",
    note: "Clears the ShadowProfile local profile and resets local confidence. It may remove visible browser storage when permission allows."
  });

  rows.push({
    label: "What wiping cannot erase",
    value: "Server data",
    note: "It cannot delete account history, website server records, or third-party data already collected outside browser-visible storage."
  });

  el.innerHTML = "";

  for(const row of rows){
    const item = document.createElement("div");
    item.className = "source-item";

    const top = document.createElement("div");
    top.className = "source-top";

    const label = document.createElement("strong");
    label.textContent = row.label;

    const value = document.createElement("span");
    value.className = "source-value";
    value.textContent = row.value;

    const note = document.createElement("p");
    note.textContent = row.note;

    top.appendChild(label);
    top.appendChild(value);
    item.appendChild(top);
    item.appendChild(note);
    el.appendChild(item);
  }
}
async function send(type,payload){ return chrome.runtime.sendMessage({type,payload}); }

async function boot(){
  const tab=await currentTab();
  const domain=domainFromUrl(tab?.url || "");
  const loaded=await getState(domain);
  const state=loaded.state;
  const counts=safeObject(state.counts);
  const scores=safeObject(state.scores);
  const mirror=buildMirror(domain,state); const persistenceInfo = inspectPersistenceSources(domain,state);
  const active=loaded.mode==="DEEP_INSPECT" && loaded.deepDomain===domain;

  setTextSafe("siteName", domain);
  setTextSafe("modeBadge", modeText(loaded.mode));
  setTextSafe("modeLabel", modeText(loaded.mode));
  setTextSafe("toggleScan", active ? "Stop Deep Scan" : "Start Deep Scan");
  setTextSafe("profileTitle", mirror.title);
  setTextSafe("profileSummary", mirror.summary);
  setTextSafe("avatarBadge", mirror.badge); setAvatarProfileClass(mirror.badge);
  setTextSafe("confidenceBadge", "Site Familiarity: " + mirror.confidence);
  setTextSafe("valueBadge", "Profile Confidence: " + mirror.value); setTextSafe("maturityBadge", "Profile Maturity: " + profileMaturity(counts));
  setTextSafe("confidence", mirror.confidence);
  setTextSafe("value", mirror.value);

  setPills("lookPills",mirror.interests);
  setList("doingList",mirror.doing);

  setTextSafe("trackingScore", scores.tracking ?? 0);
  setTextSafe("personalScore", scores.personalization ?? 0);
  setTextSafe("persistScore", scores.persistence ?? 0);
  setTextSafe("transScore", scores.transparency ?? 100);

  setTextSafe("totalEvents", counts.total_events ?? 0);
  setTextSafe("cookieEvents", counts.cookie_events ?? 0);
  setTextSafe("platformsSeen", Object.keys(safeObject(safeObject(state.request_classification).vendors)).length || 1);
  setTextSafe("sessionTime", fmtDuration(counts.duration_ms || 0));

  setTextSafe("quickEvents", counts.total_events ?? 0);
  setTextSafe("quickCookies", counts.cookie_events ?? 0);
  setTextSafe("quickSources", Array.isArray(persistenceInfo.sources) ? persistenceInfo.sources.length : 0);
  setTextSafe("quickState", persistenceInfo.profile_state || "new");
  renderProfileSources(persistenceInfo,state);
  renderReasons(mirror,persistenceInfo);

  setTextSafe("whyText", persistenceInfo.headline + " Wiping resets ShadowProfile local profile and browser-visible memory when permitted. It cannot erase data already stored on the website servers.");

  setTextSafe("evidenceText", evidence(domain,state,loaded.mode,mirror));

  document.getElementById("toggleScan").onclick=async()=>{
    await send("CONTROL_SET_MODE",{mode:active?"PASSIVE_DEFAULT":"DEEP_INSPECT",domain});
    location.reload();
  };
  document.getElementById("resetBtn").onclick=async()=>{
    await send("CONTROL_RESET_DOMAIN",{domain});
    location.reload();
  };
  const openWorkbenchBtn = document.getElementById("openWorkbench"); if(openWorkbenchBtn){ openWorkbenchBtn.onclick=()=>chrome.runtime.openOptionsPage(); } document.getElementById("exportBtn").onclick=()=>{
    const blob=new Blob([document.getElementById("evidenceText").textContent],{type:"text/plain"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="shadowprofile_"+domain.replace(/[^a-z0-9.-]+/gi,"_")+".txt";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
}

boot().catch(err=>{
  console.error("POPUP_V2_FAIL",err);
  setTextSafe("profileTitle", "ShadowProfile could not load");
  setTextSafe("profileSummary", String(err));
});
