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

function findCountry(text: string): string {
  const value = lower(text);

  return (
    COUNTRIES.find((country) =>
      value.includes(lower(country))
    ) || ""
  );
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

function parseDate(value: unknown): Date | null {
  const text = clean(value);

  if (!text) return null;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function isFresh(dateValue: unknown): boolean {
  const date = parseDate(dateValue);

  if (!date) return false;

  const ageHours =
    (Date.now() - date.getTime()) /
    (1000 * 60 * 60);

  return ageHours >= 0 && ageHours <= MAX_AGE_HOURS;
}

function extractPersonName(
  title: string,
  snippet: string
): string {
  const text = `${title} ${snippet}`;

  const patterns = [
    /(?:by|with|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*[-|,:]/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function isDemand(result: SearchResult): boolean {
  const text =
    `${clean(result.title)} ${clean(result.snippet)}`;

  if (!text) return false;

  if (hasAny(text, GENERIC_TERMS)) {
    return false;
  }

  if (hasAny(text, PROVIDER_TERMS)) {
    return false;
  }

  return hasAny(text, DEMAND_SIGNALS);
}

function isSupply(result: SearchResult): boolean {
  const text =
    `${clean(result.title)} ${clean(result.snippet)}`;

  if (!text) return false;

  if (hasAny(text, GENERIC_TERMS)) {
    return false;
  }

  if (hasAny(text, PROVIDER_TERMS)) {
    return false;
  }

  return hasAny(text, SUPPLY_SIGNALS);
}

function isSaasProfessional(
  result: SearchResult
): boolean {
  const title = clean(result.title);
  const snippet = clean(result.snippet);
  const link = clean(result.link);

  const text = `${title} ${snippet}`;

  if (!text || !link) return false;

  if (isBlocked(link)) {
    return false;
  }

  if (hasAny(text, GENERIC_TERMS)) {
    return false;
  }

  return hasAny(text, SAAS_PROVIDER_TERMS);
}

function calculateScore(
  result: SearchResult,
  type: "Demand" | "Supply" | "SaaS"
): number {
  const title = clean(result.title);
  const snippet = clean(result.snippet);
  const link = clean(result.link);

  const text = `${title} ${snippet}`;

  let score = 0;

  if (
    type === "Demand" &&
    hasAny(text, DEMAND_SIGNALS)
  ) {
    score += 30;
  }

  if (
    type === "Supply" &&
    hasAny(text, SUPPLY_SIGNALS)
  ) {
    score += 30;
  }

  if (
    type === "SaaS" &&
    hasAny(text, SAAS_PROVIDER_TERMS)
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

  if (isFresh(result.date)) {
    score += 10;
  }

  return score;
}

async function loadSkills(): Promise<SkillRow[]> {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("skills")
    .select("*");

  if (error) {
    throw new Error(
      `Failed to load skills: ${error.message}`
    );
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

  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("source", source)
    .eq("title", title)
    .limit(1);

  return Boolean(data && data.length > 0);
}

async function searchSerper(
  query: string
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    throw new Error(
      "SERPER_API_KEY is missing."
    );
  }

  const response = await fetch(
    "https://google.serper.dev/search",
    {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 10,
        tbs: "qdr:d3",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Serper request failed: ${response.status}`
    );
  }

  const json = await response.json();

  return Array.isArray(json?.organic)
    ? json.organic
    : [];
}

async function insertLead(
  table: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase
    .from(table)
    .insert(payload);

  if (error) {
    console.error(
      `Insert error in ${table}:`,
      error.message
    );

    return false;
  }

  return true;
}

function buildDemandQueries(
  skill: SkillRow
): string[] {
  const name = getSkillName(skill);

  return [
    `"looking for" "${name}"`,
    `"need" "${name}"`,
    `"need a" "${name}"`,
  ];
}

function buildSupplyQueries(
  skill: SkillRow
): string[] {
  const name = getSkillName(skill);

  return [
    `"hiring" "${name}"`,
    `"vacancy" "${name}"`,
    `"position" "${name}"`,
  ];
}

function buildSaasQueries(
  skill: SkillRow
): string[] {
  const name = getSkillName(skill);

  const category = clean(skill.category);
  const subcategory = clean(skill.subcategory);

  const queries = [
    `"${name}" professional`,
    `"${name}" profile`,
    `"${name}" LinkedIn`,
    `"${name}" Instagram`,
    `"${name}" portfolio`,
    `"${name}" consultant`,
  ];

  if (category) {
    queries.push(
      `"${name}" "${category}" professional`
    );
  }

  if (subcategory) {
    queries.push(
      `"${name}" "${subcategory}" professional`
    );
  }

  return [
    ...new Set(
      queries.filter(Boolean)
    ),
  ];
}

async function processDemand(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  if (!isDemand(result)) return false;

  if (!isFresh(result.date)) return false;

  const score = calculateScore(
    result,
    "Demand"
  );

  if (score < 60) return false;

  const title = clean(result.title);
  const link = clean(result.link);
  const snippet = clean(result.snippet);

  if (!title || !link || isBlocked(link)) {
    return false;
  }

  if (
    await alreadyExists(
      "demand_leads",
      link,
      title
    )
  ) {
    return false;
  }

  const text = `${title} ${snippet}`;

  return insertLead(
    "demand_leads",
    {
      type: "Demand",
      source: link,
      client_name:
        extractPersonName(title, snippet) ||
        title,
      skill_needed: getSkillName(skill),
      description: snippet,
      contact_email: extractEmail(text),
      contact_phone: extractPhone(text),
      status: "active",
      title,
      category: clean(skill.category),
      subcategory: clean(skill.subcategory),
      country: findCountry(text),
      city: "",
      budget: "",
      currency: "",
      contact_name:
        extractPersonName(title, snippet),
      created_at:
        parseDate(result.date)?.toISOString() ||
        new Date().toISOString(),
    }
  );
}

async function processSupply(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  if (!isSupply(result)) return false;

  if (!isFresh(result.date)) return false;

  const score = calculateScore(
    result,
    "Supply"
  );

  if (score < 60) return false;

  const title = clean(result.title);
  const link = clean(result.link);
  const snippet = clean(result.snippet);

  if (!title || !link || isBlocked(link)) {
    return false;
  }

  if (
    await alreadyExists(
      "supply_leads",
      link,
      title
    )
  ) {
    return false;
  }

  const text = `${title} ${snippet}`;

  return insertLead(
    "supply_leads",
    {
      type: "Supply",
      source: link,
      client_name:
        extractPersonName(title, snippet) ||
        title,
      skill_needed: getSkillName(skill),
      description: snippet,
      contact_email: extractEmail(text),
      contact_phone: extractPhone(text),
      status: "active",
      title,
      category: clean(skill.category),
      subcategory: clean(skill.subcategory),
      country: findCountry(text),
      city: "",
      budget: "",
      currency: "",
      contact_name:
        extractPersonName(title, snippet),
      created_at:
        parseDate(result.date)?.toISOString() ||
        new Date().toISOString(),
    }
  );
}

async function processSaas(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  if (!isSaasProfessional(result)) {
    return false;
  }

  if (!isFresh(result.date)) {
    return false;
  }

  const score = calculateScore(
    result,
    "SaaS"
  );

  if (score < 60) return false;

  const title = clean(result.title);
  const link = clean(result.link);
  const snippet = clean(result.snippet);

  if (!title || !link || isBlocked(link)) {
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

  const text = `${title} ${snippet}`;

  return insertLead(
    "saas_leads",
    {
      type: "SaaS",
      source: link,
      client_name:
        extractPersonName(title, snippet) ||
        title,
      skill_needed: getSkillName(skill),
      description: snippet,
      contact_email: extractEmail(text),
      contact_phone: extractPhone(text),
      contact_name:
        extractPersonName(title, snippet),
      status: "active",
      title,
      category: clean(skill.category),
      subcategory: clean(skill.subcategory),
      country: findCountry(text),
      city: "",
      budget: "",
      currency: "",
      created_at:
        parseDate(result.date)?.toISOString() ||
        new Date().toISOString(),
    }
  );
}

async function runType(
  type: "Demand" | "Supply" | "SaaS",
  skills: SkillRow[]
): Promise<number> {
  let inserted = 0;

  for (const skill of skills) {
    const queries =
      type === "Demand"
        ? buildDemandQueries(skill)
        : type === "Supply"
        ? buildSupplyQueries(skill)
        : buildSaasQueries(skill);

    for (const query of queries) {
      let results: SearchResult[] = [];

      try {
        results = await searchSerper(query);
      } catch (error) {
        console.error(
          `Search failed for ${type}:`,
          error
        );

        continue;
      }

      for (const result of results) {
        try {
          let saved = false;

          if (type === "Demand") {
            saved = await processDemand(
              result,
              skill
            );
          }

          if (type === "Supply") {
            saved = await processSupply(
              result,
              skill
            );
          }

          if (type === "SaaS") {
            saved = await processSaas(
              result,
              skill
            );
          }

          if (saved) {
            inserted++;
          }
        } catch (error) {
          console.error(
            `Processing failed for ${type}:`,
            error
          );
        }
      }
    }
  }

  return inserted;
}

/*
 * POST /api/fetchLeads
 *
 * Runs the real Demand + Supply + SaaS
 * lead collection engine.
 */
router.post(
  "/fetchLeads",
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      if (
        !SUPABASE_URL ||
        !SUPABASE_SERVICE_ROLE_KEY ||
        !SERPER_API_KEY
      ) {
        return res.status(500).json({
          success: false,
          error:
            "Required environment variables are missing.",
        });
      }

      const skills = await loadSkills();

      if (!skills.length) {
        return res.status(200).json({
          success: true,
          count: 0,
          demand: 0,
          supply: 0,
          saas: 0,
          skillsChecked: 0,
          message:
            "No skills found in Supabase.",
        });
      }

      const demand =
        await runType("Demand", skills);

      const supply =
        await runType("Supply", skills);

      const saas =
        await runType("SaaS", skills);

      const count =
        demand + supply + saas;

      return res.status(200).json({
        success: true,
        count,
        demand,
        supply,
        saas,
        skillsChecked: skills.length,
        message:
          "Real lead collection completed.",
      });
    } catch (error) {
      console.error(
        "Fetch leads error:",
        error
      );

      return res.status(500).json({
        success: false,
        count: 0,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch leads.",
      });
    }
  }
);

export default router;
