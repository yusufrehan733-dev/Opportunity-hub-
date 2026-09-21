import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || "";

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const serperApiKey =
  process.env.SERPER_API_KEY || "";

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export const config = {
  runtime: "nodejs",
};

const MAX_AGE_HOURS = 72;

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

const GENERIC_TERMS = [
  "job board",
  "job listings",
  "find freelancers",
  "hire freelancers",
  "freelancers for hire",
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
  "services available",
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
  "admission open",
  "classes available",
  "classes now available",
  "learn with us",
  "learn from us",
  "contact us to enroll",
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
];

const SUPPLY_SIGNALS = [
  "hiring",
  "we are hiring",
  "now hiring",
  "job opening",
  "vacancy",
  "vacancies",
  "position available",
  "position open",
  "seeking a",
  "recruiting",
  "applications open",
  "apply now",
  "apply for",
  "looking to hire",
];

const SAAS_PROVIDER_SIGNALS = [
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
];

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
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function hasAny(
  text: string,
  terms: string[]
): boolean {
  const value = lower(text);

  return terms.some((term) =>
    value.includes(lower(term))
  );
}
function isBlocked(
  url: string
): boolean {
  const value = lower(url);

  return BLOCKED_DOMAINS.some(
    (domain) =>
      value.includes(domain)
  );
}

function findCountry(
  text: string
): string {
  const value = lower(text);

  for (const country of COUNTRIES) {
    if (
      value.includes(
        lower(country)
      )
    ) {
      if (country === "USA") {
        return "United States";
      }

      if (country === "UK") {
        return "United Kingdom";
      }

      if (country === "UAE") {
        return "United Arab Emirates";
      }

      return country;
    }
  }

  return "Global";
}

function extractEmail(
  text: string
): string | null {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match
    ? match[0]
    : null;
}

function extractPhone(
  text: string
): string | null {
  const match = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/
  );

  return match
    ? match[0].trim()
    : null;
}

function isActionableUrl(
  link: string
): boolean {
  if (!link) {
    return false;
  }

  if (isBlocked(link)) {
    return false;
  }

  return /^https?:\/\//i.test(link);
}

