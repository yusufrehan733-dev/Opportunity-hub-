import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type LeadType = "Demand" | "Supply" | "SaaS";

type LeadStats = {
  found: number;
  accepted: number;
  inserted: number;
  duplicate: number;
  wrongType: number;
  noSkill: number;
  noContact: number;
  blocked: number;
  stale: number;
  invalid: number;
  insertErrors: number;
};

type SkillRow = {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  tags: string[];
};

type ContactInfo = {
  name?: string;
  email?: string;
  phone?: string;
  url?: string;
};

type SearchResult = {
  title: string;
  link: string;
  description: string;
  snippet?: string;
  author?: string;
  company?: string;
  location?: string;
  publishedAt?: string;
  sourceType: string;
};

type ProcessedLead = {
  type: LeadType;
  title: string;
  description: string;
  country: string;
  city?: string;
  skill: SkillRow;
  source: SearchResult;
  contact: ContactInfo;
  company?: string;
  publishedAt?: string;
};

type InsertedByType = Record<LeadType, number>;

const APP_URL =
  process.env.APP_URL ||
  "https://opportunity-hub-umber.vercel.app";

const REQUEST_TIMEOUT_MS = 12000;
const MAX_RESULTS_PER_SOURCE = 30;
const MAX_AGE_HOURS = 72;

const DEMAND_INTENT_TERMS = [
  "looking for a tutor",
  "looking for a teacher",
  "need a tutor",
  "need a teacher",
  "seeking a tutor",
  "seeking a teacher",
  "looking for a freelancer",
  "need a freelancer",
  "looking for a designer",
  "need a designer",
  "looking for a coach",
  "need a coach",
  "can anyone recommend",
  "hiring someone for a project",
  "need help with my website",
  "need help with marketing",
];

const DEMAND_REJECT_TERMS = [
  "we are hiring",
  "we're hiring",
  "now hiring",
  "job vacancy",
  "job opening",
  "apply now",
  "submit your application",
  "looking for clients",
  "looking for students",
  "hire me",
  "my services",
];

const SUPPLY_INTENT_TERMS = [
  "we are hiring",
  "we're hiring",
  "now hiring",
  "hiring for",
  "job opening",
  "job vacancy",
  "vacancies",
  "recruiting",
  "recruitment",
  "join our team",
  "apply now",
  "apply here",
  "position available",
  "employment opportunity",
  "looking for a teacher",
  "looking for tutor",
  "seeking a teacher",
  "seeking a tutor",
  "freelance opportunity",
  "contract opportunity",
  "service provider needed",
];

const BLOCKED_TERMS = [
  "casino",
  "gambling",
  "crypto giveaway",
  "get rich quick",
  "ebook",
  "buy my course",
  "paid course",
  "affiliate spam",
];

const BLOCKED_DOMAINS = [
  "upwork.com",
  "fiverr.com",
  "freelancer.com",
  "peopleperhour.com",
  "guru.com",
  "toptal.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "simplyhired.com",
  "careerbuilder.com",
  "jooble.org",
];
function clean(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeText(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9@.+:/_-]+/g, " ")
    .trim();
}

function toArrayText(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(clean).filter(Boolean);
      }
    } catch {
      return value.split(",").map(clean).filter(Boolean);
    }
  }

  return [];
}

function containsAny(text: string, terms: string[]): boolean {
  const normalized = normalizeText(text);

  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i")
      .test(normalized);
  });
}

