import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type LeadType = "Demand" | "Supply" | "SaaS";
type SaasRole = "teacher" | "freelancer" | "coach";

interface SearchResult {
  title: string;
  link: string;
  sourceUrl?: string;
  contactUrl?: string;
  email?: string;
  author?: string;
  country?: string;
  description?: string;
  snippet?: string;
  source: string;
  sourceType?: string;
  searchQuery?: string;
  publishedAt?: string;
  saasRole?: SaasRole;
}

interface ProcessedLead {
  lead_type: LeadType;
  title: string;
  description: string;
  skill_needed: string;
  niche: string;
  country: string;
  budget_range: string;
  salary_range: string;
  contact_email: string;
  contact_url: string;
  source: string;
  source_url: string;
  published_at: string;
  status: string;
  tags: string[];
  raw_data: Record<string, string>;
}

const REQUEST_TIMEOUT_MS = 9000;
const MAX_RESULTS_PER_SOURCE = 25;
const MAX_INSERT_PER_RUN = 120;
const MAX_DEMAND_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; OpportunityHubBot/1.0; +https://opportunity-hub-umber.vercel.app)";

const DEMAND_TEACHER_QUERIES = [
  "looking for quran tutor",
  "need quran teacher",
  "looking for tajweed teacher",
  "looking for arabic tutor",
  "need arabic teacher",
  "looking for math tutor",
  "looking for english tutor",
  "need online tutor"
];

const DEMAND_COACH_QUERIES = [
  "looking for career coach",
  "need business coach",
  "looking for life coach",
  "need executive coach",
  "looking for interview coach"
];

const DEMAND_TRANSLATION_WRITING_LEGAL_QUERIES = [
  "arabic translator",
  "arabic translation",
  "english to arabic translation",
  "arabic writer",
  "looking for freelance writer",
  "need content writer",
  "need copywriter",
  "need editor",
  "legal translation",
  "arabic legal translator",
  "contract review",
  "legal writer"
];
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

function clean(value: unknown): string {
  const raw = String(value ?? "");
  let out = "";
  let inWhitespace = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const code = ch.charCodeAt(0);
    const isSpace =
      ch === " " ||
      ch === "\n" ||
      ch === "\r" ||
      ch === "\t" ||
      code === 160;

    if (isSpace) {
      if (!inWhitespace) {
        out += " ";
        inWhitespace = true;
      }
    } else {
      out += ch;
      inWhitespace = false;
    }
  }

  return out.trim();
}

function decodeEntities(text: string): string {
  return String(text ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function stripAllTags(input: string): string {
  const raw = decodeEntities(String(input ?? ""));
  let out = "";
  let inTag = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "<") {
      inTag = true;
      out += " ";
    } else if (ch === ">") {
      inTag = false;
      out += " ";
    } else if (!inTag) {
      out += ch;
    }
  }

  return clean(out);
}

function cleanUrl(rawUrl: string): string {
  const trimmed = clean(rawUrl);
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("mailto:")) {
    return "mailto:" + clean(trimmed.slice(7));
  }

  let candidate = trimmed;
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    candidate = "https://" + trimmed;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function isValidDirectEmail(email: string): boolean {
  const val = clean(email).toLowerCase();
  const atIndex = val.indexOf("@");
  if (atIndex <= 0 || atIndex !== val.lastIndexOf("@")) return false;

  const local = val.slice(0, atIndex);
  const domain = val.slice(atIndex + 1);
  if (!local || !domain || !domain.includes(".")) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;
  return true;
}

function isParkedOrJunkUrl(url: string): boolean {
  const lower = clean(url).toLowerCase();
  if (!lower) return true;

  const blockedHosts = [
    "godaddy.com",
    "sedo.com",
    "afternic.com",
    "dan.com",
    "hugedomains.com",
    "namecheap.com",
    "bluehost.com",
    "wix.com/domain",
    "squarespace.com/domains",
    "example.com",
    "localhost",
    "127.0.0.1",
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "bsky.app/profile/",
    "news.ycombinator.com/item"
  ];

  return blockedHosts.some(host => lower.includes(host));
}

