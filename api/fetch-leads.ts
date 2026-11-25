import type {
  VercelRequest,
  VercelResponse
} from "@vercel/node";

import { createClient } from "@supabase/supabase-js";

type LeadType = "Demand" | "Supply" | "SaaS";
type SaasRole = "teacher" | "freelancer" | "coach";

type LeadStats = {
  found: number;
  accepted: number;
  inserted: number;
  total: number;
  demand: number;
  supply: number;
  saas: number;
  rejected: number;
  wrongType: number;
  noSkill: number;
  noContact: number;
  stale: number;
  duplicates: number;
  errors: number;
  sources: Record<string, any>;
};

type SkillRow = {
  id?: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  tags: string[];
};

type SearchResult = {
  title: string;
  link: string;
  description: string;
  snippet?: string;
  searchQuery?: string;
  author?: string;
  company?: string;
  location?: string;
  country?: string;
  publishedAt?: string;
  published?: string;
  sourceType: string;
  source?: string;
  sourceUrl?: string;
  contactUrl?: string;
  applicationUrl?: string;
  email?: string;
  phone?: string;
  salaryRange?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  companyWebsite?: string;
  saasRole?: SaasRole;
};

type ProcessedLead = {
  type: LeadType;
  source: string;
  sourceUrl: string;
  contactUrl: string;
  title: string;
  description: string;
  skill: string;
  category: string;
  subcategory: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  contactName: string;
  applicationUrl: string;
  platform: string;
  niche: string;
  name: string;
  clientName: string;
  company: string;
  position: string;
  publishedAt: string;
  createdAt: string;
  salaryRange?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  companyWebsite?: string;
};

type SourceJob = {
  name: string;
  category: LeadType;
  collect: () => Promise<SearchResult[]>;
};

const REQUEST_TIMEOUT_MS = 1200;
const MAX_RESULTS_PER_SOURCE = 100;
const MAX_AGE_HOURS = 72;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const DEMAND_TEACHER_QUERIES = [
  '"looking for a tutor"',
  '"need a tutor"',
  '"looking for an online teacher"',
  '"need an online teacher"',
  '"looking for a math tutor"',
  '"looking for an English teacher"',
  '"need a language teacher"',
  '"looking for a private teacher"'
];

const DEMAND_FREELANCER_QUERIES = [
  '"looking for a freelancer"',
  '"need a freelancer"',
  '"looking for a web developer"',
  '"looking for a graphic designer"',
  '"looking for a freelance writer"',
  '"need a content writer"',
  '"looking for a video editor"',
  '"need a virtual assistant"'
];

const DEMAND_COACH_QUERIES = [
  '"looking for a business coach"',
  '"need a business coach"',
  '"looking for a career coach"',
  '"need a career coach"',
  '"looking for a life coach"',
  '"looking for a consultant"'
];

const DEMAND_INTENT_TERMS = [
  "looking for a tutor",
  "need a tutor",
  "need tutoring",
  "looking for a teacher",
  "need a teacher",
  "looking for an online teacher",
  "need an online teacher",
  "looking for a freelancer",
  "need a freelancer",
  "looking for a designer",
  "need a designer",
  "looking for a coach",
  "need a coach",
  "need help with",
  "looking for help with",
  "can anyone recommend",
  "looking for a math tutor",
  "need a math tutor",
  "looking for a developer",
  "need a developer",
  "looking for a consultant",
  "need a consultant",
  "looking for a writer",
  "need a writer",
  "looking for a video editor",
  "need a video editor",
  "looking for a virtual assistant",
  "need a virtual assistant"
];

const DEMAND_REJECT_TERMS = [
  "we are hiring",
  "now hiring",
  "job vacancy",
  "job opening",
  "apply now",
  "submit your application",
  "looking for clients",
  "looking for students",
  "hire me",
  "my services",
  "available for hire",
  "join our team",
  "career opportunity",
  "we are recruiting",
  "i offer my services",
  "i am available for work",
  "book my services",
  "check out my portfolio"
];

const SUPPLY_INTENT_TERMS = [
  "we are hiring",
  "hiring for",
  "job opening",
  "job vacancy",
  "job vacancies",
  "vacancies available",
  "recruiting",
  "recruitment",
  "join our team",
  "apply now",
  "apply here",
  "position available",
  "employment opportunity",
  "freelance opportunity",
  "contract opportunity",
  "remote position",
  "full-time position",
  "part-time position",
  "remote job",
  "we are looking for a candidate",
  "salary",
  "compensation",
  "job description"
];

const PROFESSIONAL_TERMS = [
  "teacher",
  "tutor",
  "coach",
  "freelancer",
  "consultant",
  "designer",
  "developer",
  "instructor",
  "educator",
  "mentor",
  "portfolio",
  "professional profile",
  "freelance",
  "professional services",
  "online tutor",
  "business coach",
  "career coach",
  "life coach",
  "fitness coach",
  "leadership coach",
  "language teacher",
  "graphic designer",
  "web developer",
  "digital marketer",
  "virtual assistant",
  "content writer",
  "video editor",
  "online lessons",
  "online classes",
  "coaching services",
  "tutoring services",
  "my students",
  "my clients",
  "book a session",
  "work with me",
  "available for projects",
  "open for freelance work"
];

const BLOCKED_TERMS = [
  "casino",
  "gambling",
  "crypto giveaway",
  "get rich quick",
  "ebook",
  "affiliate spam",
  "investment scheme",
  "guaranteed income"
];

const BLOCKED_DOMAINS = [
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "simplyhired.com",
  "careerbuilder.com",
  "jooble.org"
];

const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "United States",
  usa: "United States",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  canada: "Canada",
  australia: "Australia",
  pakistan: "Pakistan",
  india: "India",
  uae: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
  "saudi arabia": "Saudi Arabia",
  germany: "Germany",
  france: "France",
  netherlands: "Netherlands",
  ireland: "Ireland",
  "new zealand": "New Zealand",
  singapore: "Singapore",
  "south africa": "South Africa",
  nigeria: "Nigeria",
  egypt: "Egypt"
};

const CITY_COUNTRY_MAP: Record<string, string> = {
  toronto: "Canada",
  vancouver: "Canada",
  montreal: "Canada",
  calgary: "Canada",
  london: "United Kingdom",
  manchester: "United Kingdom",
  birmingham: "United Kingdom",
  "new york": "United States",
  "los angeles": "United States",
  chicago: "United States",
  austin: "United States",
  sydney: "Australia",
  melbourne: "Australia",
  dubai: "United Arab Emirates",
  "abu dhabi": "United Arab Emirates",
  lahore: "Pakistan",
  karachi: "Pakistan",
  islamabad: "Pakistan",
  rawalpindi: "Pakistan"
};

