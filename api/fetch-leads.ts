import type {
  VercelRequest,
  VercelResponse
} from "@vercel/node";

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
  country?: string;
  publishedAt?: string;
  sourceType: string;
  contactUrl?: string;
  applicationUrl?: string;
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

const SERPER_API_KEY =
  process.env.SERPER_API_KEY ||
  process.env.SERPER_KEY ||
  "";

const REQUEST_TIMEOUT_MS = 15000;

const MAX_RESULTS_PER_SOURCE = 30;

const MAX_AGE_HOURS = 72;

const SERPER_ENDPOINT =
  "https://google.serper.dev/search";

const DEMAND_QUERIES = [
  '"looking for a tutor"',
  '"need a tutor"',
  '"looking for an online teacher"',
  '"need an online teacher"',
  '"looking for a freelancer"',
  '"need a freelancer"',
  '"looking for a designer"',
  '"need a designer"',
  '"looking for a coach"',
  '"need a coach"',
  '"need help with my website"',
  '"need help with marketing"',
  '"looking for a Quran teacher"',
  '"looking for a math tutor"'
];

const SAAS_QUERIES = [
  'site:linkedin.com/in/ freelance teacher tutor coach',
  'site:linkedin.com/in/ freelancer designer consultant',
  'site:instagram.com teacher tutor coach',
  'site:instagram.com freelance designer coach',
  'site:facebook.com teacher tutor professional',
  'site:behance.net freelance designer',
  'site:dribbble.com designer freelancer',
  'independent online teacher professional profile',
  'freelance coach professional portfolio',
  'independent consultant professional profile'
];

const DEMAND_INTENT_TERMS = [
  "looking for a tutor",
  "need a tutor",
  "need a teacher",
  "looking for a teacher",
  "seeking a tutor",
  "seeking a teacher",
  "looking for a freelancer",
  "need a freelancer",
  "looking for a designer",
  "need a designer",
  "looking for a coach",
  "need a coach",
  "can anyone recommend",
  "need help with my website",
  "need help with marketing",
  "looking for an online teacher",
  "looking for a quran teacher",
  "looking for a math tutor"
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
  "available for hire",
  "join our team",
  "career opportunity"
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
  "freelance opportunity",
  "contract opportunity",
  "remote position",
  "full time position",
  "part time position"
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
  "self employed",
  "independent professional",
  "my portfolio",
  "my profile",
  "my services",
  "available for work",
  "freelance",
  "professional services"
];

const BLOCKED_TERMS = [
  "casino",
  "gambling",
  "crypto giveaway",
  "get rich quick",
  "ebook",
  "buy my course",
  "paid course",
  "affiliate spam"
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

function clean(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9@.+:/_-]+/g, " ")
    .trim();
}

