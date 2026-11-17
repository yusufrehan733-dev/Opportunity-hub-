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
  category: string;
  fetched: number;
  accepted: number;
  inserted: number;
  failed: boolean;
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

const REQUEST_TIMEOUT_MS = 15000;

const MAX_RESULTS_PER_SOURCE = 50;

const MAX_AGE_HOURS = 72;

const USER_AGENT =
  "OpportunityHub/1.0 (public opportunity collection)";

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
  "looking for a Quran teacher",
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
  "we are looking for a candidate"
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
  "digital marketer"
];

const SAAS_CATEGORIES = [
  "teacher",
  "tutor",
  "coach",
  "freelancer",
  "consultant",
  "designer",
  "developer",
  "educator",
  "mentor",
  "digital marketer"
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

const YUBHUB_FEEDS = [
  "https://feeds.yubhub.co/facet/category/education.json",
  "https://feeds.yubhub.co/facet/category/design.json",
  "https://feeds.yubhub.co/facet/category/language-services.json",
  "https://feeds.yubhub.co/facet/category/sports-coaching.json",
  "https://feeds.yubhub.co/facet/category/consulting.json",
  "https://feeds.yubhub.co/facet/category/marketing.json",
  "https://feeds.yubhub.co/facet/category/customer-service.json"
];

const WWR_FEEDS = [
  "https://weworkremotely.com/categories/remote-design-jobs.rss",
  "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",
  "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
  "https://weworkremotely.com/categories/all-other-remote-jobs.rss"
];

function clean(value: unknown): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
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
    normalized.includes(
      normalizeText(term)
    )
  );
}

