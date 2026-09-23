import type { Request, Response, Router } from "express";
import express from "express";

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const router: Router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

const MAX_AGE_HOURS = 72;

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "UAE",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Australia",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Pakistan",
  "India",
  "Bangladesh",
  "Germany",
  "France",
  "Netherlands",
];

const BLOCKED_DOMAINS = [
  "upwork.com",
  "fiverr.com",
  "freelancer.com",
  "toptal.com",
  "peopleperhour.com",
  "guru.com",
];

const GENERIC_TERMS = [
  "job board",
  "job listings",
  "find freelancers",
  "hire freelancers",
  "best freelance",
  "free trial",
  "free seminar",
  "free webinar",
  "webinar",
  "seminar",
  "enroll now",
  "register now",
];

const SAAS_REJECT_TERMS = [
  "dictionary",
  "meaning",
  "definition",
  "what is",
  "wikipedia",
  "resource",
  "resources",
  "job",
  "jobs",
  "vacancy",
  "vacancies",
  "hiring",
  "apply now",
  "application",
  "course",
  "courses",
  "webinar",
  "seminar",
  "article",
  "blog",
  "news",
];

const PROVIDER_TERMS = [
  "we offer",
  "we provide",
  "our services",
  "book a session",
  "join our class",
  "join our course",
  "join our academy",
  "our academy",
  "our school",
  "our tutors",
  "our teachers",
  "our coaches",
  "students wanted",
  "students required",
  "accepting students",
  "new students",
  "enrollment open",
  "admissions open",
  "classes available",
  "learn with us",
  "learn from us",
  "contact us to enroll",
  "agency",
];

const DEMAND_SIGNALS = [
  "looking for",
  "need",
  "need a",
  "need an",
  "need someone",
  "need some",
  "seeking",
  "wanted",
  "want a",
  "i need",
  "we need",
  "my daughter needs",
  "my son needs",
  "my child needs",
  "my children need",
  "our company needs",
  "client needs",
  "recommend",
  "does anyone know",
  "help me find",
];

const SUPPLY_SIGNALS = [
  "hiring",
  "now hiring",
  "job opening",
  "vacancy",
  "position available",
  "position open",
  "seeking a",
  "recruiting",
  "applications open",
  "apply now",
  "apply for",
  "looking to hire",
];

const SAAS_PROVIDER_TERMS = [
  "teacher",
  "tutor",
  "coach",
  "author",
  "consultant",
  "designer",
  "developer",
  "writer",
  "copywriter",
  "video editor",
  "virtual assistant",
  "freelancer",
  "trainer",
  "mentor",
  "therapist",
  "professional",
];

type SkillRow = {
  id?: string;
  name?: string;
  skill?: string;
  category?: string;
  subcategory?: string;
};

type SearchResult = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function lower(value: unknown): string {
  return clean(value).toLowerCase();
}

function hasAny(text: string, terms: string[]): boolean {
  const value = lower(text);
  return terms.some((term) => value.includes(term));
}

function isBlocked(link: string): boolean {
  const value = lower(link);

  return BLOCKED_DOMAINS.some((domain) =>
    value.includes(domain)
  );
}

function getSkillName(skill: SkillRow): string {
  return clean(skill.name || skill.skill);
  }
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsCountryAlias(text: string, alias: string): boolean {
  const value = lower(text);
  const term = lower(alias);

  if (term.length <= 3) {
    const pattern = new RegExp(
      `\\b${escapeRegExp(term)}\\b`,
      "i"
    );

    return pattern.test(value);
  }

  return value.includes(term);
}

const COUNTRY_ALIASES: Record<string, string[]> = {
  "United States": [
    "united states",
    "usa",
    "u.s.a.",
    "u.s.",
    "america",
  ],
  Canada: ["canada", "canadian"],
  "United Kingdom": [
    "united kingdom",
    "uk",
    "u.k.",
    "britain",
    "england",
    "scotland",
    "wales",
  ],
  UAE: [
    "uae",
    "u.a.e.",
    "united arab emirates",
    "dubai",
    "abu dhabi",
  ],
  Qatar: ["qatar", "doha"],
  "Saudi Arabia": [
    "saudi arabia",
    "saudi",
    "riyadh",
    "jeddah",
  ],
  Kuwait: ["kuwait"],
  Oman: ["oman", "muscat"],
  Bahrain: ["bahrain", "manama"],
  Australia: ["australia", "australian"],
  Sweden: ["sweden", "swedish"],
  Norway: ["norway", "norwegian"],
  Denmark: ["denmark", "danish"],
  Finland: ["finland", "finnish"],
  Pakistan: ["pakistan", "pakistani"],
  India: ["india", "indian"],
  Bangladesh: ["bangladesh", "bangladeshi"],
  Germany: ["germany", "german"],
  France: ["france", "french"],
  Netherlands: ["netherlands", "dutch", "holland"],
};

