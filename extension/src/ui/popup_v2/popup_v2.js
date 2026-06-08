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
    "avatar-profile-quiet"
  );

  const b = String(badge || "").toLowerCase();

  if(b === "ai") avatar.classList.add("avatar-profile-ai");
  else if(b === "bag") avatar.classList.add("avatar-profile-shopping");
  else if(b === "play") avatar.classList.add("avatar-profile-video");
  else if(b === "news") avatar.classList.add("avatar-profile-news");
  else if(b === "care") avatar.classList.add("avatar-profile-care");
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
