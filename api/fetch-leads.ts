import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const MAX_AGE_HOURS = 72;
const MAX_QUERIES_PER_TYPE = 6;
const RESULTS_PER_SEARCH = 10;
const MAX_RESULTS_PER_SOURCE = 25;

const APP_URL = "https://opportunity-hub-umber.vercel.app/";

type LeadType = "Demand" | "Supply" | "SaaS";

type SourceType = "reddit" | "remoteok" | "wwr";

type SkillRow = {
  id?: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | string | null;
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
  publishedAt?: string;
  author?: string;
  sourceType: SourceType;
  company?: string;
  location?: string;
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

type InsertedByType = {
  Demand: number;
  Supply: number;
  SaaS: number;
};

const DEMAND_INTENT_TERMS = [
  "looking for a",
  "looking for an",
  "need a",
  "need an",
  "need help",
  "seeking a",
  "seeking an",
  "recommend a",
  "recommendation for",
  "can anyone provide",
  "hire a",
  "hire an",
  "need someone",
  "looking to hire",
  "want to hire",
  "looking for tutor",
  "need tutor",
  "looking for teacher",
  "need teacher",
  "looking for freelancer",
  "need freelancer",
  "looking for designer",
  "need designer",
  "looking for developer",
  "need developer",
  "looking for coach",
  "need coach",
];

const DEMAND_REJECT_TERMS = [
  "i offer",
  "my services",
  "hire me",
  "available for work",
  "open to work",
  "my portfolio",
  "my resume",
  "my cv",
  "looking for clients",
  "looking for students",
  "looking for customers",
  "book my service",
  "check out my work",
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

function emptyStats(): LeadStats {
  return {
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
    insertErrors: 0,
  };
}

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: unknown): string {
  return clean(value).toLowerCase();
}

function containsAny(text: string, terms: string[]): boolean {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(term));
}

function toArrayText(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,;|]/)
      .map(clean)
      .filter(Boolean);
  }

  return [];
}

function cleanUrl(value: unknown): string {
  const raw = clean(value);
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
  }
  
function extractUrls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<>"']+/gi) || [])
    .map((url) => url.replace(/[),.;!?]+$/, ""))
    .map(cleanUrl)
    .filter(Boolean);
}

function extractEmail(text: string): string {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );
  return match ? match[0].toLowerCase() : "";
}

function extractPhone(text: string): string {
  const matches =
    text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [];

  for (const candidate of matches) {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 15) {
      return candidate.trim();
    }
  }

  return "";
}

function extractContactInfo(
  text: string,
  sourceUrl = ""
): ContactInfo {
  const urls = extractUrls(text).filter(
    (url) => url !== cleanUrl(sourceUrl)
  );

  const email = extractEmail(text);
  const phone = extractPhone(text);

  const contactUrl =
    urls.find((url) => {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return (
          host.includes("linkedin.com") ||
          host.includes("facebook.com") ||
          host.includes("instagram.com") ||
          host.includes("wa.me") ||
          host.includes("whatsapp.com") ||
          host.includes("t.me") ||
          host.includes("telegram.me")
        );
      } catch {
        return false;
      }
    }) || "";

  return {
    email,
    phone,
    url: contactUrl,
  };
}

function isBlockedDomain(value: string): boolean {
  try {
    const hostname = new URL(value).hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return BLOCKED_DOMAINS.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(`.${domain}`)
    );
  } catch {
    return true;
  }
}

