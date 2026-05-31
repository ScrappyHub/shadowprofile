const $ = (id) => document.getElementById(id);
const safe = (v) => v && typeof v === "object" ? v : {};

function categoryFor(domain){
  if(domain.includes("chatgpt") || domain.includes("openai")) return "ai";
  if(domain.includes("amazon") || domain.includes("ebay")) return "shopping";
  if(domain.includes("youtube")) return "video";
  return "glasses";
}

function titleFor(category){
  if(category === "ai") return "Research / Problem Solving Profile";
  if(category === "shopping") return "Shopping Interest Profile";
  if(category === "video") return "Video Recommendation Profile";
  return "Curious Browser Profile";
}

function summaryFor(category){
  if(category === "ai") return "Your activity suggests questions, research, learning, problem solving, and tool-assisted thinking.";
  if(category === "shopping") return "Your activity suggests product exploration, comparison browsing, and possible shopping intent.";
  if(category === "video") return "Your activity suggests feed browsing, video attention, and recommendation-shaped engagement.";
  return "Your browser activity suggests general curiosity and mixed web use.";
}

function traitsFor(category){
  if(category === "ai") return ["curious","information seeker","problem solver","AI assistant user"];
  if(category === "shopping") return ["shopping","product research","comparison browsing","deal awareness"];
  if(category === "video") return ["video viewer","recommendation feed user","entertainment","attention pattern"];
  return ["curious","general browser user","mixed interests"];
}

function doingFor(category){
  if(category === "ai") return ["asking questions","researching or learning","solving problems","brainstorming ideas"];
  if(category === "shopping") return ["exploring products","comparing options","showing purchase intent"];
  if(category === "video") return ["watching videos","scrolling recommendations","returning to a feed"];
  return ["browsing sites","building a local profile"];
}

function addPills(id, arr){
  $(id).innerHTML = "";
  for(const x of arr){
    const s = document.createElement("span");
    s.className = "pill";
    s.textContent = x;
    $(id).appendChild(s);
  }
}

function addLines(id, arr){
  $(id).innerHTML = "";
  for(const x of arr){
    const d = document.createElement("div");
    d.textContent = "- " + x;
    $(id).appendChild(d);
  }
}

async function load(){
  const tabs = await chrome.tabs.query({active:true,currentWindow:true});
  const url = tabs?.[0]?.url || "";
  let domain = "browser profile";
  try { domain = new URL(url).hostname.toLowerCase(); } catch {}

  const r = await chrome.storage.local.get(["shadowprofile_domain_state"]);
  const all = r.shadowprofile_domain_state || {};
  const state = safe(all[domain]);
  const counts = safe(state.counts);

  const category = categoryFor(domain);
  const domains = Object.entries(all).map(([d,s]) => [d, safe(s.counts).total_events || 0]).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const total = domains.reduce((a,[,v])=>a+v,0) || 1;

  $("profileTitle").textContent = titleFor(category);
  $("profileSummary").textContent = summaryFor(category);
  $("readChip").textContent = "Profile Read: " + ((counts.total_events || 0) > 80 ? "High" : (counts.total_events || 0) > 20 ? "Medium" : "Low");
  $("strengthChip").textContent = "Profile Strength: " + ((counts.total_events || 0) > 40 ? "Mid" : "Low");
  $("domainChip").textContent = "Sites Seen: " + Object.keys(all).length;
  $("avatarBadge").textContent = category === "ai" ? "AI" : category === "shopping" ? "BAG" : category === "video" ? "PLAY" : "SP";

  const portrait = document.querySelector(".portrait");
  portrait.className = "portrait " + category + " glasses";
  document.querySelector(".avatar-scene").innerHTML = "<span></span>";

  addPills("lookList", traitsFor(category));
  addLines("doingList", doingFor(category));

  $("totalEvents").textContent = String(counts.total_events || 0);
  $("cookieEvents").textContent = String(counts.cookie_events || 0);
  $("userActions").textContent = String(counts.user_action_events || 0);
  $("sitesSeen").textContent = String(Object.keys(all).length || 1);

  $("domainMap").innerHTML = "";
  for(const [d,v] of domains){
    const row = document.createElement("div");
    row.className = "domain-row";
    row.innerHTML = `<div>${d}<div class="bar"><i style="width:${Math.max(4,Math.round((v/total)*100))}%"></i></div></div><strong>${v}</strong>`;
    $("domainMap").appendChild(row);
  }

  $("evidence").textContent = JSON.stringify({domain, profile:titleFor(category), traits:traitsFor(category), doing:doingFor(category), counts}, null, 2);
}

$("refreshBtn").onclick = load;
$("exportBtn").onclick = () => {
  const blob = new Blob([$("evidence").textContent], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "shadowprofile_workbench.json";
  a.click();
};
$("resetBtn").onclick = async () => {
  await chrome.storage.local.set({shadowprofile_domain_state:{}});
  location.reload();
};

load().catch(err => {
  $("profileTitle").textContent = "Workbench could not load";
  $("profileSummary").textContent = String(err);
});
