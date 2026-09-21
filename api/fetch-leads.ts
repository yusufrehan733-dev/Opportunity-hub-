import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const serperApiKey = process.env.SERPER_API_KEY || "";

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export const config = {
  runtime: "nodejs",
};

const MAX_AGE_HOURS = 72;
const RESULTS_PER_SEARCH = 10;
const MAX_QUERIES_PER_TYPE = 6;

const COUNTRIES = [
  "United States",
  "USA",
  "Canada",
  "United Kingdom",
  "UK",
  "United Arab Emirates",
  "UAE",
  "Australia",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Oman",
  "Bahrain",
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

const JOB_BOARD_DOMAINS = [
  "indeed.com",
  "ziprecruiter.com",
  "glassdoor.com",
  "linkedin.com/jobs",
  "monster.com",
  "careerbuilder.com",
  "simplyhired.com",
];

const GENERIC_TERMS = [
  "free seminar",
  "free webinar",
  "webinar",
  "seminar",
  "enroll now",
  "register now",
  "free trial",
];

const PROVIDER_TERMS = [
  "we offer",
  "we provide",
  "our services",
  "book a session",
  "book your session",
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
];

const DEMAND_SIGNALS = [
  "looking for",
  "need a",
  "need an",
  "need someone",
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
  "can anyone recommend",
  "does anyone know",
  "help me find",
  "recommend a tutor",
  "recommend a teacher",
  "recommend a coach",
];

const SUPPLY_SIGNALS = [
  "hiring",
  "we are hiring",
  "now hiring",
  "job opening",
  "job openings",
  "vacancy",
  "vacancies",
  "position available",
  "position open",
  "applications open",
  "apply now",
  "apply for",
  "recruiting",
  "recruitment",
  "opportunity",
];

const PROFESSIONAL_TERMS = [
  "teacher",
  "tutor",
  "coach",
  "consultant",
  "freelancer",
  "designer",
  "developer",
  "writer",
  "researcher",
  "author",
  "virtual assistant",
  "translator",
  "trainer",
  "educator",
  "instructor",
  "therapist",
  "accountant",
  "marketer",
];

type LeadType = "Demand" | "Supply" | "SaaS";

type SkillRow = {
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | string | null;
};

type SearchResult = {
  title?: string;
  snippet?: string;
  link?: string;
  date?: string;
};

function lower(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
  }
function hasAny(text: string, terms: string[]): boolean {
  const value = lower(text);

  return terms.some((term) =>
    value.includes(lower(term))
  );
}

function isBlocked(url: string): boolean {
  const value = lower(url);

  return BLOCKED_DOMAINS.some((domain) =>
    value.includes(domain)
  );
}

function isJobBoard(url: string): boolean {
  const value = lower(url);

  return JOB_BOARD_DOMAINS.some((domain) =>
    value.includes(domain)
  );
}

function findCountry(text: string): string {
  const value = lower(text);

  for (const country of COUNTRIES) {
    if (value.includes(lower(country))) {
      if (country === "USA") return "United States";
      if (country === "UK") return "United Kingdom";
      if (country === "UAE") {
        return "United Arab Emirates";
      }

      return country;
    }
  }

  return "Global";
}

function extractEmail(text: string): string | null {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/
  );

  return match ? match[0].trim() : null;
}

function isValidHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isSocialOrProfessionalProfile(url: string): boolean {
  const value = lower(url);

  return (
    value.includes("linkedin.com/in/") ||
    value.includes("linkedin.com/company/") ||
    value.includes("facebook.com/") ||
    value.includes("instagram.com/") ||
    value.includes("x.com/") ||
    value.includes("twitter.com/") ||
    value.includes("youtube.com/@") ||
    value.includes("tiktok.com/@")
  );
}