const BLOCKED_ECOMMERCE_COURSE_ARTICLE_HOSTS = [
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.de",
  "amazon.fr",
  "amazon.in",
  "amzn.to",
  "amzn.eu",
  "udemy.com",
  "coursera.org",
  "skillshare.com",
  "teachable.com",
  "thinkific.com",
  "kajabi.com",
  "podia.com",
  "gumroad.com",
  "etsy.com",
  "medium.com",
  "substack.com",
  "dev.to",
  "hashnode.dev",
  "blogspot.com",
  "wordpress.com",
  "wixsite.com"
];

const BLOCKED_SOCIAL_ONLY_HOSTS = [
  "bsky.app",
  "github.com",
  "reddit.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "pinterest.com"
];

const NON_DIRECT_PATH_SEGMENTS = [
  "/blog",
  "/blogs",
  "/post",
  "/posts",
  "/article",
  "/articles",
  "/news",
  "/book",
  "/books",
  "/course",
  "/courses",
  "/buy",
  "/shop",
  "/store",
  "/cart",
  "/checkout",
  "/pricing",
  "/subscribe",
  "/newsletter",
  "/podcast",
  "/episode"
];

const ACADEMY_OR_ORG_KEYWORDS = [
  "academy",
  "academies",
  "institute",
  "institut",
  "madrasa",
  "madrasah",
  "school",
  "schools",
  "college",
  "university",
  "learning hub",
  "studio group",
  "official page",
  "collective",
  "agency",
  "corporation",
  "llc",
  "ltd"
];
function clean(value: unknown): string {
  return String(value ?? "")
    .split("\r").join(" ")
    .split("\n").join(" ")
    .split("\t").join(" ")
    .split(" ")
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeText(value: unknown): string {
  return clean(value).toLowerCase();
}

function containsAny(text: string, terms: string[]): boolean {
  const normalized = normalizeText(text);
  return terms.some(term => normalized.includes(normalizeText(term)));
}

function removeTagBlocks(html: string, tagName: string): string {
  let out = html;
  const openNeedle = "<" + tagName;
  const closeNeedle = "</" + tagName + ">";

  while (true) {
    const lower = out.toLowerCase();
    const start = lower.indexOf(openNeedle);
    if (start === -1) break;
    const end = lower.indexOf(closeNeedle, start);
    if (end === -1) {
      out = out.slice(0, start);
      break;
    }
    out = out.slice(0, start) + " " + out.slice(end + closeNeedle.length);
  }
  return out;
}

function stripAllTags(html: string): string {
  let out = "";
  let inTag = false;
  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === "<") {
      inTag = true;
      out += " ";
    } else if (ch === ">") {
      inTag = false;
    } else if (!inTag) {
      out += ch;
    }
  }
  return out;
}

function stripHtml(value: unknown): string {
  let text = String(value ?? "");
  text = removeTagBlocks(text, "script");
  text = removeTagBlocks(text, "style");
  text = stripAllTags(text);

  return clean(
    text
      .split("&nbsp;").join(" ")
      .split("&amp;").join("&")
      .split("&quot;").join('"')
      .split("&#39;").join("'")
      .split("&lt;").join("<")
      .split("&gt;").join(">")
  );
}

