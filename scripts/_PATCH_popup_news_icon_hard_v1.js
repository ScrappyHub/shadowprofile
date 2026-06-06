const fs = require("fs");

const root = "C:/dev/shadowprofile";
const popupJs = root + "/extension/src/ui/popup_v2/popup_v2.js";
const popupHtml = root + "/extension/src/ui/popup_v2/popup_v2.html";
const popupCss = root + "/extension/src/ui/popup_v2/popup_v2.css";

function replaceFunction(src, name, body) {
  const start = src.indexOf("function " + name + "(");
  if (start < 0) throw new Error("Missing function " + name);

  const brace = src.indexOf("{", start);
  if (brace < 0) throw new Error("Missing opening brace for " + name);

  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") depth--;
    if (depth === 0) {
      return src.slice(0, start) + body + src.slice(i + 1);
    }
  }

  throw new Error("Could not find end of function " + name);
}

let js = fs.readFileSync(popupJs, "utf8");

const buildMirror = String.raw`function buildMirror(domain,state){
  const counts = safeObject(state.counts);
  const signals = safeObject(state.signal_breakdown);
  const d = String(domain || "").toLowerCase();

  const interests = [];
  const doing = [];
  const reasons = [];

  const isAi = d.includes("chatgpt") || d.includes("openai") || d.includes("claude") || d.includes("gemini");
  const isNews = d.includes("bbc") || d.includes("cnn") || d.includes("nytimes") || d.includes("washingtonpost") || d.includes("reuters") || d.includes("apnews") || d.includes("npr") || d.includes("foxnews") || d.includes("news");
  const isPharmacy = d.includes("walgreens") || d.includes("cvs") || d.includes("riteaid");
  const isShopping = d.includes("amazon") || d.includes("ebay") || d.includes("walmart") || d.includes("target") || signals.cart || signals.checkout;
  const isVideo = d.includes("youtube") || d.includes("netflix") || d.includes("hulu") || d.includes("tiktok") || d.includes("twitch") || signals.recommendation || signals.video_delivery;

  let title = "Quiet Profile";
  let badge = "MIRROR";
  let summary = "Not much is visible yet. Deep Scan can help reveal what this site may be learning from your behavior.";

  if(isAi){
    title = "Research / Problem Solving Profile";
    badge = "AI";
    summary = "This site may see you as someone asking questions, solving problems, learning, or using AI as a thinking partner.";
    interests.push("curious", "information seeker", "problem solver", "AI assistant user");
    doing.push("asking questions", "researching or learning", "solving problems", "brainstorming ideas");
    reasons.push("active tool use");
  } else if(isNews){
    title = "News / Media Reader Profile";
    badge = "NEWS";
    summary = "This site may see you as someone reading stories, checking headlines, following current events, or engaging with media feeds.";
    interests.push("news reader", "current events", "media browsing", "information seeking");
    doing.push("reading articles", "checking headlines", "following a story", "returning to information feeds");
    reasons.push("news or media activity");
  } else if(isPharmacy){
    title = "Pharmacy / Personal Care Profile";
    badge = "CARE";
    summary = "This site may see you as someone browsing pharmacy, wellness, health, or personal care products.";
    interests.push("pharmacy", "personal care", "wellness browsing");
    doing.push("browsing health products", "checking personal care items", "exploring pharmacy services");
    reasons.push("pharmacy or wellness activity");
  } else if(isShopping){
    title = "Shopping Interest Profile";
    badge = "BAG";
    summary = "Platforms may see you as someone exploring products, comparing options, or likely to respond to shopping prompts.";
    interests.push("shopping", "product research", "comparison browsing");
    doing.push("exploring products", "comparing options", "showing purchase intent");
    reasons.push("shopping-related activity");
  } else if(isVideo){
    title = "Video Recommendation Profile";
    badge = "PLAY";
    summary = "Platforms may see you as a video viewer whose attention can be shaped by recommendations and repeated engagement.";
    interests.push("video viewer", "recommendation feed user", "entertainment");
    doing.push("watching videos", "browsing recommendations", "responding to a feed");
    reasons.push("video and recommendation activity");
  }

  if((counts.user_action_events || 0) > 2 || (counts.total_events || 0) > 30){
    if(!doing.includes("active session")) doing.push("active session");
    reasons.push("repeated interaction");
  }

  if(interests.length === 0) interests.push("low signal");
  if(doing.length === 0) doing.push("not enough behavior yet");

  const signalTotal = Object.values(signals).reduce((a,b) => a + Number(b || 0), 0);

  let confidence = signalTotal > 12 || (counts.total_events || 0) > 80 ? "High" : signalTotal > 3 || (counts.total_events || 0) > 20 ? "Medium" : "Low";
  let value = (counts.total_events || 0) > 40 || (counts.user_action_events || 0) > 2 ? "Mid" : "Low";

  if(title !== "Quiet Profile" && confidence === "Low") confidence = "Medium";
  if(title !== "Quiet Profile" && value === "Low") value = "Mid";

  return { title, badge, summary, interests, doing, confidence, value, reasons };
}`;

js = replaceFunction(js, "buildMirror", buildMirror);
fs.writeFileSync(popupJs, js.replace(/\r\n/g, "\n"), "utf8");

let html = fs.readFileSync(popupHtml, "utf8");
html = html.replace(/<div class="site-icon">[\s\S]*?<\/div>/, '<div class="site-icon" aria-hidden="true"></div>');
fs.writeFileSync(popupHtml, html.replace(/\r\n/g, "\n"), "utf8");

let css = fs.readFileSync(popupCss, "utf8");
if (!css.includes("SHADOWPROFILE_NO_SP_SITE_ICON_V1")) {
  css += String.raw`

/* SHADOWPROFILE_NO_SP_SITE_ICON_V1 */
.site-icon {
  position: relative !important;
  color: transparent !important;
  font-size: 0 !important;
  overflow: hidden !important;
}

.site-icon::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 2px solid #35d7ff;
  border-radius: 999px;
  box-shadow: 0 0 0 5px rgba(53,215,255,.10), 0 0 22px rgba(53,215,255,.45);
}

.site-icon::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  transform: translate(-50%,-50%);
  border-radius: 999px;
  background: #35d7ff;
  box-shadow: 0 0 18px rgba(53,215,255,.75);
}
`;
}
fs.writeFileSync(popupCss, css.replace(/\r\n/g, "\n"), "utf8");

console.log("PATCH_POPUP_NEWS_ICON_HARD_V1_OK");