function containsAny(
  text: string,
  terms: string[]
): boolean {
  const normalized = normalizeText(text);

  return terms.some((term) => {
    const escaped = term.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    return new RegExp(
      `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
      "i"
    ).test(normalized);
  });
}

function stripHtml(value: unknown): string {
  return clean(value)
    .replace(
      /<!\[CDATA\[([\s\S]*?)\]\]>/g,
      "$1"
    )
    .replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      " "
    )
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

function isBlockedDomain(value: string): boolean {
  try {
    const hostname =
      new URL(value).hostname.toLowerCase();

    return BLOCKED_DOMAINS.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(`.${domain}`)
    );
  } catch {
    return true;
  }
}

function containsBlockedContent(
  text: string,
  url = ""
): boolean {
  return (
    containsAny(text, BLOCKED_TERMS) ||
    (url ? isBlockedDomain(url) : false)
  );
}

function safeDate(
  value: unknown
): string | undefined {
  const raw = clean(value);

  if (!raw) return undefined;

  const timestamp = Date.parse(raw);

  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

function isFresh(
  value?: string
): boolean {
  if (!value) return false;

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const age = Date.now() - timestamp;

  return (
    age >= 0 &&
    age <= MAX_AGE_HOURS * 60 * 60 * 1000
  );
}

function resultText(
  result: SearchResult
): string {
  return [
    result.title,
    result.description,
    result.snippet,
    result.author,
    result.company,
    result.location,
    result.country
  ]
    .filter(Boolean)
    .join(" ");
}

async function fetchJson<T = any>(
  url: string
): Promise<T> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "OpportunityHubLeadCollector/2.0"
      }
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${url}`
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
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
      signal: controller.signal,
      headers: {
        Accept:
          "application/rss+xml, application/xml, text/xml, text/plain, */*",
        "User-Agent": "OpportunityHubLeadCollector/2.0"
      }
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${url}`
      );
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
  )
  
function makeSearchResult(
  title: string,
  link: string,
  description: string,
  sourceType: string,
  publishedAt?: string,
  company?: string,
  location?: string,
  author?: string,
  contactUrl?: string,
  applicationUrl?: string
): SearchResult | null {
  const safeLink = cleanUrl(link);
  const safeTitle = clean(title);

  if (!safeLink || !safeTitle) {
    return null;
  }

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
    contactUrl: cleanUrl(contactUrl) || undefined,
    applicationUrl:
      cleanUrl(applicationUrl) || undefined
  };
}

async function searchSerper(
  query: string,
  sourceType: string
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    console.warn(
      `[LEAD COLLECTOR] Serper key missing. Skipping ${sourceType}.`
    );

    return [];
  }

  try {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(
        SERPER_ENDPOINT,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": SERPER_API_KEY
          },
          body: JSON.stringify({
            q: query,
            num: MAX_RESULTS_PER_SOURCE
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          `Serper HTTP ${response.status}`
        );
      }

      const data: any = await response.json();

      const organic = Array.isArray(data.organic)
        ? data.organic
        : [];

      return organic
        .map((item: any) => {
          const link = cleanUrl(item.link);

          return makeSearchResult(
            item.title || "",
            link,
            item.snippet || "",
            sourceType,
            item.date || undefined,
            item.company || undefined,
            item.location || undefined,
            item.author || undefined,
            link
          );
        })
        .filter(
          (item: SearchResult | null): item is SearchResult =>
            Boolean(item)
        )
        .slice(0, MAX_RESULTS_PER_SOURCE);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn(
      `[LEAD COLLECTOR] Serper search failed (${sourceType}):`,
      error instanceof Error ? error.message : String(error)
    );

    return [];
  }
}

function decodeRssValue(value: string): string {
  return stripHtml(
    value
      .replace(
        /<!\[CDATA\[([\s\S]*?)\]\]>/g,
        "$1"
      )
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(
        /&#(\d+);/g,
        (_, code) =>
          String.fromCharCode(Number(code))
      )
  );
}

function readXmlTag(
  block: string,
  names: string[]
): string {
  for (const name of names) {
    const escaped = name.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

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

function parseRssFeed(
  xml: string,
  sourceType: string
): SearchResult[] {
  const blocks =
    xml.match(/<(item|entry)\b[\s\S]*?<\/\1\s*>/gi) ||
    [];

  const results: SearchResult[] = [];

  for (const block of blocks) {
    const title = readXmlTag(
      block,
      ["title"]
    );

    const link = readXmlTag(
      block,
      ["link", "guid", "id"]
    );

    const description = readXmlTag(
      block,
      [
        "content:encoded",
        "description",
        "summary",
        "content"
      ]
    );

    const publishedAt = readXmlTag(
      block,
      [
        "pubDate",
        "published",
        "updated",
        "dc:date"
      ]
    );

    const author = readXmlTag(
      block,
      [
        "author",
        "dc:creator",
        "name"
      ]
    );

    const safeLink = cleanUrl(link);

    if (!title || !safeLink) {
      continue;
    }

    const result = makeSearchResult(
      title,
      safeLink,
      description,
      sourceType,
      publishedAt || undefined,
      undefined,
      undefined,
      author || undefined
    );

    if (result) {
      results.push(result);
    }

    if (results.length >= MAX_RESULTS_PER_SOURCE) {
      break;
    }
  }

  return results;
}

async function collectRssUrl(
  url: string,
  sourceType: string
): Promise<SearchResult[]> {
  try {
    const xml = await fetchText(url);

    if (
      !xml ||
      !/<(item|entry)\b/i.test(xml)
    ) {
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

function redditSearchUrl(
  query: string
): string {
  const params = new URLSearchParams({
    q: query,
    sort: "new",
    t: "month"
  });

  return (
    "https://www.reddit.com/search.rss?" +
    params.toString()
  );
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

      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      allResults.push(result);
    }
  }

  return allResults;
}

/*
 * DEMAND SOURCE 1:
 * Reddit service-request searches.
 */

async function collectRedditDemand(): Promise<SearchResult[]> {
  return collectRedditSearch(
    [
      ...DEMAND_QUERIES
    ],
    "Reddit Demand"
  );
}

/*
 * DEMAND SOURCE 2:
 * Public search results targeting
 * actual service requests.
 */

async function collectSerperDemand(): Promise<SearchResult[]> {
  const queries = [
    '"looking for a tutor" OR "need a tutor"',
    '"need an online teacher" OR "looking for an online teacher"',
    '"looking for a freelancer" OR "need a freelancer"',
    '"need a designer" OR "looking for a designer"',
    '"looking for a coach" OR "need a coach"',
    '"need help with my website" OR "need help with marketing"',
    '"looking for a Quran teacher" OR "looking for a math tutor"'
  ];

  const collected = await Promise.all(
    queries.map((query) =>
      searchSerper(
        query,
        "Serper Demand Search"
      )
    )
  );

  return deduplicateResults(
    collected.flat()
  );
}

/*
 * SUPPLY SOURCE 1:
 * RemoteOK public API.
 */

async function collectRemoteOK(): Promise<SearchResult[]> {
  try {
    const data = await fetchJson<any>(
      "https://remoteok.com/api"
    );

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter(
        (item: any) =>
          item &&
          item.position &&
          item.url &&
          item.date
      )
      .slice(0, MAX_RESULTS_PER_SOURCE)
      .map((item: any) =>
        makeSearchResult(
          String(item.position || ""),
          String(item.url || ""),
          String(
            item.description ||
            item.position ||
            ""
          ),
          "RemoteOK",
          item.date || undefined,
          item.company || undefined,
          item.location || undefined,
          undefined,
          undefined,
          item.url || undefined
        )
      )
      .filter(
        (item: SearchResult | null): item is SearchResult =>
          Boolean(item)
      );
  } catch (error) {
    console.warn(
      "[LEAD COLLECTOR] RemoteOK unavailable:",
      error instanceof Error ? error.message : String(error)
    );

    return [];
  }
}

/*
 * SUPPLY SOURCE 2:
 * We Work Remotely RSS feeds.
 */

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
      collectRssUrl(
        feed.url,
        feed.name
      )
    )
  );

  return deduplicateResults(
    collected.flat()
  );
}

/*
 * SUPPLY SOURCE 3:
 * Himalayas public jobs API.
 */

async function collectHimalayas(): Promise<SearchResult[]> {
  try {
    const data = await fetchJson<any>(
      "https://himalayas.app/jobs/api"
    );

    const jobs = Array.isArray(data)
      ? data
      : Array.isArray(data.jobs)
        ? data.jobs
        : [];

    return jobs
      .filter(
        (job: any) =>
          job &&
          (job.title || job.name) &&
          (job.applicationLink || job.url)
      )
      .slice(0, MAX_RESULTS_PER_SOURCE)
      .map((job: any) => {
        const applicationUrl =
          job.applicationLink ||
          job.url ||
          "";

        return makeSearchResult(
          job.title || job.name || "",
          job.url || applicationUrl,
          job.description || "",
          "Himalayas",
          job.pubDate ||
            job.createdAt ||
            job.date ||
            undefined,
          job.companyName ||
            job.company ||
            undefined,
          job.location ||
            job.locationRestrictions?.join(", ") ||
            undefined,
          undefined,
          undefined,
          applicationUrl
        );
      })
      .filter(
        (item: SearchResult | null): item is SearchResult =>
          Boolean(item)
      );
  } catch (error) {
    console.warn(
      "[LEAD COLLECTOR] Himalayas unavailable:",
      error instanceof Error ? error.message : String(error)
    );

    return [];
  }
}

/*
 * SUPPLY SOURCE 4:
 * Jobicy public jobs API.
 */

async function collectJobicy(): Promise<SearchResult[]> {
  try {
    const data = await fetchJson<any>(
      "https://jobicy.com/api/v2/remote-jobs?count=50"
    );

    const jobs = Array.isArray(data.jobs)
      ? data.jobs
      : [];

    return jobs
      .filter(
        (job: any) =>
          job &&
          job.jobTitle &&
          job.url
      )
      .slice(0, MAX_RESULTS_PER_SOURCE)
      .map((job: any) =>
        makeSearchResult(
          job.jobTitle || "",
          job.url || "",
          job.jobDescription || "",
          "Jobicy",
          job.pubDate || undefined,
          job.companyName || undefined,
          job.jobGeo || undefined,
          undefined,
          undefined,
          job.url || undefined
        )
      )
      .filter(
        (item: SearchResult | null): item is SearchResult =>
          Boolean(item)
      );
  } catch (error) {
    console.warn(
      "[LEAD COLLECTOR] Jobicy unavailable:",
      error instanceof Error ? error.message : String(error)
    );

    return [];
  }
}

/*
 * SAAS SOURCE:
 * Public professional-profile searches.
 */

async function collectSaaSProfiles(): Promise<SearchResult[]> {
  const collected = await Promise.all(
    SAAS_QUERIES.map((query) =>
      searchSerper(
        query,
        "Public Professional Profile Search"
      )
    )
  );

  return deduplicateResults(
    collected.flat()
  );
}

function deduplicateResults(
  results: SearchResult[]
): SearchResult[] {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = cleanUrl(result.link);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
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
        clean(b.name).length -
        clean(a.name).length
    );

  return matches.find((skill) => {
    const candidates = [
      skill.name,
      skill.category || "",
      skill.subcategory || "",
      ...skill.tags
    ].filter(Boolean);

    return candidates.some((candidate) => {
      const name = normalizeText(candidate);

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
  });
}

function findCountry(text: string): string {
  const countries: Array<[string, string[]]> = [
    ["United States", ["united states", "usa", "u.s.a."]],
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
    ["Kenya", ["kenya"]]
  ];

  const normalized = normalizeText(text);

  for (const [country, aliases] of countries) {
    if (
      aliases.some((alias) => {
        const escaped = alias.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

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
    ["Cape Town", ["cape town"]]
  ];

  const normalized = normalizeText(text);

  for (const [city, aliases] of cities) {
    if (
      aliases.some((alias) => {
        const escaped = alias.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

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
    url: cleanUrl(sourceUrl) || undefined
  };
}

function isOrganizationResult(
  result: SearchResult
): boolean {
  const text = normalizeText(
    resultText(result)
  );

  return Boolean(
    clean(result.company) ||
    containsAny(text, [
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
      "employer"
    ])
  );
}

function isProfessionalProfile(
  result: SearchResult,
  skill?: SkillRow
): boolean {
  const text = normalizeText(
    resultText(result)
  );

  const hostname = (() => {
    try {
      return new URL(result.link)
        .hostname
        .toLowerCase();
    } catch {
      return "";
    }
  })();

  const professionalDomains = [
    "linkedin.com",
    "instagram.com",
    "facebook.com",
    "behance.net",
    "dribbble.com",
    "github.com"
  ];

  const hasProfessionalDomain =
    professionalDomains.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(`.${domain}`)
    );

  const hasProfessionalLanguage =
    containsAny(
      text,
      PROFESSIONAL_TERMS
    );

  const hasSkill =
    Boolean(
      skill
        ? findMatchingSkill(text, [skill])
        : true
    );

  return (
    hasProfessionalDomain &&
    hasProfessionalLanguage &&
    hasSkill
  );
}

function isSpecificSourcePage(
  result: SearchResult
): boolean {
  const url = cleanUrl(result.link);

  if (!url) return false;

  try {
    const parsed = new URL(url);

    const path = parsed.pathname
      .replace(/\/+$/, "");

    if (path.length <= 1) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isValidEmail(
  value?: string
): boolean {
  if (!value) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function isValidPhone(
  value?: string
): boolean {
  if (!value) return false;

  const digits = value.replace(/\D/g, "");

  return (
    digits.length >= 8 &&
    digits.length <= 15
  );
}

function isUsableContactUrl(
  value?: string
): boolean {
  const url = cleanUrl(value);

  if (!url) return false;

  try {
    const parsed = new URL(url);

    const hostname =
      parsed.hostname.toLowerCase();

    const path = parsed.pathname
      .replace(/\/+$/, "");

    if (!path || path === "/") {
      return false;
    }

    const socialDomains = [
      "linkedin.com",
      "instagram.com",
      "facebook.com",
      "t.me",
      "telegram.me",
      "behance.net",
      "dribbble.com",
      "github.com"
    ];

    return socialDomains.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(`.${domain}`)
    ) || path.length > 1;
  } catch {
    return false;
  }
}

function hasUsableContact(
  result: SearchResult,
  contact: ContactInfo,
  type: LeadType
): boolean {
  if (
    isValidEmail(contact.email) ||
    isValidPhone(contact.phone)
  ) {
    return true;
  }

  if (type === "Demand") {
    return (
      isUsableContactUrl(result.contactUrl) ||
      isUsableContactUrl(contact.url)
    );
  }

  if (type === "Supply") {
    return (
      isUsableContactUrl(result.applicationUrl) ||
      isUsableContactUrl(result.contactUrl)
    );
  }

  return (
    isSpecificSourcePage(result) &&
    isProfessionalProfile(result)
  );
}

function classifyLeadType(
  result: SearchResult
): LeadType | null {
  const text = normalizeText(
    resultText(result)
  );

  if (
    !text ||
    containsBlockedContent(text, result.link)
  ) {
    return null;
  }

  const hasDemandIntent =
    containsAny(
      text,
      DEMAND_INTENT_TERMS
    );

  const hasDemandReject =
    containsAny(
      text,
      DEMAND_REJECT_TERMS
    );

  const hasSupplyIntent =
    containsAny(
      text,
      SUPPLY_INTENT_TERMS
    );

  const organizationResult =
    isOrganizationResult(result);

  /*
   * Employer vacancies always take priority.
   */

  if (
    hasSupplyIntent &&
    organizationResult
  ) {
    return "Supply";
  }

  /*
   * A real customer request is Demand.
   */

  if (
    hasDemandIntent &&
    !hasDemandReject &&
    !hasSupplyIntent
  ) {
    return "Demand";
  }

  /*
   * Professional profiles are SaaS prospects.
   */

  if (
    isProfessionalProfile(result) &&
    !hasDemandIntent &&
    !hasSupplyIntent &&
    !hasDemandReject
  ) {
    return "SaaS";
  }

  return null;
}

function getResultDate(
  result: SearchResult
): string | undefined {
  return safeDate(result.publishedAt);
}

function getLeadContact(
  result: SearchResult,
  type: LeadType
): ContactInfo {
  const combinedText = [
    result.title,
    result.description,
    result.snippet || "",
    result.author || "",
    result.company || ""
  ].join(" ");

  const extracted = extractContactInfo(
    combinedText,
    result.contactUrl ||
      result.applicationUrl ||
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

    email:
      emailMatch?.[0] ||
      extracted.email,

    phone:
      phoneMatch?.[0] ||
      extracted.phone,

    url:
      cleanUrl(
        type === "Supply"
          ? result.applicationUrl
          : result.contactUrl || result.link
      ) || undefined
  };
        }
 function buildProcessedLead(
  result: SearchResult,
  skills: SkillRow[]
): ProcessedLead | null {
  const type =
    classifyLeadType(result);

  if (!type) {
    return null;
  }

  const text =
    resultText(result);

  const skill =
    findMatchingSkill(
      text,
      skills
    );

  if (!skill) {
    return null;
  }

  const publishedAt =
    getResultDate(result);

  /*
   * Demand and Supply must
   * have a real date and be
   * no older than 72 hours.
   *
   * SaaS profiles are exempt.
   */
  if (
    (type === "Demand" ||
      type === "Supply") &&
    !isFresh(publishedAt)
  ) {
    return null;
  }

  const contact =
    getLeadContact(
      result,
      type
    );

  if (
    !hasUsableContact(
      result,
      contact,
      type
    )
  ) {
    return null;
  }

  const country =
    clean(
      result.country ||
      findCountry(text)
    );

  const city =
    findCity(text);

  if (!country) {
    return null;
  }

  const title =
    clean(
      result.title ||
      result.name ||
      result.company
    );

  const description =
    clean(
      result.description ||
      result.snippet ||
      result.content
    );

  if (!title || !description) {
    return null;
  }

  const sourceUrl =
    cleanUrl(result.url);

  if (!sourceUrl) {
    return null;
  }

  const contactUrl =
    cleanUrl(
      result.contactUrl ||
      contact.url
    );

  const processed: any = {
    type,

    source:
      clean(result.source) ||
      "Unknown",

    sourceUrl,

    contactUrl,

    title,

    description,

    skill:
      clean(skill.skill),

    category:
      clean(skill.category),

    subcategory:
      clean(skill.subcategory),

    country,

    city,

    contactEmail:
      clean(contact.email),

    contactPhone:
      clean(contact.phone),

    contactName:
      clean(contact.name),

    publishedAt:
      publishedAt || null,

    name:
      clean(
        result.name ||
        result.company ||
        title
      ),

    clientName:
      clean(
        result.name ||
        result.author ||
        title
      ),

    companyName:
      clean(
        result.company ||
        result.name
      ),

    position:
      title,

    applicationUrl:
      cleanUrl(
        result.applicationUrl
      ),

    platform:
      clean(result.source),

    niche:
      clean(skill.skill),

    createdAt:
      publishedAt ||
      new Date().toISOString(),
  };

  return processed as ProcessedLead;
}


/*
 * Create empty lead statistics.
 */
function emptyLeadStats(): LeadStats {
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
    errors: 0,
  } as LeadStats;
}


/*
 * Count inserted records
 * separately for each type.
 */
function emptyInsertedByType(): InsertedByType {
  return {
    demand: 0,
    supply: 0,
    saas: 0,
    total: 0,
  } as InsertedByType;
}


/*
 * Check whether a lead
 * already exists.
 *
 * Demand and Supply:
 * source_url is the primary
 * duplicate identifier.
 *
 * SaaS:
 * contact_url is checked
 * first, then source_url.
 */
async function leadAlreadyExists(
  supabase: any,
  type: LeadType,
  lead: ProcessedLead
): Promise<boolean> {
  const table =
    type === "Demand"
      ? "demand_leads"
      : type === "Supply"
        ? "supply_leads"
        : "saas_leads";

  const item: any = lead;

  if (
    type === "SaaS" &&
    item.contactUrl
  ) {
    const { data, error } =
      await supabase
        .from(table)
        .select("id")
        .eq(
          "contact_url",
          item.contactUrl
        )
        .limit(1);

    if (error) {
      throw error;
    }

    if (
      data &&
      data.length > 0
    ) {
      return true;
    }
  }

  if (item.sourceUrl) {
    const { data, error } =
      await supabase
        .from(table)
        .select("id")
        .eq(
          "source_url",
          item.sourceUrl
        )
        .limit(1);

    if (error) {
      throw error;
    }

    if (
      data &&
      data.length > 0
    ) {
      return true;
    }
  }

  return false;
}


/*
 * Demand database payload.
 */
function buildDemandPayload(
  lead: ProcessedLead
): Record<string, any> {
  const item: any = lead;

  return {
    type: "Demand",

    source:
      item.source,

    client_name:
      item.clientName,

    skill_needed:
      item.skill,

    description:
      item.description,

    contact_email:
      item.contactEmail || null,

    contact_phone:
      item.contactPhone || null,

    title:
      item.title,

    category:
      item.category || null,

    subcategory:
      item.subcategory || null,

    country:
      item.country,

    city:
      item.city || null,

    contact_name:
      item.contactName || null,

    source_url:
      item.sourceUrl,

    contact_url:
      item.contactUrl || null,

    status:
      "active",

    created_at:
      item.publishedAt ||
      item.createdAt,
  };
}


/*
 * Supply database payload.
 */
function buildSupplyPayload(
  lead: ProcessedLead
): Record<string, any> {
  const item: any = lead;

  return {
    source:
      item.source,

    name:
      item.name,

    company_name:
      item.companyName || null,

    description:
      item.description,

    position:
      item.position,

    job_title:
      item.title,

    required_skill:
      item.skill,

    category:
      item.category || null,

    subcategory:
      item.subcategory || null,

    country:
      item.country,

    city:
      item.city || null,

    contact_email:
      item.contactEmail || null,

    contact_phone:
      item.contactPhone || null,

    contact_name:
      item.contactName || null,

    apply_url:
      item.applicationUrl || null,

    source_url:
      item.sourceUrl,

    contact_url:
      item.contactUrl || null,

    niche:
      item.skill,

    status:
      "active",

    created_at:
      item.publishedAt ||
      item.createdAt,
  };
}


/*
 * SaaS database payload.
 */
function buildSaaSPayload(
  lead: ProcessedLead
): Record<string, any> {
  const item: any = lead;

  return {
    name:
      item.name,

    platform:
      item.platform,

    niche:
      item.niche,

    contact:
      item.contactUrl,

    status:
      "active",

    created_at:
      item.createdAt,

    description:
      item.description,

    trial_days:
      14,

    landing_url:
      APP_URL || null,

    source_url:
      item.sourceUrl,

    country:
      item.country,

    city:
      item.city || null,

    contact_url:
      item.contactUrl,
  };
}


/*
 * Insert one validated lead
 * into its correct table.
 */
async function insertProcessedLead(
  supabase: any,
  lead: ProcessedLead
): Promise<"inserted" | "duplicate"> {
  const item: any = lead;

  const type =
    item.type as LeadType;

  const exists =
    await leadAlreadyExists(
      supabase,
      type,
      lead
    );

  if (exists) {
    return "duplicate";
  }

  let table = "";
  let payload: Record<string, any> = {};

  if (type === "Demand") {
    table = "demand_leads";

    payload =
      buildDemandPayload(lead);
  } else if (type === "Supply") {
    table = "supply_leads";

    payload =
      buildSupplyPayload(lead);
  } else {
    table = "saas_leads";

    payload =
      buildSaaSPayload(lead);
  }

  const { error } =
    await supabase
      .from(table)
      .insert(payload);

  if (error) {
    throw error;
  }

  return "inserted";
}
  /*
 * Run one source safely.
 *
 * If a source fails, the other
 * sources can still continue.
 */
async function collectSourceSafely(
  sourceName: string,
  collector: () => Promise<SearchResult[]>
): Promise<{
  source: string;
  results: SearchResult[];
  error?: string;
}> {
  try {
    const results =
      await collector();

    return {
      source: sourceName,
      results: Array.isArray(results)
        ? results
        : [],
    };
  } catch (error: any) {
    return {
      source: sourceName,
      results: [],
      error:
        error?.message ||
        "Source collection failed",
    };
  }
}


/*
 * Collect from independent
 * sources for each lead type.
 */
async function collectAllSources() {
  const results =
    await Promise.all([
      // DEMAND SOURCES
      collectSourceSafely(
        "Reddit Demand",
        collectRedditDemand
      ),

      collectSourceSafely(
        "Serper Demand",
        collectSerperDemand
      ),

      // SUPPLY SOURCES
      collectSourceSafely(
        "RemoteOK",
        collectRemoteOK
      ),

      collectSourceSafely(
        "We Work Remotely",
        collectWWR
      ),

      collectSourceSafely(
        "Himalayas",
        collectHimalayas
      ),

      collectSourceSafely(
        "Jobicy",
        collectJobicy
      ),

      // SAAS SOURCES
      collectSourceSafely(
        "Professional Profiles",
        collectSaaSProfiles
      ),
    ]);

  return results;
}


/*
 * Process and insert all
 * collected leads.
 */
async function processCollectedLeads(
  supabase: any,
  results: SearchResult[],
  skills: SkillRow[]
) {
  const stats: any =
    emptyLeadStats();

  const inserted: any =
    emptyInsertedByType();

  const errors: string[] = [];

  const processedLeads:
    ProcessedLead[] = [];

  stats.total =
    results.length;

  /*
   * Remove repeated source URLs
   * before processing.
   */
  const uniqueResults =
    deduplicateResults(results);

  stats.duplicates =
    results.length -
    uniqueResults.length;

  /*
   * Validate every result.
   */
  for (const result of uniqueResults) {
    try {
      const lead =
        buildProcessedLead(
          result,
          skills
        );

      if (!lead) {
        stats.rejected++;

        const type =
          classifyLeadType(result);

        if (!type) {
          stats.wrongType++;
        } else if (
          !findMatchingSkill(
            resultText(result),
            skills
          )
        ) {
          stats.noSkill++;
        } else if (
          !isFresh(
            getResultDate(result)
          ) &&
          type !== "SaaS"
        ) {
          stats.stale++;
        } else {
          stats.noContact++;
        }

        continue;
      }

      processedLeads.push(lead);

      if (lead.type === "Demand") {
        stats.demand++;
      } else if (lead.type === "Supply") {
        stats.supply++;
      } else {
        stats.saas++;
      }
    } catch (error: any) {
      stats.errors++;

      errors.push(
        error?.message ||
        "Lead validation failed"
      );
    }
  }

  /*
   * Insert validated leads.
   *
   * One failed insertion does
   * not stop the remaining leads.
   */
  for (const lead of processedLeads) {
    try {
      const result =
        await insertProcessedLead(
          supabase,
          lead
        );

      if (result === "duplicate") {
        stats.duplicates++;
        continue;
      }

      if (lead.type === "Demand") {
        inserted.demand++;
      } else if (lead.type === "Supply") {
        inserted.supply++;
      } else {
        inserted.saas++;
      }

      inserted.total++;
    } catch (error: any) {
      stats.errors++;

      errors.push(
        `${lead.type}: ${
          error?.message ||
          "Database insertion failed"
        }`
      );
    }
  }

  return {
    stats,
    inserted,
    errors,
  };
}


/*
 * Vercel API handler.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  /*
   * Only POST requests
   * are allowed.
   */
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message:
        "Method not allowed. Use POST.",
    });
  }

  try {
    /*
     * Supabase configuration.
     */
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Supabase server configuration is missing.",
        requiredEnvironmentVariables: [
          "SUPABASE_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
        ],
      });
    }

    /*
     * Create Supabase client
     * with server credentials.
     */
    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * Load saved skills.
     */
    const {
      data: skillsData,
      error: skillsError,
    } = await supabase
      .from("skills")
      .select("*");

    if (skillsError) {
      throw new Error(
        "Could not load skills: " +
        skillsError.message
      );
    }

    const skills =
      (skillsData || []) as SkillRow[];

    if (skills.length === 0) {
      return res.status(200).json({
        success: true,
        message:
          "No saved skills found. Add skills before fetching leads.",
        skillsLoaded: 0,
        inserted: emptyInsertedByType(),
        stats: emptyLeadStats(),
      });
    }

    /*
     * Collect from all sources.
     */
    const sourceResults =
      await collectAllSources();

    const allResults:
      SearchResult[] = [];

    const sourceReport: Record<
      string,
      any
    > = {};

    for (const sourceResult of sourceResults) {
      sourceReport[
        sourceResult.source
      ] = {
        found:
          sourceResult.results.length,

        error:
          sourceResult.error || null,
      };

      allResults.push(
        ...sourceResult.results
      );
    }

    /*
     * Remove repeated results
     * across different sources.
     */
    const uniqueResults =
      deduplicateResults(allResults);

    /*
     * Validate and insert leads.
     */
    const outcome =
      await processCollectedLeads(
        supabase,
        uniqueResults,
        skills
      );

    /*
     * Return collection report.
     */
    return res.status(200).json({
      success: true,

      message:
        "Lead collection completed.",

      skillsLoaded:
        skills.length,

      sources:
        sourceReport,

      sourceResults:
        allResults.length,

      uniqueResults:
        uniqueResults.length,

      stats:
        outcome.stats,

      inserted:
        outcome.inserted,

      errors:
        outcome.errors.slice(0, 20),

      serperConfigured:
        Boolean(SERPER_API_KEY),

      timestamp:
        new Date().toISOString(),
    });

  } catch (error: any) {
    console.error(
      "Fetch leads error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Lead collection failed.",

      timestamp:
        new Date().toISOString(),
    });
  }
  }