function findCountry(
  text: string,
  link: string = ""
): string {
  const combined = `${text} ${link}`;

  for (const country of COUNTRIES) {
    const aliases =
      COUNTRY_ALIASES[country] || [country];

    if (
      aliases.some((alias) =>
        containsCountryAlias(combined, alias)
      )
    ) {
      return country;
    }
  }

  return "";
}

function extractEmail(text: string): string {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match?.[0] || "";
}

function extractPhone(text: string): string {
  const match = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/
  );

  return match?.[0]?.trim() || "";
}

function extractPersonName(
  title: string,
  snippet: string
): string {
  const text = `${clean(title)} ${clean(snippet)}`;

  const patterns = [
    /(?:by|from|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*[-|–]/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
  }
function isSpecificSocialOrProfileUrl(
  link: string
): boolean {
  const value = lower(link);

  if (!value) {
    return false;
  }

  const socialPatterns = [
    "linkedin.com/in/",
    "linkedin.com/pub/",
    "instagram.com/",
    "facebook.com/",
    "x.com/",
    "twitter.com/",
    "youtube.com/@",
    "tiktok.com/@",
    "threads.net/@",
  ];

  return socialPatterns.some((pattern) =>
    value.includes(pattern)
  );
}

function isGenericSaasPage(
  result: SearchResult
): boolean {
  const title = lower(result.title);
  const snippet = lower(result.snippet);
  const link = lower(result.link);

  const combined = `${title} ${snippet} ${link}`;

  if (
    hasAny(combined, SAAS_REJECT_TERMS)
  ) {
    return true;
  }

  const blockedPageDomains = [
    "dictionary.cambridge.org",
    "wikipedia.org",
    "indeed.com",
    "higheredjobs.com",
    "myworkdayjobs.com",
  ];

  if (
    blockedPageDomains.some((domain) =>
      link.includes(domain)
    )
  ) {
    return true;
  }

  return false;
}

function hasSaasIdentitySignal(
  result: SearchResult
): boolean {
  const title = clean(result.title);
  const snippet = clean(result.snippet);
  const link = clean(result.link);

  const text = `${title} ${snippet}`;

  if (isSpecificSocialOrProfileUrl(link)) {
    return true;
  }

  if (
    hasAny(text, [
      "profile",
      "portfolio",
      "about me",
      "about us",
      "my services",
      "my coaching",
      "my consulting",
      "work with me",
      "hire me",
      "contact me",
      "book me",
      "services",
      "personal website",
      "professional",
    ])
  ) {
    return true;
  }

  const providerTerms = SAAS_PROVIDER_TERMS.filter(
    (term) => term !== "professional"
  );

  return hasAny(text, providerTerms);
}

function isSaasProfessional(
  result: SearchResult
): boolean {
  const title = clean(result.title);
  const snippet = clean(result.snippet);
  const link = clean(result.link);

  if (!title || !link || !snippet) {
    return false;
  }

  if (isBlocked(link)) {
    return false;
  }

  if (isGenericSaasPage(result)) {
    return false;
  }

  const combined = `${title} ${snippet}`;

  if (
    !hasAny(
      combined,
      SAAS_PROVIDER_TERMS
    )
  ) {
    return false;
  }

  return hasSaasIdentitySignal(result);
}

function extractContactUrl(
  html: string,
  sourceUrl: string
): string {
  const hrefMatches = html.match(
    /href\s*=\s*["']([^"']+)["']/gi
  );

  if (!hrefMatches) {
    return "";
  }

  for (const raw of hrefMatches) {
    const match = raw.match(
      /href\s*=\s*["']([^"']+)["']/i
    );

    const href = match?.[1];

    if (!href) {
      continue;
    }

    const value = lower(href);

    if (
      value.startsWith("mailto:") ||
      value.startsWith("tel:")
    ) {
      return href;
    }

    if (
      value.includes("contact") ||
      value.includes("get-in-touch") ||
      value.includes("reach-us") ||
      value.includes("book")
    ) {
      try {
        return new URL(
          href,
          sourceUrl
        ).toString();
      } catch {
        continue;
      }
    }
  }

  return "";
      }
type SaasContactEvidence = {
  email: string;
  phone: string;
  contactUrl: string;
  pageText: string;
};

async function inspectSaasSource(
  sourceUrl: string
): Promise<SaasContactEvidence> {
  const empty: SaasContactEvidence = {
    email: "",
    phone: "",
    contactUrl: "",
    pageText: "",
  };

  if (!sourceUrl) {
    return empty;
  }

  try {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      6000
    );

    const response = await fetch(sourceUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OpportunityHub/1.0)",
        Accept:
          "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return empty;
    }

    const html = await response.text();

    if (!html) {
      return empty;
    }

    const pageText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20000);

    const email =
      extractEmail(
        `${html} ${pageText}`
      );

    const phone =
      extractPhone(
        `${html} ${pageText}`
      );

    const contactUrl =
      extractContactUrl(
        html,
        sourceUrl
      );

    return {
      email,
      phone,
      contactUrl,
      pageText,
    };
  } catch {
    return empty;
  }
}

