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

const REQUEST_TIMEOUT_MS = 20000;
const MAX_RESULTS_PER_SOURCE = 100;
const MAX_AGE_HOURS = 72;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const DEMAND_TEACHER_QUERIES = [
  '"looking for a tutor"',
  '"need a tutor"',
  '"looking for an online teacher"',
  '"need an online teacher"',
  '"looking for a Quran teacher"',
  '"need a Quran teacher"',
  '"looking for a math tutor"',
  '"need a math tutor"',
  '"looking for an English teacher"',
  '"need an English tutor"',
  '"looking for a language teacher"',
  '"need help with lessons"',
  '"looking for a private teacher"'
];

const DEMAND_FREELANCER_QUERIES = [
  '"looking for a freelancer"',
  '"need a freelancer"',
  '"looking for a web developer"',
  '"need a web developer"',
  '"looking for a graphic designer"',
  '"need a graphic designer"',
  '"looking for a freelance writer"',
  '"need a content writer"',
  '"looking for a video editor"',
  '"need a virtual assistant"',
  '"looking for a digital marketer"',
  '"need help with my website"'
];

const DEMAND_COACH_QUERIES = [
  '"looking for a business coach"',
  '"need a business coach"',
  '"looking for a career coach"',
  '"need a career coach"',
  '"looking for a life coach"',
  '"need a life coach"',
  '"looking for a fitness coach"',
  '"need a fitness coach"',
  '"looking for a consultant"',
  '"need a consultant"'
];

const SAAS_DEVTO_TAGS: Record<SaasRole, string[]> = {
  teacher: ["teaching", "education", "mentorship", "learning"],
  freelancer: ["freelance", "webdev", "design", "career"],
  coach: ["coaching", "career", "productivity", "leadership"]
};

const SAAS_MEDIUM_TAGS: Record<SaasRole, string[]> = {
  teacher: ["online-teaching", "tutoring", "education"],
  freelancer: ["freelancing", "web-development", "graphic-design"],
  coach: ["coaching", "life-coach", "career-coaching"]
};

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
  "looking for a quran teacher",
  "need a quran teacher",
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
  "jooble.org"
];

const CONTACT_PATH_TERMS = [
  "contact",
  "contact-us",
  "hire",
  "book",
  "message",
  "apply",
  "request",
  "get-in-touch"
];

const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "United States",
  "usa": "United States",
  "united kingdom": "United Kingdom",
  "uk": "United Kingdom",
  "canada": "Canada",
  "australia": "Australia",
  "pakistan": "Pakistan",
  "india": "India",
  "uae": "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
  "saudi arabia": "Saudi Arabia",
  "germany": "Germany",
  "france": "France",
  "netherlands": "Netherlands",
  "ireland": "Ireland",
  "new zealand": "New Zealand",
  "singapore": "Singapore",
  "south africa": "South Africa",
  "nigeria": "Nigeria",
  "egypt": "Egypt"
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
function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: unknown): string {
  return clean(value).toLowerCase();
}

function containsAny(
  text: string,
  terms: string[]
): boolean {
  const normalized = normalizeText(text);

  return terms.some(term =>
    normalized.includes(normalizeText(term))
  );
}