function cleanUrl(value: unknown): string {
  try {
    const raw = clean(value);
    if (!raw) return "";
    const url = new URL(raw);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function getHostname(value: string): string {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
}

function isBlockedDomain(value: string): boolean {
  const host = getHostname(value);
  if (!host) return false;

  return BLOCKED_DOMAINS.some(
    domain => host === domain || host.endsWith("." + domain)
  );
}

function containsBlockedContent(text: string, url = ""): boolean {
  return containsAny(text, BLOCKED_TERMS) || isBlockedDomain(url);
}

function safeDate(value: unknown): Date | null {
  const input = clean(value);
  if (!input) return null;

  const lower = input.toLowerCase();
  if (lower.endsWith(" ago")) {
    const parts = lower.slice(0, -4).trim().split(" ");
    if (parts.length === 2) {
      const amount = Number(parts[0]);
      const unit = parts[1];
      if (Number.isFinite(amount)) {
        const multiplier =
          unit.startsWith("minute")
            ? 60 * 1000
            : unit.startsWith("hour")
              ? 60 * 60 * 1000
              : unit.startsWith("day")
                ? 24 * 60 * 60 * 1000
                : unit.startsWith("week")
                  ? 7 * 24 * 60 * 60 * 1000
                  : 0;
        if (multiplier > 0) {
          return new Date(Date.now() - amount * multiplier);
        }
      }
    }
  }

  const numeric = Number(input);
  if (Number.isFinite(numeric) && numeric > 1000000000) {
    const timestamp = numeric < 100000000000 ? numeric * 1000 : numeric;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isFresh(value: unknown): boolean {
  const date = safeDate(value);
  if (!date) return false;

  const age = Date.now() - date.getTime();
  return age >= 0 && age <= MAX_AGE_HOURS * 60 * 60 * 1000;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html, application/rss+xml, application/atom+xml, application/json, text/xml, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${getHostname(url)}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url: string): Promise<any> {
  const body = await fetchText(url);

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Invalid JSON returned by ${getHostname(url)}`);
  }
}

function decodeRssValue(value: string): string {
  const unwrapped = value
    .split("<![CDATA[").join("")
    .split("]]>").join("");
  return stripHtml(unwrapped);
}

function readXmlTag(block: string, tag: string): string {
  const openTag = "<" + tag;
  const closeTag = "</" + tag + ">";
  const lowerBlock = block.toLowerCase();
  const startIdx = lowerBlock.indexOf(openTag.toLowerCase());
  if (startIdx === -1) return "";
  const afterOpenIdx = block.indexOf(">", startIdx);
  if (afterOpenIdx === -1) return "";
  const endIdx = lowerBlock.indexOf(closeTag.toLowerCase(), afterOpenIdx + 1);
  if (endIdx === -1) return "";
  return decodeRssValue(block.slice(afterOpenIdx + 1, endIdx));
}

function extractTagBlocks(xml: string, tagName: string): string[] {
  const blocks: string[] = [];
  const openNeedle = "<" + tagName;
  const closeNeedle = "</" + tagName + ">";
  const lower = xml.toLowerCase();
  let pos = 0;

  while (pos < xml.length) {
    const start = lower.indexOf(openNeedle, pos);
    if (start === -1) break;
    const end = lower.indexOf(closeNeedle, start);
    if (end === -1) break;
    blocks.push(xml.slice(start, end + closeNeedle.length));
    pos = end + closeNeedle.length;
  }

  return blocks;
}

function extractHrefAttribute(block: string): string {
  const lower = block.toLowerCase();
  const idx = lower.indexOf("href=");
  if (idx === -1) return "";
  const quote = block[idx + 5];
  if (quote !== '"' && quote !== "'") return "";
  const end = block.indexOf(quote, idx + 6);
  if (end === -1) return "";
  return block.slice(idx + 6, end);
}

function makeSearchResult(
  title: string,
  link: string,
  description: string,
  source: string,
  publishedAt = "",
  author = ""
): SearchResult {
  const safeLink = cleanUrl(link);

  return {
    title: clean(title),
    link: safeLink,
    sourceUrl: safeLink,
    description: clean(description),
    snippet: clean(description),
    source,
    sourceType: "rss",
    publishedAt: clean(publishedAt),
    published: clean(publishedAt),
    author: clean(author)
  };
}

function parseRssFeed(xml: string, source: string): SearchResult[] {
  const results: SearchResult[] = [];

  const itemBlocks = extractTagBlocks(xml, "item");
  const blocks = itemBlocks.length ? itemBlocks : extractTagBlocks(xml, "entry");

  for (const block of blocks) {
    const title = readXmlTag(block, "title");
    let link = readXmlTag(block, "link");

    if (!link) {
      link = extractHrefAttribute(block);
    }

    const description =
      readXmlTag(block, "description") ||
      readXmlTag(block, "summary") ||
      readXmlTag(block, "content:encoded") ||
      readXmlTag(block, "content");

    const publishedAt =
      readXmlTag(block, "pubDate") ||
      readXmlTag(block, "published") ||
      readXmlTag(block, "updated") ||
      readXmlTag(block, "dc:date");

    const author =
      readXmlTag(block, "author") || readXmlTag(block, "dc:creator");

    const result = makeSearchResult(
      title,
      link,
      description,
      source,
      publishedAt,
      author
    );

    if (result.title && result.link) {
      results.push(result);
    }
  }

  return results.slice(0, MAX_RESULTS_PER_SOURCE);
}

function isAlphaNum(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  );
}

function tokenizeWords(text: string): string[] {
  const lower = normalizeText(text);
  const words: string[] = [];
  let current = "";

  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (isAlphaNum(ch)) {
      current += ch;
    } else if (current) {
      words.push(current);
      current = "";
    }
  }
  if (current) words.push(current);
  return words;
}

function hasWord(text: string, phrase: string): boolean {
  const words = tokenizeWords(text);
  const targetWords = tokenizeWords(phrase);
  if (!targetWords.length) return false;
  if (targetWords.length === 1) {
    return words.includes(targetWords[0]);
  }
  return words.join(" ").includes(targetWords.join(" "));
}

function getCountry(value: string): string {
  const text = normalizeText(value);

  for (const [alias, country] of Object.entries(COUNTRY_ALIASES)) {
    if (hasWord(text, alias)) {
      return country;
    }
  }

  for (const [city, country] of Object.entries(CITY_COUNTRY_MAP)) {
    if (hasWord(text, city)) {
      return country;
    }
  }

  return "";
}

function getCity(value: string): string {
  const text = clean(value);
  const lower = text.toLowerCase();
  const markers = ["based in ", "located in ", "living in ", "from "];

  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1) {
      const rest = text.slice(idx + marker.length);
      const cut = rest.split(",")[0].split(".")[0].split(";")[0].trim();
      if (cut.length >= 2 && cut.length <= 35 && !getCountry(cut)) {
        return cut;
      }
    }
  }

  return "";
      }
function isAcademyOrOrganization(
  nameOrTitle: string,
  text: string,
  url: string
): boolean {
  const combined = `${nameOrTitle} ${text} ${url}`.toLowerCase();
  const targetName = nameOrTitle.toLowerCase();

  for (const kw of ACADEMY_OR_ORG_KEYWORDS) {
    if (hasWord(targetName, kw) || hasWord(combined, kw)) {
      return true;
    }
  }

  return false;
}

function isBlockedHost(url: string, blockedList: string[]): boolean {
  const host = getHostname(url);
  if (!host) return false;
  return blockedList.some(d => host === d || host.endsWith("." + d));
}

function isParkedOrJunkUrl(url: string): boolean {
  const cleaned = cleanUrl(url);
  if (!cleaned) return true;

  const host = getHostname(cleaned);
  if (!host || !host.includes(".")) return true;

  if (isBlockedHost(cleaned, BLOCKED_ECOMMERCE_COURSE_ARTICLE_HOSTS)) {
    return true;
  }

  if (isBlockedHost(cleaned, BLOCKED_SOCIAL_ONLY_HOSTS)) {
    return true;
  }

  if (
    host.startsWith("online-") ||
    host.startsWith("buy-") ||
    host.startsWith("domain-") ||
    host.startsWith("parked") ||
    host.startsWith("coming-soon") ||
    host.startsWith("under-construction")
  ) {
    return true;
  }

  try {
    const pathname = new URL(cleaned).pathname.toLowerCase();
    for (const seg of NON_DIRECT_PATH_SEGMENTS) {
      if (pathname === seg || pathname.startsWith(seg + "/")) {
        return true;
      }
    }
  } catch {
    return true;
  }

  return false;
}

function isDirectContactUrl(url: string): boolean {
  const cleaned = cleanUrl(url);
  if (!cleaned) return false;
  if (isBlockedDomain(cleaned)) return false;
  if (isParkedOrJunkUrl(cleaned)) return false;
  return true;
}

function isValidDirectEmail(email: string): boolean {
  const e = clean(email).toLowerCase();
  const atIdx = e.indexOf("@");
  if (atIdx <= 0 || atIdx === e.length - 1) return false;

  const local = e.slice(0, atIdx);
  const domain = e.slice(atIdx + 1);
  if (!domain.includes(".") || e.includes(" ")) return false;

  const blockedLocals = [
    "hi",
    "hello",
    "info",
    "support",
    "admin",
    "team",
    "contact",
    "sales",
    "help",
    "noreply",
    "no-reply",
    "press",
    "media",
    "jobs",
    "careers",
    "billing",
    "accounts"
  ];
  if (blockedLocals.includes(local)) return false;

  const blockedDomains = [
    "example.com",
    "sentry.io",
    "wixpress.com",
    "wordpress.com",
    "medium.com",
    "substack.com",
    "amazon.com",
    "github.com",
    "bsky.app",
    "w3.org"
  ];
  if (blockedDomains.some(d => domain === d || domain.endsWith("." + d))) {
    return false;
  }

  return true;
}

function getContactUrl(result: SearchResult, type: LeadType): string {
  const direct = cleanUrl(result.contactUrl || "");
  if (direct) {
    if (type === "SaaS") {
      return isDirectContactUrl(direct) ? direct : "";
    }
    return direct;
  }

  const application = cleanUrl(result.applicationUrl || "");
  if (application && type !== "SaaS") return application;

  const link = cleanUrl(result.link || result.sourceUrl || "");
  if (!link) return "";

  if (type === "SaaS") {
    return isDirectContactUrl(link) ? link : "";
  }
  if (type === "Demand" && result.sourceType === "reddit") return link;
  if (
    type === "Supply" &&
    (result.sourceType === "job" || result.sourceType === "rss")
  ) {
    return link;
  }

  return "";
}

function hasRealContact(result: SearchResult, type: LeadType): boolean {
  if (isValidDirectEmail(result.email || "")) {
    return true;
  }

  let digits = "";
  const phoneRaw = clean(result.phone);
  for (let i = 0; i < phoneRaw.length; i++) {
    const ch = phoneRaw[i];
    if (ch >= "0" && ch <= "9") digits += ch;
  }
  if (digits.length >= 7) {
    return true;
  }

  const contact = getContactUrl(result, type);
  if (!contact) return false;

  if (type === "SaaS") {
    return isDirectContactUrl(contact);
  }
  if (type === "Demand" && result.sourceType === "reddit") return true;
  if (
    type === "Supply" &&
    (result.sourceType === "job" || result.sourceType === "rss")
  ) {
    return true;
  }

  return false;
}

function getResultText(result: SearchResult): string {
  return normalizeText(
    [
      result.title,
      result.description,
      result.snippet,
      result.author,
      result.company,
      result.location,
      result.country
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function hasSupplyIntent(text: string): boolean {
  return containsAny(text, SUPPLY_INTENT_TERMS);
}

function hasDemandIntent(text: string): boolean {
  return containsAny(text, DEMAND_INTENT_TERMS);
}

function hasDemandReject(text: string): boolean {
  return containsAny(text, DEMAND_REJECT_TERMS);
}

function hasProfessionalIntent(text: string): boolean {
  return containsAny(text, PROFESSIONAL_TERMS);
}

function isCourseBookOrArticleSpam(text: string): boolean {
  const spamPhrases = [
    "buy my course",
    "enroll now",
    "get the book",
    "available on amazon",
    "kindle edition",
    "paperback",
    "read the full article",
    "in this article",
    "subscribe to my newsletter"
  ];
  return containsAny(text, spamPhrases);
}

function classifyLead(result: SearchResult): LeadType | null {
  const text = getResultText(result);
  const sourceUrl = cleanUrl(result.link || result.sourceUrl || "");

  if (!sourceUrl) return null;
  if (containsBlockedContent(text, sourceUrl)) return null;

  if (
    result.sourceType === "social-profile" &&
    isAcademyOrOrganization(
      clean(result.author || result.title || ""),
      text,
      sourceUrl
    )
  ) {
    return null;
  }

  if (
    result.sourceType === "social-profile" &&
    (result.saasRole || hasProfessionalIntent(text))
  ) {
    if (isCourseBookOrArticleSpam(text)) return null;
    return "SaaS";
  }

  if (hasSupplyIntent(text)) return "Supply";
  if (hasDemandReject(text)) return null;
  if (hasDemandIntent(text)) return "Demand";

  return null;
}

function getSaasRoleFallbackSkill(
  result: SearchResult,
  text: string
): SkillRow | null {
  const langAndIslamic = [
    "quran",
    "tajweed",
    "tafseer",
    "tafsir",
    "fiqh",
    "usul",
    "sharia",
    "islamic studies",
    "arabic",
    "urdu",
    "french",
    "spanish",
    "english"
  ];
  if (containsAny(text, langAndIslamic)) {
    return {
      name: "Languages & Islamic Studies Teaching",
      category: "SaaS Prospects",
      subcategory: "Education",
      tags: ["quran", "tajweed", "tafseer", "fiqh", "arabic", "urdu", "french", "english"]
    };
  }

  const subjectAndKids = [
    "teacher",
    "tutor",
    "educator",
    "instructor",
    "lessons",
    "tutoring",
    "teaching",
    "sociology",
    "math",
    "mathematics",
    "physics",
    "chemistry",
    "biology",
    "history",
    "geography",
    "psychology",
    "anthropology",
    "law",
    "kids",
    "painting",
    "art"
  ];
  if (result.saasRole === "teacher" || containsAny(text, subjectAndKids)) {
    return {
      name: "Subject, Kids & Creative Teaching",
      category: "SaaS Prospects",
      subcategory: "Education",
      tags: ["teacher", "tutor", "educator", "teaching", "kids", "painting"]
    };
  }

  const freelanceTerms = [
    "freelancer",
    "freelance",
    "writer",
    "editor",
    "copywriter",
    "ghostwriter",
    "translator",
    "wordpress",
    "web developer",
    "designer",
    "illustrator",
    "virtual assistant",
    "consultant"
  ];
  if (result.saasRole === "freelancer" || containsAny(text, freelanceTerms)) {
    return {
      name: "Writing, Design & Freelance Services",
      category: "SaaS Prospects",
      subcategory: "Independent Services",
      tags: ["freelancer", "freelance", "writer", "editor", "wordpress", "designer"]
    };
  }

  const coachTerms = ["coach", "coaching", "mentor", "mentorship"];
  if (result.saasRole === "coach" || containsAny(text, coachTerms)) {
    return {
      name: "Coaching & Mentoring",
      category: "SaaS Prospects",
      subcategory: "Coaching",
      tags: ["coach", "coaching", "mentor"]
    };
  }

  return null;
}

function findMatchingSkill(
  result: SearchResult,
  skills: SkillRow[],
  type?: LeadType
): SkillRow | null {
  const text = getResultText(result);
  if (!text) return null;

  const matches = skills
    .map(skill => {
      const terms = [skill.name, ...(skill.tags || [])]
        .map(normalizeText)
        .filter(term => term.length >= 3);

      const matched = terms.some(term => text.includes(term));
      return { skill, matched };
    })
    .filter(item => item.matched);

  if (matches.length) return matches[0].skill;

  if (type === "SaaS") {
    return getSaasRoleFallbackSkill(result, text);
  }

  return null;
}

function checkRejectionReason(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[]
): string {
  const text = getResultText(result);
  if (!text) return "empty_content";

  const sourceUrl = cleanUrl(result.link || result.sourceUrl || "");
  if (containsBlockedContent(text, sourceUrl)) return "blocked_content";
  if (!sourceUrl) return "missing_source_url";

  if (type === "SaaS" && isCourseBookOrArticleSpam(text)) {
    return "course_or_article_promo";
  }

  if (
    type === "SaaS" &&
    isAcademyOrOrganization(
      clean(result.author || result.title || ""),
      text,
      sourceUrl
    )
  ) {
    return "academy_or_org";
  }

  if (type !== "SaaS" && !isFresh(result.publishedAt || result.published)) {
    return "not_fresh";
  }

  if (!findMatchingSkill(result, skills, type)) {
    return "no_matching_skill";
  }

  if (!hasRealContact(result, type)) {
    return "no_real_contact";
  }

  return "";
}

function buildProcessedLead(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[]
): ProcessedLead | null {
  const skill = findMatchingSkill(result, skills, type);
  if (!skill) return null;

  const sourceUrl = cleanUrl(result.link || result.sourceUrl || "");
  const contactUrl = getContactUrl(result, type);
  const email = isValidDirectEmail(result.email || "")
    ? clean(result.email || "")
    : "";

  if (!sourceUrl || (!contactUrl && !email)) return null;

  const title = clean(result.title);
  const description = clean(result.description || result.snippet || "");

  const country = clean(
    result.country || getCountry([result.location, title, description].join(" "))
  );

  const city = clean(getCity(result.location || description));
  const name = clean(result.author || result.company || title);

  return {
    type,
    source: clean(result.source || "Unknown"),
    sourceUrl,
    contactUrl: contactUrl || `mailto:${email}`,
    title,
    description,
    skill: skill.name,
    category: clean(skill.category || ""),
    subcategory: clean(skill.subcategory || ""),
    country,
    city,
    email,
    phone: clean(result.phone || ""),
    contactName: name,
    applicationUrl: cleanUrl(result.applicationUrl || ""),
    platform: contactUrl ? getHostname(contactUrl) : "email",
    niche: skill.name,
    name,
    clientName: name,
    company: clean(result.company || ""),
    position: title,
    publishedAt: clean(result.publishedAt || result.published || ""),
    createdAt: new Date().toISOString(),
    salaryRange: clean(result.salaryRange || ""),
    salaryMin: result.salaryMin ?? null,
    salaryMax: result.salaryMax ?? null,
    companyWebsite: cleanUrl(result.companyWebsite || "")
  };
}
async function collectRedditQueries(
  queries: string[],
  sourceName: string
): Promise<SearchResult[]> {
  const collected: SearchResult[] = [];

  const batches = await Promise.all(
    queries.map(async query => {
      try {
        const url =
          "https://www.reddit.com/search.rss?q=" +
          encodeURIComponent(query) +
          "&sort=new&t=month&limit=25";

        const xml = await fetchText(url);
        const results = parseRssFeed(xml, sourceName);

        return results.map(result => ({
          ...result,
          source: sourceName,
          sourceType: "reddit",
          searchQuery: query,
          link: cleanUrl(result.link),
          sourceUrl: cleanUrl(result.link),
          contactUrl: cleanUrl(result.link),
          snippet: clean(result.description || result.snippet || "")
        }));
      } catch (error) {
        console.error(`[${sourceName}] Query failed:`, query, error);
        return [];
      }
    })
  );

  for (const batch of batches) {
    collected.push(...batch);
  }

  return collected.slice(0, MAX_RESULTS_PER_SOURCE);
}

async function collectRedditDemandTeachers(): Promise<SearchResult[]> {
  return collectRedditQueries(
    DEMAND_TEACHER_QUERIES,
    "Reddit Demand Teachers"
  );
}

async function collectRedditDemandFreelancers(): Promise<SearchResult[]> {
  return collectRedditQueries(
    DEMAND_FREELANCER_QUERIES,
    "Reddit Demand Freelancers"
  );
}

async function collectRedditDemandCoaches(): Promise<SearchResult[]> {
  return collectRedditQueries(
    DEMAND_COACH_QUERIES,
    "Reddit Demand Coaches"
  );
}

function stripTrailingPunctuation(token: string): string {
  let out = token.trim();
  const endChars = [".", ",", ";", "!", "?", ")", "]", "}", ">", '"', "'"];
  const startChars = ["(", "[", "{", "<", '"', "'"];
  while (out.length > 0 && endChars.includes(out[out.length - 1])) {
    out = out.slice(0, -1);
  }
  while (out.length > 0 && startChars.includes(out[0])) {
    out = out.slice(1);
  }
  return out;
}

function extractDirectContactFromBio(raw: string): {
  email: string;
  contactUrl: string;
} {
  const plain = stripAllTags(raw);
  const tokens = clean(plain).split(" ").map(stripTrailingPunctuation).filter(Boolean);

  let validEmail = "";
  let bestUrl = "";

  const allowedTlds = [
    ".com",
    ".org",
    ".net",
    ".io",
    ".co",
    ".me",
    ".edu",
    ".uk",
    ".ca",
    ".au",
    ".de",
    ".fr",
    ".in",
    ".pk",
    ".us",
    ".info",
    ".biz",
    ".ai",
    ".app",
    ".site",
    ".online",
    ".coach",
    ".tutor",
    ".studio",
    ".link",
    ".ee",
    ".cc"
  ];

  for (const token of tokens) {
    if (!validEmail && token.includes("@") && isValidDirectEmail(token)) {
      validEmail = token;
    }

    if (!bestUrl) {
      let candidate = "";
      const lower = token.toLowerCase();
      if (lower.startsWith("http://") || lower.startsWith("https://")) {
        candidate = token;
      } else if (
        !token.includes("@") &&
        allowedTlds.some(tld => lower.endsWith(tld) || lower.includes(tld + "/"))
      ) {
        candidate = "https://" + token;
      }

      if (candidate) {
        const cleaned = cleanUrl(candidate);
        if (cleaned && isDirectContactUrl(cleaned)) {
          bestUrl = cleaned;
        }
      }
    }
  }

  return {
    email: clean(validEmail),
    contactUrl: bestUrl
  };
}

function hasTwoPlusLetters(value: string): boolean {
  let count = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      count++;
      if (count >= 2) return true;
    }
  }
  return false;
}

function isRealPersonName(name: string): boolean {
  const n = clean(name);
  if (!n || n.length < 2 || n.length > 50) return false;
  const blockedNames = [
    "admin",
    "staff",
    "team",
    "support",
    "editorial",
    "bot",
    "unknown",
    "medium",
    "wordpress",
    "scouthub",
    "deleted",
    "automoderator",
    "official",
    "news",
    "daily",
    "weekly",
    "radar",
    "hub",
    "studio",
    "agency",
    "academy",
    "institute",
    "school",
    "madrasa",
    "books",
    "courses",
    "shop",
    "store"
  ];
  if (blockedNames.includes(n.toLowerCase())) {
    return false;
  }
  if (isAcademyOrOrganization(n, "", "")) {
    return false;
  }
  return hasTwoPlusLetters(n);
}

async function isUrlReachableAndActive(url: string): Promise<boolean> {
  const cleaned = cleanUrl(url);
  if (!cleaned || !isDirectContactUrl(cleaned)) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);

  try {
    const response = await fetch(cleaned, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Range: "bytes=0-1024"
      },
      signal: controller.signal
    });

    if (!response.ok || response.status >= 400) {
      return false;
    }

    const finalUrl = cleanUrl(response.url || cleaned);
    if (finalUrl && isParkedOrJunkUrl(finalUrl)) {
      return false;
    }

    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function collectBlueskySubjectAndFreelanceLeads(
  role: SaasRole,
  sourceName: string
): Promise<SearchResult[]> {
  const queriesByRole: Record<SaasRole, string[]> = {
    teacher: [
      "quran tutor",
      "tajweed tutor",
      "arabic tutor",
      "urdu tutor",
      "french tutor",
      "english tutor",
      "math tutor",
      "physics tutor",
      "chemistry tutor",
      "biology tutor",
      "history tutor",
      "psychology tutor",
      "private tutor",
      "kids tutor",
      "painting instructor"
    ],
    freelancer: [
      "freelance writer",
      "content writer",
      "copywriter",
      "ghostwriter",
      "freelance editor",
      "proofreader",
      "translator",
      "wordpress developer",
      "web designer",
      "graphic designer",
      "illustrator",
      "virtual assistant"
    ],
    coach: [
      "career coach",
      "business coach",
      "life coach",
      "executive coach",
      "academic coach",
      "writing coach"
    ]
  };

  const seen = new Set<string>();
  const rawCandidates: SearchResult[] = [];

  const batches = await Promise.all(
    (queriesByRole[role] || []).map(async q => {
      try {
        const data = await fetchJson(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(q)}&limit=50`
        );
        return Array.isArray(data?.actors) ? data.actors : [];
      } catch (error) {
        console.error(`[${sourceName}] Bluesky query failed:`, q, error);
        return [];
      }
    })
  );

  for (const actor of batches.flat()) {
    const displayName = clean(actor?.displayName || actor?.handle || "");
    const bio = clean(actor?.description || "");
    if (!bio || !isRealPersonName(displayName)) continue;
    if (isCourseBookOrArticleSpam(bio)) continue;
    if (isAcademyOrOrganization(displayName, bio, "")) continue;

    const extracted = extractDirectContactFromBio(bio);
    if (!extracted.email && !extracted.contactUrl) continue;

    const key = (extracted.email || extracted.contactUrl).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    rawCandidates.push({
      title: `${displayName} — ${bio.slice(0, 80)}`,
      link: extracted.contactUrl || `mailto:${extracted.email}`,
      sourceUrl: extracted.contactUrl || `mailto:${extracted.email}`,
      contactUrl: extracted.contactUrl,
      email: extracted.email,
      author: displayName,
      country: getCountry(bio) || "Remote / Global",
      description: bio,
      snippet: bio,
      source: sourceName,
      sourceType: "social-profile",
      saasRole: role
    });
  }

  const verified: SearchResult[] = [];
  const checkCap = role === "coach" ? 4 : 6;
  const toCheck = rawCandidates.slice(0, checkCap);

  await Promise.all(
    toCheck.map(async item => {
      if (item.email && !item.contactUrl) {
        verified.push(item);
        return;
      }
      const ok = await isUrlReachableAndActive(item.contactUrl || item.link);
      if (ok) {
        verified.push(item);
      }
    })
  );

  return verified;
}