function hasDirectSaasContact(
  result: SearchResult,
  evidence: SaasContactEvidence
): boolean {
  const sourceUrl = clean(result.link);

  if (
    evidence.email ||
    evidence.phone ||
    evidence.contactUrl
  ) {
    return true;
  }

  /*
   * A specific professional/social profile or
   * specific social post is itself a direct
   * contact path.
   */
  if (
    isSpecificSocialOrProfileUrl(sourceUrl)
  ) {
    return true;
  }

  return false;
}

function calculateScore(
  result: SearchResult,
  type: "Demand" | "Supply" | "SaaS",
  contactBonus = 0
): number {
  const title = clean(result.title);
  const snippet = clean(result.snippet);
  const link = clean(result.link);

  const text = `${title} ${snippet}`;

  let score = 0;

  if (
    type === "Demand" &&
    isDemand(text)
  ) {
    score += 30;
  }

  if (
    type === "Supply" &&
    isSupply(text)
  ) {
    score += 30;
  }

  if (
    type === "SaaS" &&
    hasAny(
      text,
      SAAS_PROVIDER_TERMS
    )
  ) {
    score += 30;
  }

  if (
    extractEmail(text) ||
    extractPhone(text)
  ) {
    score += 25;
  }

  if (link) {
    score += 15;
  }

  if (
    isFresh(result.date)
  ) {
    score += 10;
  }

  score += contactBonus;

  return score;
          }
function parseDate(value: unknown): Date | null {
  const text = clean(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function isFresh(value: unknown): boolean {
  const date = parseDate(value);

  if (!date) {
    return false;
  }

  const ageHours =
    (Date.now() - date.getTime()) /
    (1000 * 60 * 60);

  return ageHours >= 0 &&
    ageHours <= MAX_AGE_HOURS;
}

function isDemand(text: string): boolean {
  return (
    hasAny(text, DEMAND_SIGNALS) &&
    !hasAny(text, PROVIDER_TERMS)
  );
}

function isSupply(text: string): boolean {
  return (
    hasAny(text, SUPPLY_SIGNALS) &&
    !hasAny(text, DEMAND_SIGNALS)
  );
}

async function loadSkills(): Promise<SkillRow[]> {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return [];
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } =
    await supabase
      .from("skills")
      .select(
        "id,name,skill,category,subcategory"
      );

  if (error) {
    console.error(
      "Failed to load skills:",
      error.message
    );

    return [];
  }

  return (data || []) as SkillRow[];
}

async function alreadyExists(
  table: string,
  source: string,
  title: string
): Promise<boolean> {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return false;
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  const { data } =
    await supabase
      .from(table)
      .select("id")
      .eq("source", source)
      .eq("title", title)
      .limit(1);

  return Boolean(data?.length);
}

async function searchSerper(
  query: string
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      "https://google.serper.dev/search",
      {
        method: "POST",
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          q: query,
          num: 10,
          tbs: "qdr:d3",
        }),
      }
    );

    if (!response.ok) {
      return [];
    }

    const data =
      (await response.json()) as {
        organic?: SearchResult[];
      };

    return data.organic || [];
  } catch {
    return [];
  }
}