function stripHtml(value: unknown): string {
  return clean(
    String(value ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
  );
}

function cleanUrl(value: unknown): string {
  try {
    const raw = clean(value);
    const url = new URL(raw);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
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
    return new URL(value).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlockedDomain(value: string): boolean {
  const host = getHostname(value);
  if (!host) return false;

  return BLOCKED_DOMAINS.some(domain =>
    host === domain ||
    host.endsWith("." + domain)
  );
}

function containsBlockedContent(
  text: string,
  url = ""
): boolean {
  return (
    containsAny(text, BLOCKED_TERMS) ||
    isBlockedDomain(url)
  );
}

function safeDate(value: unknown): Date | null {
  const input = clean(value);
  if (!input) return null;

  const relative = input.match(
    /^(\d+)\s+(minute|hour|day|week)s?\s+ago$/i
  );

  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const multiplier =
      unit === "minute"
        ? 60 * 1000
        : unit === "hour"
          ? 60 * 60 * 1000
          : unit === "day"
            ? 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000;

    return new Date(Date.now() - amount * multiplier);
  }

  const numeric = Number(input);
  if (Number.isFinite(numeric) && numeric > 1000000000) {
    const timestamp =
      numeric < 100000000000 ? numeric * 1000 : numeric;
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

async function fetchText(
  url: string
): Promise<string> {
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
        "Accept":
          "text/html, application/rss+xml, application/atom+xml, application/json, text/xml, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} from ${getHostname(url)}`
      );
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
    throw new Error(
      `Invalid JSON returned by ${getHostname(url)}`
    );
  }
}

function decodeRssValue(value: string): string {
  return stripHtml(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(parseInt(hex, 16))
      )
      .replace(/&#(\d+);/g, (_, number) =>
        String.fromCodePoint(Number(number))
      )
      .replace(/&apos;/gi, "'")
  );
}

function readXmlTag(
  block: string,
  tag: string
): string {
  const escaped = tag.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const match = block.match(
    new RegExp(
      `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
      "i"
    )
  );

  return match ? decodeRssValue(match[1]) : "";
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

function parseRssFeed(
  xml: string,
  source: string
): SearchResult[] {
  const results: SearchResult[] = [];

  const blocks =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) ||
    xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ||
    [];

  for (const block of blocks) {
    const title = readXmlTag(block, "title");
    let link = readXmlTag(block, "link");

    if (!link) {
      const linkMatch = block.match(
        /<link[^>]+href=["']([^"']+)["']/i
      );
      link = linkMatch ? linkMatch[1] : "";
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
      readXmlTag(block, "author") ||
      readXmlTag(block, "dc:creator");

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

function getCountry(value: string): string {
  const text = normalizeText(value);

  for (const [alias, country] of Object.entries(COUNTRY_ALIASES)) {
    const expression = new RegExp(
      `\\b${alias.replace(/\s+/g, "\\s+")}\\b`,
      "i"
    );
    if (expression.test(text)) {
      return country;
    }
  }

  for (const [city, country] of Object.entries(CITY_COUNTRY_MAP)) {
    const cityExpr = new RegExp(
      `\\b${city.replace(/\s+/g, "\\s+")}\\b`,
      "i"
    );
    if (cityExpr.test(text)) {
      return country;
    }
  }

  return "";
}

function getCity(value: string): string {
  const text = clean(value);
  const match = text.match(
    /\b(?:based in|located in|living in|from)\s+([A-Z][a-zA-Z .'-]{2,35})(?:,|\||$)/i
  );

  if (!match) return "";
  const possible = clean(match[1]);
  if (getCountry(possible)) return "";

  return possible;
    }
function isSpecificContactPage(
  value: string
): boolean {
  const url = cleanUrl(value);
  if (!url) return false;

  let path = "";
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return false;
  }

  return containsAny(path, CONTACT_PATH_TERMS);
}

function getContactUrl(
  result: SearchResult,
  type: LeadType
): string {
  const direct = cleanUrl(result.contactUrl || "");
  if (direct) return direct;

  const application = cleanUrl(result.applicationUrl || "");
  if (application && type !== "SaaS") return application;

  const link = cleanUrl(result.link || result.sourceUrl || "");
  if (!link) return "";

  if (type === "SaaS") return link;
  if (type === "Demand" && result.sourceType === "reddit") return link;
  if (
    type === "Supply" &&
    (result.sourceType === "job" || result.sourceType === "rss")
  ) {
    return link;
  }

  if (isSpecificContactPage(link)) return link;

  return "";
}

function hasRealContact(
  result: SearchResult,
  type: LeadType
): boolean {
  if (
    clean(result.email) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(result.email))
  ) {
    return true;
  }

  if (clean(result.phone).replace(/\D/g, "").length >= 7) {
    return true;
  }

  const contact = getContactUrl(result, type);
  if (!contact) return false;

  if (type === "SaaS") return true;
  if (type === "Demand" && result.sourceType === "reddit") return true;
  if (
    type === "Supply" &&
    (result.sourceType === "job" || result.sourceType === "rss")
  ) {
    return true;
  }

  return isSpecificContactPage(contact);
}

function getResultText(result: SearchResult): string {
  return normalizeText([
    result.title,
    result.description,
    result.snippet,
    result.author,
    result.company,
    result.location,
    result.country
  ].filter(Boolean).join(" "));
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

function classifyLead(
  result: SearchResult
): LeadType | null {
  const text = getResultText(result);
  const sourceUrl = cleanUrl(result.link || result.sourceUrl || "");

  if (!sourceUrl) return null;
  if (containsBlockedContent(text, sourceUrl)) return null;

  if (
    result.sourceType === "social-profile" &&
    (result.saasRole || hasProfessionalIntent(text))
  ) {
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
  if (
    result.saasRole === "teacher" ||
    /\b(teacher|tutor|educator|instructor|lessons|tutoring|teaching)\b/i.test(text)
  ) {
    return {
      name: "Online Teaching",
      category: "SaaS Prospects",
      subcategory: "Education",
      tags: ["teacher", "tutor", "educator", "teaching"]
    };
  }

  if (
    result.saasRole === "freelancer" ||
    /\b(freelancer|freelance|designer|developer|consultant|writer|editor|marketer)\b/i.test(text)
  ) {
    return {
      name: "Freelancing",
      category: "SaaS Prospects",
      subcategory: "Independent Services",
      tags: ["freelancer", "freelance", "designer", "developer"]
    };
  }

  if (
    result.saasRole === "coach" ||
    /\b(coach|coaching|mentor|mentorship)\b/i.test(text)
  ) {
    return {
      name: "Coaching",
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

  if (
    type !== "SaaS" &&
    !isFresh(result.publishedAt || result.published)
  ) {
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
  const email = clean(result.email || "");

  if (!sourceUrl || (!contactUrl && !email)) return null;

  const title = clean(result.title);
  const description = clean(
    result.description || result.snippet || ""
  );

  const country = clean(
    result.country ||
    getCountry([result.location, title, description].join(" "))
  );

  const city = clean(
    getCity(result.location || description)
  );

  const name = clean(
    result.author || result.company || title
  );

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

function extractContactFromText(text: string): {
  email: string;
  contactUrl: string;
} {
  const emailMatch = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  const urlMatch = text.match(/https?:\/\/[^\s<>"')]+/i);

  return {
    email: emailMatch ? clean(emailMatch[0]) : "",
    contactUrl: urlMatch ? cleanUrl(urlMatch[0]) : ""
  };
}

function isRealPersonName(name: string): boolean {
  const n = clean(name);
  if (!n || n.length < 2 || n.length > 80) return false;
  if (/^(admin|staff|team|support|editorial|bot|unknown|medium|wordpress)$/i.test(n)) {
    return false;
  }
  return /[a-zA-Z]{2,}/.test(n);
}

async function collectDevToSaaSByRole(
  role: SaasRole,
  sourceName: string
): Promise<SearchResult[]> {
  const tags = SAAS_DEVTO_TAGS[role] || [];
  const seenKeys = new Set<string>();
  const results: SearchResult[] = [];

  for (const tag of tags) {
    try {
      const articles = await fetchJson(
        `https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=20`
      );

      if (!Array.isArray(articles)) continue;

      for (const article of articles.slice(0, 15)) {
        const articleUrl = cleanUrl(article?.url || "");
        const personName = clean(
          article?.user?.name || article?.user?.username || ""
        );
        const title = clean(article?.title || "");
        const desc = clean(article?.description || "");
        const bio = `${personName} — ${role} — ${title} ${desc}`.trim();

        const bodyContact = extractContactFromText(
          `${desc} ${article?.canonical_url || ""}`
        );
        const contactUrl =
          bodyContact.contactUrl ||
          cleanUrl(article?.canonical_url || "") ||
          articleUrl;
        const email = bodyContact.email;

        if (!isRealPersonName(personName)) continue;
        if (!contactUrl && !email) continue;

        const dedupKey = (contactUrl || email || articleUrl).toLowerCase();
        if (!dedupKey || seenKeys.has(dedupKey)) continue;
        seenKeys.add(dedupKey);

        const detectedCountry = getCountry(bio);

        results.push({
          title: `${personName} — ${title}`,
          link: articleUrl || contactUrl,
          sourceUrl: articleUrl || contactUrl,
          contactUrl: contactUrl || articleUrl,
          email,
          author: personName,
          country: detectedCountry || "Remote / Global",
          description: bio,
          snippet: bio,
          source: sourceName,
          sourceType: "social-profile",
          saasRole: role,
          publishedAt: clean(article?.published_at || ""),
          published: clean(article?.published_at || "")
        });

        if (results.length >= MAX_RESULTS_PER_SOURCE) {
          return results;
        }
      }
    } catch (error) {
      console.error(`[${sourceName}] Dev.to tag failed:`, tag, error);
    }
  }

  return results;
}

async function collectMediumSaaSByRole(
  role: SaasRole,
  sourceName: string
): Promise<SearchResult[]> {
  const tags =
    role === "teacher"
      ? [
          "online-teaching",
          "tutoring",
          "language-learning",
          "english-learning",
          "mathematics",
          "education"
        ]
      : SAAS_MEDIUM_TAGS[role] || [];

  const seenKeys = new Set<string>();
  const results: SearchResult[] = [];

  for (const tag of tags) {
    try {
      const xml = await fetchText(
        `https://medium.com/feed/tag/${encodeURIComponent(tag)}`
      );
      const items = parseRssFeed(xml, sourceName);

      for (const item of items.slice(0, 15)) {
        const personName = clean(item.author || "");
        const textBlob = `${personName} (${role}) — ${item.title} ${item.description}`;
        const { email, contactUrl } = extractContactFromText(textBlob);
        const resolvedContact = contactUrl || cleanUrl(item.link || "");

        if (!isRealPersonName(personName)) continue;
        if (!resolvedContact && !email) continue;

        const dedupKey = (resolvedContact || email).toLowerCase();
        if (!dedupKey || seenKeys.has(dedupKey)) continue;
        seenKeys.add(dedupKey);

        const detectedCountry = getCountry(textBlob);

        results.push({
          ...item,
          author: personName,
          country: detectedCountry || "Remote / Global",
          email,
          contactUrl: resolvedContact,
          source: sourceName,
          sourceType: "social-profile",
          saasRole: role,
          description: textBlob,
          snippet: textBlob
        });

        if (results.length >= MAX_RESULTS_PER_SOURCE) {
          return results;
        }
      }
    } catch (error) {
      console.error(`[${sourceName}] Medium tag failed:`, tag, error);
    }
  }

  return results;
}