async function collectSaaSByRole(
  role: SaasRole,
  sourceName: string
): Promise<SearchResult[]> {
  const rows = await collectBlueskySubjectAndFreelanceLeads(role, sourceName);
  const merged = new Map<string, SearchResult>();

  for (const row of rows) {
    const key = clean(row.email || row.contactUrl || row.link || "").toLowerCase();
    if (key && !merged.has(key)) {
      merged.set(key, row);
    }
  }

  return Array.from(merged.values()).slice(0, MAX_RESULTS_PER_SOURCE);
}

async function collectBingSaaSTeachers(): Promise<SearchResult[]> {
  return collectSaaSByRole("teacher", "SaaS Teachers");
}

async function collectBingSaaSFreelancers(): Promise<SearchResult[]> {
  return collectSaaSByRole("freelancer", "SaaS Freelancers");
}

async function collectBingSaaSCoaches(): Promise<SearchResult[]> {
  return collectSaaSByRole("coach", "SaaS Coaches");
    }
async function collectJobicy(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const response = await fetchJson(
      "https://jobicy.com/api/jobs?count=100"
    );

    const jobs = Array.isArray(response)
      ? response
      : response?.jobs || [];

    for (const job of jobs) {
      const title = clean(job.jobTitle || job.title || "");
      const description = stripHtml(
        job.jobDescription || job.description || ""
      );
      const link = cleanUrl(job.url || job.jobUrl || "");

      if (!title || !link) continue;

      results.push({
        title,
        description,
        snippet: description,
        link,
        sourceUrl: link,
        source: "Jobicy",
        sourceType: "job",
        publishedAt: job.pubDate || job.date || job.createdAt || "",
        published: job.pubDate || job.date || job.createdAt || "",
        company: clean(job.companyName || job.company || ""),
        location: clean(job.jobGeo || job.location || ""),
        salaryRange: clean(job.salary || job.salaryRange || ""),
        salaryMin: Number(job.salaryMin) || undefined,
        salaryMax: Number(job.salaryMax) || undefined,
        companyWebsite: cleanUrl(job.companyUrl || job.companyWebsite || ""),
        applicationUrl: link,
        contactUrl: link
      });
    }
  } catch (error) {
    console.error("[Jobicy] Collection failed:", error);
  }

  return results.slice(0, MAX_RESULTS_PER_SOURCE);
}

