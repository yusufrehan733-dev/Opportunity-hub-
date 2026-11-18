import type {
  VercelRequest,
  VercelResponse
} from "@vercel/node";

import { createClient } from "@supabase/supabase-js";

type LeadType =
  | "Demand"
  | "Supply"
  | "SaaS";

type LeadStats = {
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
};

type InsertedByType = {
  demand: number;
  supply: number;
  saas: number;
  total: number;
};

type SourceDiagnostic = {
  source: string;
  category: LeadType;
  fetched: number;
  accepted: number;
  inserted: number;
  failed: number;
  error?: string;
};

type SkillRow = {
  id: string;
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
  author?: string;
  company?: string;
  location?: string;
  country?: string;
  publishedAt?: string;
  sourceType: string;
  contactUrl?: string;
  applicationUrl?: string;
  email?: string;
  phone?: string;
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
  contactEmail: string;
  contactPhone: string;
  contactName: string;
  applicationUrl: string;
  platform: string;
  niche: string;
  name: string;
  clientName: string;
  companyName: string;
  position: string;
  publishedAt: string;
  createdAt: string;
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
  "OpportunityHub/1.0 (public opportunity discovery)";

const DEMAND_QUERIES = [
  '"looking for a tutor"',
  '"need a tutor"',
  '"looking for an online teacher"',
  '"need an online teacher"',
  '"looking for a Quran teacher"',
  '"looking for a math tutor"',
  '"need a freelance designer"',
  '"looking for a web developer"',
  '"need a business coach"',
  '"looking for a freelancer"',
  '"need help with my website"',
  '"looking for a language teacher"',
  '"need a graphic designer"',
  '"looking for a consultant"'
];

const SAAS_QUERIES = [
  '"online tutor" available',
  '"online teacher" offering lessons',
  '"freelance designer" available',
  '"freelance writer" available',
  '"business coach" offering services',
  '"consultant" available for projects',
  '"virtual assistant" available',
  '"language tutor" offering lessons',
  '"freelancer" portfolio',
  '"web developer" freelance portfolio',
  '"digital marketer" freelance',
  '"online instructor" services'
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
  "looking for a quran teacher",
  "looking for a math tutor",
  "looking for a developer",
  "need a consultant"
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
  "we are recruiting"
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
  "language teacher",
  "graphic designer",
  "web developer",
  "digital marketer",
  "virtual assistant"
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

const SOCIAL_PROFILE_DOMAINS = [
  "linkedin.com",
  "instagram.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "t.me",
  "telegram.me",
  "reddit.com",
  "mastodon.social",
  "threads.net"
];

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
  const normalized =
    normalizeText(text);

  return terms.some((term) =>
    normalized.includes(
      normalizeText(term)
    )
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
    const url = new URL(clean(value));

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

  if (!host) {
    return false;
  }

  return BLOCKED_DOMAINS.some(
    (domain) =>
      host === domain ||
      host.endsWith("." + domain)
  );
}

function containsBlockedContent(
  text: string
): boolean {
  return containsAny(
    text,
    BLOCKED_TERMS
  );
}

function safeDate(
  value: unknown
): Date | null {
  const input = clean(value);

  if (!input) {
    return null;
  }

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

    return new Date(
      Date.now() - amount * multiplier
    );
  }

  const numeric = Number(input);

  if (
    Number.isFinite(numeric) &&
    numeric > 1000000000
  ) {
    const timestamp =
      numeric < 100000000000
        ? numeric * 1000
        : numeric;

    const date = new Date(timestamp);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const parsed = new Date(input);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function isFresh(value: unknown): boolean {
  const date = safeDate(value);

  if (!date) {
    return false;
  }

  const age =
    Date.now() - date.getTime();

  return (
    age >= 0 &&
    age <= MAX_AGE_HOURS * 60 * 60 * 1000
  );
}

async function fetchText(
  url: string
): Promise<string> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept":
          "application/rss+xml, application/atom+xml, application/json, text/xml, text/plain, */*"
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

async function fetchJson(
  url: string
): Promise<any> {
  const body = await fetchText(url);

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      `Invalid JSON returned by ${getHostname(url)}`
    );
  }
}

function decodeRssValue(
  value: string
): string {
  return stripHtml(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(
          parseInt(hex, 16)
        )
      )
      .replace(/&#(\d+);/g, (_, number) =>
        String.fromCodePoint(
          Number(number)
        )
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

  return match
    ? decodeRssValue(match[1])
    : "";
}

function makeSearchResult(
  input: any
): SearchResult | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const link = cleanUrl(
    input.link ||
    input.url ||
    input.jobUrl ||
    input.job_url ||
    input.jobUrlCanonical ||
    input.guid
  );

  const title = stripHtml(
    input.title ||
    input.position ||
    input.job_title ||
    input.name
  );

  const description = stripHtml(
    input.description ||
    input.summary ||
    input.snippet ||
    input.excerpt ||
    input.jobDescription ||
    input.job_description ||
    input.content
  );

  if (!link || !title || !description) {
    return null;
  }

  return {
    title,
    link,
    description,

    snippet: stripHtml(
      input.snippet || ""
    ),

    author: clean(
      input.author ||
      input.username ||
      input.contactName ||
      ""
    ),

    company: clean(
      input.company ||
      input.companyName ||
      input.company_name ||
      ""
    ),

    location: clean(
      input.location ||
      input.jobGeo ||
      input.candidate_required_location ||
      ""
    ),

    country: clean(
      input.country ||
      input.countryName ||
      ""
    ),

    publishedAt: clean(
      input.pubDate ||
      input.published ||
      input.publishedAt ||
      input.date ||
      input.created_at ||
      input.createdAt ||
      input.datePosted ||
      ""
    ),

    sourceType: clean(
      input.sourceType ||
      input.source ||
      "Unknown"
    ),

    contactUrl: cleanUrl(
      input.contactUrl ||
      input.contact_url ||
      input.contact ||
      ""
    ),

    applicationUrl: cleanUrl(
      input.applicationUrl ||
      input.application_url ||
      input.apply_url ||
      input.applicationLink ||
      input.url ||
      input.link ||
      ""
    ),

    email: clean(
      input.email ||
      input.contact_email ||
      ""
    ),

    phone: clean(
      input.phone ||
      input.contact_phone ||
      ""
    )
  };
}

function parseRssFeed(
  xml: string,
  sourceType: string
): SearchResult[] {
  const blocks =
    xml.match(
      /<(item|entry)\b[\s\S]*?<\/\1>/gi
    ) || [];

  const results: SearchResult[] = [];

  for (const block of blocks) {
    const linkMatch = block.match(
      /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i
    );

    const rawLink =
      readXmlTag(block, "link") ||
      readXmlTag(block, "guid") ||
      linkMatch?.[1] ||
      "";

    const result = makeSearchResult({
      title:
        readXmlTag(block, "title"),

      link: rawLink,

      description:
        readXmlTag(block, "description") ||
        readXmlTag(block, "summary") ||
        readXmlTag(block, "content:encoded") ||
        readXmlTag(block, "content"),

      author:
        readXmlTag(block, "author") ||
        readXmlTag(block, "dc:creator"),

      pubDate:
        readXmlTag(block, "pubDate") ||
        readXmlTag(block, "published") ||
        readXmlTag(block, "updated"),

      sourceType
    });

    if (result) {
      results.push(result);
    }

    if (
      results.length >= MAX_RESULTS_PER_SOURCE
    ) {
      break;
    }
  }

  return results;
  }
  
const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "United States",
  "united states of america": "United States",
  "usa": "United States",
  "us": "United States",
  "united kingdom": "United Kingdom",
  "uk": "United Kingdom",
  "great britain": "United Kingdom",
  "england": "United Kingdom",
  "canada": "Canada",
  "australia": "Australia",
  "new zealand": "New Zealand",
  "nz": "New Zealand",
  "pakistan": "Pakistan",
  "india": "India",
  "uae": "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
  "saudi arabia": "Saudi Arabia",
  "qatar": "Qatar",
  "kuwait": "Kuwait",
  "oman": "Oman",
  "bahrain": "Bahrain",
  "ireland": "Ireland",
  "germany": "Germany",
  "france": "France",
  "netherlands": "Netherlands",
  "belgium": "Belgium",
  "switzerland": "Switzerland",
  "sweden": "Sweden",
  "norway": "Norway",
  "denmark": "Denmark",
  "finland": "Finland",
  "spain": "Spain",
  "italy": "Italy",
  "portugal": "Portugal",
  "poland": "Poland",
  "singapore": "Singapore",
  "malaysia": "Malaysia",
  "indonesia": "Indonesia",
  "philippines": "Philippines",
  "bangladesh": "Bangladesh",
  "sri lanka": "Sri Lanka",
  "south africa": "South Africa",
  "nigeria": "Nigeria",
  "kenya": "Kenya",
  "egypt": "Egypt",
  "turkey": "Turkey",
  "türkiye": "Turkey",
  "japan": "Japan",
  "china": "China",
  "south korea": "South Korea",
  "brazil": "Brazil",
  "mexico": "Mexico",
  "argentina": "Argentina",
  "ukraine": "Ukraine",
  "romania": "Romania",
  "czech republic": "Czech Republic",
  "czechia": "Czech Republic",
  "austria": "Austria",
  "greece": "Greece"
};