async function collectWordPressTeachers(
  sourceName: string
): Promise<SearchResult[]> {
  const tags = [
    "tutoring",
    "online-teaching",
    "english-teacher",
    "math-tutor",
    "language-learning",
    "music-teacher",
    "homeschooling"
  ];

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const tag of tags) {
    try {
      const xml = await fetchText(
        `https://wordpress.com/tag/${encodeURIComponent(tag)}/feed`
      );
      const items = parseRssFeed(xml, sourceName);

      for (const item of items.slice(0, 12)) {
        const personName = clean(item.author || "");
        const textBlob = `${personName} (teacher / ${tag.replace(/-/g, " ")}) — ${item.title} ${item.description}`;
        const { email, contactUrl } = extractContactFromText(textBlob);

        let siteRoot = "";
        try {
          const u = new URL(item.link);
          siteRoot = `${u.protocol}//${u.hostname}`;
        } catch {
          siteRoot = cleanUrl(item.link);
        }

        const resolvedContact = contactUrl || siteRoot || cleanUrl(item.link);

        if (!isRealPersonName(personName)) continue;
        if (!resolvedContact && !email) continue;

        const key = (resolvedContact || email).toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);

        const detectedCountry = getCountry(textBlob);

        results.push({
          ...item,
          author: personName,
          country: detectedCountry || "Remote / Global",
          email,
          contactUrl: resolvedContact,
          source: sourceName,
          sourceType: "social-profile",
          saasRole: "teacher",
          description: textBlob,
          snippet: textBlob
        });
      }
    } catch (error) {
      console.error(`[${sourceName}] WordPress tag failed:`, tag, error);
    }
  }

  return results;
}