function looksLikeContactPage(url: string): boolean {
  const value = lower(url);

  return (
    value.includes("/contact") ||
    value.includes("/contact-us") ||
    value.includes("/about") ||
    value.includes("/team") ||
    value.includes("/profile") ||
    value.includes("/consultant") ||
    value.includes("/teacher") ||
    value.includes("/tutor") ||
    value.includes("/coach")
  );
}

function getContactFromResult(
  result: SearchResult
): {
  contact: string | null;
  email: string | null;
  phone: string | null;
  contactUrl: string | null;
} {
  const title = clean(result.title);
  const snippet = clean(result.snippet);
  const link = clean(result.link);

  const combined =
    `${title} ${snippet} ${link}`;

  const email = extractEmail(combined);
  const phone = extractPhone(combined);

  if (email) {
    return {
      contact: email,
      email,
      phone,
      contactUrl: link || null,
    };
  }

  if (phone) {
    return {
      contact: phone,
      email,
      phone,
      contactUrl: link || null,
    };
  }

  if (
    isValidHttpUrl(link) &&
    (
      isSocialOrProfessionalProfile(link) ||
      looksLikeContactPage(link)
    )
  ) {
    return {
      contact: link,
      email,
      phone,
      contactUrl: link,
    };
  }

  return {
    contact: null,
    email,
    phone,
    contactUrl: null,
  };
}

function parseDate(value?: string): Date | null {
  if (!value) return null;

  const raw = value.trim().toLowerCase();

  const relative = raw.match(
    /^(\d+)\s+(minute|minutes|hour|hours|day|days)\s+ago$/
  );

  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2];

    let milliseconds = 0;

    if (unit.startsWith("minute")) {
      milliseconds = amount * 60 * 1000;
    } else if (unit.startsWith("hour")) {
      milliseconds = amount * 60 * 60 * 1000;
    } else {
      milliseconds = amount * 24 * 60 * 60 * 1000;
    }

    return new Date(Date.now() - milliseconds);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getResultDate(result: SearchResult): Date {
  return parseDate(result.date) || new Date();
}

function isFresh(date: Date): boolean {
  const ageHours =
    (Date.now() - date.getTime()) /
    (1000 * 60 * 60);

  return ageHours >= 0 && ageHours <= MAX_AGE_HOURS;
}
function uniqueStrings(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => clean(value))
        .filter(Boolean)
    )
  );
}

function getSkillSearchTerms(
  skill: SkillRow
): string[] {
  const terms: string[] = [];

  if (skill.name) {
    terms.push(clean(skill.name));
  }

  if (skill.category) {
    terms.push(clean(skill.category));
  }

  if (skill.subcategory) {
    terms.push(clean(skill.subcategory));
  }

  if (Array.isArray(skill.tags)) {
    terms.push(
      ...skill.tags.map((tag) => clean(tag))
    );
  } else if (typeof skill.tags === "string") {
    terms.push(
      ...skill.tags
        .split(",")
        .map((tag) => clean(tag))
    );
  }

  const text = lower(terms.join(" "));

  // Specialized skill -> broader skill.
  if (
    /tajweed|qiraat|hifz|tafseer|tafsir|quran/.test(
      text
    )
  ) {
    terms.push("Quran");
  }

  if (
    /calculus|algebra|geometry|trigonometry|statistics|mathematics|math/.test(
      text
    )
  ) {
    terms.push("Math");
    terms.push("Mathematics");
  }

  if (/sociology|social research/.test(text)) {
    terms.push("Social Research");
    terms.push("Research");
  }

  if (/psychology|psychological/.test(text)) {
    terms.push("Psychology");
    terms.push("Social Science");
  }

  if (/anthropology/.test(text)) {
    terms.push("Anthropology");
    terms.push("Social Science");
  }

  if (/economics|economic/.test(text)) {
    terms.push("Economics");
    terms.push("Social Science");
  }

  if (/physics/.test(text)) {
    terms.push("Physics");
    terms.push("Science");
  }

  if (/chemistry/.test(text)) {
    terms.push("Chemistry");
    terms.push("Science");
  }

  if (/biology/.test(text)) {
    terms.push("Biology");
    terms.push("Science");
  }

  if (/fiqh/.test(text)) {
    terms.push("Fiqh");
    terms.push("Islamic Studies");
  }

  if (
    /islamiyat|islamic studies|islamic/.test(text)
  ) {
    terms.push("Islamiyat");
    terms.push("Islamic Studies");
  }

  return uniqueStrings(terms);
}