function stripHtml(value: unknown): string {
  return clean(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
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

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
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
  const hostname = getHostname(value);

  if (!hostname) return true;

  return BLOCKED_DOMAINS.some(domain =>
    hostname === domain ||
    hostname.endsWith(`.${domain}`)
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
  const raw = clean(value);

  if (!raw) return null;

  const relative = raw.match(
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

  const numeric = Number(raw);

  if (
    Number.isFinite(numeric) &&
    numeric > 1000000000
  ) {
    return new Date(
      numeric < 100000000000
        ? numeric * 1000
        : numeric
    );
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
    }
function isFresh(value: unknown): boolean {
  const date = safeDate(value);

  if (!date) return false;

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
          "application/rss+xml, application/xml, text/xml, application/json, text/plain, */*"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `Request failed (${response.status}) for ${url}`
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
  const text = await fetchText(url);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Invalid JSON response from ${url}`
    );
  }
}

function decodeRssValue(
  value: string
): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(
        parseInt(code, 16)
      )
    )
    .trim();
}

function readXmlTag(
  block: string,
  tag: string
): string {
  const escapedTag = tag.replace(
    /[-/\\^$*+?.()|[\]{}]/g,
    "\\$&"
  );

  const expression = new RegExp(
    `<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}\\s*>`,
    "i"
  );

  const match = block.match(expression);

  return match
    ? stripHtml(
        decodeRssValue(match[1])
      )
    : "";
}

function makeSearchResult(input: {
  title?: unknown;
  link?: unknown;
  description?: unknown;
  author?: unknown;
  company?: unknown;
  location?: unknown;
  country?: unknown;
  publishedAt?: unknown;
  sourceType: string;
  contactUrl?: unknown;
  applicationUrl?: unknown;
  email?: unknown;
  phone?: unknown;
}): SearchResult | null {
  const link = cleanUrl(input.link);

  if (!link) return null;

  const title = stripHtml(
    input.title || ""
  );

  const description = stripHtml(
    input.description || ""
  );

  if (!title && !description) {
    return null;
  }

  return {
    title,
    link,
    description,
    author: clean(input.author) || undefined,
    company: clean(input.company) || undefined,
    location: clean(input.location) || undefined,
    country: clean(input.country) || undefined,
    publishedAt:
      clean(input.publishedAt) || undefined,
    sourceType: input.sourceType,
    contactUrl:
      cleanUrl(input.contactUrl) || undefined,
    applicationUrl:
      cleanUrl(input.applicationUrl) || undefined,
    email: clean(input.email) || undefined,
    phone: clean(input.phone) || undefined
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
    const title =
      readXmlTag(block, "title");

    const description =
      readXmlTag(block, "description") ||
      readXmlTag(block, "summary") ||
      readXmlTag(block, "content:encoded") ||
      readXmlTag(block, "content");

    const author =
      readXmlTag(block, "author") ||
      readXmlTag(block, "dc:creator") ||
      readXmlTag(block, "name");

    const publishedAt =
      readXmlTag(block, "pubDate") ||
      readXmlTag(block, "published") ||
      readXmlTag(block, "updated") ||
      readXmlTag(block, "dc:date");

    let link =
      readXmlTag(block, "link");

    if (!link) {
      const linkMatch = block.match(
        /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i
      );

      link =
        linkMatch?.[1] || "";
    }

    const result = makeSearchResult({
      title,
      link,
      description,
      author,
      publishedAt,
      sourceType
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

async function collectRssUrl(
  url: string,
  sourceType: string
): Promise<SearchResult[]> {
  const xml = await fetchText(url);

  return parseRssFeed(
    xml,
    sourceType
  );
}

function getArrayFromResponse(
  data: any
): any[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.jobs)) {
    return data.jobs;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

function collectYubHubItem(
  job: any
): SearchResult | null {
  const title =
    job.title ||
    job.job_title ||
    job.position ||
    job.name ||
    "";

  const link =
    job.url ||
    job.link ||
    job.job_url ||
    job.application_url ||
    job.apply_url ||
    "";

  const description =
    job.description ||
    job.summary ||
    job.excerpt ||
    job.content ||
    "";

  const company =
    job.company ||
    job.company_name ||
    job.organization ||
    job.employer ||
    "";

  const location =
    job.location ||
    job.job_location ||
    job.country ||
    job.region ||
    "";

  const publishedAt =
    job.published_at ||
    job.pubDate ||
    job.created_at ||
    job.date ||
    job.updated_at ||
    "";

  const applicationUrl =
    job.application_url ||
    job.apply_url ||
    job.applicationLink ||
    link;

  return makeSearchResult({
    title,
    link,
    description,
    company,
    location,
    country: job.country || "",
    publishedAt,
    sourceType: "YubHub",
    applicationUrl,
    contactUrl:
      job.contact_url ||
      job.contactUrl ||
      ""
  });
}

async function collectYubHub(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (const feed of YUBHUB_FEEDS) {
    try {
      const data = await fetchJson(feed);

      const jobs =
        getArrayFromResponse(data);

      for (const job of jobs) {
        const result =
          collectYubHubItem(job);

        if (result) {
          results.push(result);
        }
      }
    } catch {
      continue;
    }
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE *
      YUBHUB_FEEDS.length
  );
  }
function buildRedditSearchUrl(
  query: string
): string {
  const params = new URLSearchParams({
    q: query,
    sort: "new",
    t: "week",
    limit: "25"
  });

  return (
    "https://www.reddit.com/search.rss?" +
    params.toString()
  );
}

async function collectRedditDemand(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const errors: string[] = [];

  for (const query of DEMAND_QUERIES) {
    try {
      const url =
        buildRedditSearchUrl(query);

      const xml =
        await fetchText(url);

      const items =
        parseRssFeed(
          xml,
          "Reddit Demand"
        );

      results.push(...items);
    } catch (error: any) {
      errors.push(
        error?.message ||
        `Reddit search failed: ${query}`
      );
    }
  }

  if (
    results.length === 0 &&
    errors.length > 0
  ) {
    throw new Error(
      errors.slice(0, 3).join(" | ")
    );
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

async function collectWeWorkRemotely(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const errors: string[] = [];

  for (const feedUrl of WWR_FEEDS) {
    try {
      const xml =
        await fetchText(feedUrl);

      const items =
        parseRssFeed(
          xml,
          "We Work Remotely"
        );

      results.push(...items);
    } catch (error: any) {
      errors.push(
        error?.message ||
        `Feed failed: ${feedUrl}`
      );
    }
  }

  if (
    results.length === 0 &&
    errors.length > 0
  ) {
    throw new Error(
      errors.slice(0, 3).join(" | ")
    );
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

function collectRemoteJobItem(
  job: any,
  sourceType: string
): SearchResult | null {
  if (
    !job ||
    typeof job !== "object"
  ) {
    return null;
  }

  const title =
    clean(
      job.position ||
      job.title ||
      job.job_title ||
      job.name
    );

  const link =
    cleanUrl(
      job.url ||
      job.link ||
      job.job_url ||
      job.apply_url ||
      job.application_url
    );

  const description =
    clean(
      job.description ||
      job.summary ||
      job.excerpt ||
      job.content ||
      job.job_description
    );

  if (
    !title ||
    !link ||
    !description
  ) {
    return null;
  }

  const location =
    clean(
      job.location ||
      job.candidate_required_location ||
      job.jobGeo ||
      job.job_geo ||
      job.location_name
    );

  const country =
    clean(
      job.country ||
      job.country_name ||
      job.job_country
    );

  const company =
    clean(
      job.company_name ||
      job.company ||
      job.employer ||
      job.organization
    );

  const publishedAt =
    clean(
      job.date ||
      job.publication_date ||
      job.published_at ||
      job.created_at ||
      job.pubDate ||
      job.updated_at
    );

  const applicationUrl =
    cleanUrl(
      job.apply_url ||
      job.application_url ||
      job.url ||
      job.link
    );

  return makeSearchResult({
    title,
    link,
    description,
    company,
    location,
    country,
    publishedAt,
    sourceType,
    applicationUrl
  });
}

async function collectRemoteOK(): Promise<SearchResult[]> {
  const data =
    await fetchJson(
      "https://remoteok.com/api"
    );

  if (!Array.isArray(data)) {
    throw new Error(
      "RemoteOK returned an unexpected response."
    );
  }

  const results: SearchResult[] = [];

  for (const job of data) {
    // RemoteOK includes a metadata/legal
    // object before the actual job records.
    if (
      !job ||
      typeof job !== "object" ||
      !job.position
    ) {
      continue;
    }

    const result =
      collectRemoteJobItem(
        job,
        "RemoteOK"
      );

    if (result) {
      results.push(result);
    }
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

async function collectHimalayas(): Promise<SearchResult[]> {
  const data =
    await fetchJson(
      "https://himalayas.app/jobs/api?limit=20"
    );

  const jobs =
    getArrayFromResponse(data);

  if (jobs.length === 0) {
    throw new Error(
      "Himalayas returned no readable job records."
    );
  }

  const results =
    jobs
      .map((job: any) =>
        collectRemoteJobItem(
          job,
          "Himalayas"
        )
      )
      .filter(
        (item: SearchResult | null): item is SearchResult =>
          item !== null
      );

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

async function collectJobicy(): Promise<SearchResult[]> {
  const data =
    await fetchJson(
      "https://jobicy.com/api/jobs?count=50"
    );

  const jobs =
    getArrayFromResponse(data);

  if (jobs.length === 0) {
    throw new Error(
      "Jobicy returned no readable job records."
    );
  }

  const results =
    jobs
      .map((job: any) =>
        collectRemoteJobItem(
          job,
          "Jobicy"
        )
      )
      .filter(
        (item: SearchResult | null): item is SearchResult =>
          item !== null
      );

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}
const COUNTRY_ALIASES: Record<string, string> = {
  "usa": "United States",
  "us": "United States",
  "united states": "United States",
  "united states of america": "United States",
  "uk": "United Kingdom",
  "u.k.": "United Kingdom",
  "united kingdom": "United Kingdom",
  "great britain": "United Kingdom",
  "britain": "United Kingdom",
  "canada": "Canada",
  "australia": "Australia",
  "new zealand": "New Zealand",
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
  "Türkiye": "Turkey",
  "brazil": "Brazil",
  "mexico": "Mexico",
  "argentina": "Argentina",
  "japan": "Japan",
  "south korea": "South Korea",
  "hong kong": "Hong Kong"
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
  "work from home"
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

function getCountry(
  result: SearchResult
): string {
  const directCountry =
    normalizeText(
      result.country || ""
    );

  if (
    directCountry &&
    COUNTRY_ALIASES[directCountry]
  ) {
    return COUNTRY_ALIASES[directCountry];
  }

  const location =
    clean(result.location || "");

  if (!location) {
    return "";
  }

  const parts =
    location
      .split(/[,|]/)
      .map((part) =>
        normalizeText(part)
      )
      .filter(Boolean);

  for (
    let index = parts.length - 1;
    index >= 0;
    index--
  ) {
    const part = parts[index];

    if (
      COUNTRY_ALIASES[part]
    ) {
      return COUNTRY_ALIASES[part];
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

  const parts =
    location
      .split(/[,|]/)
      .map((part) => clean(part))
      .filter(Boolean);

  if (parts.length < 2) {
    return "";
  }

  const last =
    normalizeText(
      parts[parts.length - 1]
    );

  if (
    COUNTRY_ALIASES[last]
  ) {
    return parts[parts.length - 2];
  }

  if (
    GENERIC_LOCATIONS.includes(last)
  ) {
    return "";
  }

  return "";
}

function isSocialProfileUrl(
  value: string
): boolean {
  const url =
    cleanUrl(value);

  if (!url) {
    return false;
  }

  const host =
    getHostname(url);

  if (!host) {
    return false;
  }

  const isSocialDomain =
    SOCIAL_PROFILE_DOMAINS.some(
      (domain) =>
        host === domain ||
        host.endsWith("." + domain)
    );

  if (!isSocialDomain) {
    return false;
  }

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
}

function isSpecificContactPage(
  value: string
): boolean {
  const url =
    cleanUrl(value);

  if (!url) {
    return false;
  }

  if (
    isSocialProfileUrl(url)
  ) {
    return true;
  }

  const host =
    getHostname(url);

  if (
    !host ||
    isBlockedDomain(url)
  ) {
    return false;
  }

  const path =
    new URL(url).pathname
      .toLowerCase();

  return CONTACT_PATH_TERMS.some(
    (term) =>
      path.includes(term)
  );
}

function getContactUrl(
  result: SearchResult,
  type: LeadType
): string {
  const explicitContact =
    cleanUrl(
      result.contactUrl || ""
    );

  if (
    explicitContact &&
    !isBlockedDomain(explicitContact)
  ) {
    return explicitContact;
  }

  const applicationUrl =
    cleanUrl(
      result.applicationUrl || ""
    );

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

  if (
    type === "Demand" &&
    isSocialProfileUrl(sourceUrl)
  ) {
    return sourceUrl;
  }

  if (
    type === "Demand" &&
    getHostname(sourceUrl).endsWith(
      "reddit.com"
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

  if (
    isSpecificContactPage(sourceUrl)
  ) {
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
    Boolean(
      clean(result.company || "")
    );

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
    "employment"
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
  const profileSignals = [
    ...PROFESSIONAL_TERMS,
    "portfolio",
    "my services",
    "available for work",
    "book a consultation",
    "coaching",
    "tutoring",
    "teaching",
    "freelance",
    "consultant",
    "trainer",
    "mentor"
  ];

  const hasProfessionalSignal =
    containsAny(
      text,
      profileSignals
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
  const text =
    normalizeText(
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
    isOrganizationResult(
      result,
      text
    );

  // A real service request is Demand.
  // A provider advertisement is not.
  if (
    demand &&
    !demandRejected &&
    !supply
  ) {
    return "Demand";
  }

  // Vacancies and paid work opportunities
  // belong to Supply, not Demand.
  if (
    supply &&
    organization &&
    !demand
  ) {
    return "Supply";
  }

  // Professional profiles can be SaaS
  // reseller prospects only when they are
  // not asking for a job or offering a vacancy.
  if (
    !demand &&
    !supply &&
    !demandRejected &&
    isProfessionalProfile(
      result,
      text
    )
  ) {
    return "SaaS";
  }

  return null;
}

function findMatchingSkill(
  result: SearchResult,
  skills: SkillRow[]
): SkillRow | null {
  const text =
    normalizeText(
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
            normalizeText(String(item || ""))
          )
          .filter(Boolean);

        return names.some((name) => {
          if (name.length < 3) {
            return false;
          }

          return (
            text.includes(name)
          );
        });
      })
      .sort(
        (a, b) =>
          clean(b.name).length -
          clean(a.name).length
      );

  return matches[0] || null;
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

  // Demand and Supply must have a
  // verifiable publication date within 72 hours.
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

  // SaaS profiles are not restricted by
  // the 72-hour Demand/Supply freshness rule.
  const createdAt =
    publishedDate
      ? publishedDate.toISOString()
      : new Date().toISOString();

  const skill =
    findMatchingSkill(
      result,
      skills
    );

  if (!skill) {
    return null;
  }

  const contactUrl =
    getContactUrl(
      result,
      type
    );

  if (
    !hasRealContact(
      result,
      type
    )
  ) {
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

    source:
      clean(result.sourceType),

    sourceUrl,

    contactUrl,

    title,

    description,

    skill:
      clean(skill.name),

    category:
      clean(skill.category || ""),

    subcategory:
      clean(skill.subcategory || ""),

    country,

    city,

    contactEmail,

    contactPhone,

    contactName,

    applicationUrl:
      cleanUrl(
        result.applicationUrl || ""
      ),

    platform,

    niche,

    name:
      contactName || title,

    clientName:
      contactName || "Client",

    companyName:
      clean(result.company || ""),

    position:
      title,

    publishedAt:
      publishedDate
        ? publishedDate.toISOString()
        : "",

    createdAt
  };
}

function getSupabaseClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL or VITE_SUPABASE_URL environment variable."
    );
  }

  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createClient(
    url,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

async function loadSkills(
  supabase: any
): Promise<SkillRow[]> {
  const { data, error } =
    await supabase
      .from("skills")
      .select(
        "id,name,category,subcategory,tags"
      );

  if (error) {
    throw new Error(
      `Could not load skills: ${error.message}`
    );
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter(
      (item: any) =>
        clean(item.name)
    )
    .map((item: any) => ({
      id: item.id,

      name:
        clean(item.name),

      category:
        clean(item.category || ""),

      subcategory:
        clean(item.subcategory || ""),

      tags:
        Array.isArray(item.tags)
          ? item.tags
          : []
    }));
}

function getTableForType(
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
    getTableForType(lead.type);

  // Check the original source URL first.
  const sourceCheck =
    await supabase
      .from(table)
      .select("id")
      .eq("source_url", lead.sourceUrl)
      .limit(1);

  if (sourceCheck.error) {
    throw new Error(
      `Duplicate check failed: ${sourceCheck.error.message}`
    );
  }

  if (
    Array.isArray(sourceCheck.data) &&
    sourceCheck.data.length > 0
  ) {
    return true;
  }

  // Check the contact URL separately.
  // This avoids fragile URL interpolation
  // inside a Supabase OR filter.
  if (lead.contactUrl) {
    const contactCheck =
      await supabase
        .from(table)
        .select("id")
        .eq("contact_url", lead.contactUrl)
        .limit(1);

    if (contactCheck.error) {
      throw new Error(
        `Contact duplicate check failed: ${contactCheck.error.message}`
      );
    }

    if (
      Array.isArray(contactCheck.data) &&
      contactCheck.data.length > 0
    ) {
      return true;
    }
  }

  return false;
}

async function insertProcessedLead(
  supabase: any,
  lead: ProcessedLead
): Promise<"inserted" | "duplicate"> {
  const duplicate =
    await leadAlreadyExists(
      supabase,
      lead
    );

  if (duplicate) {
    return "duplicate";
  }

  let table = "";
  let record: Record<string, any> = {};

  if (lead.type === "Demand") {
    table = "demand_leads";

    record = {
      type: "Demand",

      source: lead.source,

      client_name:
        lead.clientName,

      skill_needed:
        lead.skill,

      description:
        lead.description,

      contact_email:
        lead.contactEmail || null,

      contact_phone:
        lead.contactPhone || null,

      created_at:
        lead.createdAt,

      status: "new",

      title:
        lead.title,

      category:
        lead.category || null,

      subcategory:
        lead.subcategory || null,

      country:
        lead.country || null,

      city:
        lead.city || null,

      currency: null,

      content:
        lead.description,

      name:
        lead.name,

      contact_url:
        lead.contactUrl || null,

      source_url:
        lead.sourceUrl
    };
  } else if (lead.type === "Supply") {
    table = "supply_leads";

    record = {
      company_name:
        lead.companyName || null,

      description:
        lead.description,

      position:
        lead.position,

      required_skill:
        lead.skill,

      category:
        lead.category || null,

      subcategory:
        lead.subcategory || null,

      country:
        lead.country || null,

      city:
        lead.city || null,

      salary_range: null,

      contact_email:
        lead.contactEmail || null,

      contact_phone:
        lead.contactPhone || null,

      created_at:
        lead.createdAt,

      status: "new",

      job_title:
        lead.title,

      salary_min: null,

      salary_max: null,

      company_website: null,

      apply_url:
        lead.applicationUrl ||
        lead.contactUrl ||
        null,

      source:
        lead.source,

      source_url:
        lead.sourceUrl,

      contact_url:
        lead.contactUrl || null,

      contact_name:
        lead.contactName || null,

      commission: null,

      trial_days: null,

      landing_url: null,

      contact:
        lead.contactUrl ||
        lead.contactEmail ||
        lead.contactPhone ||
        null,

      name:
        lead.name,

      niche:
        lead.niche
    };
  } else {
    table = "saas_leads";

    record = {
      name:
        lead.name,

      platform:
        lead.platform,

      niche:
        lead.niche,

      contact:
        lead.contactUrl ||
        lead.contactEmail ||
        lead.contactPhone ||
        null,

      status: "new",

      created_at:
        lead.createdAt,

      description:
        lead.description,

      commission: null,

      trial_days: null,

      landing_url: null,

      source_url:
        lead.sourceUrl,

      contact_url:
        lead.contactUrl || null,

      country:
        lead.country || null,

      city:
        lead.city || null
    };
  }

  const { error } =
    await supabase
      .from(table)
      .insert(record);

  if (error) {
    throw new Error(
      `Insert into ${table} failed: ${error.message}`
    );
  }

  return "inserted";
               }
async function collectRedditSaaS(): Promise<SearchResult[]> {
  const queries = [
    "tutor available for online tutoring",
    "teacher offering online lessons",
    "freelance designer available for projects",
    "freelance writer available for work",
    "coach offering coaching services",
    "consultant available for consulting",
    "virtual assistant available for work",
    "language tutor offering lessons",
    "marketing freelancer available",
    "web developer freelance portfolio"
  ];

  const results: SearchResult[] = [];
  const errors: string[] = [];

  for (const query of queries) {
    try {
      const xml =
        await fetchText(
          buildRedditSearchUrl(query)
        );

      const items =
        parseRssFeed(
          xml,
          "Reddit SaaS"
        );

      for (const item of items) {
        const author =
          clean(item.author || "");

        if (
          !author ||
          author.toLowerCase() === "[deleted]"
        ) {
          continue;
        }

        const username =
          author.replace(/^u\//i, "");

        if (
          !/^[A-Za-z0-9_-]{2,40}$/.test(username)
        ) {
          continue;
        }

        results.push({
          ...item,

          contactUrl:
            `https://www.reddit.com/user/${username}/`
        });
      }
    } catch (error: any) {
      errors.push(
        error?.message ||
        `Reddit SaaS search failed: ${query}`
      );
    }
  }

  if (
    results.length === 0 &&
    errors.length > 0
  ) {
    throw new Error(
      errors.slice(0, 3).join(" | ")
    );
  }

  return results.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
}

