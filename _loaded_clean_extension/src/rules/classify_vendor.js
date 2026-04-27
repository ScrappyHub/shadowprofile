import {
  VENDOR_CATEGORIES,
  CONFIDENCE_LEVELS
} from "../shared/constants.js";

const VENDOR_RULES = Object.freeze([
  {
    ruleId: "vendor_google_analytics",
    category: VENDOR_CATEGORIES.ANALYTICS,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "google-analytics.com",
    explanation: "Known analytics provider domain"
  },
  {
    ruleId: "vendor_segment",
    category: VENDOR_CATEGORIES.ANALYTICS,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "segment.io",
    explanation: "Known analytics and customer data platform domain"
  },
  {
    ruleId: "vendor_mixpanel",
    category: VENDOR_CATEGORIES.ANALYTICS,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "mixpanel.com",
    explanation: "Known analytics provider domain"
  },
  {
    ruleId: "vendor_doubleclick",
    category: VENDOR_CATEGORIES.ADVERTISING,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "doubleclick.net",
    explanation: "Known advertising domain"
  },
  {
    ruleId: "vendor_google_ads",
    category: VENDOR_CATEGORIES.ADVERTISING,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "googlesyndication.com",
    explanation: "Known ad delivery domain"
  },
  {
    ruleId: "vendor_meta",
    category: VENDOR_CATEGORIES.ADVERTISING,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "facebook.net",
    explanation: "Known Meta advertising/tracking domain"
  },
  {
    ruleId: "vendor_optimizely",
    category: VENDOR_CATEGORIES.EXPERIMENTATION,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "optimizely.com",
    explanation: "Known experimentation provider"
  },
  {
    ruleId: "vendor_launchdarkly",
    category: VENDOR_CATEGORIES.EXPERIMENTATION,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "launchdarkly.com",
    explanation: "Known feature flag and experimentation provider"
  },
  {
    ruleId: "vendor_hotjar",
    category: VENDOR_CATEGORIES.SESSION_REPLAY,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "hotjar.com",
    explanation: "Known session replay / heatmap provider"
  },
  {
    ruleId: "vendor_fullstory",
    category: VENDOR_CATEGORIES.SESSION_REPLAY,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "fullstory.com",
    explanation: "Known session replay provider"
  },
  {
    ruleId: "vendor_onetrust",
    category: VENDOR_CATEGORIES.CONSENT_MANAGEMENT,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "onetrust.com",
    explanation: "Known consent management provider"
  },
  {
    ruleId: "vendor_trustarc",
    category: VENDOR_CATEGORIES.CONSENT_MANAGEMENT,
    confidence: CONFIDENCE_LEVELS.HIGH,
    matchType: "domain_suffix",
    matchValue: "trustarc.com",
    explanation: "Known consent/privacy management provider"
  },
  {
    ruleId: "keyword_analytics",
    category: VENDOR_CATEGORIES.ANALYTICS,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "analytics",
    explanation: "URL or domain contains analytics keyword"
  },
  {
    ruleId: "keyword_metrics",
    category: VENDOR_CATEGORIES.ANALYTICS,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "metrics",
    explanation: "URL or domain contains metrics keyword"
  },
  {
    ruleId: "keyword_ads",
    category: VENDOR_CATEGORIES.ADVERTISING,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "ads",
    explanation: "URL or domain contains ad-related keyword"
  },
  {
    ruleId: "keyword_adservice",
    category: VENDOR_CATEGORIES.ADVERTISING,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "adservice",
    explanation: "URL or domain contains adservice keyword"
  },
  {
    ruleId: "keyword_experiment",
    category: VENDOR_CATEGORIES.EXPERIMENTATION,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "experiment",
    explanation: "URL or domain contains experimentation keyword"
  },
  {
    ruleId: "keyword_variant",
    category: VENDOR_CATEGORIES.EXPERIMENTATION,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "variant",
    explanation: "URL or domain contains variant keyword"
  },
  {
    ruleId: "keyword_bucket",
    category: VENDOR_CATEGORIES.EXPERIMENTATION,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "bucket",
    explanation: "URL or domain contains bucket keyword"
  },
  {
    ruleId: "keyword_recommend",
    category: VENDOR_CATEGORIES.RECOMMENDATION,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "recommend",
    explanation: "URL or domain contains recommendation keyword"
  },
  {
    ruleId: "keyword_personalization",
    category: VENDOR_CATEGORIES.RECOMMENDATION,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "personalization",
    explanation: "URL or domain contains personalization keyword"
  },
  {
    ruleId: "keyword_feed",
    category: VENDOR_CATEGORIES.RECOMMENDATION,
    confidence: CONFIDENCE_LEVELS.LOW,
    matchType: "keyword",
    matchValue: "feed",
    explanation: "URL or domain contains feed keyword"
  },
  {
    ruleId: "keyword_replay",
    category: VENDOR_CATEGORIES.SESSION_REPLAY,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "replay",
    explanation: "URL or domain contains replay keyword"
  },
  {
    ruleId: "keyword_heatmap",
    category: VENDOR_CATEGORIES.HEATMAP,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "heatmap",
    explanation: "URL or domain contains heatmap keyword"
  },
  {
    ruleId: "keyword_consent",
    category: VENDOR_CATEGORIES.CONSENT_MANAGEMENT,
    confidence: CONFIDENCE_LEVELS.MEDIUM,
    matchType: "keyword",
    matchValue: "consent",
    explanation: "URL or domain contains consent keyword"
  },
  {
    ruleId: "keyword_cookie",
    category: VENDOR_CATEGORIES.CONSENT_MANAGEMENT,
    confidence: CONFIDENCE_LEVELS.LOW,
    matchType: "keyword",
    matchValue: "cookie",
    explanation: "URL or domain contains cookie keyword"
  },
  {
    ruleId: "keyword_auth",
    category: VENDOR_CATEGORIES.IDENTITY_MANAGEMENT,
    confidence: CONFIDENCE_LEVELS.LOW,
    matchType: "keyword",
    matchValue: "auth",
    explanation: "URL or domain contains auth keyword"
  },
  {
    ruleId: "keyword_login",
    category: VENDOR_CATEGORIES.IDENTITY_MANAGEMENT,
    confidence: CONFIDENCE_LEVELS.LOW,
    matchType: "keyword",
    matchValue: "login",
    explanation: "URL or domain contains login keyword"
  }
]);

