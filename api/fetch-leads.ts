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
  searchQuery?: string;
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
  "OpportunityHub/1.0 (public opportunity discovery)";

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

const SAAS_TEACHER_QUERIES = [
  '"I teach online" tutor',
  '"online tutor" "DM me"',
  '"I offer tutoring" online',
  '"private tutor" "contact me"',
  '"online teacher" "my students"',
  '"English tutor" "available"',
  '"Quran teacher" "online classes"',
  '"language tutor" "lessons available"',
  '"math tutor" "online lessons"',
  '"I offer online lessons"'
];

const SAAS_FREELANCER_QUERIES = [
  '"freelance designer" "DM me"',
  '"freelance writer" "contact me"',
  '"web developer" "available for projects"',
  '"graphic designer" "available for work"',
  '"video editor" "DM me"',
  '"virtual assistant" "available"',
  '"digital marketer" "my services"',
  '"freelancer" "portfolio"',
  '"I offer freelance services"',
  '"open for freelance work"'
];

const SAAS_COACH_QUERIES = [
  '"business coach" "work with me"',
  '"career coach" "book a session"',
  '"life coach" "DM me"',
  '"fitness coach" "online coaching"',
  '"I am a coach" "clients"',
  '"consultant" "book a call"',
  '"leadership coach" "work with me"',
  '"I help entrepreneurs" coach'
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

const PROFESSIONAL_OFFER_TERMS = [
  "i offer",
  "i teach",
  "i provide",
  "my services",
  "my students",
  "my clients",
  "work with me",
  "book a session",
  "book a call",
  "dm me",
  "message me",
  "contact me",
  "available for projects",
  "available for work",
  "open for freelance work",
  "online lessons",
  "online classes",
  "coaching services",
  "tutoring services",
  "portfolio",
  "hire me"
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
  title: string,
  description: string,
  link: string,
  source: string,
  published?: string,
  author?: string,
  company?: string,
  location?: string,
  searchQuery?: string
): SearchResult {
  return {
    title: clean(title),
    description: clean(description),
    snippet: clean(description),
    link: cleanUrl(link),
    source,
    published,
    author: clean(author || ""),
    company: clean(company || ""),
    location: clean(location || ""),
    searchQuery,
  };
}

function parseRssFeed(
  xml: string,
  source: string
): SearchResult[] {
  const results: SearchResult[] = [];

  const items = xml.match(
    /<item\b[\s\S]*?<\/item>/gi
  ) || [];

  for (const item of items) {
    const title = readXmlTag(item, "title");
    const description =
      readXmlTag(item, "description") ||
      readXmlTag(item, "content:encoded");

    const link =
      readXmlTag(item, "link") ||
      readXmlTag(item, "guid");

    const published =
      readXmlTag(item, "pubDate") ||
      readXmlTag(item, "published") ||
      readXmlTag(item, "updated");

    const author =
      readXmlTag(item, "dc:creator") ||
      readXmlTag(item, "author");

    if (!title || !link) {
      continue;
    }

    results.push(
      makeSearchResult(
        title,
        description,
        link,
        source,
        published,
        author
      )
    );
  }

  const entries = xml.match(
    /<entry\b[\s\S]*?<\/entry>/gi
  ) || [];

  for (const entry of entries) {
    const title = readXmlTag(entry, "title");

    const description =
      readXmlTag(entry, "content") ||
      readXmlTag(entry, "summary");

    const linkMatch = entry.match(
      /<link[^>]+href=["']([^"']+)["']/i
    );

    const link =
      linkMatch?.[1] ||
      readXmlTag(entry, "link");

    const published =
      readXmlTag(entry, "published") ||
      readXmlTag(entry, "updated");

    const author =
      readXmlTag(entry, "name");

    if (!title || !link) {
      continue;
    }

    results.push(
      makeSearchResult(
        title,
        description,
        link,
        source,
        published,
        author
      )
    );
  }

  return results;
}

const COUNTRY_ALIASES: Record<string, string> = {
  pakistan: "Pakistan",
  pak: "Pakistan",
  india: "India",
  canada: "Canada",
  "united states": "United States",
  usa: "United States",
  us: "United States",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  australia: "Australia",
  germany: "Germany",
  france: "France",
  "united arab emirates": "United Arab Emirates",
  uae: "United Arab Emirates",
  "saudi arabia": "Saudi Arabia",
  malaysia: "Malaysia",
  singapore: "Singapore",
  nigeria: "Nigeria",
  kenya: "Kenya",
  "south africa": "South Africa",
  philippines: "Philippines",
  bangladesh: "Bangladesh",
  ireland: "Ireland",
  netherlands: "Netherlands",
  spain: "Spain",
  italy: "Italy",
  turkey: "Turkey",
  "new zealand": "New Zealand",
};

const GENERIC_LOCATIONS = [
  "remote",
  "worldwide",
  "global",
  "anywhere",
  "work from home",
  "online",
  "international",
  "world wide",
];

function getCountry(
  text: string
): string {
  const normalized = normalizeText(text);

  for (const [alias, country] of Object.entries(
    COUNTRY_ALIASES
  )) {
    const pattern = new RegExp(
      `\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );

    if (pattern.test(normalized)) {
      return country;
    }
  }

  return "";
}

function getCity(
  text: string
): string {
  const normalized = clean(text);

  const match = normalized.match(
    /\b(?:based in|located in|living in|from)\s+([A-Z][a-z]+(?:[\s-]+[A-Z][a-z]+){0,2})/i
  );

  if (!match?.[1]) {
    return "";
  }

  const city = clean(match[1]);

  if (
    GENERIC_LOCATIONS.some(
      location =>
        normalizeText(city).includes(location)
    )
  ) {
    return "";
  }

  return city;
}

function isSocialProfileUrl(
  value: string
): boolean {
  const url = cleanUrl(value);

  if (!url) {
    return false;
  }

  const hostname = getHostname(url);

  return SOCIAL_PROFILE_DOMAINS.some(
    domain =>
      hostname === domain ||
      hostname.endsWith(`.${domain}`)
  );
}

function isSpecificContactPage(
  value: string
): boolean {
  const url = cleanUrl(value);

  if (!url) {
    return false;
  }

  const hostname = getHostname(url);

  if (!hostname || isBlockedDomain(hostname)) {
    return false;
  }

  const path = normalizeText(
    url.replace(/^https?:\/\/[^/]+/i, "")
  );

  return (
    /\/(contact|contact-us|about|about-us|team|profile|instructor|teacher|coach|freelancer|consultant)(\/|$|\?)/i.test(
      path
    ) ||
    isSocialProfileUrl(url)
  );
}

function getContactUrl(
  result: SearchResult,
  type: LeadType
): string {
  const possibleUrls = [
    result.contactUrl,
    result.link,
    result.sourceUrl,
  ];

  for (const candidate of possibleUrls) {
    const url = cleanUrl(candidate || "");

    if (!url) {
      continue;
    }

    if (
      type === "SaaS" &&
      isSocialProfileUrl(url)
    ) {
      return url;
    }

    if (
      type === "Demand" &&
      url === cleanUrl(result.link || "")
    ) {
      return url;
    }

    if (
      type === "Supply" &&
      isSpecificContactPage(url)
    ) {
      return url;
    }
  }

  return "";
}

function hasRealContact(
  result: SearchResult,
  type: LeadType
): boolean {
  const email = clean(
    result.email ||
    result.contactEmail ||
    ""
  );

  const phone = clean(
    result.phone ||
    result.contactPhone ||
    ""
  );

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
function getResultText(
  result: SearchResult
): string {
  return normalizeText(
    [
      result.title,
      result.description,
      result.snippet,
      result.author,
      result.company,
      result.location,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isOrganizationResult(
  result: SearchResult,
  text: string
): boolean {
  const vacancySignals = [
    "we are hiring",
    "now hiring",
    "job opening",
    "job vacancy",
    "open position",
    "open role",
    "looking for a candidate",
    "seeking applicants",
    "join our team",
    "apply now",
    "job opportunity",
    "vacancy announcement",
    "hiring announcement",
  ];

  return (
    Boolean(result.company) ||
    containsAny(text, vacancySignals)
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

function hasProfessionalIntent(
  text: string
): boolean {
  return containsAny(
    text,
    PROFESSIONAL_INTENT_TERMS
  );
}

function hasProfessionalOffer(
  text: string
): boolean {
  return containsAny(
    text,
    PROFESSIONAL_OFFER_TERMS
  );
}

function isProfessionalProfile(
  result: SearchResult,
  text: string
): boolean {
  const hasIdentity =
    Boolean(clean(result.author || "")) ||
    Boolean(clean(result.contactUrl || ""));

  return (
    hasIdentity &&
    hasProfessionalIntent(text) &&
    hasProfessionalOffer(text)
  );
}

function classifyLead(
  result: SearchResult
): LeadType | null {
  const text = getResultText(result);

  if (!text) {
    return null;
  }

  const supplyIntent =
    hasSupplyIntent(text);

  const demandIntent =
    hasDemandIntent(text);

  const demandReject =
    hasDemandReject(text);

  /*
   * Hiring announcements and vacancies
   * always belong to Supply.
   */
  if (supplyIntent) {
    return "Supply";
  }

  /*
   * A service provider advertising their
   * own services must never become Demand.
   */
  if (demandReject) {
    if (
      isProfessionalProfile(result, text)
    ) {
      return "SaaS";
    }

    return null;
  }

  /*
   * Demand means a genuine customer asking
   * for help or requesting a service.
   */
  if (demandIntent) {
    return "Demand";
  }

  /*
   * SaaS prospects must show professional
   * identity and an actual service offer.
   */
  if (
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
  const text = getResultText(result);

  if (!text) {
    return null;
  }

  const normalizedText =
    ` ${text} `;

  for (const skill of skills) {
    const candidates = [
      skill.name,
      skill.category,
      skill.subcategory,
      ...(skill.tags || []),
    ]
      .map(value => normalizeText(value || ""))
      .filter(value => value.length >= 2);

    for (const candidate of candidates) {
      if (
        normalizedText.includes(
          ` ${candidate} `
        )
      ) {
        return skill;
      }

      if (
        candidate.length >= 4 &&
        text.includes(candidate)
      ) {
        return skill;
      }
    }
  }

  return null;
}

function checkRejectionReason(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[]
): string | null {
  const text = getResultText(result);

  if (!text) {
    return "empty_content";
  }

  if (
    containsBlockedContent(
      text,
      result.link || ""
    )
  ) {
    return "blocked_content";
  }

  if (
    !result.link ||
    !cleanUrl(result.link)
  ) {
    return "missing_source_url";
  }

  if (
    type !== "SaaS" &&
    !isFresh(result.published)
  ) {
    return "not_fresh";
  }

  if (
    !findMatchingSkill(result, skills)
  ) {
    return "no_matching_skill";
  }

  if (
    !hasRealContact(result, type)
  ) {
    return "no_real_contact";
  }

  if (
    type === "Demand" &&
    (
      hasDemandReject(text) ||
      hasSupplyIntent(text)
    )
  ) {
    return "wrong_demand_type";
  }

  if (
    type === "SaaS" &&
    !isProfessionalProfile(result, text)
  ) {
    return "not_professional_profile";
  }

  return null;
}

function buildProcessedLead(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[]
): ProcessedLead | null {
  const skill =
    findMatchingSkill(result, skills);

  if (!skill) {
    return null;
  }

  const title =
    clean(result.title) ||
    "Untitled opportunity";

  const description =
    clean(
      result.description ||
      result.snippet ||
      ""
    );

  const sourceUrl =
    cleanUrl(result.link || "");

  const contactUrl =
    getContactUrl(result, type);

  const country =
    getCountry(
      [
        result.location,
        result.title,
        result.description,
        result.snippet,
      ].join(" ")
    );

  const city =
    getCity(
      result.location ||
      result.description ||
      ""
    );

  const name =
    clean(
      result.author ||
      result.company ||
      ""
    );

  return {
    type,
    title,
    description,
    skill: skill.name,
    category: skill.category || "",
    subcategory: skill.subcategory || "",
    country,
    city,
    source: clean(result.source || ""),
    sourceUrl,
    contactUrl,
    contactName: name,
    name,
    company: clean(result.company || ""),
    email: clean(
      result.email ||
      result.contactEmail ||
      ""
    ),
    phone: clean(
      result.phone ||
      result.contactPhone ||
      ""
    ),
    salaryRange: clean(
      result.salaryRange || ""
    ),
    salaryMin: result.salaryMin,
    salaryMax: result.salaryMax,
    companyWebsite: clean(
      result.companyWebsite || ""
    ),
  };
      }
async function collectRedditQueries(
  queries: string[],
  sourceName: string,
  type: LeadType
): Promise<SearchResult[]> {
  const collected: SearchResult[] = [];

  for (const query of queries) {
    try {
      const url =
        "https://www.reddit.com/search.rss?q=" +
        encodeURIComponent(query) +
        "&sort=new&t=month&limit=25";

      const xml = await fetchText(url);

      const results = parseRssFeed(
        xml,
        sourceName
      );

      for (const result of results) {
        const author = clean(
          result.author || ""
        )
          .replace(/^\/?u\//i, "")
          .replace(/^@/, "")
          .trim();

        const usernameIsValid =
          /^[A-Za-z0-9_-]{2,30}$/.test(author);

        const postUrl =
          cleanUrl(result.link || "");

        if (!postUrl) {
          continue;
        }

        const contactUrl =
          type === "SaaS"
            ? usernameIsValid
              ? `https://www.reddit.com/user/${encodeURIComponent(author)}/`
              : ""
            : postUrl;

        collected.push({
          ...result,

          source: sourceName,

          /*
           * Keep the search query separate.
           * Never mix it into the post content.
           */
          searchQuery: query,

          author,

          link: postUrl,

          sourceUrl: postUrl,

          contactUrl,

          snippet: clean(
            result.description ||
            result.snippet ||
            ""
          ),
        });
      }
    } catch (error) {
      console.error(
        `[${sourceName}] Query failed:`,
        query,
        error
      );
    }
  }

  return collected;
}