function getAllSkillSearchTerms(
  skills: SkillRow[]
): string[] {
  const all: string[] = [];

  for (const skill of skills) {
    all.push(...getSkillSearchTerms(skill));
  }

  return uniqueStrings(all);
}

function findMatchingSkill(
  text: string,
  skills: SkillRow[]
): {
  name: string;
  category: string;
  subcategory: string;
} | null {
  const value = lower(text);

  // First check the actual saved skill.
  for (const skill of skills) {
    const name = clean(skill.name);

    if (
      name &&
      value.includes(lower(name))
    ) {
      return {
        name,
        category: clean(skill.category),
        subcategory: clean(skill.subcategory),
      };
    }
  }

  // Then check broader/related terms.
  for (const skill of skills) {
    const terms = getSkillSearchTerms(skill);

    const matchingTerm = terms.find(
      (term) =>
        value.includes(lower(term))
    );

    if (matchingTerm) {
      return {
        name:
          clean(skill.name) ||
          matchingTerm,
        category: clean(skill.category),
        subcategory: clean(skill.subcategory),
      };
    }
  }

  return null;
}

function getSearchSkillTerms(
  skills: SkillRow[]
): string[] {
  const terms = getAllSkillSearchTerms(skills);

  if (terms.length > 0) {
    return terms;
  }

  return [
    "teacher",
    "tutor",
    "coach",
    "freelancer",
    "consultant",
  ];
     }
function buildQueries(
  skills: SkillRow[],
  type: LeadType
): string[] {
  const skillTerms =
    getSearchSkillTerms(skills);

  const queries: string[] = [];

  if (type === "Demand") {
    for (
      let i = 0;
      i < Math.min(
        MAX_QUERIES_PER_TYPE,
        skillTerms.length
      );
      i++
    ) {
      const skill = skillTerms[i];

      queries.push(
        `"${skill}" ("looking for" OR "need a" OR "need someone" OR "seeking" OR "wanted")`
      );
    }

    queries.push(
      `"${skillTerms[0]}" ("can anyone recommend" OR "help me find")`
    );
  }

  if (type === "Supply") {
    for (
      let i = 0;
      i < Math.min(
        MAX_QUERIES_PER_TYPE,
        skillTerms.length
      );
      i++
    ) {
      const skill = skillTerms[i];

      queries.push(
        `"${skill}" ("hiring" OR "vacancy" OR "position available" OR "recruiting")`
      );
    }
  }

  if (type === "SaaS") {
    const professionalSearches = [
      "teacher",
      "tutor",
      "coach",
      "consultant",
      "freelancer",
      "designer",
      "developer",
      "writer",
      "researcher",
      "author",
      "virtual assistant",
      "educator",
    ];

    for (
      let i = 0;
      i < professionalSearches.length &&
      queries.length < MAX_QUERIES_PER_TYPE;
      i++
    ) {
      const professional =
        professionalSearches[i];

      queries.push(
        `"${professional}" ("contact" OR "email" OR "DM" OR "message me" OR "LinkedIn" OR "Instagram")`
      );
    }

    for (
      let i = 0;
      i < skillTerms.length &&
      queries.length < MAX_QUERIES_PER_TYPE;
      i++
    ) {
      queries.push(
        `"${skillTerms[i]}" ("teacher" OR "tutor" OR "coach" OR "consultant" OR "freelancer")`
      );
    }
  }

  return uniqueStrings(queries);
}