function containsBlockedContent(text: string): boolean {
  return containsAny(text, BLOCKED_TERMS);
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

function findMatchingSkill(
  text: string,
  skills: SkillRow[]
): SkillRow | undefined {
  const normalized = normalizeText(text);

  const matches = skills
    .filter((skill) => clean(skill.name))
    .sort(
      (a, b) =>
        clean(b.name).length - clean(a.name).length
    );

  return matches.find((skill) => {
    const name = normalizeText(skill.name);
    if (!name) return false;

    const escaped = name.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    return new RegExp(
      `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
      "i"
    ).test(normalized);
  });
}

function findCountry(text: string): string {
  const countries: Array<[string, string[]]> = [
    ["United States", ["united states", "usa", "u.s.a."]],
    ["United Kingdom", ["united kingdom", "uk", "britain"]],
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
      aliases.some((alias) =>
        new RegExp(
          `(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`,
          "i"
        ).test(normalized)
      )
    ) {
      return country;
    }
  }

  return "";
}

function findCity(text: string): string {
  const cities = [
    "London",
    "Manchester",
    "Birmingham",
    "New York",
    "Los Angeles",
    "Chicago",
    "Toronto",
    "Vancouver",
    "Sydney",
    "Melbourne",
    "Lahore",
    "Islamabad",
    "Karachi",
    "Delhi",
    "Mumbai",
    "Dubai",
    "Abu Dhabi",
    "Riyadh",
    "Berlin",
    "Paris",
    "Dublin",
    "Singapore",
    "Kuala Lumpur",
    "Nairobi",
    "Lagos",
  ];

  const normalized = normalizeText(text);

  return (
    cities.find((city) => {
      const escaped = city.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      return new RegExp(
        `(^|[^a-z])${escaped}([^a-z]|$)`,
        "i"
      ).test(normalized);
    }) || ""
  );
}

function isFresh(publishedAt?: string): boolean {
  if (!publishedAt) return false;

  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return false;

  const age = Date.now() - timestamp;

  return age >= 0 && age <= MAX_AGE_HOURS * 60 * 60 * 1000;
}

function makeSearchResult(
  title: string,
  link: string,
  description: string,
  sourceType: SourceType,
  publishedAt?: string,
  author?: string,
  location?: string
): SearchResult | null {
  const safeLink = cleanUrl(link);
  const safeTitle = clean(title);

  if (!safeLink || !safeTitle || isBlockedDomain(safeLink)) {
    return null;
  }

  return {
    title: safeTitle,
    link: safeLink,
    description: clean(description),
    snippet: clean(description),
    sourceType,
    publishedAt,
    author: clean(author),
    location: clean(location),
  };
  }
    
function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    );
}

function stripHtml(value: string): string {
  return decodeXml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseXmlItems(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];
  const blocks = xml.match(/<(item|entry)\b[^>]*>[\s\S]*?<\/\1>/gi) || [];

  for (const block of blocks) {
    const readTag = (tag: string): string => {
      const match = block.match(
        new RegExp(
          `<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`,
          "i"
        )
      );
      return match ? stripHtml(match[1]) : "";
    };

    const linkMatch = block.match(
      /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i
    );

    const guidMatch = block.match(
      /<guid\b[^>]*>([\s\S]*?)<\/guid>/i
    );

    items.push({
      title: readTag("title"),
      link:
        (linkMatch ? decodeXml(linkMatch[1]) : "") ||
        readTag("link") ||
        (guidMatch ? stripHtml(guidMatch[1]) : ""),
      description:
        readTag("description") ||
        readTag("summary") ||
        readTag("content:encoded") ||
        readTag("content"),
      publishedAt:
        readTag("pubDate") ||
        readTag("published") ||
        readTag("updated") ||
        readTag("date"),
      author:
        readTag("author") ||
        readTag("dc:creator"),
    });
  }

  return items;
}

async function fetchText(
  url: string,
  timeoutMs = 12000
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
  const timeout = setTimeout(() => controller.abort(), 12000);

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

function safeDate(value: unknown): string | undefined {
  const raw = clean(value);
  if (!raw) return undefined;

  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return undefined;

  return new Date(timestamp).toISOString();
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const output: SearchResult[] = [];

  for (const result of results) {
    const url = cleanUrl(result.link);
    if (!url) continue;

    const key = url.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) continue;

    seen.add(key);
    output.push({ ...result, link: url });
  }

  return output;
}

async function collectRemoteOk(): Promise<SearchResult[]> {
  try {
    const data = await fetchJson<unknown>(
      "https://remoteok.com/api"
    );

    if (!Array.isArray(data)) return [];

    const results: SearchResult[] = [];

    for (const item of data.slice(1)) {
      if (!item || typeof item !== "object") continue;

      const job = item as Record<string, unknown>;
      const title = clean(job.position);
      const company = clean(job.company);
      const link = cleanUrl(
        clean(job.url) ||
          (job.id ? `https://remoteok.com/remote-jobs/${job.id}` : "")
      );

      if (!title || !link || !company) continue;

      const description = stripHtml(
        [
          clean(job.description),
          clean(job.tags),
          company,
          title,
          clean(job.location),
        ].join(" ")
      );

      const result = makeSearchResult(
        title,
        link,
        description,
        "remoteok",
        safeDate(job.date),
        company,
        clean(job.location)
      );

      if (result) {
        result.company = company;
        results.push(result);
      }

      if (results.length >= RESULTS_PER_SEARCH) break;
    }

    return results;
  } catch (error) {
    console.error("[LEAD COLLECTOR] RemoteOK error:", error);
    return [];
  }
}

async function collectRemoteOkRss(): Promise<SearchResult[]> {
  try {
    const xml = await fetchText(
      "https://remoteok.com/remote-jobs.rss"
    );

    return parseXmlItems(xml)
      .slice(0, RESULTS_PER_SEARCH)
      .map((item) =>
        makeSearchResult(
          item.title,
          item.link,
          item.description,
          "remoteok",
          safeDate(item.publishedAt),
          item.author
        )
      )
      .filter((item): item is SearchResult => Boolean(item));
  } catch (error) {
    console.error("[LEAD COLLECTOR] RemoteOK RSS error:", error);
    return [];
  }
}

async function collectWWR(): Promise<SearchResult[]> {
  try {
    const xml = await fetchText(
      "https://weworkremotely.com/remote-jobs.rss"
    );

    return parseXmlItems(xml)
      .slice(0, RESULTS_PER_SEARCH)
      .map((item) =>
        makeSearchResult(
          item.title,
          item.link,
          item.description,
          "wwr",
          safeDate(item.publishedAt),
          item.author
        )
      )
      .filter((item): item is SearchResult => Boolean(item));
  } catch (error) {
    console.error("[LEAD COLLECTOR] We Work Remotely error:", error);
    return [];
  }
}
  
async function collectReddit(): Promise<SearchResult[]> {
  const feeds = [
    "https://www.reddit.com/r/forhire/new/.rss",
    "https://www.reddit.com/r/slavelabour/new/.rss",
    "https://www.reddit.com/r/freelance_forhire/new/.rss",
    "https://www.reddit.com/r/needafriend/new/.rss",
    "https://www.reddit.com/r/Teachers/new/.rss",
  ];

  const results: SearchResult[] = [];

  for (const feedUrl of feeds) {
    try {
      const xml = await fetchText(feedUrl);
      const items = parseXmlItems(xml);

      for (const item of items) {
        const result = makeSearchResult(
          item.title,
          item.link,
          item.description,
          "reddit",
          safeDate(item.publishedAt),
          item.author
        );

        if (!result) continue;

        results.push(result);

        if (results.length >= MAX_RESULTS_PER_SOURCE) {
          break;
        }
      }
    } catch (error) {
      console.error(
        "[LEAD COLLECTOR] Reddit feed error:",
        feedUrl,
        error
      );
    }

    if (results.length >= MAX_RESULTS_PER_SOURCE) {
      break;
    }
  }

  return dedupeResults(results);
}

function isOrganizationResult(result: SearchResult): boolean {
  const text = normalizeText(
    [
      result.title,
      result.description,
      result.company,
      result.author,
    ].join(" ")
  );

  const organizationTerms = [
    "company",
    "organization",
    "school",
    "university",
    "college",
    "academy",
    "institute",
    "agency",
    "studio",
    "agency",
    "nonprofit",
    "non-profit",
    "foundation",
    "clinic",
    "business",
    "team",
    "department",
    "we are hiring",
    "we're hiring",
    "our team",
    "company website",
  ];

  return (
    Boolean(result.company) ||
    containsAny(text, organizationTerms)
  );
}

function isProfessionalProfile(
  result: SearchResult,
  skill: SkillRow
): boolean {
  const text = normalizeText(
    [
      result.title,
      result.description,
      result.author,
      result.company,
    ].join(" ")
  );

  const professionalTerms = [
    "teacher",
    "tutor",
    "educator",
    "coach",
    "mentor",
    "freelancer",
    "consultant",
    "designer",
    "developer",
    "writer",
    "trainer",
    "instructor",
    "professional",
    "portfolio",
    "my work",
    "my services",
    "years of experience",
    "years experience",
    "specialist",
    "expert",
  ];

  const skillName = normalizeText(skill.name);

  return (
    containsAny(text, professionalTerms) ||
    (Boolean(skillName) && text.includes(skillName))
  );
}

function isSpecificSourcePage(result: SearchResult): boolean {
  try {
    const url = new URL(result.link);
    const hostname = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();

    if (isBlockedDomain(result.link)) return false;

    if (
      hostname === "reddit.com" ||
      hostname.endsWith(".reddit.com")
    ) {
      return /^\/r\/[^/]+\/comments\/[^/]+\/[^/]+/.test(path);
    }

    if (
      hostname === "linkedin.com" ||
      hostname.endsWith(".linkedin.com")
    ) {
      return (
        path.startsWith("/in/") ||
        path.startsWith("/company/")
      );
    }

    if (
      hostname === "facebook.com" ||
      hostname.endsWith(".facebook.com") ||
      hostname === "instagram.com" ||
      hostname.endsWith(".instagram.com") ||
      hostname === "t.me" ||
      hostname === "wa.me"
    ) {
      return path.length > 1;
    }

    if (
      hostname === "remoteok.com" ||
      hostname.endsWith(".remoteok.com") ||
      hostname === "weworkremotely.com" ||
      hostname.endsWith(".weworkremotely.com")
    ) {
      return false;
    }

    const genericPaths = [
      "",
      "/",
      "/jobs",
      "/careers",
      "/about",
      "/contact",
      "/search",
      "/home",
      "/remote-jobs",
    ];

    if (genericPaths.includes(path.replace(/\/+$/, "") || "/")) {
      return false;
    }

    return path.split("/").filter(Boolean).length >= 2;
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

  const contactUrl = cleanUrl(contact.url);
  const sourceUrl = cleanUrl(result.link);

  if (contactUrl && contactUrl !== sourceUrl) {
    return true;
  }

  if (type === "SaaS") {
    return isSpecificSourcePage(result);
  }

  return false;
        }
      
function classifyResult(
  result: SearchResult,
  skills: SkillRow[]
): { type: LeadType | null; skill?: SkillRow } {
  const text = resultText(result);
  const lower = normalizeText(text);
  const skill = findMatchingSkill(text, skills);

  if (!skill) return { type: null };

  if (containsBlockedContent(lower)) {
    return { type: null };
  }

  const demandIntent = containsAny(lower, DEMAND_INTENT_TERMS);
  const demandReject = containsAny(lower, DEMAND_REJECT_TERMS);
  const supplyIntent = containsAny(lower, SUPPLY_INTENT_TERMS);
  const organization = isOrganizationResult(result);
  const hiringLanguage =
    supplyIntent ||
    containsAny(lower, [
      "job posting",
      "job listing",
      "we are recruiting",
      "position open",
      "submit your application",
      "job opportunity",
    ]);

  const professional = isProfessionalProfile(result, skill);

  // Demand: someone needs a service, not someone selling one.
  if (
    demandIntent &&
    !demandReject &&
    !hiringLanguage &&
    !organization
  ) {
    return { type: "Demand", skill };
  }

  // Supply: a real organization is hiring or seeking providers.
  if (
    organization &&
    hiringLanguage &&
    !demandIntent
  ) {
    return { type: "Supply", skill };
  }

  // SaaS: a relevant professional, never a job vacancy.
  if (
    professional &&
    !hiringLanguage &&
    !demandIntent &&
    !demandReject &&
    !containsAny(lower, [
      "apply now",
      "job vacancy",
      "job listing",
      "job posting",
      "salary",
      "employment opportunity",
      "we are hiring",
      "we're hiring",
      "now hiring",
    ]) &&
    isSpecificSourcePage(result)
  ) {
    return { type: "SaaS", skill };
  }

  return { type: null };
}

function validateProcessedLead(
  lead: ProcessedLead
): { valid: boolean; reason?: keyof LeadStats } {
  const result = lead.source;
  const text = resultText(result);

  if (!lead.title || !result.link || !cleanUrl(result.link)) {
    return { valid: false, reason: "invalid" };
  }

  if (isBlockedDomain(result.link) || containsBlockedContent(text)) {
    return { valid: false, reason: "blocked" };
  }

  if (!lead.country || !lead.skill?.name) {
    return { valid: false, reason: "noSkill" };
  }

  if (
    lead.type !== "SaaS" &&
    !isFresh(lead.publishedAt)
  ) {
    return { valid: false, reason: "stale" };
  }

  if (
    !hasUsableContact(result, lead.contact, lead.type)
  ) {
    return { valid: false, reason: "noContact" };
  }

  const lower = normalizeText(text);

  if (lead.type === "Demand") {
    if (
      !containsAny(lower, DEMAND_INTENT_TERMS) ||
      containsAny(lower, DEMAND_REJECT_TERMS) ||
      containsAny(lower, SUPPLY_INTENT_TERMS) ||
      isOrganizationResult(result)
    ) {
      return { valid: false, reason: "wrongType" };
    }
  }

  if (lead.type === "Supply") {
    if (
      !isOrganizationResult(result) ||
      !containsAny(lower, SUPPLY_INTENT_TERMS) ||
      containsAny(lower, [
        "looking for clients",
        "looking for students",
        "looking for customers",
        "my services",
        "hire me",
      ])
    ) {
      return { valid: false, reason: "wrongType" };
    }
  }

  if (lead.type === "SaaS") {
    if (
      !isProfessionalProfile(result, lead.skill) ||
      containsAny(lower, [
        "apply now",
        "job vacancy",
        "job listing",
        "job posting",
        "employment opportunity",
        "we are hiring",
        "we're hiring",
        "now hiring",
      ]) ||
      !isSpecificSourcePage(result)
    ) {
      return { valid: false, reason: "wrongType" };
    }
  }

  return { valid: true };
}

function buildProcessedLead(
  result: SearchResult,
  skills: SkillRow[]
): ProcessedLead | null {
  const classification = classifyResult(result, skills);

  if (!classification.type || !classification.skill) {
    return null;
  }

  const type = classification.type;
  const skill = classification.skill;
  const text = resultText(result);
  const contact = extractContactInfo(text, result.link);

  const locationText = [
    result.location,
    result.title,
    result.description,
    result.snippet,
    result.company,
  ]
    .filter(Boolean)
    .join(" ");

  const country = findCountry(locationText);
  const city = findCity(locationText);

  const lead: ProcessedLead = {
    type,
    title: clean(result.title),
    description: clean(result.description || result.snippet).slice(0, 500),
    country,
    city: city || undefined,
    skill,
    source: result,
    contact,
    company: clean(result.company) || undefined,
    publishedAt: safeDate(result.publishedAt),
  };

  const validation = validateProcessedLead(lead);

  return validation.valid ? lead : null;
}

function makeLeadTitle(lead: ProcessedLead): string {
  return clean(lead.title).slice(0, 120);
}

function makeDescription(lead: ProcessedLead): string {
  return clean(lead.description).slice(0, 500);
}

function makeContactUrl(lead: ProcessedLead): string {
  const contactUrl = cleanUrl(lead.contact.url);
  return contactUrl || "";
}

function makeSourceUrl(lead: ProcessedLead): string {
  return cleanUrl(lead.source.link);
    }
    
async function insertDemandLead(
  supabase: ReturnType<typeof createClient>,
  lead: ProcessedLead
): Promise<"inserted" | "duplicate" | "error"> {
  const sourceUrl = makeSourceUrl(lead);

  const existing = await supabase
    .from("demand_leads")
    .select("id")
    .eq("source_url", sourceUrl)
    .limit(1);

  if (existing.error) {
    console.error("[LEAD COLLECTOR] Demand duplicate check:", existing.error);
    return "error";
  }

  if (existing.data && existing.data.length > 0) {
    return "duplicate";
  }

  const payload = {
    client_name: clean(lead.contact.name) || clean(lead.company) || makeLeadTitle(lead),
    skill_needed: lead.skill.name,
    description: makeDescription(lead),
    email: lead.contact.email || null,
    contact_phone: lead.contact.phone || null,
    title: makeLeadTitle(lead),
    category: lead.skill.category || null,
    subcategory: lead.skill.subcategory || null,
    country: lead.country,
    city: lead.city || null,
    contact_name: lead.contact.name || null,
    contact_email: lead.contact.email || null,
    source_url: sourceUrl,
    contact_url: makeContactUrl(lead) || null,
    status: "active",
    created_at: new Date().toISOString(),
  };

  const inserted = await supabase
    .from("demand_leads")
    .insert(payload);

  if (inserted.error) {
    console.error("[LEAD COLLECTOR] Demand insert:", inserted.error);
    return "error";
  }

  return "inserted";
}

async function insertSupplyLead(
  supabase: ReturnType<typeof createClient>,
  lead: ProcessedLead
): Promise<"inserted" | "duplicate" | "error"> {
  const sourceUrl = makeSourceUrl(lead);

  const existing = await supabase
    .from("supply_leads")
    .select("id")
    .eq("source_url", sourceUrl)
    .limit(1);

  if (existing.error) {
    console.error("[LEAD COLLECTOR] Supply duplicate check:", existing.error);
    return "error";
  }

  if (existing.data && existing.data.length > 0) {
    return "duplicate";
  }

  const contactUrl = makeContactUrl(lead) || null;

  const payload = {
    name: clean(lead.company) || makeLeadTitle(lead),
    description: makeDescription(lead),
    position: makeLeadTitle(lead),
    required_skill: lead.skill.name,
    category: lead.skill.category || null,
    subcategory: lead.skill.subcategory || null,
    country: lead.country,
    city: lead.city || null,
    contact_email: lead.contact.email || null,
    contact_phone: lead.contact.phone || null,
    job_title: makeLeadTitle(lead),
    company_name: clean(lead.company) || null,
    company_website: null,
    apply_url: contactUrl,
    source: lead.source.sourceType,
    source_url: sourceUrl,
    contact_name: lead.contact.name || null,
    niche: lead.skill.name,
    contact: contactUrl || lead.contact.email || lead.contact.phone || null,
    created_at: new Date().toISOString(),
  };

  const inserted = await supabase
    .from("supply_leads")
    .insert(payload);

  if (inserted.error) {
    console.error("[LEAD COLLECTOR] Supply insert:", inserted.error);
    return "error";
  }

  return "inserted";
}

async function insertSaasLead(
  supabase: ReturnType<typeof createClient>,
  lead: ProcessedLead
): Promise<"inserted" | "duplicate" | "error"> {
  const sourceUrl = makeSourceUrl(lead);
  const contactUrl = makeContactUrl(lead) || sourceUrl;

  const existingContact = await supabase
    .from("saas_leads")
    .select("id")
    .eq("contact_url", contactUrl)
    .limit(1);

  if (existingContact.error) {
    console.error("[LEAD COLLECTOR] SaaS contact duplicate check:", existingContact.error);
    return "error";
  }

  if (existingContact.data && existingContact.data.length > 0) {
    return "duplicate";
  }

  const existingSource = await supabase
    .from("saas_leads")
    .select("id")
    .eq("source_url", sourceUrl)
    .limit(1);

  if (existingSource.error) {
    console.error("[LEAD COLLECTOR] SaaS source duplicate check:", existingSource.error);
    return "error";
  }

  if (existingSource.data && existingSource.data.length > 0) {
    return "duplicate";
  }

  const payload = {
    name: clean(lead.contact.name) || clean(lead.source.author) || makeLeadTitle(lead),
    platform: lead.source.sourceType,
    niche: lead.skill.name,
    contact: lead.contact.email || lead.contact.phone || contactUrl,
    status: "active",
    created_at: new Date().toISOString(),
    description: makeDescription(lead),
    trial_days: 14,
    landing_url: APP_URL,
    source_url: sourceUrl,
    country: lead.country,
    city: lead.city || null,
    contact_url: contactUrl,
  };

  const inserted = await supabase
    .from("saas_leads")
    .insert(payload);

  if (inserted.error) {
    console.error("[LEAD COLLECTOR] SaaS insert:", inserted.error);
    return "error";
  }

  return "inserted";
}

async function insertProcessedLead(
  supabase: ReturnType<typeof createClient>,
  lead: ProcessedLead
): Promise<"inserted" | "duplicate" | "error"> {
  if (lead.type === "Demand") {
    return insertDemandLead(supabase, lead);
  }

  if (lead.type === "Supply") {
    return insertSupplyLead(supabase, lead);
  }

  return insertSaasLead(supabase, lead);
}
async function loadSkillsFromSupabase(
  supabase: ReturnType<typeof createClient>
): Promise<SkillRow[]> {
  const { data, error } = await supabase
    .from("skills")
    .select("id,name,category,subcategory,tags");

  if (error) {
    throw new Error(`Could not load skills: ${error.message}`);
  }

  return (data || [])
    .map((row: Record<string, unknown>) => ({
      id: clean(row.id),
      name: clean(row.name),
      category: clean(row.category) || null,
      subcategory: clean(row.subcategory) || null,
      tags: toArrayText(row.tags),
    }))
    .filter((skill: SkillRow) => Boolean(skill.name));
}

async function collectAllSources(): Promise<SearchResult[]> {
  const collectors = await Promise.allSettled([
    collectRemoteOk(),
    collectRemoteOkRss(),
    collectWWR(),
    collectReddit(),
  ]);

  const results: SearchResult[] = [];

  for (const collector of collectors) {
    if (collector.status === "fulfilled") {
      results.push(...collector.value);
    } else {
      console.error(
        "[LEAD COLLECTOR] Source collection failed:",
        collector.reason
      );
    }
  }

  return dedupeResults(results);
}

function processResults(
  results: SearchResult[],
  skills: SkillRow[],
  type: LeadType
): { leads: ProcessedLead[]; diagnostics: LeadStats } {
  const diagnostics = emptyStats();
  const leads: ProcessedLead[] = [];

  for (const result of results) {
    diagnostics.found += 1;

    const classification = classifyResult(result, skills);

    if (!classification.type || !classification.skill) {
      if (!findMatchingSkill(resultText(result), skills)) {
        diagnostics.noSkill += 1;
      } else {
        diagnostics.wrongType += 1;
      }
      continue;
    }

    if (classification.type !== type) {
      diagnostics.wrongType += 1;
      continue;
    }

    const lead = buildProcessedLead(result, skills);

    if (!lead) {
      const text = resultText(result);

      if (isBlockedDomain(result.link) || containsBlockedContent(text)) {
        diagnostics.blocked += 1;
      } else if (
        type !== "SaaS" &&
        !isFresh(result.publishedAt)
      ) {
        diagnostics.stale += 1;
      } else if (!findCountry(text)) {
        diagnostics.noSkill += 1;
      } else if (
        !hasUsableContact(
          result,
          extractContactInfo(text, result.link),
          type
        )
      ) {
        diagnostics.noContact += 1;
      } else {
        diagnostics.invalid += 1;
      }

      continue;
    }

    const validation = validateProcessedLead(lead);

    if (!validation.valid) {
      diagnostics[validation.reason || "invalid"] += 1;
      continue;
    }

    diagnostics.accepted += 1;
    leads.push(lead);
  }

  return { leads, diagnostics };
}

function diagnosticsForResults(
  results: SearchResult[],
  skills: SkillRow[]
): {
  diagnostics: Record<LeadType, LeadStats>;
  leads: ProcessedLead[];
} {
  const demand = processResults(results, skills, "Demand");
  const supply = processResults(results, skills, "Supply");
  const saas = processResults(results, skills, "SaaS");

  return {
    diagnostics: {
      Demand: demand.diagnostics,
      Supply: supply.diagnostics,
      SaaS: saas.diagnostics,
    },
    leads: [
      ...demand.leads,
      ...supply.leads,
      ...saas.leads,
    ],
  };
}

async function insertAllProcessedLeads(
  supabase: ReturnType<typeof createClient>,
  leads: ProcessedLead[],
  diagnostics: Record<LeadType, LeadStats>
): Promise<InsertedByType> {
  const insertedByType: InsertedByType = {
    Demand: 0,
    Supply: 0,
    SaaS: 0,
  };

  for (const lead of leads) {
    const result = await insertProcessedLead(supabase, lead);
    const stats = diagnostics[lead.type];

    if (result === "inserted") {
      stats.inserted += 1;
      insertedByType[lead.type] += 1;
    } else if (result === "duplicate") {
      stats.duplicate += 1;
    } else {
      stats.insertErrors += 1;
    }
  }

  return insertedByType;
}

function totalStats(
  diagnostics: Record<LeadType, LeadStats>
): LeadStats {
  const total = emptyStats();

  for (const type of ["Demand", "Supply", "SaaS"] as LeadType[]) {
    const stats = diagnostics[type];

    total.found += stats.found;
    total.accepted += stats.accepted;
    total.inserted += stats.inserted;
    total.duplicate += stats.duplicate;
    total.wrongType += stats.wrongType;
    total.noSkill += stats.noSkill;
    total.noContact += stats.noContact;
    total.blocked += stats.blocked;
    total.stale += stats.stale;
    total.invalid += stats.invalid;
    total.insertErrors += stats.insertErrors;
  }

  return total;
      }
      
function emptyDiagnostics(): Record<LeadType, LeadStats> {
  return {
    Demand: emptyStats(),
    Supply: emptyStats(),
    SaaS: emptyStats(),
  };
}

function buildResponsePayload(
  diagnostics: Record<LeadType, LeadStats>,
  insertedByType: InsertedByType
) {
  const overall = totalStats(diagnostics);

  return {
    success: true,
    message: `Lead collection completed. Inserted ${overall.inserted} leads.`,
    added: overall.inserted,
    inserted: overall.inserted,
    insertedByType,
    diagnostics: {
      Demand: diagnostics.Demand,
      Supply: diagnostics.Supply,
      SaaS: diagnostics.SaaS,
      overall,
    },
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
      message: "Method not allowed. Use POST.",
    });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      success: false,
      message:
        "Missing server configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  try {
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const skills = await loadSkillsFromSupabase(supabase);

    if (skills.length === 0) {
      const diagnostics = emptyDiagnostics();

      return res.status(200).json({
        success: true,
        message: "No skills were available for lead matching.",
        added: 0,
        inserted: 0,
        insertedByType: {
          Demand: 0,
          Supply: 0,
          SaaS: 0,
        },
        diagnostics: {
          ...diagnostics,
          overall: totalStats(diagnostics),
        },
      });
    }

    console.log(
      `[LEAD COLLECTOR] Loaded ${skills.length} skills.`
    );

    const results = await collectAllSources();

    console.log(
      `[LEAD COLLECTOR] Collected ${results.length} unique source results.`
    );

    const processed = diagnosticsForResults(results, skills);
    const diagnostics = processed.diagnostics;

    const insertedByType = await insertAllProcessedLeads(
      supabase,
      processed.leads,
      diagnostics
    );

    const payload = buildResponsePayload(
      diagnostics,
      insertedByType
    );

    console.log(
      "[LEAD COLLECTOR] Completed:",
      JSON.stringify(payload.diagnostics)
    );

    return res.status(200).json(payload);
  } catch (error) {
    console.error("[LEAD COLLECTOR] Fatal error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "An unexpected lead collection error occurred.";

    return res.status(500).json({
      success: false,
      message: "Lead collection failed.",
      error: message,
      added: 0,
      inserted: 0,
      insertedByType: {
        Demand: 0,
        Supply: 0,
        SaaS: 0,
      },
      diagnostics: {
        Demand: emptyStats(),
        Supply: emptyStats(),
        SaaS: emptyStats(),
        overall: emptyStats(),
      },
    });
  }
  }