async function collectOpenAlexEducators(
  sourceName: string
): Promise<SearchResult[]> {
  const queries = [
    "english teacher",
    "mathematics teacher",
    "science teacher",
    "language instructor",
    "music teacher"
  ];

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const q of queries) {
    try {
      const data = await fetchJson(
        `https://api.openalex.org/authors?search=${encodeURIComponent(q)}&per-page=15`
      );
      const authors = Array.isArray(data?.results) ? data.results : [];

      for (const author of authors) {
        const name = clean(author?.display_name || "");
        const institution = clean(
          author?.last_known_institutions?.[0]?.display_name || ""
        );
        const countryCode = clean(
          author?.last_known_institutions?.[0]?.country_code || ""
        );
        const topic = clean(author?.topics?.[0]?.display_name || q);
        const profileUrl = cleanUrl(author?.orcid || author?.id || "");

        if (!isRealPersonName(name) || !profileUrl) continue;

        const key = profileUrl.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const bio = `${name} — ${topic} Educator${institution ? ` at ${institution}` : ""}`;

        results.push({
          title: bio,
          link: profileUrl,
          sourceUrl: profileUrl,
          contactUrl: profileUrl,
          author: name,
          country: countryCode || "Global",
          description: bio,
          snippet: bio,
          source: sourceName,
          sourceType: "social-profile",
          saasRole: "teacher"
        });
      }
    } catch (error) {
      console.error(`[${sourceName}] OpenAlex query failed:`, q, error);
    }
  }

  return results;
}

