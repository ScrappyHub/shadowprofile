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
  const r = await chrome.storage.local.get(["shadowprofile_domain_state"]);
  const all = r.shadowprofile_domain_state || {};

  const domains = Object.entries(all)
    .map(([d,s]) => [d, safe(s).counts?.total_events || 0, safe(s)])
    .filter(([d]) => !String(d).includes("chrome-extension") && !String(d).match(/^[a-z]{32}$/))
    .sort((a,b)=>b[1]-a[1])
    .slice(0,12);

  const primary = domains[0] || ["browser profile", 0, {}];
  const domain = primary[0];
  const state = primary[2];
  const counts = safe(state.counts);

  const totalEvents = domains.reduce((a,[,v]) => a + Number(v || 0), 0);
  const totalCookies = domains.reduce((a,[,,s]) => a + Number(safe(s.counts).cookie_events || 0), 0);
  const totalActions = domains.reduce((a,[,,s]) => a + Number(safe(s.counts).user_action_events || 0), 0);

  let category = categoryFor(domain);

  const schoolSignals = domains.some(([d]) =>
    d.includes("purdue") ||
    d.includes("brightspace") ||
    d.includes("pearson") ||
    d.includes("wgu")
  );

  if(schoolSignals && category !== "ai"){
    category = "glasses";
  }

  $("profileTitle").textContent =
    category === "glasses" && schoolSignals
      ? "Student / Learning Profile"
      : titleFor(category);

  $("profileSummary").textContent =
    category === "glasses" && schoolSignals
      ? "Your browser activity suggests coursework, learning platforms, assignments, research, and repeated study sessions."
      : summaryFor(category);

  $("readChip").textContent =
    "Profile Read: " + (totalEvents > 2500 ? "High" : totalEvents > 500 ? "Medium" : "Low");

  $("strengthChip").textContent =
    "Profile Strength: " + (totalEvents > 1000 ? "High" : totalEvents > 100 ? "Mid" : "Low");

  $("domainChip").textContent =
    "Sites Seen: " + String(domains.length || Object.keys(all).length || 0);

  $("avatarBadge").textContent =
    category === "ai" ? "AI" :
    category === "shopping" ? "BAG" :
    category === "video" ? "PLAY" :
    schoolSignals ? "EDU" :
    "SP";

  const portrait = document.querySelector(".portrait");
  portrait.className = "portrait " + category + " glasses";
  document.querySelector(".avatar-scene").innerHTML = "<span></span>";

  const traits =
    schoolSignals
      ? ["student", "information seeker", "coursework", "research mode"]
      : traitsFor(category);

  const doing =
    schoolSignals
      ? ["studying or learning", "using course platforms", "researching assignments", "returning to school tools"]
      : doingFor(category);

  addPills("lookList", traits);
  addLines("doingList", doing);

  $("totalEvents").textContent = String(totalEvents);
  $("cookieEvents").textContent = String(totalCookies);
  $("userActions").textContent = String(totalActions);
  $("sitesSeen").textContent = String(domains.length || Object.keys(all).length || 0);

  $("domainMap").innerHTML = "";

  const max = Math.max(1, ...domains.map(([,v]) => Number(v || 0)));

  for(const [d,v] of domains.slice(0,10)){
    const row = document.createElement("div");
    row.className = "domain-row";
    row.innerHTML =
      `<div>${d}<div class="bar"><i style="width:${Math.max(4,Math.round((Number(v || 0)/max)*100))}%"></i></div></div><strong>${v}</strong>`;
    $("domainMap").appendChild(row);
  }

  $("evidence").textContent = JSON.stringify({
    profile_scope: "browser-wide",
    primary_domain: domain,
    profile: $("profileTitle").textContent,
    traits,
    doing,
    totals: {
      total_events: totalEvents,
      cookie_events: totalCookies,
      user_actions: totalActions,
      sites_seen: domains.length
    },
    top_domains: domains.map(([d,v]) => ({domain:d,total_events:v}))
  }, null, 2);
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
