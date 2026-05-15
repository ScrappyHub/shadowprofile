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
  const confidence = signalTotal>12 || (counts.total_events||0)>80 ? "High" : signalTotal>3 || (counts.total_events||0)>20 ? "Medium" : "Low";
  const value = (counts.total_events||0)>40 || (counts.user_action_events||0)>2 ? "Mid" : "Low";

  let title="Low-Signal Profile", badge="?";
  let summary="ShadowProfile does not see enough strong behavior yet. Run Deep Scan to build a clearer mirror.";

  if(domain.includes("chatgpt") || domain.includes("openai")){
    title="Research / Tool User";
    badge="AI";
    summary="Platforms may see you as someone using tools for questions, research, learning, problem solving, and productivity.";
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
    d.textContent="• "+pillText(v);
    el.appendChild(d);
  }
}

function evidence(domain,state,mode,mirror){
  const c=safeObject(state.counts);
  const s=safeObject(state.signal_breakdown);
  return [
    "Site: "+domain,
    "Mode: "+modeText(mode),
    "Profile: "+mirror.title,
    "Confidence: "+mirror.confidence,
    "Total events: "+(c.total_events||0),
    "Cookie events: "+(c.cookie_events||0),
    "User actions: "+(c.user_action_events||0),
    "",
    "Behavior signals:",
    JSON.stringify(s,null,2),
    "",
    "Reasoning:",
    mirror.reasons.length ? mirror.reasons.join(", ") : "observed site activity"
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

  document.getElementById("siteName").textContent=domain;
  document.getElementById("modeBadge").textContent=modeText(loaded.mode);
  document.getElementById("modeLabel").textContent=modeText(loaded.mode);
  document.getElementById("toggleScan").textContent=active ? "Stop Deep Scan" : "Start Deep Scan";
  document.getElementById("profileTitle").textContent=mirror.title;
  document.getElementById("profileSummary").textContent=mirror.summary;
  document.getElementById("avatarBadge").textContent=mirror.badge;
  document.getElementById("confidenceBadge").textContent="Confidence: "+mirror.confidence;
  document.getElementById("valueBadge").textContent="Value: "+mirror.value;
  document.getElementById("confidence").textContent=mirror.confidence;
  document.getElementById("value").textContent=mirror.value;

  setPills("lookPills",mirror.interests);
  setList("doingList",mirror.doing);

  document.getElementById("trackingScore").textContent=scores.tracking ?? 0;
  document.getElementById("personalScore").textContent=scores.personalization ?? 0;
  document.getElementById("persistScore").textContent=scores.persistence ?? 0;
  document.getElementById("transScore").textContent=scores.transparency ?? 100;

  document.getElementById("totalEvents").textContent=counts.total_events ?? 0;
  document.getElementById("cookieEvents").textContent=counts.cookie_events ?? 0;
  document.getElementById("platformsSeen").textContent=Object.keys(safeObject(safeObject(state.request_classification).vendors)).length || 1;
  document.getElementById("sessionTime").textContent=fmtDuration(counts.duration_ms || 0);

  document.getElementById("whyText").textContent =
    "Sites use patterns like these to personalize, rank, recommend, and predict what you may do next. ShadowProfile keeps this mirror local on your device.";

  document.getElementById("evidenceText").textContent=evidence(domain,state,loaded.mode,mirror);

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
  document.getElementById("profileTitle").textContent="ShadowProfile could not load";
  document.getElementById("profileSummary").textContent=String(err);
});