async function collectGitHubSaaSByRole(
  role: SaasRole,
  sourceName: string
): Promise<SearchResult[]> {
  const queriesByRole: Record<SaasRole, string[]> = {
    teacher: ["teacher in:bio", "tutor in:bio", "instructor in:bio"],
    freelancer: ["freelance in:bio", "freelancer in:bio"],
    coach: ["coach in:bio", "mentor in:bio"]
  };

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const q of queriesByRole[role] || []) {
    try {
      const searchData = await fetchJson(
        `https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=15`
      );
      const users = Array.isArray(searchData?.items) ? searchData.items : [];

      for (const item of users.slice(0, 8)) {
        const login = clean(item?.login || "");
        if (!login || seen.has(login.toLowerCase())) continue;
        seen.add(login.toLowerCase());

        const profile = await fetchJson(
          `https://api.github.com/users/${encodeURIComponent(login)}`
        );

        const name = clean(profile?.name || login);
        const bio = clean(profile?.bio || "");
        const location = clean(profile?.location || "");
        const blog = cleanUrl(profile?.blog || "");
        const email = clean(profile?.email || "");
        const twitter = clean(profile?.twitter_username || "");
        const githubUrl = cleanUrl(profile?.html_url || "");

        const contactUrl =
          blog ||
          (twitter ? `https://x.com/${twitter}` : "") ||
          githubUrl;

        if (!isRealPersonName(name)) continue;
        if (!bio || (!contactUrl && !email)) continue;

        const detectedCountry = getCountry(`${location} ${bio}`);

        results.push({
          title: `${name} — ${bio.slice(0, 80)}`,
          link: githubUrl || contactUrl,
          sourceUrl: githubUrl || contactUrl,
          contactUrl,
          email,
          author: name,
          location,
          country: detectedCountry || location || "Remote / Global",
          description: `${bio}${location ? ` | Location: ${location}` : ""}`,
          snippet: bio,
          source: sourceName,
          sourceType: "social-profile",
          saasRole: role
        });
      }
    } catch (error) {
      console.error(`[${sourceName}] GitHub query failed:`, q, error);
    }
  }

  return results;
}