async function collectRedditDemandTeachers():
Promise<SearchResult[]> {
  return collectRedditQueries(
    DEMAND_TEACHER_QUERIES,
    "Reddit Demand Teachers",
    "Demand"
  );
}

async function collectRedditDemandFreelancers():
Promise<SearchResult[]> {
  return collectRedditQueries(
    DEMAND_FREELANCER_QUERIES,
    "Reddit Demand Freelancers",
    "Demand"
  );
}

async function collectRedditDemandCoaches():
Promise<SearchResult[]> {
  return collectRedditQueries(
    DEMAND_COACH_QUERIES,
    "Reddit Demand Coaches",
    "Demand"
  );
}

async function collectRedditSaaSTeachers():
Promise<SearchResult[]> {
  return collectRedditQueries(
    SAAS_TEACHER_QUERIES,
    "Reddit SaaS Teachers",
    "SaaS"
  );
}

async function collectRedditSaaSFreelancers():
Promise<SearchResult[]> {
  return collectRedditQueries(
    SAAS_FREELANCER_QUERIES,
    "Reddit SaaS Freelancers",
    "SaaS"
  );
}

async function collectRedditSaaSCoaches():
Promise<SearchResult[]> {
  return collectRedditQueries(
    SAAS_COACH_QUERIES,
    "Reddit SaaS Coaches",
    "SaaS"
  );
}
async function collectJobicy():
Promise<SearchResult[]> {
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

      if (!title || !link) {
        continue;
      }

      results.push({
        title,
        description,
        snippet: description,
        link,
        sourceUrl: link,
        source: "Jobicy",
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
      });
    }
  } catch (error) {
    console.error(
      "[Jobicy] Collection failed:",
      error
    );
  }

  return results;
}