const WWR_FEEDS = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-design-jobs.rss",
  "https://weworkremotely.com/categories/remote-marketing-jobs.rss",
  "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
  "https://weworkremotely.com/categories/remote-sales-jobs.rss"
];

async function collectWeWorkRemotely(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  const batches = await Promise.all(
    WWR_FEEDS.map(async feed => {
      try {
        const xml = await fetchText(feed);
        const feedResults = parseRssFeed(xml, "We Work Remotely");

        return feedResults.map(result => ({
          ...result,
          sourceType: "job",
          applicationUrl: result.link,
          contactUrl: result.link
        }));
      } catch (error) {
        console.error("[We Work Remotely] Feed failed:", feed, error);
        return [];
      }
    })
  );

  for (const batch of batches) {
    results.push(...batch);
  }

  return results.slice(0, MAX_RESULTS_PER_SOURCE);
}

async function collectRemoteOK(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const response = await fetchJson("https://remoteok.com/api");

    const jobs = Array.isArray(response) ? response.slice(1) : [];

    for (const job of jobs) {
      const title = clean(job.position || "");
      const description = stripHtml(job.description || "");
      const link = cleanUrl(
        job.url || (job.id ? `https://remoteok.com/remote-jobs/${job.id}` : "")
      );

      if (!title || !link) continue;

      results.push({
        title,
        description,
        snippet: description,
        link,
        sourceUrl: link,
        source: "Remote OK",
        sourceType: "job",
        publishedAt: job.date || job.epoch || "",
        published: job.date || job.epoch || "",
        company: clean(job.company || ""),
        location: clean(job.location || "Remote"),
        salaryRange: clean(job.salary || ""),
        companyWebsite: cleanUrl(job.company_url || ""),
        applicationUrl: link,
        contactUrl: link
      });
    }
  } catch (error) {
    console.error("[Remote OK] Collection failed:", error);
  }

  return results.slice(0, MAX_RESULTS_PER_SOURCE);
        }
