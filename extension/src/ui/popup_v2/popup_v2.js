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
  const counts=safeObject(state.counts);
  const signals=safeObject(state.signal_breakdown);
  const cats=safeObject(safeObject(state.request_classification).categories);
  const interests=[], doing=[], reasons=[];

  if(domain.includes("chatgpt") || domain.includes("openai")){
    interests.push("curious","information seeker","problem solver","AI assistant user");
    doing.push("asking questions & getting answers","researching or learning something","solving problems or troubleshooting","brainstorming or getting ideas");
    reasons.push("active tool use");
  }
  if(domain.includes("youtube") || signals.recommendation || signals.video_delivery){
    interests.push("video viewer","recommendation feed user","entertainment");
    doing.push("watching videos","responding to recommendations","browsing a feed");
    reasons.push("video and recommendation activity");
  }
  if(domain.includes("amazon") || domain.includes("ebay") || signals.cart || signals.checkout){
    interests.push("shopping","product research","comparison browsing");
    doing.push("exploring products","comparing options","showing purchase intent");
    reasons.push("shopping-related activity");
  }

  if((counts.user_action_events||0)>2 || (counts.total_events||0)>30){
    if(!doing.includes("active session")) doing.push("active session");
    reasons.push("repeated interaction");
  }

  if(interests.length===0) interests.push("low signal");
  if(doing.length===0) doing.push("not enough behavior yet");

  const signalTotal = Object.values(signals).reduce((a,b)=>a+Number(b||0),0);
  let confidence = signalTotal>12 || (counts.total_events||0)>80 ? "High" : signalTotal>3 || (counts.total_events||0)>20 ? "Medium" : "Low"; if(title !== "Quiet Profile" && title !== "Low-Signal Profile" && confidence === "Low") confidence = "Medium";
  let value = (counts.total_events||0)>40 || (counts.user_action_events||0)>2 ? "Mid" : "Low"; if(title !== "Quiet Profile" && title !== "Low-Signal Profile" && value === "Low") value = "Mid";

  let title="Quiet Profile", badge="?";
  let summary="Not much is visible yet. Deep Scan can help reveal what this site may be learning from your behavior.";

  if(domain.includes("chatgpt") || domain.includes("openai")){
    title="Research / Problem Solving Profile";
    badge="AI";
    summary="This site may see you as someone asking questions, solving problems, learning, or using AI as a thinking partner.";
  } else if(domain.includes("youtube")){
    title="Video Recommendation Profile";
    badge="play";
    summary="Platforms may see you as a video viewer whose attention can be shaped by recommendations and repeated engagement.";
  } else if(domain.includes("amazon")){
    title="Shopping Interest Profile";
    badge="bag";
    summary="Platforms may see you as someone exploring products, comparing options, or likely to respond to shopping prompts.";
  }

  return {title,badge,summary,interests,doing,confidence,value,reasons};
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
  const mirror=buildMirror(domain,state);
  const active=loaded.mode==="DEEP_INSPECT" && loaded.deepDomain===domain;

  setTextSafe("siteName", domain);
  setTextSafe("modeBadge", modeText(loaded.mode));
  setTextSafe("modeLabel", modeText(loaded.mode));
  setTextSafe("toggleScan", active ? "Stop Deep Scan" : "Start Deep Scan");
  setTextSafe("profileTitle", mirror.title);
  setTextSafe("profileSummary", mirror.summary);
  setTextSafe("avatarBadge", mirror.badge);
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

  setTextSafe("whyText", "Sites use patterns like these to personalize, rank, recommend, and predict what you may do next. ShadowProfile keeps this mirror local on your device.");

  setTextSafe("evidenceText", evidence(domain,state,loaded.mode,mirror));

  document.getElementById("toggleScan").onclick=async()=>{
    await send("CONTROL_SET_MODE",{mode:active?"PASSIVE_DEFAULT":"DEEP_INSPECT",domain});
    location.reload();
  };
  document.getElementById("resetBtn").onclick=async()=>{
    await send("CONTROL_RESET_DOMAIN",{domain});
    location.reload();
  };
  document.getElementById("exportBtn").onclick=()=>{
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