const WWR_FEEDS = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-design-jobs.rss",
  "https://weworkremotely.com/categories/remote-marketing-jobs.rss",
  "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
  "https://weworkremotely.com/categories/remote-sales-jobs.rss",
];

async function collectWeWorkRemotely():
Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (const feed of WWR_FEEDS) {
    try {
      const xml = await fetchText(feed);

      const feedResults = parseRssFeed(
        xml,
        "We Work Remotely"
      );

      results.push(...feedResults);
    } catch (error) {
      console.error(
        "[We Work Remotely] Feed failed:",
        feed,
        error
      );
    }
  }

  return results;
}

async function collectRemoteOK():
Promise<SearchResult[]> {
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

      if (!title || !link) {
        continue;
      }

      results.push({
        title,
        description,
        snippet: description,
        link,
        sourceUrl: link,
        source: "Remote OK",
        published:
          job.date ||
          job.epoch ||
          "",
        company: clean(
          job.company || ""
        ),
        location: clean(
          job.location || "Remote"
        ),
        salaryRange: clean(
          job.salary || ""
        ),
        companyWebsite: cleanUrl(
          job.company_url || ""
        ),
      });
    }
  } catch (error) {
    console.error(
      "[Remote OK] Collection failed:",
      error
    );
  }

  return results;
}
type SourceJob = {
  name: string;
  type: LeadType;
  collect: () => Promise<SearchResult[]>;
};

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
      source: source.name,
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
  sourceCollectionErrors = {};

  const sourceJobs: SourceJob[] = [
    {
      name: "Reddit Demand Teachers",
      type: "Demand",
      collect: collectRedditDemandTeachers,
    },
    {
      name: "Reddit Demand Freelancers",
      type: "Demand",
      collect: collectRedditDemandFreelancers,
    },
    {
      name: "Reddit Demand Coaches",
      type: "Demand",
      collect: collectRedditDemandCoaches,
    },
    {
      name: "Reddit SaaS Teachers",
      type: "SaaS",
      collect: collectRedditSaaSTeachers,
    },
    {
      name: "Reddit SaaS Freelancers",
      type: "SaaS",
      collect: collectRedditSaaSFreelancers,
    },
    {
      name: "Reddit SaaS Coaches",
      type: "SaaS",
      collect: collectRedditSaaSCoaches,
    },
    {
      name: "Jobicy",
      type: "Supply",
      collect: collectJobicy,
    },
    {
      name: "We Work Remotely",
      type: "Supply",
      collect: collectWeWorkRemotely,
    },
    {
      name: "Remote OK",
      type: "Supply",
      collect: collectRemoteOK,
    },
  ];

  const collected = await Promise.all(
    sourceJobs.map(source =>
      runSource(source)
    )
  );

  return {
    results: collected.flat(),
    sourceJobs,
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
        persistSession: false,
      },
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

  return (data || []).map((row: any) => ({
    name: clean(
      row.name ||
      row.skill ||
      ""
    ),

    category: clean(
      row.category || ""
    ),

    subcategory: clean(
      row.subcategory || ""
    ),

    tags: Array.isArray(row.tags)
      ? row.tags.map((tag: any) =>
          clean(String(tag))
        )
      : [],
  })).filter(
    (skill: SkillRow) =>
      Boolean(skill.name)
  );
}