const GENERIC_LOCATIONS = [
  "remote",
  "worldwide",
  "anywhere",
  "global",
  "europe",
  "asia",
  "africa",
  "north america",
  "south america",
  "multiple locations",
  "work from home",
  "worldwide remote"
];

function getCountry(
  result: SearchResult
): string {
  const directCountry =
    normalizeText(result.country || "");

  if (COUNTRY_ALIASES[directCountry]) {
    return COUNTRY_ALIASES[directCountry];
  }

  const location =
    clean(result.location || "");

  if (!location) {
    return "";
  }

  const parts = location
    .split(/[,|]/)
    .map((part) => normalizeText(part))
    .filter(Boolean);

  for (let i = parts.length - 1; i >= 0; i--) {
    if (COUNTRY_ALIASES[parts[i]]) {
      return COUNTRY_ALIASES[parts[i]];
    }
  }

  return "";
}

function getCity(
  result: SearchResult
): string {
  const location =
    clean(result.location || "");

  if (!location) {
    return "";
  }

  const parts = location
    .split(/[,|]/)
    .map((part) => clean(part))
    .filter(Boolean);

  if (parts.length < 2) {
    return "";
  }

  const last =
    normalizeText(parts[parts.length - 1]);

  if (COUNTRY_ALIASES[last]) {
    return parts[parts.length - 2];
  }

  if (GENERIC_LOCATIONS.includes(last)) {
    return "";
  }

  return "";
}

