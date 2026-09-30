import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type LeadType = "Demand" | "Supply" | "SaaS";

type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
  date?: string;
  searchQuery?: string;
};

type SkillRow = {
  id?: string;
  name: string;
  category?: string;
  subcategory?: string;
  tags?: string[] | string;
};

type LeadStats = {
  found: number;
  accepted: number;
  inserted: number;
  duplicate: number;
  stale: number;
  wrongType: number;
  noContact: number;
  noSkill: number;
  blocked: number;
  insertErrors: number;
};

type InsertedByType = {
  Demand: number;
  Supply: number;
  SaaS: number;
};

type CollectorResult = {
  stats: LeadStats;
  insertedByType: InsertedByType;
};

type ContactInfo = {
  email?: string;
  phone?: string;
  url?: string;
};

const MAX_AGE_HOURS = 72;
const MAX_QUERIES_PER_TYPE = 6;
const RESULTS_PER_SEARCH = 10;

const GOOGLE_SEARCH_URL = "https://www.google.com/search";

const SERPER_API_KEY =
  process.env.SERPER_API_KEY || process.env.VITE_SERPER_API_KEY || "";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const BLOCKED_DOMAINS = [
  "google.com",
  "google.co.uk",
  "google.ca",
  "google.ae",
  "google.com.pk",
  "support.google.com",
  "accounts.google.com",
  "policies.google.com",
  "youtube.com",
  "youtu.be",
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.ae",
  "daraz.pk",
  "ebay.com",
  "etsy.com",
  "walmart.com",
  "aliexpress.com",
  "udemy.com",
  "coursera.org",
  "skillshare.com",
  "fiverr.com",
  "upwork.com",
  "freelancer.com",
  "peopleperhour.com",
  "guru.com",
];

const BLOCKED_RESULT_TERMS = [
  "feedback",
  "google search",
  "search settings",
  "privacy",
  "terms",
  "advertising",
  "help center",
  "sign in",
  "search preferences",
];

const SAAS_REJECT_TERMS = [
  "amazon",
  "daraz",
  "ebay",
  "etsy",
  "walmart",
  "aliexpress",
  "book",
  "ebook",
  "course",
  "webinar",
  "training course",
  "online course",
  "app",
  "software",
  "plugin",
  "template",
  "directory",
  "marketplace",
  "job board",
  "jobs board",
  "news",
  "article",
  "blog",
  "podcast",
  "product",
  "pricing",
  "shop",
  "store",
  "buy now",
];

const DEMAND_TERMS = [
  "looking for",
  "need a",
  "need an",
  "seeking",
  "wanted",
  "want a",
  "want an",
  "require",
  "requires",
  "required",
  "hiring",
  "hire",
  "help needed",
  "help wanted",
  "client needs",
  "project needed",
  "looking to hire",
  "looking to work with",
];

const SUPPLY_TERMS = [
  "freelance",
  "freelancer",
  "available for",
  "available to",
  "accepting clients",
  "taking clients",
  "open for work",
  "open to work",
  "work with clients",
  "offers",
  "offering",
  "services",
  "service provider",
  "tutor available",
  "teacher available",
  "coach available",
  "consultant available",
  "apply",
  "applications open",
  "now accepting",
];

const PROFESSIONAL_TERMS = [
  "teacher",
  "tutor",
  "trainer",
  "coach",
  "mentor",
  "consultant",
  "advisor",
  "adviser",
  "educator",
  "instructor",
  "professional",
  "freelancer",
  "freelance",
  "consulting",
  "coaching",
  "teaching",
  "training",
];

const DIRECT_CONTACT_TERMS = [
  "contact",
  "email",
  "e-mail",
  "phone",
  "telephone",
  "whatsapp",
  "telegram",
  "linkedin",
  "facebook",
  "instagram",
  "book a call",
  "schedule a call",
  "get in touch",
];