const sourceCollectionErrors: Record<string, string> = {};

async function runSource(source: SourceJob): Promise<SearchResult[]> {
  try {
    const results = await source.collect();

    console.log(`[${source.name}] Found ${results.length} results`);

    return results.map(result => ({
      ...result,
      source: source.name
    }));
  } catch (error: any) {
    const message = error?.message || String(error);

    sourceCollectionErrors[source.name] = message;

    console.error(`[${source.name}] Collection error:`, message);

    return [];
  }
}

async function collectAllSources(): Promise<{
  results: SearchResult[];
  sourceJobs: SourceJob[];
}> {
  for (const key of Object.keys(sourceCollectionErrors)) {
    delete sourceCollectionErrors[key];
  }

  const sourceJobs: SourceJob[] = [
    {
      name: "Reddit Demand Teachers",
      category: "Demand",
      collect: collectRedditDemandTeachers
    },
    {
      name: "Reddit Demand Freelancers",
      category: "Demand",
      collect: collectRedditDemandFreelancers
    },
    {
      name: "Reddit Demand Coaches",
      category: "Demand",
      collect: collectRedditDemandCoaches
    },
    {
      name: "SaaS Teachers",
      category: "SaaS",
      collect: collectBingSaaSTeachers
    },
    {
      name: "SaaS Freelancers",
      category: "SaaS",
      collect: collectBingSaaSFreelancers
    },
    {
      name: "SaaS Coaches",
      category: "SaaS",
      collect: collectBingSaaSCoaches
    },
    {
      name: "Jobicy",
      category: "Supply",
      collect: collectJobicy
    },
    {
      name: "We Work Remotely",
      category: "Supply",
      collect: collectWeWorkRemotely
    },
    {
      name: "Remote OK",
      category: "Supply",
      collect: collectRemoteOK
    }
  ];

  const collected = await Promise.all(
    sourceJobs.map(source => runSource(source))
  );

  return {
    results: collected.flat(),
    sourceJobs
  };
}

