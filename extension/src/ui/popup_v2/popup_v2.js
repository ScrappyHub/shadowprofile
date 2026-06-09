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
    "Profile Read: " + mirror.confidence,
    "Profile Strength: " + mirror.value,
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
  const sources = Array.isArray(info.sources) ? info.sources : [];
  const rows = [];

  const add = (label, value, note) => rows.push({label, value, note});

  add("Profile state", info.profile_state || "new", info.headline || "No strong browser-visible memory found yet.");

  if(Number(counts.cookie_events || 0) > 0){
    add("Cookies", String(counts.cookie_events), "Browser-visible cookie memory helped build this mirror.");
  }

  if(Number(counts.storage_events || 0) > 0){
    add("Site storage", String(counts.storage_events), "Browser-visible site storage helped build this mirror.");
  }

  if(Number(counts.total_events || 0) > 0){
    add("Observed activity", String(counts.total_events), "ShadowProfile observed local activity on this site.");
  }

  if(Number(counts.user_action_events || 0) > 0){
    add("User actions", String(counts.user_action_events), "Clicks, visits, or interaction patterns shaped this profile.");
  }

  for(const source of sources.slice(0,8)){
    add(pillText(source), "seen", "Used as evidence for this local mirror.");
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
    item.innerHTML = "<strong>" + row.label + "</strong><span>" + row.value + "</span><p>" + row.note + "</p>";
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
  setTextSafe("confidenceBadge", "Profile Read: " + mirror.confidence);
  setTextSafe("valueBadge", "Profile Strength: " + mirror.value);
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

  setTextSafe("whyText", persistenceInfo.headline + " Wiping resets ShadowProfile local mirror and browser-visible memory when permitted. It cannot erase data already stored on the website servers.");

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