async function getArrayFromResponse(
  supabase: ReturnType<typeof createClient>,
  table: string,
  columns = "*"
): Promise<any[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns);

  if (error) {
    console.error(
      `[${table}] Read failed:`,
      error.message
    );

    return [];
  }

  return Array.isArray(data)
    ? data
    : [];
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
      created_at: now,
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
      status: "active",
    };
  } else {
    table = "saas_leads";

    record = {
      name: lead.name || lead.contactName,
      platform: lead.source,
      niche: lead.skill,
      contact: lead.contactUrl || lead.email || lead.phone,
      description: lead.description,
      source_url: lead.sourceUrl,
      contact_url: lead.contactUrl || null,
      country: lead.country || null,
      city: lead.city || null,
      status: "active",
      created_at: now,
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
    demand: 0,
    supply: 0,
    saas: 0,
    total: 0,
    duplicates: 0,
    rejected: 0,
    errors: 0,
    sources: {},
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

function incrementSourceCount(
  stats: LeadStats,
  source: string
): void {
  if (!stats.sources[source]) {
    stats.sources[source] = 0;
  }

  stats.sources[source]++;
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

  const sourceDiagnostics: Record<
    string,
    {
      found: number;
      accepted: number;
      inserted: number;
      rejected: number;
      duplicates: number;
      errors: number;
      wrongType: number;
      noSkill: number;
      noContact: number;
    }
  > = {};

  for (const source of sourceJobs) {
    sourceDiagnostics[source.name] = {
      found: 0,
      accepted: 0,
      inserted: 0,
      rejected: 0,
      duplicates: 0,
      errors: 0,
      wrongType: 0,
      noSkill: 0,
      noContact: 0,
    };
  }

  stats.found = results.length;

  for (const result of results) {
    const sourceName =
      clean(result.source || "Unknown");

    if (!sourceDiagnostics[sourceName]) {
      sourceDiagnostics[sourceName] = {
        found: 0,
        accepted: 0,
        inserted: 0,
        rejected: 0,
        duplicates: 0,
        errors: 0,
        wrongType: 0,
        noSkill: 0,
        noContact: 0,
      };
    }

    const diagnostic =
      sourceDiagnostics[sourceName];

    diagnostic.found++;

    try {
      const type = classifyLead(result);

      if (!type) {
        diagnostic.wrongType++;
        diagnostic.rejected++;
        stats.rejected++;
        continue;
      }

      const expectedSource =
        sourceJobs.find(
          source => source.name === sourceName
        );

      if (
        expectedSource &&
        expectedSource.type !== type
      ) {
        diagnostic.wrongType++;
        diagnostic.rejected++;
        stats.rejected++;
        continue;
      }

      const rejectionReason =
        checkRejectionReason(
          result,
          type,
          skills
        );

      if (rejectionReason) {
        if (
          rejectionReason ===
          "no_matching_skill"
        ) {
          diagnostic.noSkill++;
        }

        if (
          rejectionReason ===
          "no_real_contact"
        ) {
          diagnostic.noContact++;
        }

        diagnostic.rejected++;
        stats.rejected++;
        continue;
      }

      const lead =
        buildProcessedLead(
          result,
          type,
          skills
        );

      if (!lead) {
        diagnostic.rejected++;
        stats.rejected++;
        continue;
      }

      const sourceKey =
        lead.sourceUrl.toLowerCase();

      const contactKey =
        lead.contactUrl.toLowerCase();

      if (
        sourceKey &&
        seenSourceUrls.has(sourceKey)
      ) {
        diagnostic.duplicates++;
        stats.duplicates++;
        continue;
      }

      if (
        contactKey &&
        seenContactUrls.has(contactKey)
      ) {
        diagnostic.duplicates++;
        stats.duplicates++;
        continue;
      }

      if (
        await leadAlreadyExists(
          supabase,
          lead
        )
      ) {
        if (sourceKey) {
          seenSourceUrls.add(sourceKey);
        }

        if (contactKey) {
          seenContactUrls.add(contactKey);
        }

        diagnostic.duplicates++;
        stats.duplicates++;
        continue;
      }

      stats.accepted++;
      diagnostic.accepted++;

      const inserted =
        await insertProcessedLead(
          supabase,
          lead
        );

      if (!inserted) {
        diagnostic.errors++;
        stats.errors++;
        continue;
      }

      if (sourceKey) {
        seenSourceUrls.add(sourceKey);
      }

      if (contactKey) {
        seenContactUrls.add(contactKey);
      }

      stats.inserted++;
      diagnostic.inserted++;

      incrementTypeCount(
        stats,
        lead.type
      );

      incrementSourceCount(
        stats,
        sourceName
      );
    } catch (error: any) {
      diagnostic.errors++;
      stats.errors++;

      console.error(
        `[${sourceName}] Processing failed:`,
        error?.message || error
      );
    }
  }

  stats.sources = sourceDiagnostics as any;

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
      message: "Method not allowed. Use POST.",
    });
  }

  try {
    const supabase = getSupabaseClient();

    const collection =
      await collectAllSources();

    const stats =
      await processCollectedResults(
        collection.results,
        collection.sourceJobs,
        supabase
      );

    return res.status(200).json({
      success: true,
      message: "Lead collection completed.",
      stats,
      sources: sourceCollectionErrors,
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
      message,
    });
  }
}