function normalizeInput(value) {
  return String(value || "").trim().toLowerCase();
}

function domainMatchesSuffix(domain, suffix) {
  const d = normalizeInput(domain);
  const s = normalizeInput(suffix);
  return d === s || d.endsWith("." + s);
}

function textContainsKeyword(text, keyword) {
  return normalizeInput(text).includes(normalizeInput(keyword));
}

function getRuleTarget(rule, input) {
  const domain = normalizeInput(input.domain);
  const url = normalizeInput(input.url);
  if (rule.matchType === "domain_suffix") {
    return domain;
  }
  if (rule.matchType === "keyword") {
    return domain + " " + url;
  }
  return domain + " " + url;
}

function ruleMatches(rule, input) {
  const target = getRuleTarget(rule, input);

  if (rule.matchType === "domain_suffix") {
    return domainMatchesSuffix(target, rule.matchValue);
  }

  if (rule.matchType === "keyword") {
    return textContainsKeyword(target, rule.matchValue);
  }

  return false;
}

export function classifyVendor({ domain = "", url = "" }) {
  const matches = [];

  for (const rule of VENDOR_RULES) {
    if (ruleMatches(rule, { domain, url })) {
      matches.push({
        ruleId: rule.ruleId,
        category: rule.category,
        confidence: rule.confidence,
        explanation: rule.explanation
      });
    }
  }

  if (matches.length === 0) {
    return {
      categories: [VENDOR_CATEGORIES.UNKNOWN],
      matches: [],
      primaryCategory: VENDOR_CATEGORIES.UNKNOWN
    };
  }

  const categories = [...new Set(matches.map((m) => m.category))];

  return {
    categories,
    matches,
    primaryCategory: categories[0]
  };
}

export function getVendorRules() {
  return VENDOR_RULES.slice();
}