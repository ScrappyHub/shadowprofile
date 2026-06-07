export function inferMirrorProfile(domain, state = {}) {
  const d = String(domain || "").toLowerCase();
  const counts = state.counts || {};
  const signals = state.signal_breakdown || {};
  const requestClass = state.request_classification || {};
  const categories = requestClass.categories || {};
  const vendors = requestClass.vendors || {};

  const totalEvents = Number(counts.total_events || 0);
  const userActions = Number(counts.user_action_events || 0);
  const cookieEvents = Number(counts.cookie_events || 0);

  const traits = [];
  const behaviors = [];
  const reasons = [];

  let title = "Quiet Profile";
  let badge = "MIRROR";
  let summary = "Not much is visible yet. Deep Scan can help reveal what this site may be learning from your behavior.";

  const add = (arr, items) => {
    for (const item of items) {
      if (item && !arr.includes(item)) arr.push(item);
    }
  };

  const isAi = /chatgpt|openai|claude|gemini|copilot|perplexity/.test(d);
  const isSearch = /(^|\.)google\.com$|bing\.com|duckduckgo\.com|search\.yahoo\.com/.test(d);
  const isEmail = /mail\.google\.com|gmail\.com|outlook\.live|outlook\.office|mail\.yahoo/.test(d);
  const isNews = /bbc|cnn|nytimes|washingtonpost|reuters|apnews|npr|foxnews|news/.test(d);
  const isShopping = /amazon|ebay|walmart|target|bestbuy|etsy/.test(d) || signals.cart || signals.checkout;
  const isPharmacy = /walgreens|cvs|riteaid/.test(d);
  const isVideo = /youtube|netflix|hulu|tiktok|twitch/.test(d) || signals.recommendation || signals.video_delivery;
  const isSchool = /purdue|brightspace|pearson|wgu|canvas|blackboard|moodle/.test(d);
  const isFinance = /bank|chase|paypal|stripe|coinbase|robinhood|fidelity|finance/.test(d);

  if (isAi) {
    title = "Research / Problem Solving Profile";
    badge = "AI";
    summary = "This site may see you as someone asking questions, solving problems, learning, or using AI as a thinking partner.";
    add(traits, ["curious", "information seeker", "problem solver", "AI assistant user"]);
    add(behaviors, ["asking questions", "researching or learning", "solving problems", "brainstorming ideas"]);
    reasons.push("AI or assistant domain");
  } else if (isEmail) {
    title = "Communication / Inbox Profile";
    badge = "MAIL";
    summary = "This site may see you as someone managing messages, accounts, work, school, or personal communication.";
    add(traits, ["communicator", "account holder", "organized user", "returning inbox user"]);
    add(behaviors, ["checking messages", "managing communication", "returning to an inbox", "using account-based services"]);
    reasons.push("email or inbox domain");
  } else if (isSearch) {
    title = "Search / Information Seeking Profile";
    badge = "SEARCH";
    summary = "This site may see you as someone looking for answers, comparing information, navigating the web, or starting research.";
    add(traits, ["information seeker", "research oriented", "web navigator", "decision maker"]);
    add(behaviors, ["searching for answers", "comparing information", "navigating to other sites", "starting a research path"]);
    reasons.push("search engine domain");
  } else if (isSchool) {
    title = "Student / Learning Profile";
    badge = "EDU";
    summary = "This site may see you as someone studying, using course platforms, researching assignments, or returning to school tools.";
    add(traits, ["student", "information seeker", "coursework", "research mode"]);
    add(behaviors, ["studying or learning", "using course platforms", "researching assignments", "returning to school tools"]);
    reasons.push("education or coursework domain");
  } else if (isNews) {
    title = "News / Media Reader Profile";
    badge = "NEWS";
    summary = "This site may see you as someone reading stories, checking headlines, following current events, or engaging with media feeds.";
    add(traits, ["news reader", "current events", "media browsing", "information seeking"]);
    add(behaviors, ["reading articles", "checking headlines", "following a story", "returning to information feeds"]);
    reasons.push("news or media domain");
  } else if (isPharmacy) {
    title = "Pharmacy / Personal Care Profile";
    badge = "CARE";
    summary = "This site may see you as someone browsing pharmacy, wellness, health, or personal care products.";
    add(traits, ["pharmacy", "personal care", "wellness browsing"]);
    add(behaviors, ["browsing health products", "checking personal care items", "exploring pharmacy services"]);
    reasons.push("pharmacy or personal care domain");
  } else if (isShopping) {
    title = "Shopping Interest Profile";
    badge = "BAG";
    summary = "Platforms may see you as someone exploring products, comparing options, or likely to respond to shopping prompts.";
    add(traits, ["shopping", "product research", "comparison browsing"]);
    add(behaviors, ["exploring products", "comparing options", "showing purchase intent"]);
    reasons.push("shopping or product domain");
  } else if (isVideo) {
    title = "Video Recommendation Profile";
    badge = "PLAY";
    summary = "Platforms may see you as a video viewer whose attention can be shaped by recommendations and repeated engagement.";
    add(traits, ["video viewer", "recommendation feed user", "entertainment"]);
    add(behaviors, ["watching videos", "browsing recommendations", "responding to a feed"]);
    reasons.push("video or recommendation domain");
  } else if (/keyboard|mechanicalkeyboard|keycap|switches|mouse|headset|pcpart|newegg|microcenter/.test(d)) {
    title = "Tech Hobby / Gear Research Profile";
    badge = "GEAR";
    summary = "This site may see you as someone researching specialized gear, comparing products, or browsing a niche tech hobby.";
    add(traits, ["tech hobbyist", "gear researcher", "product comparison", "niche shopper"]);
    add(behaviors, ["researching equipment", "comparing options", "browsing specialized products", "exploring hobby gear"]);
    reasons.push("specialized tech or hobby domain");
  } else if (/github|gitlab|stackoverflow|npmjs|developer|docs\.|api|vercel|supabase/.test(d)) {
    title = "Developer / Builder Profile";
    badge = "DEV";
    summary = "This site may see you as someone building, debugging, reading documentation, or working with software tools.";
    add(traits, ["developer", "builder", "technical researcher", "tool user"]);
    add(behaviors, ["reading documentation", "debugging or building", "using developer tools", "researching technical answers"]);
    reasons.push("developer or documentation domain");
  } else if (/reddit|discord|x\.com|twitter|facebook|instagram|threads|social/.test(d)) {
    title = "Social / Community Profile";
    badge = "SOCIAL";
    summary = "This site may see you as someone browsing communities, discussions, social feeds, or interest groups.";
    add(traits, ["community browser", "discussion reader", "social feed user"]);
    add(behaviors, ["reading discussions", "browsing communities", "checking social activity"]);
    reasons.push("social or community domain");
  } else if (/wikipedia|wiktionary|britannica|archive|reference/.test(d)) {
    title = "Reference / Learning Profile";
    badge = "REF";
    summary = "This site may see you as someone looking up background information, definitions, history, or reference material.";
    add(traits, ["reference seeker", "learner", "background researcher"]);
    add(behaviors, ["looking up information", "reading reference material", "learning context"]);
    reasons.push("reference or encyclopedia domain");
  } else if (isFinance) {
    title = "Finance / Account Profile";
    badge = "FIN";
    summary = "This site may see you as someone managing accounts, payments, balances, or financial tools.";
    add(traits, ["account manager", "finance user", "transaction aware"]);
    add(behaviors, ["checking account information", "managing payments", "reviewing financial tools"]);
    reasons.push("finance or account domain");
  }

  if (Number(signals.cart || 0) > 0) {
    add(traits, ["purchase intent"]);
    add(behaviors, ["using cart or checkout flows"]);
    reasons.push("cart activity");
  }

  if (Number(signals.telemetry || 0) > 0) {
    add(traits, ["measured user"]);
    reasons.push("telemetry endpoints");
  }

  if (Number(signals.recommendation || 0) > 0) {
    add(traits, ["recommendation target"]);
    add(behaviors, ["interacting with recommendation systems"]);
    reasons.push("recommendation signals");
  }

  if (totalEvents > 30 || userActions > 2) {
    add(behaviors, ["active session"]);
    reasons.push("repeated interaction");
  }

  if (cookieEvents > 0) {
    reasons.push("browser memory/cookie activity");
  }

  if (traits.length === 0) traits.push("low signal");
  if (behaviors.length === 0) behaviors.push("not enough behavior yet");

  const signalTotal =
    Object.values(signals).reduce((a,b) => a + Number(b || 0), 0) +
    Object.values(categories).reduce((a,b) => a + Number(b || 0), 0) +
    Object.values(vendors).reduce((a,b) => a + Number(b || 0), 0);

  let confidence =
    signalTotal > 12 || totalEvents > 80
      ? "High"
      : title !== "Quiet Profile"
        ? "Medium"
      : signalTotal > 3 || totalEvents > 20
        ? "Medium"
        : "Low";

  let value =
    totalEvents > 5000
      ? "High"
      : totalEvents > 40 || userActions > 2
        ? "Mid"
        : "Low";

  if (title !== "Quiet Profile" && value === "Low") value = "Mid";

  return {
    title,
    badge,
    summary,
    interests: traits,
    doing: behaviors,
    confidence,
    value,
    reasons
  };
}