async function collectSaaSByRole(
  role: SaasRole,
  sourceName: string
): Promise<SearchResult[]> {
  const tasks: Promise<SearchResult[]>[] = [
    collectDevToSaaSByRole(role, sourceName),
    collectMediumSaaSByRole(role, sourceName),
    collectGitHubSaaSByRole(role, sourceName)
  ];

  if (role === "teacher") {
    tasks.push(
      collectWordPressTeachers(sourceName),
      collectOpenAlexEducators(sourceName)
    );
  }

  const batches = await Promise.all(tasks);
  const merged = new Map<string, SearchResult>();

  for (const row of batches.flat()) {
    const key = cleanUrl(row.contactUrl || row.link || "").toLowerCase();
    if (key && !merged.has(key)) {
      merged.set(key, row);
    }
  }

  return Array.from(merged.values()).slice(0, MAX_RESULTS_PER_SOURCE);
}

async function collectBingSaaSTeachers(): Promise<SearchResult[]> {
  return collectSaaSByRole("teacher", "All-Subjects SaaS Teachers");
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
      const title = clean(
        job.jobTitle || job.title || ""
      );

      const description = stripHtml(
        job.jobDescription ||
        job.description ||
        ""
      );

      const link = cleanUrl(
        job.url ||
        job.jobUrl ||
        ""
      );

      if (!title || !link) continue;

      results.push({
        title,
        description,
        snippet: description,
        link,
        sourceUrl: link,
        source: "Jobicy",
        sourceType: "job",
        publishedAt:
          job.pubDate ||
          job.date ||
          job.createdAt ||
          "",
        published:
          job.pubDate ||
          job.date ||
          job.createdAt ||
          "",
        company: clean(
          job.companyName ||
          job.company ||
          ""
        ),
        location: clean(
          job.jobGeo ||
          job.location ||
          ""
        ),
        salaryRange: clean(
          job.salary ||
          job.salaryRange ||
          ""
        ),
        salaryMin:
          Number(job.salaryMin) || undefined,
        salaryMax:
          Number(job.salaryMax) || undefined,
        companyWebsite: cleanUrl(
          job.companyUrl ||
          job.companyWebsite ||
          ""
        ),
        applicationUrl: link,
        contactUrl: link
      });
    }
  } catch (error) {
    console.error(
      "[Jobicy] Collection failed:",
      error
    );
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
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

  for (const feed of WWR_FEEDS) {
    try {
      const xml = await fetchText(feed);

      const feedResults = parseRssFeed(
        xml,
        "We Work Remotely"
      );

      results.push(
        ...feedResults.map(result => ({
          ...result,
          sourceType: "job",
          applicationUrl: result.link,
          contactUrl: result.link
        }))
      );
    } catch (error) {
      console.error(
        "[We Work Remotely] Feed failed:",
        feed,
        error
      );
    }
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

async function collectRemoteOK(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const response = await fetchJson(
      "https://remoteok.com/api"
    );

    const jobs = Array.isArray(response)
      ? response.slice(1)
      : [];

    for (const job of jobs) {
      const title = clean(
        job.position || ""
      );

      const description = stripHtml(
        job.description || ""
      );

      const link = cleanUrl(
        job.url ||
        (
          job.id
            ? `https://remoteok.com/remote-jobs/${job.id}`
            : ""
        )
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
        publishedAt:
          job.date ||
          job.epoch ||
          "",
        published:
          job.date ||
          job.epoch ||
          "",
        company: clean(job.company || ""),
        location: clean(
          job.location || "Remote"
        ),
        salaryRange: clean(job.salary || ""),
        companyWebsite: cleanUrl(
          job.company_url || ""
        ),
        applicationUrl: link,
        contactUrl: link
      });
    }
  } catch (error) {
    console.error(
      "[Remote OK] Collection failed:",
      error
    );
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
  }
const sourceCollectionErrors: Record<
  string,
  string
> = {};

async function runSource(
  source: SourceJob
): Promise<SearchResult[]> {
  try {
    const results = await source.collect();

    console.log(
      `[${source.name}] Found ${results.length} results`
    );

    return results.map(result => ({
      ...result,
      source: source.name
    }));
  } catch (error: any) {
    const message =
      error?.message ||
      String(error);

    sourceCollectionErrors[source.name] =
      message;

    console.error(
      `[${source.name}] Collection error:`,
      message
    );

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
      name: "All-Subjects SaaS Teachers",
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
    sourceJobs.map(source =>
      runSource(source)
    )
  );

  return {
    results: collected.flat(),
    sourceJobs
  };
}

function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

async function loadSkills(
  supabase: ReturnType<typeof createClient>
): Promise<SkillRow[]> {
  const { data, error } = await supabase
    .from("skills")
    .select("*");

  if (error) {
    throw new Error(
      `Unable to load skills: ${error.message}`
    );
  }

  return (data || [])
    .map((row: any) => ({
      id: clean(row.id || ""),
      name: clean(
        row.name ||
        row.skill ||
        ""
      ),
      category: clean(row.category || ""),
      subcategory: clean(row.subcategory || ""),
      tags: Array.isArray(row.tags)
        ? row.tags.map((tag: any) =>
            clean(String(tag))
          )
        : []
    }))
    .filter((skill: SkillRow) =>
      Boolean(skill.name)
    );
}

async function leadAlreadyExists(
  supabase: ReturnType<typeof createClient>,
  lead: ProcessedLead
): Promise<boolean> {
  const table =
    lead.type === "Demand"
      ? "demand_leads"
      : lead.type === "Supply"
        ? "supply_leads"
        : "saas_leads";

  if (lead.sourceUrl) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("source_url", lead.sourceUrl)
      .limit(1);

    if (!error && data && data.length > 0) {
      return true;
    }
  }

  if (lead.contactUrl) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("contact_url", lead.contactUrl)
      .limit(1);

    if (!error && data && data.length > 0) {
      return true;
    }
  }

  return false;
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
      city: lead.city || null,
      status: "active",
      created_at: now
    };
  }

  const { error } = await supabase
    .from(table)
    .insert(record);

  if (error) {
    console.error(
      `[${table}] Insert failed:`,
      error.message
    );

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

function incrementTypeCount(
  stats: LeadStats,
  type: LeadType
): void {
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
  const skills = await loadSkills(supabase);

  const seenSourceUrls = new Set<string>();
  const seenContactUrls = new Set<string>();

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

      const rejectionReason = checkRejectionReason(
        result,
        type,
        skills
      );

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

      const lead = buildProcessedLead(
        result,
        type,
        skills
      );

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

      if (await leadAlreadyExists(supabase, lead)) {
        if (sourceKey) seenSourceUrls.add(sourceKey);
        if (contactKey) seenContactUrls.add(contactKey);

        diagnostic.duplicates++;
        stats.duplicates++;
        continue;
      }

      stats.accepted++;
      diagnostic.accepted++;

      const inserted = await insertProcessedLead(
        supabase,
        lead
      );

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
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

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
      error?.message ||
      "Unexpected error while collecting leads.";

    console.error(
      "[Fetch Leads] Handler failed:",
      message
    );

    return res.status(500).json({
      success: false,
      message
    });
  }
      }