async function insertLead(
  table: string,
  lead: Record<string, unknown>
): Promise<boolean> {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return false;
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } =
    await supabase
      .from(table)
      .insert(lead);

  if (error) {
    console.error(
      `Failed to insert ${table}:`,
      error.message
    );

    return false;
  }

  return true;
}

function buildSaasQueries(
  skill: SkillRow
): string[] {
  const name = getSkillName(skill);

  if (!name) {
    return [];
  }

  const queries = [
    `"${name}" professional`,
    `"${name}" profile`,
    `"${name}" LinkedIn`,
    `"${name}" Instagram`,
    `"${name}" portfolio`,
    `"${name}" consultant`,
  ];

  if (skill.category) {
    queries.push(
      `"${name}" "${clean(
        skill.category
      )}" professional`
    );
  }

  if (skill.subcategory) {
    queries.push(
      `"${name}" "${clean(
        skill.subcategory
      )}" professional`
    );
  }

  return queries;
}

async function processSaas(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  const title = clean(result.title);
  const link = clean(result.link);
  const snippet = clean(result.snippet);

  if (
    !title ||
    !link ||
    !snippet
  ) {
    return false;
  }

  if (
    !isSaasProfessional(result)
  ) {
    return false;
  }

  if (
    !isFresh(result.date)
  ) {
    return false;
  }

  const evidence =
    await inspectSaasSource(link);

  const directContact =
    hasDirectSaasContact(
      result,
      evidence
    );

  /*
   * Gold rule:
   * SaaS leads must have a real direct
   * contact path. No contact = reject.
   */
  if (!directContact) {
    return false;
  }

  const combinedText = [
    title,
    snippet,
    evidence.pageText,
  ].join(" ");

  const country =
    findCountry(
      combinedText,
      link
    );

  const score =
    calculateScore(
      result,
      "SaaS",
      directContact ? 25 : 0
    );

  if (score < 60) {
    return false;
  }

  if (
    await alreadyExists(
      "saas_leads",
      link,
      title
    )
  ) {
    return false;
  }

  const contactEmail =
    evidence.email ||
    extractEmail(
      `${snippet} ${title}`
    );

  const contactPhone =
    evidence.phone ||
    extractPhone(
      `${snippet} ${title}`
    );

  const contactUrl =
    evidence.contactUrl ||
    (
      isSpecificSocialOrProfileUrl(link)
        ? link
        : ""
    );

  const personName =
    extractPersonName(
      title,
      snippet
    );

  const inserted =
    await insertLead(
      "saas_leads",
      {
        type: "SaaS",
        source: link,
        client_name:
          personName || title,
        skill_needed:
          getSkillName(skill),
        description:
          snippet,
        contact_email:
          contactEmail,
        contact_phone:
          contactPhone,
        contact_name:
          personName,
        contact_url:
          contactUrl,
        status: "active",
        title,
        category:
          clean(skill.category),
        subcategory:
          clean(skill.subcategory),
        country,
        city: "",
        budget: "",
        currency: "",
        created_at:
          new Date().toISOString(),
      }
    );

  return inserted;
}

async function runSaas(
  skills: SkillRow[]
): Promise<number> {
  let inserted = 0;

  for (const skill of skills) {
    const queries =
      buildSaasQueries(skill);

    for (const query of queries) {
      const results =
        await searchSerper(query);

      for (const result of results) {
        const success =
          await processSaas(
            result,
            skill
          );

        if (success) {
          inserted += 1;
        }
      }
    }
  }

  return inserted;
}

router.post(
  "/fetchLeads",
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      const skills =
        await loadSkills();

      if (!skills.length) {
        return res.json({
          success: true,
          message:
            "No skills available",
          inserted: 0,
        });
      }

      const saasInserted =
        await runSaas(skills);

      return res.json({
        success: true,
        message:
          "Lead fetching completed",
        inserted: saasInserted,
        SaaS: saasInserted,
      });
    } catch (error) {
      console.error(
        "fetchLeads error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Lead fetching failed",
      });
    }
  }
);

export default router;