async function loadSkills(): Promise<SkillRow[]> {
  const { data, error } =
    await supabase
      .from("skills")
      .select(
        "name, category, subcategory, tags"
      );

  if (error) {
    console.error(
      "Skills load error:",
      error
    );

    return [];
  }

  return (data || []) as SkillRow[];
}

async function searchSerper(
  query: string
): Promise<SearchResult[]> {
  if (!serperApiKey) {
    throw new Error(
      "SERPER_API_KEY is missing"
    );
  }

  const response = await fetch(
    "https://google.serper.dev/search",
    {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: RESULTS_PER_SEARCH,
        tbs: "qdr:d3",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Serper request failed: ${response.status}`
    );
  }

  const data = await response.json();

  return (data?.organic || []) as SearchResult[];
}

async function alreadyExists(
  table: string,
  sourceUrl: string
): Promise<boolean> {
  if (!sourceUrl) {
    return false;
  }

  const { data, error } =
    await supabase
      .from(table)
      .select("id")
      .eq("source_url", sourceUrl)
      .limit(1);

  if (error) {
    console.error(
      `Duplicate check failed for ${table}:`,
      error
    );

    return false;
  }

  return Boolean(
    data && data.length > 0
  );
}
function validBaseResult(
  result: SearchResult
): boolean {
  const title = clean(result.title);
  const link = clean(result.link);

  if (!title || !link) {
    return false;
  }

  if (!isValidHttpUrl(link)) {
    return false;
  }

  if (isBlocked(link)) {
    return false;
  }

  if (!isFresh(getResultDate(result))) {
    return false;
  }

  return true;
}

function isDemandLead(
  result: SearchResult
): boolean {
  const text =
    `${clean(result.title)} ${clean(result.snippet)}`;

  if (hasAny(text, GENERIC_TERMS)) {
    return false;
  }

  if (hasAny(text, PROVIDER_TERMS)) {
    return false;
  }

  return hasAny(
    text,
    DEMAND_SIGNALS
  );
}

function isSupplyLead(
  result: SearchResult
): boolean {
  const text =
    `${clean(result.title)} ${clean(result.snippet)}`;

  if (hasAny(text, GENERIC_TERMS)) {
    return false;
  }

  if (
    hasAny(text, [
      "students wanted",
      "students required",
      "accepting students",
      "enrollment",
      "admissions",
      "free class",
      "free lesson",
    ])
  ) {
    return false;
  }

  return hasAny(
    text,
    SUPPLY_SIGNALS
  );
}

function isSaasProfessional(
  result: SearchResult
): boolean {
  const title = clean(result.title);
  const snippet = clean(result.snippet);
  const link = clean(result.link);

  const text =
    `${title} ${snippet} ${link}`;

  if (hasAny(text, GENERIC_TERMS)) {
    return false;
  }

  if (isJobBoard(link)) {
    return false;
  }

  if (
    hasAny(text, [
      "looking for a job",
      "looking for work",
      "seeking employment",
      "open to work",
    ])
  ) {
    return false;
  }

  return hasAny(
    text,
    PROFESSIONAL_TERMS
  );
}

function buildLead(
  result: SearchResult,
  skills: SkillRow[],
  type: LeadType
): Record<string, unknown> | null {
  const title = clean(result.title);
  const snippet = clean(result.snippet);
  const link = clean(result.link);

  if (!validBaseResult(result)) {
    return null;
  }

  const contact =
    getContactFromResult(result);

  // Absolutely mandatory.
  if (!contact.contact) {
    return null;
  }

  const combinedText =
    `${title} ${snippet} ${link}`;

  const matchedSkill =
    findMatchingSkill(
      combinedText,
      skills
    );

  if (!matchedSkill) {
    return null;
  }

  const country =
    findCountry(combinedText);

  let niche =
    matchedSkill.name ||
    matchedSkill.category ||
    "Professional Services";

  if (type === "Demand") {
    niche =
      `${matchedSkill.name || niche} Demand`;
  }

  if (type === "Supply") {
    niche =
      `${matchedSkill.name || niche} Supply`;
  }

  return {
    name: title,
    platform: link,
    niche,
    contact: contact.contact,
    status: "new",
    description:
      snippet ||
      `${type} opportunity related to ${matchedSkill.name}`,
    commission: null,
    trial_days: 14,
    landing_url: link,
    source_url: link,
    contact_url:
      contact.contactUrl || link,
    country,
    city: null,
  };
  }
async function processLead(
  table: string,
  result: SearchResult,
  skills: SkillRow[],
  type: LeadType
): Promise<boolean> {
  if (type === "Demand") {
    if (!isDemandLead(result)) {
      return false;
    }
  }

  if (type === "Supply") {
    if (!isSupplyLead(result)) {
      return false;
    }
  }

  if (type === "SaaS") {
    if (!isSaasProfessional(result)) {
      return false;
    }
  }

  const link = clean(result.link);

  if (
    await alreadyExists(
      table,
      link
    )
  ) {
    return false;
  }

  const lead =
    buildLead(
      result,
      skills,
      type
    );

  if (!lead) {
    return false;
  }

  const { error } =
    await supabase
      .from(table)
      .insert(lead);

  if (error) {
    console.error(
      `Insert failed for ${type}:`,
      error
    );

    return false;
  }

  console.log(
    `Added ${type} lead:`,
    clean(result.title)
  );

  return true;
}

async function runSearches(
  type: LeadType,
  table: string,
  skills: SkillRow[]
): Promise<number> {
  const queries =
    buildQueries(
      skills,
      type
    );

  let added = 0;

  console.log(
    `${type}: running ${queries.length} searches`
  );

  for (const query of queries) {
    try {
      console.log(
        `${type} search:`,
        query
      );

      const results =
        await searchSerper(query);

      console.log(
        `${type}: ${results.length} results`
      );

      for (const result of results) {
        try {
          const inserted =
            await processLead(
              table,
              result,
              skills,
              type
            );

          if (inserted) {
            added++;
          }
        } catch (error) {
          console.error(
            `${type} result processing error:`,
            error
          );
        }
      }
    } catch (error) {
      console.error(
        `${type} search error:`,
        error
      );
    }
  }

  console.log(
    `${type}: added ${added}`
  );

  return added;
    }
async function runCollector(): Promise<{
  demand: number;
  supply: number;
  saas: number;
}> {
  if (!supabaseUrl) {
    throw new Error(
      "SUPABASE_URL is missing"
    );
  }

  if (!supabaseServiceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing"
    );
  }

  if (!serperApiKey) {
    throw new Error(
      "SERPER_API_KEY is missing"
    );
  }

  const skills =
    await loadSkills();

  console.log(
    `Loaded ${skills.length} skills`
  );

  const demand =
    await runSearches(
      "Demand",
      "demand_leads",
      skills
    );

  const supply =
    await runSearches(
      "Supply",
      "supply_leads",
      skills
    );

  const saas =
    await runSearches(
      "SaaS",
      "saas_leads",
      skills
    );

  console.log(
    `COLLECTOR COMPLETE — Demand: ${demand}, Supply: ${supply}, SaaS: ${saas}`
  );

  return {
    demand,
    supply,
    saas,
  };
}

export default async function handler(
  req: any,
  res: any
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({
        success: false,
        error: "Method not allowed",
      });
  }

  try {
    const result =
      await runCollector();

    const total =
      result.demand +
      result.supply +
      result.saas;

    return res
      .status(200)
      .json({
        success: true,
        added: total,
        demand: result.demand,
        supply: result.supply,
        saas: result.saas,
        message:
          `Real lead collection completed. ${total} leads added.`,
      });
  } catch (error) {
    console.error(
      "Lead collector failed:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        added: 0,
        demand: 0,
        supply: 0,
        saas: 0,
        error:
          error instanceof Error
            ? error.message
            : "Lead collector failed",
      });
  }
      }