function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function loadSkills(
  supabase: ReturnType<typeof createClient>
): Promise<SkillRow[]> {
  const { data, error } = await supabase.from("skills").select("*");

  if (error) {
    throw new Error(`Unable to load skills: ${error.message}`);
  }

  return (data || [])
    .map((row: any) => ({
      id: clean(row.id || ""),
      name: clean(row.name || row.skill || ""),
      category: clean(row.category || ""),
      subcategory: clean(row.subcategory || ""),
      tags: Array.isArray(row.tags)
        ? row.tags.map((tag: any) => clean(String(tag)))
        : []
    }))
    .filter((skill: SkillRow) => Boolean(skill.name));
}

async function loadExistingUrlSets(
  supabase: ReturnType<typeof createClient>
): Promise<{
  existingSourceUrls: Set<string>;
  existingContactUrls: Set<string>;
}> {
  const existingSourceUrls = new Set<string>();
  const existingContactUrls = new Set<string>();

  const tables = ["demand_leads", "supply_leads", "saas_leads"] as const;

  await Promise.all(
    tables.map(async table => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("source_url, contact_url")
          .limit(500);

        if (!error && Array.isArray(data)) {
          for (const row of data as any[]) {
            const src = cleanUrl(row?.source_url || "").toLowerCase();
            const cnt = cleanUrl(row?.contact_url || "").toLowerCase();
            if (src) existingSourceUrls.add(src);
            if (cnt) existingContactUrls.add(cnt);
          }
        }
      } catch {
        // Ignore lookup error and rely on in-memory deduplication
      }
    })
  );

  return { existingSourceUrls, existingContactUrls };
}