function isSocialProfileUrl(
  value: string
): boolean {
  const url = cleanUrl(value);

  if (!url) {
    return false;
  }

  const host = getHostname(url);

  const allowed =
    SOCIAL_PROFILE_DOMAINS.some(
      (domain) =>
        host === domain ||
        host.endsWith("." + domain)
    );

  if (!allowed) {
    return false;
  }

  try {
    const path =
      new URL(url).pathname
        .toLowerCase()
        .replace(/\/+$/, "");

    if (
      !path ||
      path === "/" ||
      path === "/login" ||
      path === "/signup" ||
      path === "/about"
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isSpecificContactPage(
  value: string
): boolean {
  const url = cleanUrl(value);

  if (!url) {
    return false;
  }

  if (isSocialProfileUrl(url)) {
    return true;
  }

  const host = getHostname(url);

  if (!host || isBlockedDomain(url)) {
    return false;
  }

  try {
    const path =
      new URL(url).pathname.toLowerCase();

    return CONTACT_PATH_TERMS.some(
      (term) => path.includes(term)
    );
  } catch {
    return false;
  }
}

function getContactUrl(
  result: SearchResult,
  type: LeadType
): string {
  const explicitContact =
    cleanUrl(result.contactUrl || "");

  if (
    explicitContact &&
    !isBlockedDomain(explicitContact)
  ) {
    return explicitContact;
  }

  const applicationUrl =
    cleanUrl(result.applicationUrl || "");

  if (
    type === "Supply" &&
    applicationUrl &&
    !isBlockedDomain(applicationUrl)
  ) {
    return applicationUrl;
  }

  const sourceUrl =
    cleanUrl(result.link || "");

  if (!sourceUrl) {
    return "";
  }

  const host = getHostname(sourceUrl);

  if (
    type === "Demand" &&
    (
      isSocialProfileUrl(sourceUrl) ||
      host === "reddit.com" ||
      host.endsWith(".reddit.com")
    )
  ) {
    return sourceUrl;
  }

  if (
    type === "SaaS" &&
    isSocialProfileUrl(sourceUrl)
  ) {
    return sourceUrl;
  }

  if (isSpecificContactPage(sourceUrl)) {
    return sourceUrl;
  }

  return "";
}

function hasRealContact(
  result: SearchResult,
  type: LeadType
): boolean {
  const email =
    clean(result.email || "");

  const phone =
    clean(result.phone || "");

  if (
    email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return true;
  }

  if (
    phone &&
    phone.replace(/\D/g, "").length >= 7
  ) {
    return true;
  }

  return Boolean(
    getContactUrl(result, type)
  );
}

function hasDemandIntent(
  text: string
): boolean {
  return containsAny(
    text,
    DEMAND_INTENT_TERMS
  );
}

function hasDemandReject(
  text: string
): boolean {
  return containsAny(
    text,
    DEMAND_REJECT_TERMS
  );
}

function hasSupplyIntent(
  text: string
): boolean {
  return containsAny(
    text,
    SUPPLY_INTENT_TERMS
  );
}

function isOrganizationResult(
  result: SearchResult,
  text: string
): boolean {
  const hasCompany =
    Boolean(clean(result.company || ""));

  const jobSignals = [
    "hiring",
    "we are hiring",
    "job opening",
    "job vacancy",
    "vacancy",
    "position available",
    "career opportunity",
    "join our team",
    "apply now",
    "salary",
    "employment",
    "job description",
    "required skills",
    "responsibilities",
    "qualifications",
    "years of experience"
  ];

  return (
    hasCompany ||
    containsAny(text, jobSignals)
  );
}

function isProfessionalProfile(
  result: SearchResult,
  text: string
): boolean {
  const hasProfessionalSignal =
    containsAny(
      text,
      PROFESSIONAL_TERMS
    );

  const hasNamedPerson =
    Boolean(
      clean(result.author || "") ||
      clean(result.company || "")
    );

  return (
    hasProfessionalSignal &&
    hasNamedPerson
  );
}

function classifyLead(
  result: SearchResult
): LeadType | null {
  const text = normalizeText(
    [
      result.title,
      result.description,
      result.snippet,
      result.author,
      result.company,
      result.location
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (
    !text ||
    containsBlockedContent(text) ||
    isBlockedDomain(result.link || "")
  ) {
    return null;
  }

  const demand =
    hasDemandIntent(text);

  const demandRejected =
    hasDemandReject(text);

  const supply =
    hasSupplyIntent(text);

  const organization =
    isOrganizationResult(result, text);

  // A genuine request for a service is Demand.
  if (
    demand &&
    !demandRejected &&
    !supply
  ) {
    return "Demand";
  }

  // Hiring announcements and vacancies are Supply.
  if (
    supply &&
    organization &&
    !demand
  ) {
    return "Supply";
  }

  // Professional service providers are SaaS prospects.
  if (
    !demand &&
    !supply &&
    !demandRejected &&
    isProfessionalProfile(result, text)
  ) {
    return "SaaS";
  }

  return null;
}

function findMatchingSkill(
  result: SearchResult,
  skills: SkillRow[]
): SkillRow | null {
  const text = normalizeText(
    [
      result.title,
      result.description,
      result.snippet,
      result.company
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (!text) {
    return null;
  }

  const matches =
    skills
      .filter((skill) => {
        const names = [
          skill.name,
          ...(Array.isArray(skill.tags)
            ? skill.tags
            : [])
        ]
          .map((item) =>
            normalizeText(item)
          )
          .filter((item) => item.length >= 3);

        return names.some((name) => {
          const escaped =
            name.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );

          const pattern = new RegExp(
            `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
            "i"
          );

          return pattern.test(text);
        });
      })
      .sort(
        (a, b) =>
          clean(b.name).length -
          clean(a.name).length
      );

  return matches[0] || null;
}

function checkRejectionReason(
  result: SearchResult,
  skills: SkillRow[]
): "wrongType" | "stale" | "noSkill" | "noContact" | null {
  const type = classifyLead(result);

  if (!type) {
    return "wrongType";
  }

  if (
    type !== "SaaS" &&
    !isFresh(result.publishedAt)
  ) {
    return "stale";
  }

  if (!findMatchingSkill(result, skills)) {
    return "noSkill";
  }

  if (!hasRealContact(result, type)) {
    return "noContact";
  }

  return null;
}

function buildProcessedLead(
  result: SearchResult,
  skills: SkillRow[]
): ProcessedLead | null {
  const type =
    classifyLead(result);

  if (!type) {
    return null;
  }

  const title =
    clean(result.title);

  const description =
    clean(
      result.description ||
      result.snippet ||
      ""
    );

  const sourceUrl =
    cleanUrl(result.link);

  if (
    !title ||
    !description ||
    !sourceUrl
  ) {
    return null;
  }

  const publishedDate =
    safeDate(result.publishedAt);

  if (
    type !== "SaaS" &&
    (
      !publishedDate ||
      !isFresh(result.publishedAt)
    )
  ) {
    return null;
  }

  const createdAt =
    publishedDate
      ? publishedDate.toISOString()
      : new Date().toISOString();

  const skill =
    findMatchingSkill(result, skills);

  if (!skill) {
    return null;
  }

  const contactUrl =
    getContactUrl(result, type);

  if (!hasRealContact(result, type)) {
    return null;
  }

  const contactEmail =
    clean(result.email || "");

  const contactPhone =
    clean(result.phone || "");

  const country =
    getCountry(result);

  const city =
    getCity(result);

  const contactName =
    clean(
      result.author ||
      result.company ||
      ""
    );

  const platform =
    getHostname(sourceUrl);

  const niche =
    clean(
      skill.subcategory ||
      skill.category ||
      skill.name
    );

  return {
    type,
    source: clean(result.sourceType),
    sourceUrl,
    contactUrl,
    title,
    description,
    skill: clean(skill.name),
    category: clean(skill.category || ""),
    subcategory: clean(skill.subcategory || ""),
    country,
    city,
    contactEmail,
    contactPhone,
    contactName,
    applicationUrl:
      cleanUrl(result.applicationUrl || ""),
    platform,
    niche,
    name: contactName || title,
    clientName: contactName || "Client",
    companyName: clean(result.company || ""),
    position: title,
    publishedAt:
      publishedDate
        ? publishedDate.toISOString()
        : "",
    createdAt
  };
  }
  
function buildRedditSearchUrl(
  query: string
): string {
  const params = new URLSearchParams({
    q: query,
    sort: "new",
    t: "week",
    limit: "50"
  });

  return (
    "https://www.reddit.com/search.rss?" +
    params.toString()
  );
}

async function collectRedditQueries(
  queries: string[],
  sourceName: string,
  type: LeadType
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const errors: string[] = [];

  const responses = await Promise.allSettled(
    queries.map(async (query) => {
      const xml = await fetchText(
        buildRedditSearchUrl(query)
      );

      return {
        query,
        items: parseRssFeed(
          xml,
          sourceName
        )
      };
    })
  );

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];

    if (response.status === "rejected") {
      errors.push(
        clean(
          response.reason?.message ||
          `Reddit query failed: ${queries[i]}`
        )
      );

      continue;
    }

    for (const item of response.value.items) {
      const author =
        clean(item.author || "");

      const query =
        response.value.query;

      if (type === "SaaS") {
        if (
          !author ||
          author.toLowerCase().includes("[deleted]")
        ) {
          continue;
        }

        const username = author
          .replace(/^u\//i, "")
          .replace(/^\/u\//i, "")
          .trim();

        if (
          !/^[A-Za-z0-9_-]{2,40}$/.test(username)
        ) {
          continue;
        }

        results.push({
          ...item,

          snippet: [
            query,
            item.snippet || ""
          ].join(" "),

          contactUrl:
            `https://www.reddit.com/user/${username}/`,

          sourceType: sourceName
        });
      } else {
        results.push({
          ...item,

          snippet: [
            query,
            item.snippet || ""
          ].join(" "),

          contactUrl:
            item.link,

          sourceType: sourceName
        });
      }
    }
  }

  if (
    results.length === 0 &&
    errors.length > 0
  ) {
    throw new Error(
      errors.slice(0, 4).join(" | ")
    );
  }

  if (errors.length > 0) {
    sourceCollectionErrors.set(
      sourceName,
      errors.slice(0, 4).join(" | ")
    );
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

async function collectRedditDemand():
Promise<SearchResult[]> {
  return collectRedditQueries(
    DEMAND_QUERIES,
    "Reddit Demand",
    "Demand"
  );
}

async function collectRedditSaaS():
Promise<SearchResult[]> {
  return collectRedditQueries(
    SAAS_QUERIES,
    "Reddit SaaS",
    "SaaS"
  );
}

/*
 * Jobicy public jobs API.
 * No API key is required.
 */
async function collectJobicy():
Promise<SearchResult[]> {
  const data = await fetchJson(
    "https://jobicy.com/api/jobs?count=100"
  );

  const jobs = getArrayFromResponse(data);

  const results: SearchResult[] = [];

  for (const job of jobs) {
    const result = makeSearchResult({
      title:
        job.jobTitle ||
        job.title,

      link:
        job.url ||
        job.jobUrl,

      description:
        "Job vacancy. " +
        stripHtml(
          job.jobDescription ||
          job.description ||
          job.jobExcerpt ||
          ""
        ),

      company:
        job.companyName ||
        job.company,

      location:
        job.jobGeo ||
        job.location,

      country:
        job.country ||
        "",

      pubDate:
        job.pubDate ||
        job.datePosted ||
        job.createdAt,

      applicationUrl:
        job.url ||
        job.jobUrl,

      sourceType:
        "Jobicy"
    });

    if (result) {
      results.push(result);
    }
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

/*
 * We Work Remotely public RSS.
 * The original job URL is retained.
 */
const WWR_FEEDS = [
  "https://weworkremotely.com/remote-jobs.rss",

  "https://weworkremotely.com/categories/remote-design-jobs.rss",

  "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",

  "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",

  "https://weworkremotely.com/categories/remote-product-jobs.rss",

  "https://weworkremotely.com/categories/all-other-remote-jobs.rss"
];

async function collectWeWorkRemotely():
Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const errors: string[] = [];

  const feeds = await Promise.allSettled(
    WWR_FEEDS.map(async (url) => {
      const xml = await fetchText(url);

      return parseRssFeed(
        xml,
        "We Work Remotely"
      );
    })
  );

  for (const feed of feeds) {
    if (feed.status === "rejected") {
      errors.push(
        clean(
          feed.reason?.message ||
          "We Work Remotely feed failed"
        )
      );

      continue;
    }

    for (const item of feed.value) {
      results.push({
        ...item,

        description:
          "Job vacancy. " +
          item.description,

        sourceType:
          "We Work Remotely"
      });
    }
  }

  if (
    results.length === 0 &&
    errors.length > 0
  ) {
    throw new Error(
      errors.slice(0, 4).join(" | ")
    );
  }

  if (errors.length > 0) {
    sourceCollectionErrors.set(
      "We Work Remotely",
      errors.slice(0, 4).join(" | ")
    );
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

/*
 * Remote OK public JSON API.
 * Its first array item is a legal notice,
 * not a job, so it is excluded.
 */
async function collectRemoteOK():
Promise<SearchResult[]> {
  const data = await fetchJson(
    "https://remoteok.com/api"
  );

  if (!Array.isArray(data)) {
    throw new Error(
      "Remote OK returned an unexpected response."
    );
  }

  const jobs = data.filter(
    (item: any) =>
      item &&
      typeof item === "object" &&
      (
        item.position ||
        item.title
      ) &&
      (
        item.id ||
        item.url
      )
  );

  const results: SearchResult[] = [];

  for (const job of jobs) {
    const result = makeSearchResult({
      title:
        job.position ||
        job.title,

      link:
        job.url,

      description:
        "Job vacancy. " +
        stripHtml(
          job.description ||
          job.position ||
          ""
        ),

      company:
        job.company,

      location:
        job.location,

      pubDate:
        job.date ||
        job.epoch,

      applicationUrl:
        job.apply_url ||
        job.url,

      sourceType:
        "Remote OK"
    });

    if (result) {
      results.push(result);
    }
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

/*
 * Shared source error tracking.
 * Partial feed failures are reported
 * without throwing away successful results.
 */
const sourceCollectionErrors =
  new Map<string, string>();

async function runSource(
  source: SourceJob
): Promise<{
  results: SearchResult[];
  diagnostic: SourceDiagnostic;
}> {
  sourceCollectionErrors.delete(
    source.name
  );

  try {
    const results =
      await source.collect();

    const partialError =
      sourceCollectionErrors.get(
        source.name
      );

    return {
      results,

      diagnostic: {
        source: source.name,
        category: source.category,
        fetched: results.length,
        accepted: 0,
        inserted: 0,
        failed: partialError ? 1 : 0,
        error: partialError || undefined
      }
    };
  } catch (error: any) {
    const message =
      clean(
        error?.message ||
        "Unknown source error"
      );

    return {
      results: [],

      diagnostic: {
        source: source.name,
        category: source.category,
        fetched: 0,
        accepted: 0,
        inserted: 0,
        failed: 1,
        error: message
      }
    };
  }
}

/*
 * Collect every configured source.
 */
async function collectAllSources(): Promise<{
  results: SearchResult[];
  diagnostics: SourceDiagnostic[];
}> {
  const sources: SourceJob[] = [
    {
      name: "Reddit Demand",
      category: "Demand",
      collect: collectRedditDemand
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
    },

    {
      name: "Reddit SaaS",
      category: "SaaS",
      collect: collectRedditSaaS
    }
  ];

  const completed =
    await Promise.all(
      sources.map(runSource)
    );

  const results: SearchResult[] = [];

  const diagnostics: SourceDiagnostic[] = [];

  for (const item of completed) {
    results.push(...item.results);

    diagnostics.push(
      item.diagnostic
    );
  }

  return {
    results,
    diagnostics
  };
}

/*
 * Helpers used by the database processing
 * section in Part 4.
 */
function getArrayFromResponse(
  response: any
): any[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const possibleArrays = [
    response.jobs,
    response.results,
    response.data,
    response.items
  ];

  for (const value of possibleArrays) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
      }
function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_URL or VITE_SUPABASE_URL environment variable."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Lead collection requires the Supabase service role key."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}


async function loadSkills(
  supabase: any
): Promise<SkillRow[]> {
  const { data, error } =
    await supabase
      .from("skills")
      .select("*");

  if (error) {
    throw new Error(
      `Unable to load skills: ${error.message}`
    );
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((row: any) => {
      const name = clean(
        row.name ||
        row.skill ||
        row.title ||
        row.skill_name
      );

      if (!name) {
        return null;
      }

      let tags: string[] = [];

      if (Array.isArray(row.tags)) {
        tags = row.tags
          .map((tag: any) => clean(tag))
          .filter(Boolean);
      } else if (
        typeof row.tags === "string"
      ) {
        tags = row.tags
          .split(",")
          .map((tag: string) => clean(tag))
          .filter(Boolean);
      }

      return {
        id: row.id,
        name,
        category:
          clean(row.category) || undefined,
        subcategory:
          clean(row.subcategory) || undefined,
        tags,
      };
    })
    .filter(Boolean) as SkillRow[];
}


function getLeadTable(
  type: LeadType
): string {
  if (type === "Demand") {
    return "demand_leads";
  }

  if (type === "Supply") {
    return "supply_leads";
  }

  return "saas_leads";
}


async function leadAlreadyExists(
  supabase: any,
  lead: ProcessedLead
): Promise<boolean> {
  const table =
    getLeadTable(lead.type);

  const sourceUrl =
    clean(lead.sourceUrl);

  const contactUrl =
    clean(lead.contactUrl);

  if (sourceUrl) {
    const { data, error } =
      await supabase
        .from(table)
        .select("id")
        .eq("source_url", sourceUrl)
        .limit(1);

    if (error) {
      throw new Error(
        `Duplicate check failed for ${table}: ${error.message}`
      );
    }

    if (data && data.length > 0) {
      return true;
    }
  }

  if (contactUrl) {
    const { data, error } =
      await supabase
        .from(table)
        .select("id")
        .eq("contact_url", contactUrl)
        .limit(1);

    if (error) {
      throw new Error(
        `Contact duplicate check failed for ${table}: ${error.message}`
      );
    }

    if (data && data.length > 0) {
      return true;
    }
  }

  return false;
}


async function insertProcessedLead(
  supabase: any,
  lead: ProcessedLead
): Promise<void> {
  const now =
    lead.createdAt ||
    new Date().toISOString();

  const common = {
    country: lead.country || null,
    city: lead.city || null,
    category: lead.category || null,
    subcategory:
      lead.subcategory || null,
    description:
      lead.description || "",
    source: lead.source || "Unknown",
    source_url:
      lead.sourceUrl || null,
    contact_url:
      lead.contactUrl || null,
    created_at: now,
    status: "new",
  };

  let table = "";
  let record: Record<string, any> = {};

  if (lead.type === "Demand") {
    table = "demand_leads";

    record = {
      ...common,

      type: "Demand",

      client_name:
        lead.name || "Potential Client",

      title:
        lead.title ||
        lead.name ||
        "Service request",

      skill_needed:
        lead.skill || null,

      contact_email:
        lead.contactEmail || null,

      contact_phone:
        lead.contactPhone || null,

      content:
        lead.description || "",
    };
  } else if (lead.type === "Supply") {
    table = "supply_leads";

    record = {
      ...common,

      company_name:
        lead.companyName ||
        lead.name ||
        "Company",

      name:
        lead.name ||
        lead.companyName ||
        "Company",

      position:
        lead.title ||
        lead.name ||
        "Job opportunity",

      job_title:
        lead.title ||
        lead.name ||
        "Job opportunity",

      required_skill:
        lead.skill || null,

      salary_range:
        lead.salaryRange || null,

      salary_min:
        lead.salaryMin || null,

      salary_max:
        lead.salaryMax || null,

      company_website:
        lead.companyWebsite || null,

      apply_url:
        lead.applicationUrl ||
        lead.contactUrl ||
        lead.sourceUrl ||
        null,

      contact_email:
        lead.contactEmail || null,

      contact_phone:
        lead.contactPhone || null,

      contact_name:
        lead.contactName || null,

      contact:
        lead.contactUrl ||
        lead.contactEmail ||
        lead.contactPhone ||
        null,

      niche:
        lead.skill ||
        lead.category ||
        null,

      commission: null,
      trial_days: null,
      landing_url: null,
    };
  } else {
    table = "saas_leads";

    record = {
      name:
        lead.name ||
        lead.companyName ||
        "Professional",

      platform:
        lead.platform ||
        lead.source ||
        "Unknown",

      niche:
        lead.skill ||
        lead.category ||
        "Professional services",

      contact:
        lead.contactUrl ||
        lead.contactEmail ||
        lead.contactPhone ||
        null,

      status: "new",

      created_at: now,

      description:
        lead.description || "",

      commission: null,
      trial_days: null,
      landing_url: null,

      source_url:
        lead.sourceUrl || null,

      contact_url:
        lead.contactUrl || null,

      country:
        lead.country || null,

      city:
        lead.city || null,
    };
  }

  const { error } =
    await supabase
      .from(table)
      .insert(record);

  if (error) {
    throw new Error(
      `Insert failed in ${table}: ${error.message}`
    );
  }
}


function incrementTypeCount(
  inserted: InsertedByType,
  type: LeadType
): void {
  if (type === "Demand") {
    inserted.demand += 1;
  } else if (type === "Supply") {
    inserted.supply += 1;
  } else {
    inserted.saas += 1;
  }

  inserted.total =
    inserted.demand +
    inserted.supply +
    inserted.saas;
}


function createEmptyStats(): LeadStats {
  return {
    found: 0,
    accepted: 0,
    inserted: 0,
    duplicates: 0,
    rejected: 0,
    wrongType: 0,
    noSkill: 0,
    noContact: 0,
    stale: 0,
    errors: 0,
    demand: 0,
    supply: 0,
    saas: 0,
    total: 0,
  };
}


function createEmptyInserted(): InsertedByType {
  return {
    demand: 0,
    supply: 0,
    saas: 0,
    total: 0,
  };
}


function recordDiagnosticError(
  diagnostic: SourceDiagnostic,
  message: string
): void {
  diagnostic.failed += 1;

  diagnostic.error = diagnostic.error
    ? `${diagnostic.error}; ${message}`
    : message;
}


async function processCollectedResults(
  supabase: any,
  results: SearchResult[],
  diagnostics: SourceDiagnostic[]
): Promise<{
  stats: LeadStats;
  inserted: InsertedByType;
}> {
  const stats = createEmptyStats();
  const inserted = createEmptyInserted();

  stats.found = results.length;

  const skills =
    await loadSkills(supabase);

  if (skills.length === 0) {
    throw new Error(
      "No skills were found in the skills table. Add skills before collecting leads."
    );
  }

  const diagnosticBySource =
    new Map<string, SourceDiagnostic>();

  for (const diagnostic of diagnostics) {
    diagnosticBySource.set(
      diagnostic.source,
      diagnostic
    );
  }

  const processedInThisRun =
    new Set<string>();

  for (const result of results) {
    const sourceName =
      clean(result.sourceType) ||
      "Unknown";

    const diagnostic =
      diagnosticBySource.get(sourceName);

    const type =
      classifyLead(result);

    if (!type) {
      stats.wrongType += 1;
      stats.rejected += 1;

      continue;
    }

    const rejectionReason =
      checkRejectionReason(
        result,
        type
      );

    if (rejectionReason) {
      stats.rejected += 1;

      if (
        rejectionReason === "wrongType"
      ) {
        stats.wrongType += 1;
      } else if (
        rejectionReason === "noSkill"
      ) {
        stats.noSkill += 1;
      } else if (
        rejectionReason === "noContact"
      ) {
        stats.noContact += 1;
      } else if (
        rejectionReason === "stale"
      ) {
        stats.stale += 1;
      }

      continue;
    }

    const lead =
      buildProcessedLead(
        result,
        type,
        skills
      );

    if (!lead) {
      stats.rejected += 1;

      continue;
    }

    const duplicateKey =
      `${lead.type}:${lead.sourceUrl || lead.contactUrl || normalizeText(lead.name)}`;

    if (
      processedInThisRun.has(
        duplicateKey
      )
    ) {
      stats.duplicates += 1;

      continue;
    }

    processedInThisRun.add(
      duplicateKey
    );

    stats.accepted += 1;

    try {
      const duplicate =
        await leadAlreadyExists(
          supabase,
          lead
        );

      if (duplicate) {
        stats.duplicates += 1;

        continue;
      }

      await insertProcessedLead(
        supabase,
        lead
      );

      incrementTypeCount(
        inserted,
        lead.type
      );

      stats.inserted += 1;

      if (diagnostic) {
        diagnostic.inserted += 1;
        diagnostic.accepted += 1;
      }
    } catch (error: any) {
      stats.errors += 1;

      const message =
        clean(error?.message) ||
        "Unknown database error";

      if (diagnostic) {
        recordDiagnosticError(
          diagnostic,
          message
        );
      }
    }
  }

  stats.demand = inserted.demand;
  stats.supply = inserted.supply;
  stats.saas = inserted.saas;
  stats.total = inserted.total;

  return {
    stats,
    inserted,
  };
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
      message: "Method not allowed. Use POST.",
    });
  }

  const startedAt = Date.now();

  try {
    const supabase =
      getSupabaseClient();

    /*
     * Collect results from all
     * configured free sources.
     */
    const collection =
      await collectAllSources();

    const results =
      collection.results || [];

    const diagnostics =
      collection.diagnostics || [];

    /*
     * Validate, classify, check duplicates,
     * and insert into the correct tables.
     */
    const processed =
      await processCollectedResults(
        supabase,
        results,
        diagnostics
      );

    const duration =
      Date.now() - startedAt;

    const successfulSources =
      diagnostics.filter(
        (item) => item.failed === 0
      ).length;

    const failedSources =
      diagnostics.filter(
        (item) => item.failed > 0
      ).length;

    return res.status(200).json({
      success: true,

      message:
        "Lead collection completed.",

      durationMs: duration,

      stats: processed.stats,

      inserted: processed.inserted,

      counts: {
        demand: processed.inserted.demand,
        supply: processed.inserted.supply,
        saas: processed.inserted.saas,
        total: processed.inserted.total,
      },

      sources: {
        total: diagnostics.length,
        successful: successfulSources,
        partiallyFailed: failedSources,
      },

      diagnostics,
    });
  } catch (error: any) {
    console.error(
      "Opportunity Hub lead collection failed:",
      error
    );

    const message =
      clean(error?.message) ||
      "An unexpected error occurred while collecting leads.";

    return res.status(500).json({
      success: false,

      message,

      stats: createEmptyStats(),

      inserted: createEmptyInserted(),

      counts: {
        demand: 0,
        supply: 0,
        saas: 0,
        total: 0,
      },

      diagnostics: [],

      error: message,
    });
  }
}