function isDirectContactUrl(url: string): boolean {
  const cleaned = cleanUrl(url);
  if (!cleaned) return false;
  if (cleaned.toLowerCase().startsWith("mailto:")) {
    return isValidDirectEmail(cleaned.slice(7));
  }
  return !isParkedOrJunkUrl(cleaned);
}

function isFreshWithin72Hours(rawDate?: string): boolean {
  const val = clean(rawDate || "");
  if (!val) return true;
  const parsed = Date.parse(val);
  if (Number.isNaN(parsed)) return true;
  const now = Date.now();
  const age = now - parsed;
  return age >= -60000 && age <= MAX_DEMAND_AGE_MS;
}

function isAcademyOrAgencyOrCompanyDemand(
  author: string,
  text: string,
  url: string
): boolean {
  const combined = ` ${clean(`${author} ${text} ${url}`).toLowerCase()} `;
  const blockedOrgTerms = [
    " academy ",
    " institute ",
    " university ",
    " college ",
    " school ",
    " madrasa ",
    " madrassa ",
    " agency ",
    " agencies ",
    " staffing ",
    " recruiter ",
    " recruiting ",
    " law firm ",
    " attorneys ",
    " studio ",
    " inc.",
    " llc ",
    " ltd ",
    " corp ",
    " foundation ",
    " center ",
    " centre ",
    " platform ",
    " marketplace ",
    " our company ",
    " our team ",
    " our agency ",
    " our school ",
    " we are hiring "
  ];
  return blockedOrgTerms.some(term => combined.includes(term));
}
async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/xml, text/xml, text/html, */*"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return (await response.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

function getCountry(text: string): string {
  const t = ` ${clean(text).toLowerCase()} `;

  const countryMap: Array<[string, string[]]> = [
    ["United States", [" united states ", " usa ", " u.s. ", " new york ", " california ", " texas ", " florida ", " chicago "]],
    ["United Kingdom", [" united kingdom ", " uk ", " u.k. ", " london ", " manchester ", " birmingham ", " scotland "]],
    ["Canada", [" canada ", " toronto ", " vancouver ", " montreal "]],
    ["Australia", [" australia ", " sydney ", " melbourne "]],
    ["Pakistan", [" pakistan ", " rawalpindi ", " islamabad ", " lahore ", " karachi "]],
    ["India", [" india ", " mumbai ", " delhi ", " bangalore ", " bengaluru ", " hyderabad "]],
    ["United Arab Emirates", [" uae ", " dubai ", " abu dhabi ", " sharjah "]],
    ["Saudi Arabia", [" saudi arabia ", " riyadh ", " jeddah "]],
    ["Germany", [" germany ", " berlin ", " munich "]],
    ["France", [" france ", " paris "]]
  ];

  for (const [country, patterns] of countryMap) {
    if (patterns.some(p => t.includes(p))) {
      return country;
    }
  }

  return "Remote / Global";
}

function isAcademyOrOrganization(
  name: string,
  bio: string,
  url: string
): boolean {
  const combined = ` ${clean(`${name} ${bio} ${url}`).toLowerCase()} `;
  const orgTerms = [
    " academy ",
    " institute ",
    " university ",
    " college ",
    " school ",
    " madrasa ",
    " madrassa ",
    " agency ",
    " studio ",
    " inc.",
    " llc ",
    " ltd ",
    " corp ",
    " foundation ",
    " center ",
    " centre ",
    " platform ",
    " marketplace "
  ];
  return orgTerms.some(term => combined.includes(term));
}

function isCourseBookOrArticleSpam(text: string): boolean {
  const t = ` ${clean(text).toLowerCase()} `;
  const spamTerms = [
    " buy my course ",
    " enroll now ",
    " limited spots course ",
    " free webinar ",
    " crypto signal ",
    " forex signal ",
    " get rich ",
    " make $",
    " passive income course "
  ];
  return spamTerms.some(term => t.includes(term));
}

function detectSkillNeeded(text: string, role?: SaasRole): string {
  const t = ` ${clean(text).toLowerCase()} `;

  if (
    t.includes(" quran ") ||
    t.includes(" tajweed ") ||
    t.includes(" arabic ") ||
    t.includes(" urdu ") ||
    t.includes(" islamic ")
  ) {
    return "Languages & Islamic Studies Teaching";
  }

  if (
    t.includes(" legal ") ||
    t.includes(" contract ") ||
    t.includes(" paralegal ") ||
    t.includes(" lawyer ") ||
    t.includes(" attorney ")
  ) {
    return "Freelancing & Business";
  }

  if (
    t.includes(" history ") ||
    t.includes(" historian ") ||
    t.includes(" math ") ||
    t.includes(" physics ") ||
    t.includes(" chemistry ") ||
    t.includes(" biology ") ||
    t.includes(" science ") ||
    t.includes(" english ") ||
    t.includes(" esl ") ||
    t.includes(" ielts ") ||
    t.includes(" tutor ") ||
    t.includes(" teacher ") ||
    t.includes(" phonics ") ||
    t.includes(" reading ") ||
    role === "teacher"
  ) {
    return "Education & Teaching";
  }

  if (
    t.includes(" coach ") ||
    t.includes(" coaching ") ||
    t.includes(" mentor ") ||
    role === "coach"
  ) {
    return "Coaching & Mentorship";
  }

  if (
    t.includes(" writer ") ||
    t.includes(" editor ") ||
    t.includes(" designer ") ||
    t.includes(" developer ") ||
    t.includes(" freelance ") ||
    t.includes(" translation ") ||
    t.includes(" translator ") ||
    role === "freelancer"
  ) {
    return "Writing, Design & Freelance Services";
  }

  return "Freelancing & Business";
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

function isArticleOrSupplyJobText(text: string, url: string): boolean {
  const combined = ` ${clean(`${text} ${url}`).toLowerCase()} `;

  const blockedUrlOrTextPatterns = [
    " medium.com ",
    " substack.com ",
    " dev.to ",
    " hashnode. ",
    " /blog ",
    " /blogs ",
    " /article ",
    " /articles ",
    " /guide ",
    " /guides ",
    " /tutorial ",
    " /news ",
    " /careers ",
    " /jobs ",
    " greenhouse.io ",
    " lever.co ",
    " ashbyhq.com ",
    " workdayjobs.com ",
    " linkedin.com/jobs ",
    " indeed.com ",
    " remotive.com ",
    " jobicy.com ",
    " article ",
    " essay ",
    " op-ed ",
    " press release ",
    " benchmark ",
    " case study ",
    " how we built ",
    " why i left ",
    " job description ",
    " job posting ",
    " full-time ",
    " part-time ",
    " base salary ",
    " equity ",
    " benefits package ",
    " equal opportunity employer "
  ];

  if (blockedUrlOrTextPatterns.some(pat => combined.includes(pat))) {
    return true;
  }

  const individualRequestSignals = [
    " looking for ",
    " need a ",
    " need an ",
    " seeking a ",
    " seeking an ",
    " anyone know ",
    " recommendation for ",
    " recommendations for ",
    " hire a ",
    " hire an ",
    " looking to hire ",
    " want to hire ",
    " need help with "
  ];

  return !individualRequestSignals.some(sig => combined.includes(sig));
}

async function isUrlReachableAndActive(url: string): Promise<boolean> {
  const cleaned = cleanUrl(url);
  if (!cleaned || !isDirectContactUrl(cleaned)) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1400);

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

async function collectFreshDemandFromHackerNews(
  queries: string[],
  sourceName: string
): Promise<SearchResult[]> {
  const cutoffSec = Math.floor((Date.now() - MAX_DEMAND_AGE_MS) / 1000);
  const collected: SearchResult[] = [];
  const seen = new Set<string>();

  const batches = await Promise.all(
    queries.map(async q => {
      try {
        const url =
          "https://hn.algolia.com/api/v1/search_by_date?query=" +
          encodeURIComponent(q) +
          "&numericFilters=created_at_i>" +
          cutoffSec +
          "&hitsPerPage=25";
        const data = await fetchJson(url);
        return Array.isArray(data?.hits) ? data.hits : [];
      } catch (error) {
        console.error(`[${sourceName}] HN query failed:`, q, error);
        return [];
      }
    })
  );

  const candidates: SearchResult[] = [];

  for (const hit of batches.flat() as Array<Record<string, unknown>>) {
    const title = stripAllTags(hit?.title || "");
    const storyTitle = stripAllTags(hit?.story_title || "");
    const bodyText = stripAllTags(hit?.comment_text || hit?.story_text || title || storyTitle);
    const createdAt = clean(hit?.created_at || "");
    const authorName = clean(hit?.author || "");
    const rawHitUrl = cleanUrl(String(hit?.url || ""));
    const combinedText = `${title || storyTitle} ${bodyText}`;

    if (!combinedText || !isFreshWithin72Hours(createdAt)) continue;
    if (isAcademyOrAgencyOrCompanyDemand(authorName, combinedText, rawHitUrl)) continue;
    if (isCourseBookOrArticleSpam(combinedText)) continue;
    if (isArticleOrSupplyJobText(combinedText, rawHitUrl)) continue;

    const extracted = extractDirectContactFromBio(combinedText);
    const directUrl =
      extracted.contactUrl || (rawHitUrl && isDirectContactUrl(rawHitUrl) ? rawHitUrl : "");
    const directEmail = extracted.email;

    if (!directEmail && !directUrl) continue;

    const dedupeKey = `${(directEmail || directUrl).toLowerCase()}|${combinedText.slice(0, 60).toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    candidates.push({
      title: (title || storyTitle || bodyText).slice(0, 110),
      link: directUrl || `mailto:${directEmail}`,
      sourceUrl: directUrl || `mailto:${directEmail}`,
      contactUrl: directUrl,
      email: directEmail,
      author: authorName,
      country: getCountry(combinedText) || "Remote / Global",
      description: bodyText,
      snippet: bodyText,
      publishedAt: createdAt,
      source: sourceName,
      sourceType: "hn-api"
    });
  }

  await Promise.all(
    candidates.slice(0, 20).map(async item => {
      if (item.email && !item.contactUrl) {
        collected.push(item);
        return;
      }
      const reachable = await isUrlReachableAndActive(item.contactUrl || item.link);
      if (reachable) {
        collected.push(item);
      }
    })
  );

  return collected.slice(0, MAX_RESULTS_PER_SOURCE);
}

async function collectRedditDemandTeachers(): Promise<SearchResult[]> {
  return collectFreshDemandFromHackerNews(DEMAND_TEACHER_QUERIES, "Demand Teachers");
}

async function collectRedditDemandCoaches(): Promise<SearchResult[]> {
  return collectFreshDemandFromHackerNews(DEMAND_COACH_QUERIES, "Demand Coaches");
}

async function collectRedditDemandFreelancers(): Promise<SearchResult[]> {
  return collectFreshDemandFromHackerNews(
    DEMAND_TRANSLATION_WRITING_LEGAL_QUERIES,
    "Demand Translation Writing Legal"
  );
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
      "painting instructor",
      "esl tutor",
      "ielts tutor",
      "reading tutor",
      "phonics teacher",
      "science tutor",
      "exam prep tutor",
      "music teacher",
      "art teacher"
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
      "writing coach",
      "wellness coach",
      "health coach",
      "mindset coach",
      "interview coach",
      "parenting coach",
      "productivity coach"
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
        const actors = Array.isArray(data?.actors) ? data.actors : [];
        return actors as Array<Record<string, unknown>>;
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
  const checkCap = role === "coach" ? 6 : 8;
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
async function collectAllSources(): Promise<{
  results: SearchResult[];
  errors: Array<{ source: string; error: string }>;
}> {
  const collectors: Array<{ name: string; fn: () => Promise<SearchResult[]> }> = [
    { name: "Demand Teachers", fn: collectRedditDemandTeachers },
    { name: "Demand Coaches", fn: collectRedditDemandCoaches },
    { name: "Demand Translation Writing Legal", fn: collectRedditDemandFreelancers },
    { name: "SaaS Teachers", fn: collectBingSaaSTeachers },
    { name: "SaaS Freelancers", fn: collectBingSaaSFreelancers },
    { name: "SaaS Coaches", fn: collectBingSaaSCoaches }
  ];

  const settled = await Promise.all(
    collectors.map(async item => {
      try {
        const rows = await item.fn();
        return {
          name: item.name,
          rows,
          error: ""
        };
      } catch (err: unknown) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Unknown collector error")
            : "Unknown collector error";
        return {
          name: item.name,
          rows: [] as SearchResult[],
          error: clean(msg)
        };
      }
    })
  );

  const results: SearchResult[] = [];
  const errors: Array<{ source: string; error: string }> = [];

  for (const entry of settled) {
    if (entry.error) {
      errors.push({ source: entry.name, error: entry.error });
    }
    results.push(...entry.rows);
  }

  return { results, errors };
}

function inferLeadType(item: SearchResult): LeadType {
  if (item.saasRole) return "SaaS";
  const src = clean(item.source).toLowerCase();
  if (src.includes("saas")) return "SaaS";
  if (src.includes("supply")) return "Supply";
  return "Demand";
}

function isRecentDemand(rawDate?: string): boolean {
  const val = clean(rawDate || "");
  if (!val) return true;
  const parsed = Date.parse(val);
  if (Number.isNaN(parsed)) return true;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const age = Date.now() - parsed;
  return age >= -60000 && age <= sevenDaysMs;
}

function processCollectedResults(results: SearchResult[]): ProcessedLead[] {
  const seen = new Set<string>();
  const processed: ProcessedLead[] = [];

  for (const item of results) {
    const leadType = inferLeadType(item);
    const title = clean(item.title || item.author || "Opportunity");
    const description = clean(item.description || item.snippet || title);
    const contactEmail = clean(item.email || "");
    const contactUrl = cleanUrl(item.contactUrl || "");
    const sourceUrl = cleanUrl(item.sourceUrl || item.link || contactUrl || "");
    const hasDirectContact =
      (contactEmail && isValidDirectEmail(contactEmail)) ||
      (contactUrl && isDirectContactUrl(contactUrl));

    if (!title || !hasDirectContact) {
      continue;
    }

    if (leadType === "Demand") {
      if (!isRecentDemand(item.publishedAt)) {
        continue;
      }
      if (
        isAcademyOrAgencyOrCompanyDemand(
          clean(item.author || ""),
          `${title} ${description}`,
          contactUrl || sourceUrl
        )
      ) {
        continue;
      }
      if (isArticleOrSupplyJobText(`${title} ${description}`, contactUrl || sourceUrl)) {
        continue;
      }
    }

    const country =
      clean(item.country || "") ||
      getCountry(`${title} ${description}`) ||
      "Remote / Global";
    const skillNeeded = detectSkillNeeded(`${title} ${description}`, item.saasRole);

    const dedupeKey = `${leadType}|${(contactEmail || contactUrl).toLowerCase()}|${title.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    processed.push({
      lead_type: leadType,
      title,
      description,
      skill_needed: skillNeeded,
      niche: skillNeeded,
      country,
      budget_range: "",
      salary_range: "",
      contact_email: contactEmail,
      contact_url: contactUrl,
      source: clean(item.source || "Collector"),
      source_url: sourceUrl || contactUrl,
      published_at: clean(item.publishedAt || "") || new Date().toISOString(),
      status: "new",
      tags: [leadType.toLowerCase(), skillNeeded.toLowerCase()],
      raw_data: {
        sourceType: clean(item.sourceType || ""),
        searchQuery: clean(item.searchQuery || ""),
        author: clean(item.author || "")
      }
    });

    if (processed.length >= MAX_INSERT_PER_RUN) {
      break;
    }
  }

  return processed;
}

function tableForLeadType(leadType: LeadType): string {
  if (leadType === "Supply") return "supply_leads";
  if (leadType === "SaaS") return "saas_leads";
  return "demand_leads";
}

async function insertProcessedLead(
  supabase: ReturnType<typeof getSupabaseClient>,
  lead: ProcessedLead
): Promise<{ inserted: boolean; duplicate: boolean; error?: string }> {
  const table = tableForLeadType(lead.lead_type);
  const directContact = lead.contact_email || lead.contact_url || lead.source_url;
  const authorName = clean(lead.raw_data?.author || "");

  if (lead.lead_type === "SaaS") {
    const saasPayload: Record<string, string> = {
      name: authorName || lead.title,
      platform: lead.source,
      niche: lead.skill_needed,
      contect: directContact,
      description: lead.description,
      country: lead.country,
      landing_url: lead.contact_url || lead.source_url,
      contact_url: lead.contact_url || lead.source_url,
      source_url: lead.source_url || lead.contact_url,
      status: lead.status || "new"
    };

    const { error } = await supabase.from(table).insert(saasPayload);
    if (!error) return { inserted: true, duplicate: false };
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return { inserted: false, duplicate: true };
    }
    return { inserted: false, duplicate: false, error: error.message };
  }

  const existing = await supabase
    .from("demand_leads")
    .select("id")
    .eq("title", lead.title)
    .limit(1);

  if (existing.data && existing.data.length > 0) {
    return { inserted: false, duplicate: true };
  }

  const demandPayload: Record<string, string> = {
    type: "demand",
    source: lead.source,
    client_name: authorName || "Individual Client",
    skill_needed: lead.skill_needed,
    category: lead.skill_needed,
    title: lead.title,
    description: lead.description,
    country: lead.country,
    budget: lead.budget_range || lead.salary_range || "",
    contact_email: lead.contact_email || "",
    contact_url: lead.contact_url || lead.source_url,
    source_url: lead.source_url || lead.contact_url,
    status: "new"
  };

  const firstTry = await supabase.from("demand_leads").insert(demandPayload);
  if (!firstTry.error) {
    return { inserted: true, duplicate: false };
  }

  const firstMsg = String(firstTry.error.message || "").toLowerCase();
  if (firstMsg.includes("duplicate") || firstMsg.includes("unique")) {
    return { inserted: false, duplicate: true };
  }

  const fallbackPayload: Record<string, string> = {
    type: "Demand",
    source: lead.source,
    client_name: authorName || "Individual Client",
    skill_needed: lead.skill_needed,
    category: lead.skill_needed,
    title: lead.title,
    description: lead.description,
    country: lead.country,
    contact_email: lead.contact_email || "",
    contact_url: lead.contact_url || lead.source_url,
    source_url: lead.source_url || lead.contact_url
  };

  const secondTry = await supabase.from("demand_leads").insert(fallbackPayload);
  if (!secondTry.error) {
    return { inserted: true, duplicate: false };
  }

  const secondMsg = String(secondTry.error.message || "").toLowerCase();
  if (secondMsg.includes("duplicate") || secondMsg.includes("unique")) {
    return { inserted: false, duplicate: true };
  }

  console.error("[Insert Error - demand_leads]", firstTry.error.message, "|", secondTry.error.message);
  return {
    inserted: false,
    duplicate: false,
    error: `${firstTry.error.message} | ${secondTry.error.message}`
  };
  }
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST."
    });
  }

  try {
    const supabase = getSupabaseClient();
    const { results, errors } = await collectAllSources();
    const processed = processCollectedResults(results);

    let insertedCount = 0;
    let duplicateCount = 0;
    let insertErrorCount = 0;
    const sampleInsertErrors: string[] = [];

    const insertedByType = {
      Demand: 0,
      Supply: 0,
      SaaS: 0
    };

    for (const lead of processed) {
      const outcome = await insertProcessedLead(supabase, lead);
      if (outcome.inserted) {
        insertedCount++;
        insertedByType[lead.lead_type]++;
      } else if (outcome.duplicate) {
        duplicateCount++;
      } else {
        insertErrorCount++;
        if (
          outcome.error &&
          sampleInsertErrors.length < 3 &&
          !sampleInsertErrors.includes(outcome.error)
        ) {
          sampleInsertErrors.push(`${lead.lead_type}: ${outcome.error}`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      added: insertedCount,
      demand: insertedByType.Demand,
      supply: insertedByType.Supply,
      saas: insertedByType.SaaS,
      stats: {
        found: results.length,
        accepted: processed.length,
        inserted: insertedCount,
        duplicates: duplicateCount,
        insertErrors: insertErrorCount,
        insertedByType
      },
      sampleInsertErrors,
      sourceErrors: errors
    });
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message || "Lead collector failed.")
        : "Lead collector failed.";
    return res.status(500).json({
      success: false,
      message
    });
  }
      }