async function insertProcessedLead(
  supabase: ReturnType<typeof createClient>,
  lead: ProcessedLead
): Promise<boolean> {
  const now = new Date().toISOString();

  let table = "";
  let record: Record<string, any> = {};

  if (lead.type === "Demand") {
    table = "demand_leads";

    record = {
      type: "Demand",
      source: lead.source,
      client_name: lead.contactName || lead.name,
      name: lead.name,
      title: lead.title,
      skill_needed: lead.skill,
      description: lead.description,
      contact_email: lead.email || null,
      contact_phone: lead.phone || null,
      contact_url: lead.contactUrl || null,
      source_url: lead.sourceUrl,
      category: lead.category,
      subcategory: lead.subcategory,
      country: lead.country || null,
      city: lead.city || null,
      content: lead.description,
      status: "active",
      created_at: now
    };
  } else if (lead.type === "Supply") {
    table = "supply_leads";

    record = {
      company_name: lead.company || lead.name,
      name: lead.name,
      description: lead.description,
      position: lead.title,
      job_title: lead.title,
      required_skill: lead.skill,
      category: lead.category,
      subcategory: lead.subcategory,
      country: lead.country || null,
      city: lead.city || null,
      salary_range: lead.salaryRange || null,
      salary_min: lead.salaryMin ?? null,
      salary_max: lead.salaryMax ?? null,
      company_website: lead.companyWebsite || null,
      apply_url: lead.contactUrl || lead.sourceUrl,
      contact_url: lead.contactUrl || null,
      contact_name: lead.contactName || null,
      contact: lead.email || lead.phone || lead.contactUrl || null,
      source: lead.source,
      source_url: lead.sourceUrl,
      status: "active"
    };
  } else {
    table = "saas_leads";

    record = {
      name: lead.name || lead.contactName,
      platform: lead.platform,
      niche: lead.skill,
      contact: lead.email || lead.contactUrl,
      description: lead.description,
      source_url: lead.sourceUrl,
      contact_url: lead.contactUrl,
      country: lead.country || null,
      created_at: now
    };
  }

  const { error } = await supabase.from(table).insert(record);

  if (error) {
    console.error(`[${table}] Insert failed:`, error.message);
    return false;
  }

  return true;
}

function createEmptyStats(): LeadStats {
  return {
    found: 0,
    accepted: 0,
    inserted: 0,
    total: 0,
    demand: 0,
    supply: 0,
    saas: 0,
    rejected: 0,
    wrongType: 0,
    noSkill: 0,
    noContact: 0,
    stale: 0,
    duplicates: 0,
    errors: 0,
    sources: {}
  };
}

function incrementTypeCount(stats: LeadStats, type: LeadType): void {
  if (type === "Demand") {
    stats.demand++;
  } else if (type === "Supply") {
    stats.supply++;
  } else {
    stats.saas++;
  }

  stats.total++;
}

async function processCollectedResults(
  results: SearchResult[],
  sourceJobs: SourceJob[],
  supabase: ReturnType<typeof createClient>
): Promise<LeadStats> {
  const stats = createEmptyStats();
  const [skills, existingSets] = await Promise.all([
    loadSkills(supabase),
    loadExistingUrlSets(supabase)
  ]);

  const seenSourceUrls = existingSets.existingSourceUrls;
  const seenContactUrls = existingSets.existingContactUrls;

  const sourceDiagnostics: Record<string, any> = {};

  for (const source of sourceJobs) {
    sourceDiagnostics[source.name] = {
      category: source.category,
      found: 0,
      accepted: 0,
      inserted: 0,
      rejected: 0,
      duplicates: 0,
      errors: 0,
      wrongType: 0,
      noSkill: 0,
      noContact: 0,
      stale: 0
    };
  }

  stats.found = results.length;

  for (const result of results) {
    const sourceName = clean(result.source || "Unknown");

    if (!sourceDiagnostics[sourceName]) {
      sourceDiagnostics[sourceName] = {
        category: "Demand",
        found: 0,
        accepted: 0,
        inserted: 0,
        rejected: 0,
        duplicates: 0,
        errors: 0,
        wrongType: 0,
        noSkill: 0,
        noContact: 0,
        stale: 0
      };
    }

    const diagnostic = sourceDiagnostics[sourceName];
    diagnostic.found++;

    try {
      const type = classifyLead(result);

      if (!type) {
        diagnostic.wrongType++;
        diagnostic.rejected++;
        stats.wrongType++;
        stats.rejected++;
        continue;
      }

      const expectedSource = sourceJobs.find(
        source => source.name === sourceName
      );

      if (expectedSource && expectedSource.category !== type) {
        diagnostic.wrongType++;
        diagnostic.rejected++;
        stats.wrongType++;
        stats.rejected++;
        continue;
      }

      const rejectionReason = checkRejectionReason(result, type, skills);

      if (rejectionReason) {
        if (rejectionReason === "no_matching_skill") {
          diagnostic.noSkill++;
          stats.noSkill++;
        }

        if (rejectionReason === "no_real_contact") {
          diagnostic.noContact++;
          stats.noContact++;
        }

        if (rejectionReason === "not_fresh") {
          diagnostic.stale++;
          stats.stale++;
        }

        diagnostic.rejected++;
        stats.rejected++;
        continue;
      }

      const lead = buildProcessedLead(result, type, skills);

      if (!lead) {
        diagnostic.rejected++;
        stats.rejected++;
        continue;
      }

      const sourceKey = lead.sourceUrl.toLowerCase();
      const contactKey = lead.contactUrl.toLowerCase();

      if (sourceKey && seenSourceUrls.has(sourceKey)) {
        diagnostic.duplicates++;
        stats.duplicates++;
        continue;
      }

      if (contactKey && seenContactUrls.has(contactKey)) {
        diagnostic.duplicates++;
        stats.duplicates++;
        continue;
      }

      stats.accepted++;
      diagnostic.accepted++;

      const inserted = await insertProcessedLead(supabase, lead);

      if (!inserted) {
        diagnostic.errors++;
        stats.errors++;
        continue;
      }

      if (sourceKey) seenSourceUrls.add(sourceKey);
      if (contactKey) seenContactUrls.add(contactKey);

      stats.inserted++;
      diagnostic.inserted++;

      incrementTypeCount(stats, lead.type);
    } catch (error: any) {
      diagnostic.errors++;
      stats.errors++;

      console.error(
        `[${sourceName}] Processing failed:`,
        error?.message || error
      );
    }
  }

  stats.sources = sourceDiagnostics;
  return stats;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST."
    });
  }

  try {
    const supabase = getSupabaseClient();

    const collection = await collectAllSources();

    const stats = await processCollectedResults(
      collection.results,
      collection.sourceJobs,
      supabase
    );

    return res.status(200).json({
      success: true,
      message: "Lead collection completed.",
      stats,
      sources: sourceCollectionErrors
    });
  } catch (error: any) {
    const message =
      error?.message || "Unexpected error while collecting leads.";

    console.error("[Fetch Leads] Handler failed:", message);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message
      });
    }
  }
      }
