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
.replace(/<script[\s\S]?</script>/gi, " ")
.replace(/<style[\s\S]?</style>/gi, " ")
.replace(/<[^>]*>/g, " ")
.replace(/ /gi, " ")
.replace(/&/gi, "&")
.replace(/"/gi, '"')
.replace(/'/gi, "'")
.replace(/</gi, "<")
.replace(/>/gi, ">")
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
.replace(/^www./, "");
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
"text/html, application/rss+xml, application/atom+xml, application/json, text/xml, text/plain, /",
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
Invalid JSON returned by ${getHostname(url)}
);
}
}

function decodeRssValue(value: string): string {
return stripHtml(
value
.replace(/<!\(CDATA[([\s\S]*?)\)]>/g, "$1")
.replace(/&#x([0-9a-f]+);/gi, (, hex) =>
String.fromCodePoint(parseInt(hex, 16))
)
.replace(/&#(\d+);/g, (, number) =>
String.fromCodePoint(Number(number))
)
.replace(/'/gi, "'")
);
}

function readXmlTag(
block: string,
tag: string
): string {
const escaped = tag.replace(
/[.*+?^${}()|[]\]/g,
"\$&"
);

const match = block.match(
new RegExp(
<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>,
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
xml.match(/<item\b[\s\S]?</item>/gi) ||
xml.match(/<entry\b[\s\S]?</entry>/gi) ||
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
\\b${alias.replace(/\s+/g, "\\s+")}\\b,
"i"
);
if (expression.test(text)) {
return country;
}
}

for (const [city, country] of Object.entries(CITY_COUNTRY_MAP)) {
const cityExpr = new RegExp(
\\b${city.replace(/\s+/g, "\\s+")}\\b,
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
/\b(?:based in|located in|living in|from)\s+([A-Z][a-zA-Z .'-]{2,35})(?:,|||$)/i
);

if (!match) return "";
const possible = clean(match[1]);
if (getCountry(possible)) return "";

return possible;
  }
function isArticleOrPostUrl(url: string): boolean {
  const cleaned = cleanUrl(url);
  if (!cleaned) return true;

  try {
    const parsed = new URL(cleaned);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");

    if (
      BLOCKED_SOCIAL_ONLY_HOSTS.some(
        d => host === d || host.endsWith("." + d)
      )
    ) {
      return true;
    }

    // Reject obvious blog/news post URLs
    if (/\/(blog|post|posts|article|articles|news|202\d)\//i.test(path)) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

function isDirectExternalWebsiteOrBookingUrl(url: string): boolean {
  const cleaned = cleanUrl(url);
  if (!cleaned) return false;
  if (isArticleOrPostUrl(cleaned)) return false;

  const host = getHostname(cleaned);
  if (!host || !host.includes(".")) return false;

  return true;
}
function extractEmailOrExternalSiteFromBio(raw: string): {
  email: string;
  contactUrl: string;
} {
  const cleanHtml = raw.replace(/<[^>]+>/g, " ");

  const emailMatches =
    cleanHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const validEmail =
    emailMatches.find(
      e =>
        !/noreply|no-reply|example\.com|sentry|wixpress|wordpress|medium\.com|w3\.org/i.test(
          e
        )
    ) || "";

  // Match full URLs AND bare domains in Bluesky bios (e.g. "janedoe.com" or "calendly.com/jane")
  const explicitUrls = raw.match(/https?:\/\/[^\s<>"')\\]+/gi) || [];
  const bareDomains =
    cleanHtml.match(
      /(?:^|\s)((?:[a-z0-9-]+\.)+(?:com|org|net|io|co|me|edu|uk|ca|au|de|fr|in|pk|us|info|biz|ai|app|site|online|coach|academy|tutor|studio)(?:\/[^\s<>"')]*)?)/gi
    ) || [];

  const candidates = [
    ...explicitUrls,
    ...bareDomains.map(d => `https://${d.trim().replace(/^\/+/, "")}`)
  ];

  let bestUrl = "";
  for (const candidate of candidates) {
    const cleaned = cleanUrl(candidate.replace(/[.,;!?]+$/, ""));
    if (!cleaned || isBlockedDomain(cleaned)) continue;

    if (isDirectExternalWebsiteOrBookingUrl(cleaned)) {
      bestUrl = cleaned;
      break;
    }
  }

  return {
    email: clean(validEmail),
    contactUrl: bestUrl
  };
}

async function collectMastodonDirectBioLeads(
  role: SaasRole,
  sourceName: string
): Promise<SearchResult[]> {
  const roleRegex: Record<SaasRole, RegExp> = {
    teacher: /\b(teacher|tutor|educator|instructor|teaching|tutoring|lessons|esl)\b/i,
    freelancer: /\b(freelance|freelancer|writer|designer|editor|copywriter|translator|consultant)\b/i,
    coach: /\b(coach|coaching|mentor|mentorship)\b/i
  };

  const instances = [
    "https://mastodon.social",
    "https://mas.to",
    "https://mstdn.social"
  ];

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  const batches = await Promise.all(
    instances.map(async instance => {
      try {
        const accounts = await fetchJson(
          `${instance}/api/v1/directory?local=false&order=active&limit=40`
        );
        return Array.isArray(accounts) ? accounts : [];
      } catch (error) {
        console.error(`[${sourceName}] Mastodon directory failed:`, instance, error);
        return [];
      }
    })
  );

  for (const account of batches.flat()) {
    const displayName = clean(account?.display_name || account?.username || "");
    const noteHtml = String(account?.note || "");
    const fieldsText = Array.isArray(account?.fields)
      ? account.fields
          .map((f: any) => `${f?.name || ""} ${f?.value || ""}`)
          .join(" ")
      : "";
    const combinedBio = `${noteHtml} ${fieldsText}`;
    const cleanBio = clean(combinedBio.replace(/<[^>]+>/g, " "));

    if (!cleanBio || !isRealPersonName(displayName)) continue;
    if (!roleRegex[role].test(cleanBio)) continue;

    const extracted = extractEmailOrExternalSiteFromBio(combinedBio);
    if (!extracted.email && !extracted.contactUrl) continue;

    const key = (extracted.email || extracted.contactUrl).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      title: `${displayName} — ${cleanBio.slice(0, 80)}`,
      link: extracted.contactUrl || `mailto:${extracted.email}`,
      sourceUrl: extracted.contactUrl || `mailto:${extracted.email}`,
      contactUrl: extracted.contactUrl,
      email: extracted.email,
      author: displayName,
      country: getCountry(cleanBio) || "Remote / Global",
      description: cleanBio,
      snippet: cleanBio,
      source: sourceName,
      sourceType: "social-profile",
      saasRole: role
    });
  }

  return results;
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
name: "DevTo & Medium SaaS Teachers",
category: "SaaS",
collect: collectBingSaaSTeachers
},
{
name: "DevTo & Medium SaaS Freelancers",
category: "SaaS",
collect: collectBingSaaSFreelancers
},
{
name: "DevTo & Medium SaaS Coaches",
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
Unable to load skills: ${error.message}
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
  contact: lead.contactUrl,  
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
[${table}] Insert failed:,
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
