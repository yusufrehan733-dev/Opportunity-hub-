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

const APP_URL =
  process.env.APP_URL ||
  "https://opportunity-hub-umber.vercel.app";

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
  "independent professional",
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

const SAAS_SOURCE_DOMAINS = [
  "linkedin.com/in/",
  "instagram.com/",
  "facebook.com/",
  "github.com/",
  "behance.net/",
  "dribbble.com/",
  "mastodon.social/",
  "reddit.com/user/"
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

const SOCIAL_DOMAINS = [
  "linkedin.com",
  "instagram.com",
  "facebook.com",
  "github.com",
  "behance.net",
  "dribbble.com",
  "reddit.com",
  "mastodon.social",
  "x.com",
  "twitter.com"
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
function clean(value: unknown): string {
  if (value === null || value === undefined) {
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
    normalized.includes(normalizeText(term))
  );
}

function stripHtml(value: unknown): string {
  return clean(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">"));
}

function cleanUrl(value: unknown): string {
  const raw = clean(value);

  if (!raw) return "";

  try {
    const url = new URL(raw);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:" &&
      url.protocol !== "mailto:"
    ) {
      return "";
    }

    if (url.protocol === "mailto:") {
      return raw;
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
  value: string
): boolean {
  return containsAny(value, BLOCKED_TERMS);
}

function safeDate(value: unknown): Date | null {
  const raw = clean(value);

  if (!raw) return null;

  const parsed = new Date(raw);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const relative = raw.toLowerCase();

  const now = new Date();

  const match = relative.match(
    /(\d+)\s*(minute|minutes|min|hour|hours|day|days|week|weeks)\s*ago/
  );

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];

  if (unit.startsWith("minute") || unit === "min") {
    now.setMinutes(now.getMinutes() - amount);
  } else if (unit.startsWith("hour")) {
    now.setHours(now.getHours() - amount);
  } else if (unit.startsWith("day")) {
    now.setDate(now.getDate() - amount);
  } else if (unit.startsWith("week")) {
    now.setDate(now.getDate() - amount * 7);
  }

  return now;
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

async function fetchJson(
  url: string
): Promise<any> {
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
        "Accept": "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status}`
      );
    }

    return await response.json();
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
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/xml, text/xml, text/plain, */*"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status}`
      );
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function makeSearchResult(
  values: Partial<SearchResult>
): SearchResult | null {
  const title = clean(values.title);
  const link = cleanUrl(values.link);

  if (!title || !link) {
    return null;
  }

  return {
    title,
    link,
    description: clean(values.description),
    snippet: clean(values.snippet),
    author: clean(values.author),
    company: clean(values.company),
    location: clean(values.location),
    country: clean(values.country),
    publishedAt: clean(values.publishedAt),
    sourceType: clean(values.sourceType) || "Unknown",
    contactUrl: cleanUrl(values.contactUrl),
    applicationUrl: cleanUrl(values.applicationUrl)
  };
}

function decodeRssValue(value: string): string {
  return stripHtml(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_match, code) =>
        String.fromCharCode(Number(code))
      )
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

function parseRssFeed(
  xml: string,
  sourceType: string
): SearchResult[] {
  const blocks =
    xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];

  const results: SearchResult[] = [];

  for (const block of blocks) {
    const title =
      readXmlTag(block, "title");

    const description =
      readXmlTag(block, "description") ||
      readXmlTag(block, "summary") ||
      readXmlTag(block, "content");

    const author =
      readXmlTag(block, "author") ||
      readXmlTag(block, "dc:creator");

    const publishedAt =
      readXmlTag(block, "pubDate") ||
      readXmlTag(block, "published") ||
      readXmlTag(block, "updated");

    let link =
      readXmlTag(block, "link");

    if (!link) {
      const linkMatch = block.match(
        /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i
      );

      link = linkMatch?.[1] || "";
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

  return results;
}

async function collectRssUrl(
  url: string,
  sourceType: string
): Promise<SearchResult[]> {
  const xml = await fetchText(url);

  return parseRssFeed(
    xml,
    sourceType
  ).slice(0, MAX_RESULTS_PER_SOURCE);
}

function redditSearchUrl(
  query: string
): string {
  return (
    "https://www.reddit.com/search.rss" +
    `?q=${encodeURIComponent(query)}` +
    "&sort=new&t=month"
  );
}

async function collectRedditSearch(
  url: string,
  sourceType: string
): Promise<SearchResult[]> {
  const xml = await fetchText(url);

  return parseRssFeed(
    xml,
    sourceType
  ).slice(0, MAX_RESULTS_PER_SOURCE);
}

async function collectRedditDemand(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (const query of DEMAND_QUERIES) {
    try {
      const items = await collectRedditSearch(
        redditSearchUrl(query),
        "Reddit"
      );

      results.push(...items);
    } catch {
      continue;
    }
  }

  return results;
}
async function collectHackerNewsDemand(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  const queries = [
    "looking for a tutor",
    "need a freelancer",
    "looking for a designer",
    "need a developer",
    "looking for a coach"
  ];

  for (const query of queries) {
    try {
      const url =
        "https://hn.algolia.com/api/v1/search_by_date" +
        `?query=${encodeURIComponent(query)}` +
        "&tags=story&hitsPerPage=25";

      const data: any = await fetchJson(url);

      for (const hit of data?.hits || []) {
        const title = clean(hit.title || "");
        const description = clean(
          stripHtml(hit.story_text || "")
        );

        const link =
          cleanUrl(hit.url) ||
          `https://news.ycombinator.com/item?id=${hit.objectID}`;

        if (!title && !description) continue;

        const result = makeSearchResult({
          title,
          link,
          description,
          author: hit.author || "",
          publishedAt: hit.created_at || "",
          sourceType: "Hacker News"
        });

        if (result) results.push(result);
      }
    } catch {
      continue;
    }
  }

  return results;
}

async function collectRemoteOK(): Promise<SearchResult[]> {
  try {
    const data: any = await fetchJson(
      "https://remoteok.com/api"
    );

    const jobs = Array.isArray(data)
      ? data.filter((item: any) => item && item.id)
      : [];

    return jobs.slice(0, MAX_RESULTS_PER_SOURCE).map(
      (job: any): SearchResult | null =>
        makeSearchResult({
          title: job.position || job.title || "",
          link:
            job.url ||
            `https://remoteok.com/remote-jobs/${job.id}`,
          description: stripHtml(job.description || ""),
          company: job.company || "",
          location: job.location || "Remote",
          country: job.location || "",
          publishedAt: job.date || "",
          sourceType: "RemoteOK",
          applicationUrl: job.apply_url || job.url || ""
        })
    ).filter(
      (item: SearchResult | null): item is SearchResult =>
        item !== null
    );
  } catch {
    return [];
  }
}

async function collectWeWorkRemotely(): Promise<SearchResult[]> {
  const feeds = [
    "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-design-jobs.rss",
    "https://weworkremotely.com/categories/remote-teaching-jobs.rss",
    "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",
    "https://weworkremotely.com/categories/remote-customer-support-jobs.rss"
  ];

  const results: SearchResult[] = [];

  for (const feed of feeds) {
    try {
      results.push(
        ...await collectRssUrl(feed, "We Work Remotely")
      );
    } catch {
      continue;
    }
  }

  return results;
}

async function collectHimalayas(): Promise<SearchResult[]> {
  try {
    const data: any = await fetchJson(
      "https://himalayas.app/jobs/api?limit=50"
    );

    const jobs = Array.isArray(data)
      ? data
      : Array.isArray(data?.jobs)
        ? data.jobs
        : [];

    return jobs.slice(0, MAX_RESULTS_PER_SOURCE).map(
      (job: any): SearchResult | null =>
        makeSearchResult({
          title: job.title || job.position || "",
          link:
            job.applicationLink ||
            job.url ||
            job.jobUrl ||
            "",
          description: stripHtml(
            job.description || job.excerpt || ""
          ),
          company: job.companyName || job.company || "",
          location: job.location || "Remote",
          country: job.location || "",
          publishedAt:
            job.pubDate ||
            job.publishedAt ||
            job.createdAt ||
            "",
          sourceType: "Himalayas",
          applicationUrl:
            job.applicationLink || job.url || ""
        })
    ).filter(
      (item: SearchResult | null): item is SearchResult =>
        item !== null
    );
  } catch {
    return [];
  }
}

async function collectJobicy(): Promise<SearchResult[]> {
  try {
    const data: any = await fetchJson(
      "https://jobicy.com/api/v2/remote-jobs?count=50"
    );

    const jobs = Array.isArray(data?.jobs)
      ? data.jobs
      : [];

    return jobs.slice(0, MAX_RESULTS_PER_SOURCE).map(
      (job: any): SearchResult | null =>
        makeSearchResult({
          title: job.jobTitle || "",
          link: job.url || job.jobUrl || "",
          description: stripHtml(
            job.jobDescription || ""
          ),
          company: job.companyName || "",
          location: job.jobGeo || "Remote",
          country: job.jobGeo || "",
          publishedAt: job.pubDate || "",
          sourceType: "Jobicy",
          applicationUrl: job.url || job.jobUrl || ""
        })
    ).filter(
      (item: SearchResult | null): item is SearchResult =>
        item !== null
    );
  } catch {
    return [];
  }
}

async function collectRemotive(): Promise<SearchResult[]> {
  try {
    const data: any = await fetchJson(
      "https://remotive.com/api/remote-jobs?limit=50"
    );

    const jobs = Array.isArray(data?.jobs)
      ? data.jobs
      : [];

    return jobs.slice(0, MAX_RESULTS_PER_SOURCE).map(
      (job: any): SearchResult | null =>
        makeSearchResult({
          title: job.title || "",
          link: job.url || "",
          description: stripHtml(
            job.description || ""
          ),
          company: job.company_name || "",
          location:
            job.candidate_required_location || "Remote",
          country: job.candidate_required_location || "",
          publishedAt: job.publication_date || "",
          sourceType: "Remotive",
          applicationUrl: job.url || ""
        })
    ).filter(
      (item: SearchResult | null): item is SearchResult =>
        item !== null
    );
  } catch {
    return [];
  }
}

async function collectGithubProfessionals(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  const queries = [
    "teacher",
    "tutor",
    "coach",
    "freelancer",
    "designer",
    "developer",
    "consultant",
    "educator"
  ];

  for (const query of queries) {
    try {
      const url =
        "https://api.github.com/search/users" +
        `?q=${encodeURIComponent(query)}+in:bio` +
        "&per_page=20";

      const data: any = await fetchJson(url);

      for (const user of data?.items || []) {
        if (!user.login) continue;

        try {
          const profile: any = await fetchJson(
            `https://api.github.com/users/${encodeURIComponent(user.login)}`
          );

          const bioText = clean(profile.bio || "");
          const blog = cleanUrl(profile.blog || "");
          const email = clean(profile.email || "");
          const profileUrl = cleanUrl(profile.html_url);

          if (!profileUrl) continue;

          if (
            !containsAny(
              normalizeText(bioText),
              PROFESSIONAL_TERMS
            )
          ) {
            continue;
          }

          const result = makeSearchResult({
            title: `${profile.name || user.login} — ${bioText}`,
            link: profileUrl,
            description: `${bioText} ${profile.location || ""}`,
            author: profile.name || user.login,
            location: profile.location || "",
            country: profile.location || "",
            sourceType: "GitHub",
            contactUrl:
              blog ||
              (email ? `mailto:${email}` : profileUrl)
          });

          if (result) results.push(result);
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  return results;
}

async function collectRedditSaaS(): Promise<SearchResult[]> {
  const queries = [
    "teacher portfolio",
    "online tutor profile",
    "freelance designer portfolio",
    "independent business coach",
    "freelance developer portfolio",
    "consultant services"
  ];

  const results: SearchResult[] = [];

  for (const query of queries) {
    try {
      const items = await collectRedditSearch(
        redditSearchUrl(query),
        "Reddit"
      );

      for (const item of items) {
        const author = clean(item.author || "");

        if (!author) continue;

        const result = makeSearchResult({
          ...item,
          contactUrl:
            `https://www.reddit.com/user/${encodeURIComponent(author)}/`
        });

        if (result) results.push(result);
      }
    } catch {
      continue;
    }
  }

  return results;
}

async function collectDevCommunitySaaS(): Promise<SearchResult[]> {
  const feeds = [
    "https://dev.to/feed/tag/freelance",
    "https://dev.to/feed/tag/design",
    "https://dev.to/feed/tag/consulting",
    "https://dev.to/feed/tag/education"
  ];

  const results: SearchResult[] = [];

  for (const feed of feeds) {
    try {
      results.push(
        ...await collectRssUrl(feed, "DEV Community")
      );
    } catch {
      continue;
    }
  }

  return results;
}

async function collectMastodonProfessionals(): Promise<SearchResult[]> {
  const tags = [
    "freelancer",
    "teacher",
    "tutor",
    "coach",
    "designer",
    "consultant"
  ];

  const results: SearchResult[] = [];

  for (const tag of tags) {
    try {
      const feed =
        `https://mastodon.social/tags/${encodeURIComponent(tag)}.rss`;

      results.push(
        ...await collectRssUrl(feed, "Mastodon")
      );
    } catch {
      continue;
    }
  }

  return results;
  }
  
function getCombinedText(
  result: SearchResult
): string {
  return normalizeText([
    result.title,
    result.description,
    result.snippet,
    result.author,
    result.company,
    result.location
  ].filter(Boolean).join(" "));
}

function getLeadType(
  result: SearchResult
): LeadType | null {
  const text = getCombinedText(result);

  if (!text || containsBlockedContent(text)) {
    return null;
  }

  const hasDemandIntent =
    containsAny(text, DEMAND_INTENT_TERMS);

  const hasDemandReject =
    containsAny(text, DEMAND_REJECT_TERMS);

  const hasSupplyIntent =
    containsAny(text, SUPPLY_INTENT_TERMS);

  if (hasDemandIntent && !hasDemandReject) {
    return "Demand";
  }

  if (hasSupplyIntent) {
    return "Supply";
  }

  if (
    containsAny(text, PROFESSIONAL_TERMS) &&
    (
      result.sourceType === "GitHub" ||
      result.sourceType === "Mastodon" ||
      result.sourceType === "DEV Community" ||
      result.sourceType === "Reddit"
    )
  ) {
    return "SaaS";
  }

  return null;
}

function getSkill(
  result: SearchResult
): string {
  const text = getCombinedText(result);

  const skills = [
    "Quran teaching",
    "Arabic teaching",
    "English teaching",
    "language teaching",
    "math tutoring",
    "science tutoring",
    "online tutoring",
    "teaching",
    "tutoring",
    "business coaching",
    "career coaching",
    "life coaching",
    "graphic design",
    "web design",
    "UI/UX design",
    "web development",
    "software development",
    "app development",
    "digital marketing",
    "content writing",
    "copywriting",
    "video editing",
    "photography",
    "consulting",
    "accounting",
    "virtual assistance",
    "translation",
    "freelancing",
    "design",
    "development",
    "coaching",
    "marketing"
  ];

  const match = skills.find(skill =>
    text.includes(normalizeText(skill))
  );

  return match || "";
}

function getContactUrl(
  result: SearchResult
): string {
  const explicitContact =
    cleanUrl(result.contactUrl);

  if (explicitContact) {
    return explicitContact;
  }

  const applicationUrl =
    cleanUrl(result.applicationUrl);

  if (
    applicationUrl &&
    result.sourceType !== "Reddit"
  ) {
    return applicationUrl;
  }

  const sourceUrl = cleanUrl(result.link);

  if (!sourceUrl) return "";

  const hostname = getHostname(sourceUrl);

  if (
    hostname === "linkedin.com" ||
    hostname.endsWith(".linkedin.com") ||
    hostname === "instagram.com" ||
    hostname.endsWith(".instagram.com") ||
    hostname === "facebook.com" ||
    hostname.endsWith(".facebook.com") ||
    hostname === "github.com" ||
    hostname.endsWith(".github.com") ||
    hostname === "behance.net" ||
    hostname.endsWith(".behance.net") ||
    hostname === "dribbble.com" ||
    hostname.endsWith(".dribbble.com") ||
    hostname === "mastodon.social" ||
    hostname === "reddit.com" ||
    hostname.endsWith(".reddit.com")
  ) {
    return sourceUrl;
  }

  return "";
}

function hasRealContact(
  result: SearchResult,
  type: LeadType
): boolean {
  const contactUrl = getContactUrl(result);

  if (!contactUrl) return false;

  if (contactUrl.startsWith("mailto:")) {
    return true;
  }

  const hostname = getHostname(contactUrl);

  if (!hostname || isBlockedDomain(contactUrl)) {
    return false;
  }

  if (type === "Supply") {
    return Boolean(
      cleanUrl(result.applicationUrl) ||
      containsAny(
        normalizeText(contactUrl),
        CONTACT_PATH_TERMS
      )
    );
  }

  if (type === "Demand") {
    return (
      contactUrl !== cleanUrl(result.link) ||
      hostname === "reddit.com" ||
      hostname.endsWith(".reddit.com") ||
      hostname === "facebook.com" ||
      hostname.endsWith(".facebook.com") ||
      hostname === "instagram.com" ||
      hostname.endsWith(".instagram.com") ||
      hostname === "linkedin.com" ||
      hostname.endsWith(".linkedin.com")
    );
  }

  return (
    hostname === "linkedin.com" ||
    hostname.endsWith(".linkedin.com") ||
    hostname === "instagram.com" ||
    hostname.endsWith(".instagram.com") ||
    hostname === "facebook.com" ||
    hostname.endsWith(".facebook.com") ||
    hostname === "github.com" ||
    hostname.endsWith(".github.com") ||
    hostname === "behance.net" ||
    hostname.endsWith(".behance.net") ||
    hostname === "dribbble.com" ||
    hostname.endsWith(".dribbble.com") ||
    hostname === "mastodon.social" ||
    hostname === "reddit.com" ||
    hostname.endsWith(".reddit.com") ||
    containsAny(
      normalizeText(contactUrl),
      CONTACT_PATH_TERMS
    )
  );
}

function getCountry(
  result: SearchResult
): string {
  const value = clean(
    result.country || result.location
  );

  if (!value) return "";

  const parts = value.split(",");

  return clean(parts[parts.length - 1]);
}

function getCity(
  result: SearchResult
): string {
  const value = clean(result.location);

  if (!value) return "";

  const parts = value.split(",");

  return parts.length > 1
    ? clean(parts[0])
    : "";
}

function getContactName(
  result: SearchResult
): string {
  return clean(
    result.author ||
    result.company ||
    ""
  );
}

function isValidSearchResult(
  result: SearchResult
): boolean {
  const link = cleanUrl(result.link);

  if (!link || isBlockedDomain(link)) {
    return false;
  }

  const text = getCombinedText(result);

  if (!text || containsBlockedContent(text)) {
    return false;
  }

  return Boolean(
    clean(result.title) ||
    clean(result.description)
  );
}

function deduplicateResults(
  results: SearchResult[]
): SearchResult[] {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const result of results) {
    const link = cleanUrl(result.link);

    if (!link) continue;

    const key = link.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(result);
  }

  return unique;
  }
  
function matchSkill(
  result: SearchResult,
  skills: SkillRow[]
): SkillRow | null {
  const text = getCombinedText(result);

  const detectedSkill = normalizeText(
    getSkill(result)
  );

  if (!detectedSkill) return null;

  const exactMatch = skills.find(skill => {
    const names = [
      skill.name,
      ...(skill.tags || [])
    ].map(normalizeText);

    return names.some(name =>
      name &&
      (
        name === detectedSkill ||
        text.includes(name)
      )
    );
  });

  if (exactMatch) return exactMatch;

  const partialMatch = skills.find(skill => {
    const names = [
      skill.name,
      ...(skill.tags || [])
    ].map(normalizeText);

    return names.some(name =>
      name &&
      (
        name.includes(detectedSkill) ||
        detectedSkill.includes(name)
      )
    );
  });

  return partialMatch || null;
}

function buildProcessedLead(
  result: SearchResult,
  type: LeadType,
  skillRow: SkillRow
): ProcessedLead | null {
  const sourceUrl = cleanUrl(result.link);
  const contactUrl = getContactUrl(result);

  if (!sourceUrl || !contactUrl) {
    return null;
  }

  const title = clean(result.title);
  const description = clean(
    result.description || result.snippet || ""
  );

  const skill = clean(skillRow.name);

  if (!title || !skill) {
    return null;
  }

  const publishedDate =
    safeDate(result.publishedAt);

  if (!publishedDate) {
    return null;
  }

  const createdAt =
    publishedDate.toISOString();

  const contactName =
    getContactName(result);

  const companyName =
    clean(result.company || "");

  const name =
    contactName ||
    companyName ||
    title;

  const position =
    type === "Supply"
      ? title
      : "";

  return {
    type,
    source: clean(result.sourceType),
    sourceUrl,
    contactUrl,
    title,
    description,
    skill,
    category: clean(skillRow.category),
    subcategory: clean(skillRow.subcategory),
    country: getCountry(result),
    city: getCity(result),
    contactEmail: "",
    contactPhone: "",
    contactName,
    applicationUrl:
      cleanUrl(result.applicationUrl) ||
      (type === "Supply" ? contactUrl : ""),
    platform: clean(result.sourceType),
    niche: skill,
    name,
    clientName:
      type === "Demand" ? name : "",
    companyName,
    position,
    publishedAt: createdAt,
    createdAt
  };
}

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
    errors: 0
  };
}

function emptyInsertedByType(): InsertedByType {
  return {
    demand: 0,
    supply: 0,
    saas: 0,
    total: 0
  };
}

function incrementLeadType(
  counts: InsertedByType,
  type: LeadType
): void {
  if (type === "Demand") {
    counts.demand += 1;
  } else if (type === "Supply") {
    counts.supply += 1;
  } else {
    counts.saas += 1;
  }

  counts.total += 1;
}
function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

async function loadSkills(
  supabase: ReturnType<typeof createClient>
): Promise<SkillRow[]> {
  const { data, error } = await supabase
    .from("skills")
    .select("id,name,category,subcategory,tags");

  if (error) {
    throw new Error(
      `Unable to load skills: ${error.message}`
    );
  }
  return (data || []).map((row: any) => ({
    id: clean(row.id),
    name: clean(row.name),
    category: row.category
      ? clean(row.category)
      : null,
    subcategory: row.subcategory
      ? clean(row.subcategory)
      : null,
    tags: Array.isArray(row.tags)
      ? row.tags.map(clean).filter(Boolean)
      : []
  })).filter((skill: SkillRow) => skill.name);
  }
async function leadAlreadyExists(
  supabase: ReturnType<typeof createClient>,
  table: string,
  sourceUrl: string,
  contactUrl: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .or(
      `source_url.eq.${sourceUrl},contact_url.eq.${contactUrl}`
    )
    .limit(1);

  if (error) {
    throw new Error(
      `Duplicate check failed for ${table}: ${error.message}`
    );
  }

  return Boolean(data && data.length > 0);
}
async function insertProcessedLead(
  supabase: ReturnType<typeof createClient>,
  lead: ProcessedLead
): Promise<boolean> {
  let table = "";
  let record: Record<string, any> = {};

  if (lead.type === "Demand") {
    table = "demand_leads";

    record = {
      type: "Demand",
      source: lead.source,
      client_name: lead.clientName,
      skill_needed: lead.skill,
      description: lead.description,
      contact_email: lead.contactEmail || null,
      contact_phone: lead.contactPhone || null,
      created_at: lead.createdAt,
      status: "active",
      title: lead.title,
      category: lead.category || null,
      subcategory: lead.subcategory || null,
      country: lead.country || null,
      city: lead.city || null,
      content: lead.description,
      name: lead.name,
      contact_url: lead.contactUrl,
      source_url: lead.sourceUrl
    };
  } else if (lead.type === "Supply") {
    table = "supply_leads";

    record = {
      company_name: lead.companyName || null,
      description: lead.description,
      position: lead.position,
      required_skill: lead.skill,
      category: lead.category || null,
      subcategory: lead.subcategory || null,
      country: lead.country || null,
      city: lead.city || null,
      created_at: lead.createdAt,
      job_title: lead.title,
      company_website: null,
      apply_url: lead.applicationUrl || lead.contactUrl,
      source: lead.source,
      status: "active",
      source_url: lead.sourceUrl,
      contact_url: lead.contactUrl,
      contact_name: lead.contactName || null,
      contact: lead.contactUrl,
      name: lead.name,
      niche: lead.niche
    };
  } else {
    table = "saas_leads";

    record = {
      name: lead.name,
      platform: lead.platform,
      niche: lead.niche,
      contact: lead.contactUrl,
      status: "active",
      created_at: lead.createdAt,
      description: lead.description,
      source_url: lead.sourceUrl,
      contact_url: lead.contactUrl,
      country: lead.country || null,
      city: lead.city || null
    };
  }
  const exists = await leadAlreadyExists(
    supabase,
    table,
    lead.sourceUrl,
    lead.contactUrl
  );

  if (exists) {
    return false;
  }

  const { error } = await supabase
    .from(table)
    .insert(record);

  if (error) {
    throw new Error(
      `Insert failed for ${table}: ${error.message}`
    );
  }

  return true;
}
async function collectAllSources(): Promise<{
  demand: SearchResult[];
  supply: SearchResult[];
  saas: SearchResult[];
}> {
  const [
    redditDemand,
    hackerNewsDemand,
    remoteOK,
    weWorkRemotely,
    himalayas,
    jobicy,
    remotive,
    githubProfessionals,
    redditSaaS,
    devCommunitySaaS,
    mastodonProfessionals
  ] = await Promise.all([
    collectRedditDemand(),
    collectHackerNewsDemand(),
    collectRemoteOK(),
    collectWeWorkRemotely(),
    collectHimalayas(),
    collectJobicy(),
    collectRemotive(),
    collectGithubProfessionals(),
    collectRedditSaaS(),
    collectDevCommunitySaaS(),
    collectMastodonProfessionals()
  ]);

  return {
    demand: [
      ...redditDemand,
      ...hackerNewsDemand
    ],
    supply: [
      ...remoteOK,
      ...weWorkRemotely,
      ...himalayas,
      ...jobicy,
      ...remotive
    ],
    saas: [
      ...githubProfessionals,
      ...redditSaaS,
      ...devCommunitySaaS,
      ...mastodonProfessionals
    ]
  };
}

function getExpectedType(
  sourceGroup: "demand" | "supply" | "saas"
): LeadType {
  if (sourceGroup === "demand") {
    return "Demand";
  }

  if (sourceGroup === "supply") {
    return "Supply";
  }

  return "SaaS";
        }
async function processSourceGroup(
  supabase: ReturnType<typeof createClient>,
  results: SearchResult[],
  expectedType: LeadType,
  skills: SkillRow[],
  stats: LeadStats,
  inserted: InsertedByType
): Promise<void> {
  const uniqueResults =
    deduplicateResults(results);

  for (const result of uniqueResults) {
    try {
      if (!isValidSearchResult(result)) {
        stats.rejected += 1;
        continue;
      }

      const detectedType =
        getLeadType(result);

      if (
        !detectedType ||
        detectedType !== expectedType
      ) {
        stats.wrongType += 1;
        continue;
      }

      if (
        expectedType !== "SaaS" &&
        !isFresh(result.publishedAt)
      ) {
        stats.stale += 1;
        continue;
      }

      const skillRow =
        matchSkill(result, skills);

      if (!skillRow) {
        stats.noSkill += 1;
        continue;
      }

      if (
        !hasRealContact(result, expectedType)
      ) {
        stats.noContact += 1;
        continue;
      }

      const lead = buildProcessedLead(
        result,
        expectedType,
        skillRow
      );

      if (!lead) {
        stats.rejected += 1;
        continue;
      }

      const wasInserted =
        await insertProcessedLead(
          supabase,
          lead
        );

      if (wasInserted) {
        incrementLeadType(
          inserted,
          expectedType
        );

        stats.total += 1;

        if (expectedType === "Demand") {
          stats.demand += 1;
        } else if (expectedType === "Supply") {
          stats.supply += 1;
        } else {
          stats.saas += 1;
        }
      } else {
        stats.duplicates += 1;
      }
    } catch {
      stats.errors += 1;
    }
  }
}

async function runLeadCollection(): Promise<{
  success: boolean;
  stats: LeadStats;
  inserted: InsertedByType;
  message: string;
}> {
  const stats = emptyLeadStats();
  const inserted = emptyInsertedByType();

  const supabase = getSupabaseClient();

  const skills = await loadSkills(supabase);

  if (!skills.length) {
    throw new Error(
      "No skills were found in the skills table."
    );
  }

  const sources = await collectAllSources();

  await processSourceGroup(
    supabase,
    sources.demand,
    "Demand",
    skills,
    stats,
    inserted
  );

  await processSourceGroup(
    supabase,
    sources.supply,
    "Supply",
    skills,
    stats,
    inserted
  );

  await processSourceGroup(
    supabase,
    sources.saas,
    "SaaS",
    skills,
    stats,
    inserted
  );

  return {
    success: true,
    stats,
    inserted,
    message:
      `Collection completed. Added ${inserted.total} new leads.`
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
    const result =
      await runLeadCollection();

    return res.status(200).json(result);
  } catch (error: any) {
    const message =
      clean(error?.message) ||
      "Lead collection failed.";

    return res.status(500).json({
      success: false,
      message
    });
  }
    }