const SKILL_GROUPS: Record<string, string[]> = {
  math: [
    "math",
    "mathematics",
    "maths",
    "algebra",
    "geometry",
    "calculus",
    "statistics",
    "trigonometry",
  ],
  science: [
    "science",
    "physics",
    "chemistry",
    "biology",
    "environmental science",
  ],
  english: [
    "english",
    "english language",
    "english literature",
    "grammar",
    "writing",
    "creative writing",
    "academic writing",
  ],
  languages: [
    "language",
    "languages",
    "arabic",
    "urdu",
    "french",
    "spanish",
    "german",
    "chinese",
    "mandarin",
    "hindi",
  ],
  quran: [
    "quran",
    "qur'an",
    "tajweed",
    "qirat",
    "qiraat",
    "hifz",
    "hafiz",
    "islamic studies",
    "tafsir",
    "tafseer",
  ],
  teaching: [
    "teaching",
    "teacher",
    "tutor",
    "education",
    "educator",
    "instruction",
    "instructor",
  ],
  coaching: [
    "coach",
    "coaching",
    "mentor",
    "mentoring",
    "consultant",
    "consulting",
    "advisor",
    "adviser",
  ],
  business: [
    "business",
    "business coaching",
    "business consultant",
    "entrepreneurship",
    "startup",
    "management",
    "marketing",
    "sales",
  ],
  technology: [
    "technology",
    "tech",
    "programming",
    "coding",
    "software",
    "web development",
    "development",
    "javascript",
    "python",
    "react",
  ],
};
function emptyStats(): LeadStats {
  return {
    found: 0,
    accepted: 0,
    inserted: 0,
    duplicate: 0,
    stale: 0,
    wrongType: 0,
    noContact: 0,
    noSkill: 0,
    blocked: 0,
    insertErrors: 0,
  };
}

function emptyInsertedByType(): InsertedByType {
  return {
    Demand: 0,
    Supply: 0,
    SaaS: 0,
  };
}

function cleanText(value: unknown): string {
  if (value === undefined || value === null) return "";

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s+#.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);

  return terms.some((term) => {
    const t = normalize(term);
    return t && normalized.includes(t);
  });
}