function stripHtml(value: unknown): string {
  return clean(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(value: unknown): string {
  const raw = clean(value);
  if (!raw) return "";

  try {
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

function isBlockedDomain(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();

    return BLOCKED_DOMAINS.some(
      (domain) =>
        hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return true;
  }
}

function containsBlockedContent(text: string): boolean {
  return containsAny(text, BLOCKED_TERMS);
}

function safeDate(value: unknown): string | undefined {
  const raw = clean(value);
  if (!raw) return undefined;

  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return undefined;

  return new Date(timestamp).toISOString();
}

function isFresh(value?: string): boolean {
  if (!value) return false;

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;

  const age = Date.now() - timestamp;
  return age >= 0 && age <= MAX_AGE_HOURS * 60 * 60 * 1000;
}

function resultText(result: SearchResult): string {
  return [
    result.title,
    result.description,
    result.snippet,
    result.author,
    result.company,
    result.location,
  ]
    .filter(Boolean)
    .join(" ");
}

function makeSearchResult(
  title: string,
  link: string,
  description: string,
  sourceType: string,
  publishedAt?: string,
  company?: string,
  location?: string,
  author?: string
): SearchResult | null {
  const safeLink = cleanUrl(link);
  const safeTitle = clean(title);

  if (!safeTitle || !safeLink) return null;

  return {
    title: safeTitle,
    link: safeLink,
    description: stripHtml(description).slice(0, 4000),
    snippet: stripHtml(description).slice(0, 1000),
    sourceType,
    publishedAt: safeDate(publishedAt),
    company: clean(company) || undefined,
    location: clean(location) || undefined,
    author: clean(author) || undefined,
  };
}

async function fetchText(
  url: string,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, text/plain, */*",
        "User-Agent": "OpportunityHubLeadCollector/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "OpportunityHubLeadCollector/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
  }
function findMatchingSkill(
  text: string,
  skills: SkillRow[]
): SkillRow | undefined {
  const normalized = normalizeText(text);

  const matches = skills
    .filter((skill) => clean(skill.name))
    .sort((a, b) => clean(b.name).length - clean(a.name).length);

  return matches.find((skill) => {
    const name = normalizeText(skill.name);
    if (!name) return false;

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return new RegExp(
      `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
      "i"
    ).test(normalized);
  });
}

function findCountry(text: string): string {
  const countries: Array<[string, string[]]> = [
    ["United States", ["united states", "usa", "u.s.a.", "us"]],
    ["United Kingdom", ["united kingdom", "uk", "britain", "england"]],
    ["Canada", ["canada"]],
    ["Australia", ["australia"]],
    ["Pakistan", ["pakistan"]],
    ["India", ["india"]],
    ["United Arab Emirates", ["united arab emirates", "uae"]],
    ["Saudi Arabia", ["saudi arabia"]],
    ["Germany", ["germany"]],
    ["France", ["france"]],
    ["Nigeria", ["nigeria"]],
    ["South Africa", ["south africa"]],
    ["New Zealand", ["new zealand"]],
    ["Ireland", ["ireland"]],
    ["Singapore", ["singapore"]],
    ["Malaysia", ["malaysia"]],
    ["Philippines", ["philippines"]],
    ["Bangladesh", ["bangladesh"]],
    ["Kenya", ["kenya"]],
  ];

  const normalized = normalizeText(text);

  for (const [country, aliases] of countries) {
    if (
      aliases.some((alias) => {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(
          `(^|[^a-z])${escaped}([^a-z]|$)`,
          "i"
        ).test(normalized);
      })
    ) {
      return country;
    }
  }

  return "";
}

function findCity(text: string): string {
  const cities: Array<[string, string[]]> = [
    ["New York", ["new york", "nyc"]],
    ["Los Angeles", ["los angeles"]],
    ["Chicago", ["chicago"]],
    ["Houston", ["houston"]],
    ["Toronto", ["toronto"]],
    ["Vancouver", ["vancouver"]],
    ["London", ["london"]],
    ["Manchester", ["manchester"]],
    ["Birmingham", ["birmingham"]],
    ["Sydney", ["sydney"]],
    ["Melbourne", ["melbourne"]],
    ["Dubai", ["dubai"]],
    ["Abu Dhabi", ["abu dhabi"]],
    ["Islamabad", ["islamabad"]],
    ["Lahore", ["lahore"]],
    ["Karachi", ["karachi"]],
    ["Delhi", ["delhi"]],
    ["Mumbai", ["mumbai"]],
    ["Bengaluru", ["bengaluru", "bangalore"]],
    ["Dublin", ["dublin"]],
    ["Berlin", ["berlin"]],
    ["Paris", ["paris"]],
    ["Singapore", ["singapore"]],
    ["Auckland", ["auckland"]],
    ["Cape Town", ["cape town"]],
  ];

  const normalized = normalizeText(text);

  for (const [city, aliases] of cities) {
    if (
      aliases.some((alias) => {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(
          `(^|[^a-z])${escaped}([^a-z]|$)`,
          "i"
        ).test(normalized);
      })
    ) {
      return city;
    }
  }

  return "";
}

function extractContactInfo(
  text: string,
  sourceUrl: string
): ContactInfo {
  const emailMatch = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );

  const phoneMatch = text.match(
    /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/
  );

  return {
    email: emailMatch?.[0],
    phone: phoneMatch?.[0],
    url: cleanUrl(sourceUrl) || undefined,
  };
}

function isOrganizationResult(result: SearchResult): boolean {
  const text = normalizeText(resultText(result));

  return containsAny(text, [
    "company",
    "school",
    "university",
    "academy",
    "organization",
    "organisation",
    "agency",
    "studio",
    "our team",
    "we are hiring",
    "we're hiring",
    "now hiring",
    "recruitment",
    "job opening",
    "job vacancy",
  ]);
}

function isProfessionalProfile(
  result: SearchResult,
  skill: SkillRow
): boolean {
  const text = normalizeText(resultText(result));

  const professionalTerms = [
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
    "self employed",
    "self-employed",
    "independent professional",
    "my portfolio",
    "my profile",
    "my services",
    "available for work",
  ];

  return (
    Boolean(findMatchingSkill(text, [skill])) &&
    containsAny(text, professionalTerms)
  );
}

function isSpecificSourcePage(result: SearchResult): boolean {
  const url = cleanUrl(result.link);
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");

    return path.length > 1;
  } catch {
    return false;
  }
}

function hasUsableContact(
  result: SearchResult,
  contact: ContactInfo,
  type: LeadType
): boolean {
  if (contact.email || contact.phone) return true;

  if (type === "SaaS") {
    return isSpecificSourcePage(result);
  }

  // A source page is only a contact path candidate.
  // The final lead still needs a genuine, relevant request or opportunity.
  return Boolean(cleanUrl(result.link)) && isSpecificSourcePage(result);
}

function decodeRssValue(value: string): string {
  return stripHtml(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_, code) =>
        String.fromCharCode(Number(code))
      )
  ).trim();
}

function readXmlTag(block: string, names: string[]): string {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tagPattern = new RegExp(
      `<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}\\s*>`,
      "i"
    );
    const match = block.match(tagPattern);

    if (match?.[1]) {
      return decodeRssValue(match[1]);
    }

    const atomPattern = new RegExp(
      `<${escaped}\\b[^>]*\\bhref=["']([^"']+)["'][^>]*\\/?>`,
      "i"
    );
    const atomMatch = block.match(atomPattern);

    if (atomMatch?.[1]) {
      return decodeRssValue(atomMatch[1]);
    }
  }

  return "";
}

function parseRssFeed(xml: string, sourceType: string): SearchResult[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1\s*>/gi) || [];
  const results: SearchResult[] = [];

  for (const block of blocks) {
    const title = readXmlTag(block, ["title"]);
    const link = readXmlTag(block, ["link", "guid", "id"]);
    const description = readXmlTag(block, [
      "content:encoded",
      "description",
      "summary",
      "content"
    ]);
    const publishedAt = readXmlTag(block, [
      "pubDate",
      "published",
      "updated",
      "dc:date"
    ]);
    const author = readXmlTag(block, [
      "author",
      "dc:creator",
      "name"
    ]);

    const safeLink = cleanUrl(link);

    if (!title || !safeLink) continue;

    results.push(
      makeSearchResult(
        title,
        safeLink,
        description,
        sourceType,
        publishedAt || undefined,
        undefined,
        undefined,
        author || undefined
      )
    );

    if (results.length >= MAX_RESULTS_PER_SOURCE) break;
  }

  return results;
}

async function collectRssUrl(
  url: string,
  sourceType: string
): Promise<SearchResult[]> {
  try {
    const xml = await fetchText(url);

    if (!xml || !/<(item|entry)\b/i.test(xml)) {
      return [];
    }

    return parseRssFeed(xml, sourceType);
  } catch (error) {
    console.warn(
      `[LEAD COLLECTOR] ${sourceType} feed unavailable:`,
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

function redditSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    sort: "new",
    t: "month"
  });

  return `https://www.reddit.com/search.rss?${params.toString()}`;
}

async function collectRedditSearch(
  queries: string[],
  sourceType: string
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const results = await collectRssUrl(
      redditSearchUrl(query),
      sourceType
    );

    for (const result of results) {
      const key = cleanUrl(result.link);

      if (!key || seen.has(key)) continue;

      seen.add(key);
      allResults.push(result);
    }
  }

  return allResults;
}

async function collectDemandSources(): Promise<SearchResult[]> {
  return collectRedditSearch(
    [
      '"looking for a tutor"',
      '"need a tutor"',
      '"looking for an online teacher"',
      '"need a freelancer"',
      '"looking for a designer"',
      '"need help with my website"',
      '"looking for a coach"',
      '"need help with marketing"'
    ],
    "Reddit Demand Search"
  );
}

async function collectSaaSSources(): Promise<SearchResult[]> {
  return collectRedditSearch(
    [
      '"freelance tutor" profile',
      '"online teacher" freelance',
      '"freelance designer" portfolio',
      '"independent coach" online',
      '"freelancer" "my portfolio"',
      '"online Quran teacher"'
    ],
    "Reddit Professional Search"
  );
}

async function collectRemoteOk(): Promise<SearchResult[]> {
  try {
    const data = await fetchJson(
      "https://remoteok.com/api"
    );

    if (!Array.isArray(data)) return [];

    return data
      .filter((item: any) => item && item.position && item.url)
      .slice(0, MAX_RESULTS_PER_SOURCE)
      .map((item: any) =>
        makeSearchResult(
          clean(String(item.position || "")),
          cleanUrl(String(item.url || "")),
          stripHtml(
            String(item.description || item.position || "")
          ),
          "RemoteOK",
          item.date || undefined,
          item.company || undefined,
          item.location || undefined
        )
      )
      .filter((item: SearchResult) => Boolean(item.link && item.title));
  } catch (error) {
    console.warn(
      "[LEAD COLLECTOR] RemoteOK unavailable:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

async function collectWWR(): Promise<SearchResult[]> {
  const feeds = [
    {
      url: "https://weworkremotely.com/categories/remote-design-jobs.rss",
      name: "WWR Design"
    },
    {
      url: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
      name: "WWR Programming"
    },
    {
      url: "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",
      name: "WWR Sales and Marketing"
    },
    {
      url: "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
      name: "WWR Customer Support"
    }
  ];

  const collected = await Promise.all(
    feeds.map((feed) =>
      collectRssUrl(feed.url, feed.name)
    )
  );

  const seen = new Set<string>();

  return collected
    .flat()
    .filter((result) => {
      const key = cleanUrl(result.link);

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .slice(0, MAX_RESULTS_PER_SOURCE);
    }

function classifyLeadType(
  result: SearchResult
): LeadType | null {
  const text = normalizeText(resultText(result));

  if (!text || containsBlockedContent(text, result.link)) {
    return null;
  }

  const hasDemandIntent = containsAny(text, DEMAND_INTENT_TERMS);
  const hasDemandReject = containsAny(text, DEMAND_REJECT_TERMS);
  const hasSupplyIntent = containsAny(text, SUPPLY_INTENT_TERMS);
  const organizationResult = isOrganizationResult(text);

  // A request from a potential client must not be treated as a job.
  if (hasDemandIntent && !hasDemandReject && !hasSupplyIntent) {
    return "Demand";
  }

  // Hiring announcements and vacancies belong to Supply.
  if (hasSupplyIntent && organizationResult) {
    return "Supply";
  }

  // Professional profiles are possible SaaS reseller prospects.
  if (
    isProfessionalProfile(result, text) &&
    !hasDemandIntent &&
    !hasSupplyIntent &&
    !hasDemandReject
  ) {
    return "SaaS";
  }

  return null;
}

function getResultDate(result: SearchResult): string | undefined {
  const date = safeDate(result.publishedAt);

  if (!date) return undefined;

  return date.toISOString();
}

function getLeadContact(
  result: SearchResult,
  type: LeadType
): ContactInfo {
  const combinedText = [
    result.title,
    result.description,
    result.snippet || "",
    result.author || ""
  ].join(" ");

  const extracted = extractContactInfo(
    combinedText,
    result.link
  );

  const emailMatch = combinedText.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  const phoneMatch = combinedText.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/
  );

  return {
    name: clean(
      result.author ||
      result.company ||
      (type === "SaaS" ? result.title : "")
    ) || undefined,
    email: emailMatch?.[0] || extracted.email,
    phone: phoneMatch?.[0] || extracted.phone,
    url: result.link
  };
}

function buildProcessedLead(
  result: SearchResult,
  skills: SkillRow[]
): ProcessedLead | null {
  const type = classifyLeadType(result);

  if (!type) return null;

  const combinedText = normalizeText(resultText(result));
  const skill = findMatchingSkill(combinedText, skills);

  // Demand and Supply must match an actual saved app skill.
  // SaaS prospects may be classified by professional profile.
  if (!skill && type !== "SaaS") return null;

  const publishedAt = getResultDate(result);

  // Demand and Supply are limited to the last 72 hours.
  // If the source provides no reliable date, do not assume it is fresh.
  if (type !== "SaaS") {
    if (!publishedAt || !isFresh(publishedAt)) return null;
  }

  const country = findCountry(combinedText);
  const city = findCity(combinedText);
  const contact = getLeadContact(result, type);

  if (!hasUsableContact(result, contact, type)) {
    return null;
  }

  const chosenSkill: SkillRow = skill || {
    id: "",
    name: "Professional Services",
    category: "Professional Services",
    subcategory: null,
    tags: []
  };

  return {
    type,
    title: clean(result.title),
    description: clean(
      result.description || result.snippet || result.title
    ),
    country,
    city: city || undefined,
    skill: chosenSkill,
    source: result,
    contact,
    company: result.company || undefined,
    publishedAt
  };
}

function emptyLeadStats(): Record<LeadType, LeadStats> {
  const create = (): LeadStats => ({
    found: 0,
    accepted: 0,
    inserted: 0,
    duplicate: 0,
    wrongType: 0,
    noSkill: 0,
    noContact: 0,
    blocked: 0,
    stale: 0,
    invalid: 0,
    insertErrors: 0
  });

  return {
    Demand: create(),
    Supply: create(),
    SaaS: create()
  };
}

function emptyInsertedByType(): InsertedByType {
  return {
    Demand: 0,
    Supply: 0,
    SaaS: 0
  };
}
  
function classifyLeadType(
  result: SearchResult
): LeadType | null {
  const text = normalizeText(resultText(result));

  if (!text || containsBlockedContent(text, result.link)) {
    return null;
  }

  const hasDemandIntent = containsAny(text, DEMAND_INTENT_TERMS);
  const hasDemandReject = containsAny(text, DEMAND_REJECT_TERMS);
  const hasSupplyIntent = containsAny(text, SUPPLY_INTENT_TERMS);
  const organizationResult = isOrganizationResult(text);

  // A request from a potential client must not be treated as a job.
  if (hasDemandIntent && !hasDemandReject && !hasSupplyIntent) {
    return "Demand";
  }

  // Hiring announcements and vacancies belong to Supply.
  if (hasSupplyIntent && organizationResult) {
    return "Supply";
  }

  // Professional profiles are possible SaaS reseller prospects.
  if (
    isProfessionalProfile(result, text) &&
    !hasDemandIntent &&
    !hasSupplyIntent &&
    !hasDemandReject
  ) {
    return "SaaS";
  }

  return null;
}

function getResultDate(result: SearchResult): string | undefined {
  const date = safeDate(result.publishedAt);

  if (!date) return undefined;

  return date.toISOString();
}

function getLeadContact(
  result: SearchResult,
  type: LeadType
): ContactInfo {
  const combinedText = [
    result.title,
    result.description,
    result.snippet || "",
    result.author || ""
  ].join(" ");

  const extracted = extractContactInfo(
    combinedText,
    result.link
  );

  const emailMatch = combinedText.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  const phoneMatch = combinedText.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/
  );

  return {
    name: clean(
      result.author ||
      result.company ||
      (type === "SaaS" ? result.title : "")
    ) || undefined,
    email: emailMatch?.[0] || extracted.email,
    phone: phoneMatch?.[0] || extracted.phone,
    url: result.link
  };
}

function buildProcessedLead(
  result: SearchResult,
  skills: SkillRow[]
): ProcessedLead | null {
  const type = classifyLeadType(result);

  if (!type) return null;

  const combinedText = normalizeText(resultText(result));
  const skill = findMatchingSkill(combinedText, skills);

  // Demand and Supply must match an actual saved app skill.
  // SaaS prospects may be classified by professional profile.
  if (!skill && type !== "SaaS") return null;

  const publishedAt = getResultDate(result);

  // Demand and Supply are limited to the last 72 hours.
  // If the source provides no reliable date, do not assume it is fresh.
  if (type !== "SaaS") {
    if (!publishedAt || !isFresh(publishedAt)) return null;
  }

  const country = findCountry(combinedText);
  const city = findCity(combinedText);
  const contact = getLeadContact(result, type);

  if (!hasUsableContact(result, contact, type)) {
    return null;
  }

  const chosenSkill: SkillRow = skill || {
    id: "",
    name: "Professional Services",
    category: "Professional Services",
    subcategory: null,
    tags: []
  };

  return {
    type,
    title: clean(result.title),
    description: clean(
      result.description || result.snippet || result.title
    ),
    country,
    city: city || undefined,
    skill: chosenSkill,
    source: result,
    contact,
    company: result.company || undefined,
    publishedAt
  };
}

function emptyLeadStats(): Record<LeadType, LeadStats> {
  const create = (): LeadStats => ({
    found: 0,
    accepted: 0,
    inserted: 0,
    duplicate: 0,
    wrongType: 0,
    noSkill: 0,
    noContact: 0,
    blocked: 0,
    stale: 0,
    invalid: 0,
    insertErrors: 0
  });

  return {
    Demand: create(),
    Supply: create(),
    SaaS: create()
  };
}

function emptyInsertedByType(): InsertedByType {
  return {
    Demand: 0,
    Supply: 0,
    SaaS: 0
  };
  }

async function sourceAlreadyExists(
  supabase: any,
  table: string,
  sourceUrl: string
): Promise<boolean> {
  if (!sourceUrl) return false;

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("source_url", sourceUrl)
    .limit(1);

  if (error) {
    console.warn(
      `[LEAD COLLECTOR] Duplicate check failed for ${table}:`,
      error.message
    );
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}

async function saasLeadAlreadyExists(
  supabase: any,
  contactUrl: string,
  sourceUrl: string
): Promise<boolean> {
  if (contactUrl) {
    const { data, error } = await supabase
      .from("saas_leads")
      .select("id")
      .eq("contact_url", contactUrl)
      .limit(1);

    if (error) {
      console.warn(
        "[LEAD COLLECTOR] SaaS contact duplicate check failed:",
        error.message
      );
      throw error;
    }

    if (Array.isArray(data) && data.length > 0) {
      return true;
    }
  }

  return sourceAlreadyExists(
    supabase,
    "saas_leads",
    sourceUrl
  );
}

function buildDemandPayload(lead: ProcessedLead): Record<string, any> {
  return {
    client_name:
      lead.contact.name ||
      lead.company ||
      lead.title,
    skill_needed: lead.skill.name,
    description: lead.description,
    email: lead.contact.email || null,
    contact_phone: lead.contact.phone || null,
    title: lead.title,
    category: lead.skill.category || lead.skill.name,
    subcategory: lead.skill.subcategory || null,
    country: lead.country,
    city: lead.city || null,
    contact_name: lead.contact.name || null,
    contact_email: lead.contact.email || null,
    source_url: lead.source.link,
    contact_url: lead.contact.url || lead.source.link,
    status: "active",
    created_at: lead.publishedAt || new Date().toISOString()
  };
}

function buildSupplyPayload(lead: ProcessedLead): Record<string, any> {
  return {
    name:
      lead.company ||
      lead.contact.name ||
      lead.title,
    description: lead.description,
    position: lead.title,
    required_skill: lead.skill.name,
    category: lead.skill.category || lead.skill.name,
    subcategory: lead.skill.subcategory || null,
    country: lead.country,
    city: lead.city || null,
    contact_email: lead.contact.email || null,
    contact_phone: lead.contact.phone || null,
    job_title: lead.title,
    company_name: lead.company || null,
    company_website: null,
    apply_url: lead.source.link,
    source: lead.source.sourceType,
    source_url: lead.source.link,
    contact_name: lead.contact.name || null,
    niche: lead.skill.name,
    contact: lead.contact.url || lead.source.link,
    created_at: lead.publishedAt || new Date().toISOString()
  };
}

function buildSaasPayload(lead: ProcessedLead): Record<string, any> {
  return {
    name:
      lead.contact.name ||
      lead.company ||
      lead.title,
    platform: lead.source.sourceType,
    niche: lead.skill.name,
    contact: lead.contact.email ||
      lead.contact.phone ||
      lead.contact.url ||
      lead.source.link,
    status: "active",
    created_at: new Date().toISOString(),
    description: lead.description,
    trial_days: 14,
    landing_url: APP_URL,
    source_url: lead.source.link,
    country: lead.country,
    city: lead.city || null,
    contact_url: lead.contact.url || lead.source.link
  };
}

async function insertProcessedLead(
  supabase: any,
  lead: ProcessedLead
): Promise<"inserted" | "duplicate" | "error"> {
  const table =
    lead.type === "Demand"
      ? "demand_leads"
      : lead.type === "Supply"
        ? "supply_leads"
        : "saas_leads";

  try {
    const duplicate =
      lead.type === "SaaS"
        ? await saasLeadAlreadyExists(
            supabase,
            lead.contact.url || lead.source.link,
            lead.source.link
          )
        : await sourceAlreadyExists(
            supabase,
            table,
            lead.source.link
          );

    if (duplicate) return "duplicate";

    const payload =
      lead.type === "Demand"
        ? buildDemandPayload(lead)
        : lead.type === "Supply"
          ? buildSupplyPayload(lead)
          : buildSaasPayload(lead);

    const { error } = await supabase
      .from(table)
      .insert(payload);

    if (error) {
      console.error(
        `[LEAD COLLECTOR] Insert failed for ${lead.type}:`,
        error.message
      );
      return "error";
    }

    return "inserted";
  } catch (error) {
    console.error(
      `[LEAD COLLECTOR] Save failed for ${lead.type}:`,
      error instanceof Error ? error.message : String(error)
    );
    return "error";
  }
}

async function insertAllProcessedLeads(
  supabase: any,
  leads: ProcessedLead[],
  stats: Record<LeadType, LeadStats>,
  insertedByType: InsertedByType
): Promise<void> {
  for (const lead of leads) {
    const result = await insertProcessedLead(supabase, lead);

    if (result === "inserted") {
      stats[lead.type].inserted += 1;
      insertedByType[lead.type] += 1;
    } else if (result === "duplicate") {
      stats[lead.type].duplicate += 1;
    } else {
      stats[lead.type].insertErrors += 1;
    }
  }
  }
    
function diagnosticsForResults(
  results: SearchResult[],
  skills: SkillRow[]
): {
  processed: ProcessedLead[];
  stats: Record<LeadType, LeadStats>;
} {
  const stats = emptyLeadStats();
  const processed: ProcessedLead[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const initialType = classifyLeadType(result);

    if (initialType) {
      stats[initialType].found += 1;
    }

    const key = cleanUrl(result.link);

    if (!key || !result.title) {
      if (initialType) {
        stats[initialType].invalid += 1;
      }
      continue;
    }

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (containsBlockedContent(resultText(result), result.link)) {
      if (initialType) {
        stats[initialType].blocked += 1;
      }
      continue;
    }

    if (!initialType) {
      continue;
    }

    const combinedText = normalizeText(resultText(result));
    const skill = findMatchingSkill(combinedText, skills);

    if (!skill && initialType !== "SaaS") {
      stats[initialType].noSkill += 1;
      continue;
    }

    const publishedAt = getResultDate(result);

    if (
      initialType !== "SaaS" &&
      (!publishedAt || !isFresh(publishedAt))
    ) {
      stats[initialType].stale += 1;
      continue;
    }

    const contact = getLeadContact(result, initialType);

    if (!hasUsableContact(result, contact, initialType)) {
      stats[initialType].noContact += 1;
      continue;
    }

    const lead = buildProcessedLead(result, skills);

    if (!lead) {
      stats[initialType].invalid += 1;
      continue;
    }

    processed.push(lead);
    stats[lead.type].accepted += 1;
  }

  return { processed, stats };
}

function buildDiagnosticsResponse(
  stats: Record<LeadType, LeadStats>,
  insertedByType: InsertedByType,
  sourceCounts: Record<string, number>,
  totalCollected: number
): Record<string, any> {
  const summarize = (type: LeadType) => ({
    ...stats[type],
    inserted: insertedByType[type]
  });

  return {
    success: true,
    message:
      `Collected ${totalCollected} unique source results. ` +
      `Inserted Demand ${insertedByType.Demand}, ` +
      `Supply ${insertedByType.Supply}, ` +
      `SaaS ${insertedByType.SaaS}.`,
    totalCollected,
    sources: sourceCounts,
    insertedByType,
    diagnostics: {
      Demand: summarize("Demand"),
      Supply: summarize("Supply"),
      SaaS: summarize("SaaS"),
      "SaaS → Insert Errors": stats.SaaS.insertErrors
    }
  };
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

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[LEAD COLLECTOR] Missing Supabase server environment variables."
    );

    return res.status(500).json({
      success: false,
      message:
        "Supabase server configuration is missing. Check the server environment variables."
    });
  }

  try {
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log("[LEAD COLLECTOR] Loading skills...");

    const { data: skillRows, error: skillError } =
      await supabase
        .from("skills")
        .select("id,name,category,subcategory,tags");

    if (skillError) {
      console.error(
        "[LEAD COLLECTOR] Failed to load skills:",
        skillError.message
      );

      return res.status(500).json({
        success: false,
        message: "Could not load skills from Supabase.",
        error: skillError.message
      });
    }

    const skills: SkillRow[] = (skillRows || [])
      .filter((row: any) => row && row.name)
      .map((row: any) => ({
        id: String(row.id || ""),
        name: String(row.name || ""),
        category: row.category
          ? String(row.category)
          : null,
        subcategory: row.subcategory
          ? String(row.subcategory)
          : null,
        tags: Array.isArray(row.tags)
          ? row.tags.map((tag: unknown) => String(tag))
          : []
      }));

    if (skills.length === 0) {
      return res.status(200).json({
        success: true,
        message:
          "No skills were found in the skills table. Add skills before fetching leads.",
        totalCollected: 0,
        insertedByType: emptyInsertedByType(),
        diagnostics: emptyLeadStats()
      });
    }

    console.log(
      `[LEAD COLLECTOR] Loaded ${skills.length} skills.`
    );

    const sourceResults = await Promise.all([
      collectDemandSources(),
      collectRemoteOk(),
      collectWWR(),
      collectSaaSSources()
    ]);

    const demandResults = sourceResults[0];
    const remoteOkResults = sourceResults[1];
    const wwrResults = sourceResults[2];
    const saasResults = sourceResults[3];

    const allResults = [
      ...demandResults,
      ...remoteOkResults,
      ...wwrResults,
      ...saasResults
    ];

    const uniqueResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const result of allResults) {
      const url = cleanUrl(result.link);

      if (!url || seenUrls.has(url)) continue;

      seenUrls.add(url);
      uniqueResults.push({
        ...result,
        link: url
      });
    }

    console.log(
      `[LEAD COLLECTOR] Collected ${uniqueResults.length} unique source results.`
    );

    const processedResult = diagnosticsForResults(
      uniqueResults,
      skills
    );

    const stats = processedResult.stats;
    const processed = processedResult.processed;
    const insertedByType = emptyInsertedByType();

    await insertAllProcessedLeads(
      supabase,
      processed,
      stats,
      insertedByType
    );

    const sourceCounts: Record<string, number> = {
      "Reddit Demand Search": demandResults.length,
      RemoteOK: remoteOkResults.length,
      "We Work Remotely": wwrResults.length,
      "Reddit Professional Search": saasResults.length
    };

    const response = buildDiagnosticsResponse(
      stats,
      insertedByType,
      sourceCounts,
      uniqueResults.length
    );

    console.log(
      "[LEAD COLLECTOR] Finished:",
      JSON.stringify(response)
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error(
      "[LEAD COLLECTOR] Unexpected failure:",
      error instanceof Error ? error.stack || error.message : String(error)
    );

    return res.status(500).json({
      success: false,
      message: "The lead collector encountered an unexpected error.",
      error:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
  }