type SourceJob = {
  name: string;
  category: LeadType;
  collect: () => Promise<SearchResult[]>;
};

async function runSource(
  source: SourceJob
): Promise<{
  results: SearchResult[];
  diagnostic: SourceDiagnostic;
}> {
  try {
    const results =
      await source.collect();

    return {
      results,

      diagnostic: {
        source: source.name,
        category: source.category,
        fetched: results.length,
        accepted: 0,
        inserted: 0,
        failed: 0
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

function createEmptyStats(): LeadStats {
  return {
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
    errors: 0
  };
}

function createEmptyInserted(): InsertedByType {
  return {
    demand: 0,
    supply: 0,
    saas: 0,
    total: 0
  };
}

function incrementTypeCount(
  target: InsertedByType,
  type: LeadType
): void {
  if (type === "Demand") {
    target.demand++;
  } else if (type === "Supply") {
    target.supply++;
  } else {
    target.saas++;
  }

  target.total++;
}

function checkRejectionReason(
  result: SearchResult,
  skills: SkillRow[]
): "wrongType" | "stale" | "noSkill" | "noContact" | null {
  const type =
    classifyLead(result);

  if (!type) {
    return "wrongType";
  }

  if (
    type !== "SaaS" &&
    (
      !safeDate(result.publishedAt) ||
      !isFresh(result.publishedAt)
    )
  ) {
    return "stale";
  }

  if (
    !findMatchingSkill(
      result,
      skills
    )
  ) {
    return "noSkill";
  }

  if (
    !hasRealContact(
      result,
      type
    )
  ) {
    return "noContact";
  }

  return null;
}

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
      name: "YubHub",
      category: "Supply",
      collect: collectYubHub
    },
    {
      name: "We Work Remotely",
      category: "Supply",
      collect: collectWeWorkRemotely
    },
    {
      name: "Himalayas",
      category: "Supply",
      collect: collectHimalayas
    },
    {
      name: "Jobicy",
      category: "Supply",
      collect: collectJobicy
    },
    {
      name: "RemoteOK",
      category: "Supply",
      collect: collectRemoteOK
    },
    {
      name: "Reddit SaaS",
      category: "SaaS",
      collect: collectRedditSaaS
    }
  ];

  const outcomes =
    await Promise.all(
      sources.map(runSource)
    );

  return {
    results:
      outcomes.flatMap(
        (outcome) => outcome.results
      ),

    diagnostics:
      outcomes.map(
        (outcome) => outcome.diagnostic
      )
  };
}

async function processCollectedResults(
  supabase: any,
  results: SearchResult[],
  diagnostics: SourceDiagnostic[]
): Promise<{
  stats: LeadStats;
  inserted: InsertedByType;
}> {
  const stats =
    createEmptyStats();

  const inserted =
    createEmptyInserted();

  const skills =
    await loadSkills(supabase);

  if (skills.length === 0) {
    throw new Error(
      "The skills table returned no usable skills. Leads cannot be matched safely."
    );
  }

  const seen =
    new Set<string>();

  const diagnosticBySource =
    new Map<string, SourceDiagnostic>();

  for (const diagnostic of diagnostics) {
    diagnosticBySource.set(
      diagnostic.source,
      diagnostic
    );
  }

  for (const result of results) {
    const type =
      classifyLead(result);

    const reason =
      checkRejectionReason(
        result,
        skills
      );

    if (reason) {
      stats.rejected++;

      if (reason === "wrongType") {
        stats.wrongType++;
      } else if (reason === "stale") {
        stats.stale++;
      } else if (reason === "noSkill") {
        stats.noSkill++;
      } else if (reason === "noContact") {
        stats.noContact++;
      }

      continue;
    }

    if (!type) {
      stats.rejected++;
      stats.wrongType++;
      continue;
    }

    const lead =
      buildProcessedLead(
        result,
        skills
      );

    if (!lead) {
      stats.rejected++;
      continue;
    }

    const uniqueKey =
      `${lead.type}:${lead.sourceUrl}`;

    if (seen.has(uniqueKey)) {
      stats.duplicates++;
      continue;
    }

    seen.add(uniqueKey);

    const diagnostic =
      diagnosticBySource.get(
        lead.source
      );

    if (diagnostic) {
      diagnostic.accepted++;
    }

    try {
      const outcome =
        await insertProcessedLead(
          supabase,
          lead
        );

      if (outcome === "duplicate") {
        stats.duplicates++;
        continue;
      }

      incrementTypeCount(
        inserted,
        lead.type
      );

      if (diagnostic) {
        diagnostic.inserted++;
      }
    } catch (error: any) {
      stats.errors++;

      if (diagnostic) {
        diagnostic.failed++;
        diagnostic.error =
          [
            diagnostic.error,
            clean(
              error?.message ||
              "Lead insertion failed"
            )
          ]
            .filter(Boolean)
            .join(" | ");
      }
    }
  }

  stats.demand =
    inserted.demand;

  stats.supply =
    inserted.supply;

  stats.saas =
    inserted.saas;

  stats.total =
    inserted.total;

  stats.errors +=
    diagnostics.filter(
      (item) => Boolean(item.error)
    ).length;

  return {
    stats,
    inserted
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
      message: "Method not allowed. Use POST."
    });
  }

  try {
    const supabase =
      getSupabaseClient();

    const collected =
      await collectAllSources();

    const processed =
      await processCollectedResults(
        supabase,
        collected.results,
        collected.diagnostics
      );

    return res.status(200).json({
      success: true,

      message:
        "Lead collection completed.",

      stats:
        processed.stats,

      inserted:
        processed.inserted,

      counts: {
        demand:
          processed.inserted.demand,

        supply:
          processed.inserted.supply,

        saas:
          processed.inserted.saas,

        total:
          processed.inserted.total
      },

      diagnostics:
        collected.diagnostics,

      sources: {
        total:
          collected.diagnostics.length,

        successful:
          collected.diagnostics.filter(
            (item) =>
              !item.error
          ).length,

        failed:
          collected.diagnostics.filter(
            (item) =>
              Boolean(item.error)
          ).length
      }
    });
  } catch (error: any) {
    const message =
      clean(
        error?.message ||
        "Lead collection failed."
      );

    console.error(
      "Opportunity Hub lead collection error:",
      message
    );

    return res.status(500).json({
      success: false,
      message,
      stats:
        createEmptyStats(),
      inserted:
        createEmptyInserted()
    });
  }
      }