function domainFromUrl(url?: string): string {
  if (!url) return "";

  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isGoogleOwnedUrl(url?: string): boolean {
  const domain = domainFromUrl(url);

  if (!domain) return true;

  return (
    domain === "google.com" ||
    domain.endsWith(".google.com") ||
    domain.endsWith(".google.co.uk") ||
    domain.endsWith(".google.ca") ||
    domain.endsWith(".google.ae") ||
    domain.endsWith(".google.com.pk")
  );
}

function isBlockedDomain(url?: string): boolean {
  const domain = domainFromUrl(url);

  if (!domain) return true;

  return BLOCKED_DOMAINS.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`)
  );
}

function isBlockedResult(result: SearchResult): boolean {
  const text = normalize(
    `${result.title} ${result.snippet || ""} ${result.link}`
  );

  if (isGoogleOwnedUrl(result.link)) return true;

  if (isBlockedDomain(result.link)) return true;

  return BLOCKED_RESULT_TERMS.some((term) => {
    return normalize(result.title).includes(normalize(term));
  }) || SAAS_REJECT_TERMS.some((term) => {
    return text.includes(normalize(term));
  });
}

function normalizeUrl(url?: string): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    parsed.hash = "";

    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
    ];

    trackingParams.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

function isDirectSocialProfile(url?: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host.includes("linkedin.com")) {
      return path.includes("/in/") || path.includes("/company/");
    }

    if (host.includes("facebook.com")) {
      return path.length > 1 && !path.startsWith("/search");
    }

    if (host.includes("instagram.com")) {
      return path.length > 1 && !path.startsWith("/explore");
    }

    if (host.includes("x.com") || host.includes("twitter.com")) {
      return path.length > 1;
    }

    if (host.includes("t.me")) {
      return path.length > 1;
    }

    return false;
  } catch {
    return false;
  }
}

function isDirectContactPageUrl(url?: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    return [
      "contact",
      "contact-us",
      "get-in-touch",
      "reach-us",
      "hire-me",
      "work-with-me",
      "book-a-call",
      "book-call",
      "consultation",
    ].some((term) => path.includes(term));
  } catch {
    return false;
  }
}

function isValidExternalResultUrl(url?: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    if (isGoogleOwnedUrl(url)) return false;

    if (isBlockedDomain(url)) return false;

    return true;
  } catch {
    return false;
  }
    }
function detectCountry(text: string): string | undefined {
  const value = normalize(text);

  const countries: Array<[string, string[]]> = [
    ["United Kingdom", ["united kingdom", "uk", "britain", "england", "scotland", "wales"]],
    ["United States", ["united states", "usa", "us", "america"]],
    ["Canada", ["canada", "canadian"]],
    ["Australia", ["australia", "australian"]],
    ["United Arab Emirates", ["united arab emirates", "uae", "dubai", "abu dhabi"]],
    ["Pakistan", ["pakistan", "pakistani"]],
    ["India", ["india", "indian"]],
    ["Saudi Arabia", ["saudi arabia", "saudi"]],
    ["Qatar", ["qatar", "doha"]],
    ["Germany", ["germany", "german"]],
    ["France", ["france", "french"]],
    ["Spain", ["spain", "spanish"]],
    ["Italy", ["italy", "italian"]],
    ["Malaysia", ["malaysia", "malaysian"]],
    ["Singapore", ["singapore"]],
    ["New Zealand", ["new zealand"]],
    ["South Africa", ["south africa", "south african"]],
    ["Ireland", ["ireland", "irish"]],
  ];

  for (const [country, aliases] of countries) {
    if (aliases.some((alias) => value.includes(normalize(alias)))) {
      return country;
    }
  }

  return undefined;
}

function detectCity(text: string): string | undefined {
  const value = normalize(text);

  const cities = [
    "London",
    "Manchester",
    "Birmingham",
    "Leeds",
    "Liverpool",
    "Glasgow",
    "Edinburgh",
    "Toronto",
    "Vancouver",
    "Montreal",
    "Calgary",
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Sydney",
    "Melbourne",
    "Brisbane",
    "Dubai",
    "Abu Dhabi",
    "Karachi",
    "Lahore",
    "Islamabad",
    "Peshawar",
    "Abbottabad",
    "Delhi",
    "Mumbai",
    "Bangalore",
    "Doha",
    "Riyadh",
    "Singapore",
  ];

  for (const city of cities) {
    if (value.includes(normalize(city))) {
      return city;
    }
  }

  return undefined;
}

function skillCandidateValues(skill: SkillRow): string[] {
  const values = [
    skill.name,
    skill.category,
    skill.subcategory,
  ].filter(Boolean) as string[];

  if (Array.isArray(skill.tags)) {
    values.push(...skill.tags);
  } else if (typeof skill.tags === "string") {
    values.push(
      ...skill.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }

  return values;
}

function detectSkill(
  text: string,
  skills: SkillRow[]
): SkillRow | undefined {
  const normalizedText = normalize(text);

  if (!normalizedText) return undefined;

  // First: exact real skill/category/subcategory/tag matching.
  for (const skill of skills) {
    const values = skillCandidateValues(skill);

    for (const value of values) {
      const normalizedValue = normalize(value);

      if (
        normalizedValue.length >= 3 &&
        normalizedText.includes(normalizedValue)
      ) {
        return skill;
      }
    }
  }

  // Second: controlled skill-group matching.
  for (const skill of skills) {
    const values = skillCandidateValues(skill);
    const combined = normalize(values.join(" "));

    for (const groupValues of Object.values(SKILL_GROUPS)) {
      const matchedGroupTerm = groupValues.find((term) =>
        normalizedText.includes(normalize(term))
      );

      if (!matchedGroupTerm) continue;

      const relatedToGroup = groupValues.some((term) =>
        combined.includes(normalize(term))
      );

      if (relatedToGroup) {
        return skill;
      }
    }
  }

  return undefined;
}

/*
 * Important:
 * The search query is NOT allowed to create a lead by itself.
 *
 * It can only help identify the real skill that was intentionally searched
 * from our Supabase skills list. The actual result still needs evidence
 * that it is relevant/professional before this fallback is accepted.
 */
function detectSkillFromQueryContext(
  result: SearchResult,
  skills: SkillRow[],
  leadType: LeadType
): SkillRow | undefined {
  if (!result.searchQuery) return undefined;

  const query = normalize(result.searchQuery);
  const resultText = normalize(
    `${result.title} ${result.snippet || ""}`
  );

  const resultHasProfessionalEvidence = containsAny(
    resultText,
    PROFESSIONAL_TERMS
  );

  if (!resultHasProfessionalEvidence) {
    return undefined;
  }

  for (const skill of skills) {
    const values = skillCandidateValues(skill);

    if (
      values.some((value) => {
        const normalizedValue = normalize(value);
        return (
          normalizedValue.length >= 3 &&
          query.includes(normalizedValue)
        );
      })
    ) {
      return skill;
    }
  }

  // Controlled group fallback for cases such as:
  // "Mathematics" in the search query while the DB skill is "Math Tutor".
  for (const skill of skills) {
    const skillText = normalize(skillCandidateValues(skill).join(" "));

    for (const groupValues of Object.values(SKILL_GROUPS)) {
      const queryMatchesGroup = groupValues.some((term) =>
        query.includes(normalize(term))
      );

      const skillMatchesGroup = groupValues.some((term) =>
        skillText.includes(normalize(term))
      );

      if (queryMatchesGroup && skillMatchesGroup) {
        return skill;
      }
    }
  }

  return undefined;
        }
function extractPersonName(title: string): string | undefined {
  const value = cleanText(title);

  if (!value) return undefined;

  const firstPart = value
    .split(/\s+[|–—-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)[0];

  if (!firstPart) return undefined;

  const cleaned = firstPart
    .replace(/\b(teacher|tutor|coach|consultant|mentor|advisor)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ");

  if (words.length >= 2 && words.length <= 5) {
    const looksLikeName = words.every((word) =>
      /^[A-Z][A-Za-z'.-]+$/.test(word)
    );

    if (looksLikeName) {
      return cleaned;
    }
  }

  return undefined;
}

function extractEmails(text: string): string[] {
  const matches = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
  );

  return [...new Set((matches || []).map((email) => email.toLowerCase()))];
}

function extractPhones(text: string): string[] {
  const matches = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/g
  );

  return [
    ...new Set(
      (matches || [])
        .map((phone) => phone.replace(/\s+/g, " ").trim())
        .filter((phone) => phone.replace(/\D/g, "").length >= 8)
    ),
  ];
}

function extractContactLinks(
  html: string,
  baseUrl: string
): string[] {
  const links: string[] = [];

  const regex =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const anchorText = normalize(match[2]);

    if (!href) continue;

    try {
      const absolute = new URL(href, baseUrl).toString();

      if (!isValidExternalResultUrl(absolute)) continue;

      const useful =
        isDirectSocialProfile(absolute) ||
        isDirectContactPageUrl(absolute) ||
        containsAny(anchorText, DIRECT_CONTACT_TERMS);

      if (useful) {
        links.push(normalizeUrl(absolute));
      }
    } catch {
      // Ignore malformed links.
    }
  }

  return [...new Set(links)];
}

async function improveContact(
  result: SearchResult
): Promise<ContactInfo> {
  const directText = `${result.title} ${result.snippet || ""}`;

  const directEmails = extractEmails(directText);
  const directPhones = extractPhones(directText);

  // A social/profile/contact page itself can be a valid direct contact path.
  if (
    isDirectSocialProfile(result.link) ||
    isDirectContactPageUrl(result.link)
  ) {
    return {
      email: directEmails[0],
      phone: directPhones[0],
      url: normalizeUrl(result.link),
    };
  }

  if (!result.link || !isValidExternalResultUrl(result.link)) {
    return {
      email: directEmails[0],
      phone: directPhones[0],
    };
  }

  try {
    const response = await fetch(result.link, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OpportunityHubLeadCollector/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        email: directEmails[0],
        phone: directPhones[0],
      };
    }

    const html = await response.text();

    const pageText = cleanText(html);

    const emails = [
      ...directEmails,
      ...extractEmails(pageText),
    ];

    const phones = [
      ...directPhones,
      ...extractPhones(pageText),
    ];

    const links = extractContactLinks(html, result.link);

    return {
      email: [...new Set(emails)][0],
      phone: [...new Set(phones)][0],
      url: links[0],
    };
  } catch {
    return {
      email: directEmails[0],
      phone: directPhones[0],
    };
  }
}

function isIndividualSaasProfile(
  result: SearchResult,
  contact: ContactInfo
): boolean {
  const text = normalize(
    `${result.title} ${result.snippet || ""}`
  );

  if (!containsAny(text, PROFESSIONAL_TERMS)) {
    return false;
  }

  const personName = extractPersonName(result.title);

  if (personName) return true;

  if (contact.url && isDirectSocialProfile(contact.url)) {
    return true;
  }

  if (isDirectSocialProfile(result.link)) {
    return true;
  }

  return false;
  }
/*
 * Google fallback parser
 *
 * This is the critical repair.
 *
 * We ONLY extract anchors that contain a real <h3> result title.
 * We then reject:
 * - Google support
 * - Google feedback
 * - Google navigation
 * - Google-owned URLs
 * - blocked marketplaces/directories/etc.
 *
 * This prevents entries such as:
 * "feedback -> https://support.google.com/websearch"
 * from ever entering the lead pipeline.
 */
function parseGoogleResults(
  html: string,
  searchQuery: string
): SearchResult[] {
  const results: SearchResult[] = [];

  /*
   * Google organic results normally contain an <a> containing an <h3>.
   * We intentionally do NOT parse every <a> on the page.
   */
  const resultRegex =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?<h3\b[^>]*>[\s\S]*?<\/h3>[\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while ((match = resultRegex.exec(html)) !== null) {
    const href = match[1];
    const block = match[2];

    if (!href || !block) continue;

    let link = href.trim();

    // Google may return redirect URLs. Resolve simple /url?q=... redirects.
    try {
      if (link.startsWith("/url?")) {
        const parsed = new URL(link, "https://www.google.com");
        const target =
          parsed.searchParams.get("q") ||
          parsed.searchParams.get("url");

        if (target) {
          link = target;
        }
      }
    } catch {
      continue;
    }

    if (!isValidExternalResultUrl(link)) {
      continue;
    }

    const h3Match = block.match(
      /<h3\b[^>]*>([\s\S]*?)<\/h3>/i
    );

    if (!h3Match) continue;

    const title = cleanText(h3Match[1]);

    if (!title) continue;

    /*
     * Strip the title from the block before treating remaining text
     * as the snippet.
     */
    const withoutTitle = block.replace(h3Match[0], " ");
    const snippet = cleanText(withoutTitle);

    const candidate: SearchResult = {
      title,
      link: normalizeUrl(link),
      snippet: snippet.slice(0, 1200),
      searchQuery,
    };

    if (isGoogleOwnedUrl(candidate.link)) continue;
    if (isBlockedDomain(candidate.link)) continue;

    if (
      containsAny(
        normalize(`${candidate.title} ${candidate.snippet}`),
        BLOCKED_RESULT_TERMS
      )
    ) {
      continue;
    }

    results.push(candidate);
  }

  /*
   * De-duplicate the parser output.
   */
  const unique = new Map<string, SearchResult>();

  for (const result of results) {
    const key = normalizeUrl(result.link);

    if (!key) continue;

    if (!unique.has(key)) {
      unique.set(key, result);
    }
  }

  return [...unique.values()].slice(0, RESULTS_PER_SEARCH);
}

async function searchSerper(
  query: string
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    return [];
  }

  const response = await fetch(
    "https://google.serper.dev/search",
    {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: RESULTS_PER_SEARCH,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Serper request failed: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  const organic = Array.isArray(data?.organic)
    ? data.organic
    : [];

  return organic
    .map((item: any) => ({
      title: cleanText(item?.title),
      link: normalizeUrl(item?.link),
      snippet: cleanText(item?.snippet),
      date: cleanText(item?.date),
      searchQuery: query,
    }))
    .filter(
      (item: SearchResult) =>
        item.title &&
        isValidExternalResultUrl(item.link)
    )
    .slice(0, RESULTS_PER_SEARCH);
}

async function searchGoogleFallback(
  query: string
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    num: String(RESULTS_PER_SEARCH),
    hl: "en",
  });

  const response = await fetch(
    `${GOOGLE_SEARCH_URL}?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google fallback request failed: ${response.status}`
    );
  }

  const html = await response.text();

  return parseGoogleResults(html, query);
}

async function searchWithFallback(
  query: string
): Promise<SearchResult[]> {
  if (SERPER_API_KEY) {
    try {
      return await searchSerper(query);
    } catch (error) {
      console.warn(
        "[LEAD COLLECTOR] Serper failed; using Google fallback.",
        error
      );
    }
  }

  return searchGoogleFallback(query);
}
async function insertLead(
  type: LeadType,
  result: SearchResult,
  skill: SkillRow,
  contact: ContactInfo
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const text = getSearchText(result);
  const country = detectCountry(text);
  const city = detectCity(text);
  const budget = getBudget(text);
  const currency = getCurrency(text);
  const name = extractPersonName(result.title);

  const common = {
    title: result.title,
    name: name || null,
    company: null,
    description: result.snippet || null,
    skill: skill.name || null,
    category: skill.category || null,
    subcategory: skill.subcategory || null,
    country: country || null,
    city: city || null,
    budget: budget || null,
    currency: currency || null,
    source_url: normalizeUrl(result.link),
    contact_email: contact.email || null,
    contact_phone: contact.phone || null,
    contact_url: contact.url || null,
  };

  if (type === "Demand") {
    const { error } = await supabase
      .from("demand_leads")
      .insert(common);

    if (error) throw error;
    return;
  }

  if (type === "Supply") {
    const { error } = await supabase
      .from("supply_leads")
      .insert(common);

    if (error) throw error;
    return;
  }

  /*
   * Keep the existing compatibility field "contect" as well as
   * the normal contact fields used by the dashboard.
   */
  const saasPayload = {
    ...common,
    contect:
      contact.email ||
      contact.phone ||
      contact.url ||
      null,
  };

  const { error } = await supabase
    .from("saas_leads")
    .insert(saasPayload);

  if (error) throw error;
}

async function processResult(
  type: LeadType,
  result: SearchResult,
  skills: SkillRow[],
  stats: LeadStats
): Promise<boolean> {
  stats.found += 1;

  /*
   * First and most important safety check:
   * Never process Google's own support/navigation pages as leads.
   */
  if (!isValidExternalResultUrl(result.link)) {
    stats.blocked += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "blocked-url",
        title: result.title,
        url: result.link,
        query: result.searchQuery,
      })
    );

    return false;
  }

  if (isBlockedResult(result)) {
    stats.blocked += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "blocked",
        title: result.title,
        url: result.link,
        query: result.searchQuery,
      })
    );

    return false;
  }

  /*
   * Demand/Supply/SaaS type evidence must come from the actual result.
   */
  if (!resultMatchesType(result, type)) {
    stats.wrongType += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "wrong-type",
        title: result.title,
        url: result.link,
        query: result.searchQuery,
        snippet: result.snippet,
      })
    );

    return false;
  }

  if (!isFreshEnough(result, type)) {
    stats.stale += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "stale",
        title: result.title,
        url: result.link,
        date: result.date,
      })
    );

    return false;
  }

  /*
   * Normal skill detection first.
   */
  let skill = detectSkill(
    getSearchText(result),
    skills
  );

  /*
   * Controlled query-context fallback:
   * only maps to a real skill already loaded from Supabase,
   * and only when the actual result contains professional evidence.
   *
   * The query alone cannot create a lead.
   */
  if (!skill) {
    skill = detectSkillFromQueryContext(
      result,
      skills,
      type
    );
  }

  if (!skill) {
    stats.noSkill += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "no-skill",
        title: result.title,
        url: result.link,
        query: result.searchQuery,
        snippet: result.snippet,
      })
    );

    return false;
  }

  const contact = await improveContact(result);

  /*
   * Gold standard:
   * email, phone, WhatsApp/Telegram/social profile,
   * named professional profile, or direct contact page.
   *
   * A random source/article URL is NOT accepted as contact.
   */
  if (
    !contact.email &&
    !contact.phone &&
    !contact.url
  ) {
    stats.noContact += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "no-contact",
        title: result.title,
        url: result.link,
        query: result.searchQuery,
        skill: skill.name,
      })
    );

    return false;
  }

  if (
    type === "SaaS" &&
    !isIndividualSaasProfile(result, contact)
  ) {
    stats.wrongType += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "not-individual-saas-profile",
        title: result.title,
        url: result.link,
        query: result.searchQuery,
        skill: skill.name,
      })
    );

    return false;
  }

  const duplicate = await leadAlreadyExists(
    type,
    result,
    contact
  );

  if (duplicate) {
    stats.duplicate += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "duplicate",
        title: result.title,
        url: result.link,
      })
    );

    return false;
  }

  stats.accepted += 1;

  try {
    await insertLead(
      type,
      result,
      skill,
      contact
    );

    stats.inserted += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "inserted",
        title: result.title,
        url: result.link,
        skill: skill.name,
        country: detectCountry(getSearchText(result)),
      })
    );

    return true;
  } catch (error) {
    stats.insertErrors += 1;

    console.error(
      "[LEAD INSERT ERROR]",
      JSON.stringify({
        type,
        title: result.title,
        url: result.link,
        skill: skill.name,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      })
    );

    return false;
  }
}
async function collectLeadsForType(
  type: LeadType,
  skills: SkillRow[]
): Promise<CollectorResult> {
  const stats = emptyStats();
  const insertedByType = emptyInsertedByType();

  const queries = buildQueries(type, skills);

  /*
   * Prevent the same URL appearing from multiple searches.
   */
  const seenUrls = new Set<string>();

  for (const query of queries) {
    let results: SearchResult[] = [];

    try {
      results = await searchWithFallback(query);
    } catch (error) {
      console.error(
        `[LEAD SEARCH ERROR] ${type}`,
        error
      );

      continue;
    }

    for (const result of results) {
      const normalizedSource = normalizeUrl(result.link);

      if (!normalizedSource) continue;

      if (seenUrls.has(normalizedSource)) {
        continue;
      }

      seenUrls.add(normalizedSource);

      const beforeInserted = stats.inserted;

      await processResult(
        type,
        {
          ...result,
          searchQuery: query,
        },
        skills,
        stats
      );

      if (stats.inserted > beforeInserted) {
        insertedByType[type] += 1;
      }
    }
  }

  return {
    stats,
    insertedByType,
  };
}

async function loadSkills(): Promise<SkillRow[]> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("skills")
    .select(
      "id,name,category,subcategory,tags,created_at"
    )
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter(
      (row: any) =>
        row &&
        typeof row.name === "string" &&
        row.name.trim()
    )
    .map((row: any) => ({
      id: row.id,
      name: row.name.trim(),
      category: row.category || undefined,
      subcategory: row.subcategory || undefined,
      tags: row.tags,
    }));
}

function combineStats(
  target: LeadStats,
  source: LeadStats
): void {
  target.found += source.found;
  target.accepted += source.accepted;
  target.inserted += source.inserted;
  target.duplicate += source.duplicate;
  target.stale += source.stale;
  target.wrongType += source.wrongType;
  target.noContact += source.noContact;
  target.noSkill += source.noSkill;
  target.blocked += source.blocked;
  target.insertErrors += source.insertErrors;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /*
   * Always return JSON, including errors.
   * This prevents the old:
   * "Unexpected token 'A' ... is not valid JSON"
   * problem from returning HTML/text to Admin.tsx.
   */
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error:
          "Supabase server environment variables are not configured.",
      });
    }

    const skills = await loadSkills();

    if (!skills.length) {
      return res.status(200).json({
        ok: true,
        message:
          "No skills were found in the skills table.",
        added: 0,
        demand: 0,
        supply: 0,
        saas: 0,
        diagnostics: {
          overall: emptyStats(),
          insertedByType: emptyInsertedByType(),
        },
      });
    }

    const overall = emptyStats();
    const insertedByType = emptyInsertedByType();

    /*
     * Run all three lead types.
     */
    const types: LeadType[] = [
      "Demand",
      "Supply",
      "SaaS",
    ];

    for (const type of types) {
      const result = await collectLeadsForType(
        type,
        skills
      );

      combineStats(
        overall,
        result.stats
      );

      insertedByType.Demand +=
        result.insertedByType.Demand;

      insertedByType.Supply +=
        result.insertedByType.Supply;

      insertedByType.SaaS +=
        result.insertedByType.SaaS;
    }

    const added =
      insertedByType.Demand +
      insertedByType.Supply +
      insertedByType.SaaS;

    return res.status(200).json({
      ok: true,
      message: `Added ${added} leads`,
      added,
      demand: insertedByType.Demand,
      supply: insertedByType.Supply,
      saas: insertedByType.SaaS,
      diagnostics: {
        overall,
        insertedByType,
      },
    });
  } catch (error) {
    console.error(
      "[LEAD COLLECTOR FATAL ERROR]",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
      diagnostics: {
        overall: emptyStats(),
        insertedByType: emptyInsertedByType(),
      },
    });
  }
        }