function parseDate(
  value?: string
): Date | null {
  if (!value) {
    return null;
  }

  const raw =
    value.trim().toLowerCase();

  const relative =
    raw.match(
      /^(\d+)\s+(minute|minutes|hour|hours|day|days)\s+ago$/
    );

  if (relative) {
    const amount =
      Number(relative[1]);

    const unit =
      relative[2];

    let milliseconds = 0;

    if (
      unit.startsWith("minute")
    ) {
      milliseconds =
        amount * 60 * 1000;
    } else if (
      unit.startsWith("hour")
    ) {
      milliseconds =
        amount *
        60 *
        60 *
        1000;
    } else if (
      unit.startsWith("day")
    ) {
      milliseconds =
        amount *
        24 *
        60 *
        60 *
        1000;
    }

    return new Date(
      Date.now() - milliseconds
    );
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function getResultDate(
  result: SearchResult
): Date {
  const parsed =
    parseDate(result.date);

  return (
    parsed ||
    new Date()
  );
}

function isFresh(
  date: Date
): boolean {
  const ageHours =
    (Date.now() -
      date.getTime()) /
    (1000 * 60 * 60);

  return (
    ageHours >= 0 &&
    ageHours <= MAX_AGE_HOURS
  );
}

function extractPersonName(
  title: string,
  snippet: string
): string | null {
  const combined =
    `${title} ${snippet}`.trim();

  const email =
    extractEmail(combined);

  if (email) {
    const beforeEmail =
      combined
        .split(email)[0]
        .trim();

    const words =
      beforeEmail
        .split(/\s+/)
        .filter(Boolean);

    if (words.length >= 2) {
      const candidate =
        words
          .slice(
            Math.max(
              0,
              words.length - 4
            )
          )
          .join(" ");

      if (
        candidate.length >= 4 &&
        candidate.length <= 80
      ) {
        return candidate;
      }
    }
  }

  const separators =
    title.split(
      /\s*[|–—-]\s*/
    );

  if (
    separators.length > 1 &&
    separators[0]
      .trim()
      .split(/\s+/)
      .length >= 2
  ) {
    return separators[0].trim();
  }

  return null;
  }
function isDemand(
  text: string
): boolean {
  if (
    hasAny(
      text,
      GENERIC_TERMS
    )
  ) {
    return false;
  }

  if (
    hasAny(
      text,
      PROVIDER_TERMS
    )
  ) {
    return false;
  }

  return hasAny(
    text,
    DEMAND_SIGNALS
  );
}

function isSupply(
  text: string
): boolean {
  if (
    hasAny(
      text,
      GENERIC_TERMS
    )
  ) {
    return false;
  }

  if (
    hasAny(text, [
      "students wanted",
      "students required",
      "accepting students",
      "enrollment",
      "admissions",
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
  text: string
): boolean {
  if (
    hasAny(
      text,
      GENERIC_TERMS
    )
  ) {
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
    SAAS_PROVIDER_SIGNALS
  );
}

function calculateScore(
  type:
    | "Demand"
    | "Supply"
    | "SaaS",
  title: string,
  snippet: string,
  link: string,
  date: Date,
  hasContact: boolean
): number {
  const text =
    `${title} ${snippet}`
      .toLowerCase();

  let score = 0;

  if (
    type === "Demand" &&
    hasAny(
      text,
      DEMAND_SIGNALS
    )
  ) {
    score += 30;
  }

  if (
    type === "Supply" &&
    hasAny(
      text,
      SUPPLY_SIGNALS
    )
  ) {
    score += 30;
  }

  if (type === "SaaS") {
    if (
      hasAny(
        text,
        SAAS_PROVIDER_SIGNALS
      )
    ) {
      score += 30;
    }

    if (
      /linkedin|instagram|facebook|youtube|website|profile|portfolio/i.test(
        link
      )
    ) {
      score += 20;
    }
  }

  if (hasContact) {
    score += 25;
  }

  if (link) {
    score += 15;
  }

  const ageHours =
    (Date.now() -
      date.getTime()) /
    (1000 * 60 * 60);

  if (ageHours <= 24) {
    score += 10;
  } else if (ageHours <= 48) {
    score += 5;
  }

  return Math.min(
    score,
    100
  );
}

async function loadSkills(): Promise<
  SkillRow[]
> {
  const {
    data,
    error,
  } = await supabase
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

  return (
    (data || []) as SkillRow[]
  );
}

async function alreadyExists(
  table: string,
  source: string
): Promise<boolean> {
  if (!source) {
    return false;
  }

  const {
    data,
    error,
  } = await supabase
    .from(table)
    .select("id")
    .eq("source", source)
    .limit(1);

  if (error) {
    console.error(
      `Duplicate check failed for ${table}:`,
      error
    );

    return false;
  }

  return Boolean(
    data &&
      data.length > 0
  );
}

async function searchSerper(
  query: string
): Promise<SearchResult[]> {
  if (!serperApiKey) {
    throw new Error(
      "SERPER_API_KEY is missing"
    );
  }

  const response =
    await fetch(
      "https://google.serper.dev/search",
      {
        method: "POST",
        headers: {
          "X-API-KEY":
            serperApiKey,
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
    throw new Error(
      `Serper request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  return (
    data?.organic || []
  ) as SearchResult[];
}

async function insertLead(
  table: string,
  lead: Record<
    string,
    unknown
  >
): Promise<boolean> {
  const {
    error,
  } = await supabase
    .from(table)
    .insert(lead);

  if (error) {
    console.error(
      `Insert failed for ${table}:`,
      error
    );

    return false;
  }

  return true;
  }
function findMatchingSkill(
  text: string,
  skills: SkillRow[]
): SkillRow | null {
  const normalizedText =
    lower(text);

  let bestMatch:
    SkillRow | null = null;

  let bestLength = 0;

  for (const skill of skills) {
    const names = [
      skill.name,
      skill.category,
      skill.subcategory,
      ...(Array.isArray(skill.tags)
        ? skill.tags
        : typeof skill.tags === "string"
        ? skill.tags
            .split(",")
            .map((tag) => tag.trim())
        : [])
    ]
      .filter(Boolean)
      .map((value) =>
        lower(String(value))
      );

    for (const name of names) {
      if (
        name &&
        normalizedText.includes(name) &&
        name.length > bestLength
      ) {
        bestMatch = skill;
        bestLength = name.length;
      }
    }
  }

  return bestMatch;
}

function buildDemandQueries(
  skills: SkillRow[]
): string[] {
  const queries: string[] = [];

  for (const skill of skills) {
    const names = [
      clean(skill.name),
      clean(skill.category),
      clean(skill.subcategory),
    ].filter(Boolean);

    const uniqueNames =
      Array.from(
        new Set(names)
      );

    for (const name of uniqueNames) {
      queries.push(
        `"${name}" ("looking for" OR "need" OR "needed" OR "hiring" OR "seeking")`
      );
    }
  }

  return Array.from(
    new Set(queries)
  ).slice(0, 12);
}

function buildSupplyQueries(
  skills: SkillRow[]
): string[] {
  const queries: string[] = [];

  for (const skill of skills) {
    const names = [
      clean(skill.name),
      clean(skill.category),
      clean(skill.subcategory),
    ].filter(Boolean);

    const uniqueNames =
      Array.from(
        new Set(names)
      );

    for (const name of uniqueNames) {
      queries.push(
        `"${name}" ("job" OR "position" OR "opportunity" OR "vacancy" OR "hiring" OR "recruiting")`
      );
    }
  }

  return Array.from(
    new Set(queries)
  ).slice(0, 12);
}

function buildSaasQueries(
  skills: SkillRow[]
): string[] {
  const queries: string[] = [];

  for (const skill of skills) {
    const names = [
      clean(skill.name),
      clean(skill.category),
      clean(skill.subcategory),
    ].filter(Boolean);

    const uniqueNames =
      Array.from(
        new Set(names)
      );

    for (const name of uniqueNames) {
      queries.push(
        `"${name}" ("teacher" OR "tutor" OR "coach" OR "consultant" OR "researcher" OR "author" OR "designer" OR "developer" OR "writer")`
      );
    }
  }

  return Array.from(
    new Set(queries)
  ).slice(0, 12);
}

async function processDemand(
  result: SearchResult,
  skills: SkillRow[]
): Promise<boolean> {
  const title =
    clean(result.title) ||
    "Untitled Demand Lead";

  const snippet =
    clean(result.snippet);

  const text =
    clean(
      `${title} ${snippet}`
    );

  if (!isDemand(text)) {
    return false;
  }

  if (isBlocked(result.link || "")) {
    return false;
  }

  const date =
    getResultDate(result);

  if (!isFresh(date)) {
    return false;
  }

  const matchedSkill =
    findMatchingSkill(
      text,
      skills
    );

  if (!matchedSkill) {
    return false;
  }

  const email =
    extractEmail(text);

  const phone =
    extractPhone(text);

  const link =
    clean(result.link);

  const actionableUrl =
    isActionableUrl(link)
      ? link
      : "";

  if (
    !email &&
    !phone &&
    !actionableUrl
  ) {
    return false;
  }

  if (
    await alreadyExists(
      "demand_leads",
      link
    )
  ) {
    return false;
  }

  const score =
    calculateScore(
      "Demand",
      title,
      snippet,
      link,
      date,
      Boolean(
        email ||
        phone ||
        actionableUrl
      )
    );

  return insertLead(
    "demand_leads",
    {
      source: link,
      source_url: link,
      title,
      client_name:
        extractPersonName(
          title,
          snippet
        ),
      description: snippet,
      skill_needed:
        matchedSkill.name,
      skill:
        matchedSkill.name,
      category:
        matchedSkill.category,
      subcategory:
        matchedSkill.subcategory,
      country:
        findCountry(text),
      city: "",
      budget: null,
      currency: null,
      contact:
        email ||
        phone ||
        actionableUrl,
      contact_email: email,
      contact_phone: phone,
      contact_url:
        actionableUrl,
      status: "active",
      lead_type: "Demand",
      gold_score: score,
      posted_at:
        date.toISOString(),
      created_at:
        new Date().toISOString(),
    }
  );
            }
