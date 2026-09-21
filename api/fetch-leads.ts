import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const serperApiKey =
  process.env.SERPER_API_KEY || "";

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export const config = {
  runtime: "edge",
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
  "hiring",
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

type SearchResult = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
};

type SkillRow = {
  name?: string;
  category?: string;
  subcategory?: string;
  tags?: string[] | string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function lower(value: string): string {
  return value.toLowerCase();
}

function isBlocked(url: string): boolean {
  const value = lower(url);

  return BLOCKED_DOMAINS.some(
    (domain) =>
      value.includes(domain)
  );
}

function hasAny(
  text: string,
  terms: string[]
): boolean {
  const value = lower(text);

  return terms.some((term) =>
    value.includes(term)
  );
}

function findCountry(text: string): string {
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
        amount * 60 * 60 * 1000;
    } else if (
      unit.startsWith("day")
    ) {
      milliseconds =
        amount * 24 *
        60 * 60 * 1000;
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
  value?: string
): Date {
  const parsed =
    parseDate(value);

  /*
   * Serper does not always return
   * a date field. The search itself
   * is restricted to the last 3 days,
   * so use the collection time when
   * Google/Serper omits the date.
   */
  return parsed || new Date();
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

  return (
    (data || []) as SkillRow[]
  );
}

async function alreadyExists(
  table: string,
  source: string
): Promise<boolean> {
  const { data, error } =
    await supabase
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
    return [];
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
  const { error } =
    await supabase
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
async function processDemand(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  const title =
    clean(result.title);

  const link =
    clean(result.link);

  const snippet =
    clean(result.snippet);

  if (!title || !link) {
    return false;
  }

  const text =
    `${title} ${snippet}`;

  if (isBlocked(link)) {
    return false;
  }

  if (!isDemand(text)) {
    return false;
  }

  const date =
    getResultDate(result.date);

  if (!isFresh(date)) {
    return false;
  }

  const email =
    extractEmail(text);

  const phone =
    extractPhone(text);

  const actionableUrl =
    isActionableUrl(link);

  const hasContact =
    Boolean(
      email ||
      phone ||
      actionableUrl
    );

  const score =
    calculateScore(
      "Demand",
      title,
      snippet,
      link,
      date,
      hasContact
    );

  if (score < 60) {
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

  return insertLead(
    "demand_leads",
    {
      type: "Demand",
      source: link,

      client_name: title,

      skill_needed:
        clean(skill.name),

      description:
        snippet,

      contact_email:
        email,

      contact_phone:
        phone,

      contact:
        actionableUrl
          ? link
          : null,

      contact_url:
        actionableUrl
          ? link
          : null,

      status: "active",

      title,

      category:
        clean(skill.category) ||
        "Real Opportunity",

      subcategory:
        clean(skill.subcategory) ||
        "Google",

      country:
        findCountry(text),

      city: null,
      budget: null,
      currency: null,

      contact_name: null,

      created_at:
        date.toISOString(),
    }
  );
}

async function processSupply(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  const title =
    clean(result.title);

  const link =
    clean(result.link);

  const snippet =
    clean(result.snippet);

  if (!title || !link) {
    return false;
  }

  const text =
    `${title} ${snippet}`;

  if (isBlocked(link)) {
    return false;
  }

  if (!isSupply(text)) {
    return false;
  }

  const date =
    getResultDate(result.date);

  if (!isFresh(date)) {
    return false;
  }

  const email =
    extractEmail(text);

  const phone =
    extractPhone(text);

  const actionableUrl =
    isActionableUrl(link);

  const hasContact =
    Boolean(
      email ||
      phone ||
      actionableUrl
    );

  const score =
    calculateScore(
      "Supply",
      title,
      snippet,
      link,
      date,
      hasContact
    );

  if (score < 60) {
    return false;
  }

  if (
    await alreadyExists(
      "supply_leads",
      link
    )
  ) {
    return false;
  }

  return insertLead(
    "supply_leads",
    {
      type: "Supply",
      source: link,

      /*
       * Supply uses company_name
       * so /api/leads can read it.
       */
      company_name: title,

      /*
       * Keep client_name too when
       * the existing database accepts it.
       */
      client_name: title,

      skill_needed:
        clean(skill.name),

      description:
        snippet,

      contact_email:
        email,

      contact_phone:
        phone,

      contact:
        actionableUrl
          ? link
          : null,

      contact_url:
        actionableUrl
          ? link
          : null,

      status: "active",

      title,

      category:
        clean(skill.category) ||
        "Real Opportunity",

      subcategory:
        clean(skill.subcategory) ||
        "Google",

      country:
        findCountry(text),

      city: null,
      budget: null,
      currency: null,

      contact_name: null,

      created_at:
        date.toISOString(),
    }
  );
}

async function processSaas(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  const title =
    clean(result.title);

  const link =
    clean(result.link);

  const snippet =
    clean(result.snippet);

  if (!title || !link) {
    return false;
  }

  const text =
    `${title} ${snippet}`;

  if (isBlocked(link)) {
    return false;
  }

  if (!isSaasProfessional(text)) {
    return false;
  }

  const date =
    getResultDate(result.date);

  if (!isFresh(date)) {
    return false;
  }

  const email =
    extractEmail(text);

  const phone =
    extractPhone(text);

  const personName =
    extractPersonName(
      title,
      snippet
    );

  /*
   * For SaaS, a public professional
   * profile/source URL is an actionable
   * contact path.
   */
  const actionableUrl =
    isActionableUrl(link);

  const hasContact =
    Boolean(
      email ||
      phone ||
      actionableUrl
    );

  const score =
    calculateScore(
      "SaaS",
      title,
      snippet,
      link,
      date,
      hasContact
    );

  if (score < 60) {
    return false;
  }

  if (
    await alreadyExists(
      "saas_leads",
      link
    )
  ) {
    return false;
  }

  return insertLead(
    "saas_leads",
    {
      type: "SaaS",
      source: link,

      /*
       * SaaS API expects name.
       */
      name:
        personName || title,

      client_name:
        personName || title,

      skill_needed:
        clean(skill.name),

      description:
        snippet,

      contact_email:
        email,

      contact_phone:
        phone,

      contact:
        actionableUrl
          ? link
          : null,

      contact_url:
        actionableUrl
          ? link
          : null,

      contact_name:
        personName,

      status: "active",

      title,

      category:
        clean(skill.category) ||
        "Professional",

      subcategory:
        clean(skill.subcategory) ||
        "SaaS Prospect",

      country:
        findCountry(text),

      city: null,
      budget: null,
      currency: null,

      created_at:
        date.toISOString(),
    }
  );
   }
async function processDemand(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  const title =
    clean(result.title);

  const link =
    clean(result.link);

  const snippet =
    clean(result.snippet);

  if (!title || !link) {
    return false;
  }

  const text =
    `${title} ${snippet}`;

  if (isBlocked(link)) {
    return false;
  }

  if (!isDemand(text)) {
    return false;
  }

  const date =
    getResultDate(result.date);

  if (!isFresh(date)) {
    return false;
  }

  const email =
    extractEmail(text);

  const phone =
    extractPhone(text);

  const actionableUrl =
    isActionableUrl(link);

  const hasContact =
    Boolean(
      email ||
      phone ||
      actionableUrl
    );

  const score =
    calculateScore(
      "Demand",
      title,
      snippet,
      link,
      date,
      hasContact
    );

  if (score < 60) {
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

  return insertLead(
    "demand_leads",
    {
      type: "Demand",
      source: link,

      client_name: title,

      skill_needed:
        clean(skill.name),

      description:
        snippet,

      contact_email:
        email,

      contact_phone:
        phone,

      contact:
        actionableUrl
          ? link
          : null,

      contact_url:
        actionableUrl
          ? link
          : null,

      status: "active",

      title,

      category:
        clean(skill.category) ||
        "Real Opportunity",

      subcategory:
        clean(skill.subcategory) ||
        "Google",

      country:
        findCountry(text),

      city: null,
      budget: null,
      currency: null,

      contact_name: null,

      created_at:
        date.toISOString(),
    }
  );
}

async function processSupply(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  const title =
    clean(result.title);

  const link =
    clean(result.link);

  const snippet =
    clean(result.snippet);

  if (!title || !link) {
    return false;
  }

  const text =
    `${title} ${snippet}`;

  if (isBlocked(link)) {
    return false;
  }

  if (!isSupply(text)) {
    return false;
  }

  const date =
    getResultDate(result.date);

  if (!isFresh(date)) {
    return false;
  }

  const email =
    extractEmail(text);

  const phone =
    extractPhone(text);

  const actionableUrl =
    isActionableUrl(link);

  const hasContact =
    Boolean(
      email ||
      phone ||
      actionableUrl
    );

  const score =
    calculateScore(
      "Supply",
      title,
      snippet,
      link,
      date,
      hasContact
    );

  if (score < 60) {
    return false;
  }

  if (
    await alreadyExists(
      "supply_leads",
      link
    )
  ) {
    return false;
  }

  return insertLead(
    "supply_leads",
    {
      type: "Supply",
      source: link,

      /*
       * Supply uses company_name
       * so /api/leads can read it.
       */
      company_name: title,

      /*
       * Keep client_name too when
       * the existing database accepts it.
       */
      client_name: title,

      skill_needed:
        clean(skill.name),

      description:
        snippet,

      contact_email:
        email,

      contact_phone:
        phone,

      contact:
        actionableUrl
          ? link
          : null,

      contact_url:
        actionableUrl
          ? link
          : null,

      status: "active",

      title,

      category:
        clean(skill.category) ||
        "Real Opportunity",

      subcategory:
        clean(skill.subcategory) ||
        "Google",

      country:
        findCountry(text),

      city: null,
      budget: null,
      currency: null,

      contact_name: null,

      created_at:
        date.toISOString(),
    }
  );
}

async function processSaas(
  result: SearchResult,
  skill: SkillRow
): Promise<boolean> {
  const title =
    clean(result.title);

  const link =
    clean(result.link);

  const snippet =
    clean(result.snippet);

  if (!title || !link) {
    return false;
  }

  const text =
    `${title} ${snippet}`;

  if (isBlocked(link)) {
    return false;
  }

  if (!isSaasProfessional(text)) {
    return false;
  }

  const date =
    getResultDate(result.date);

  if (!isFresh(date)) {
    return false;
  }

  const email =
    extractEmail(text);

  const phone =
    extractPhone(text);

  const personName =
    extractPersonName(
      title,
      snippet
    );

  /*
   * For SaaS, a public professional
   * profile/source URL is an actionable
   * contact path.
   */
  const actionableUrl =
    isActionableUrl(link);

  const hasContact =
    Boolean(
      email ||
      phone ||
      actionableUrl
    );

  const score =
    calculateScore(
      "SaaS",
      title,
      snippet,
      link,
      date,
      hasContact
    );

  if (score < 60) {
    return false;
  }

  if (
    await alreadyExists(
      "saas_leads",
      link
    )
  ) {
    return false;
  }

  return insertLead(
    "saas_leads",
    {
      type: "SaaS",
      source: link,

      /*
       * SaaS API expects name.
       */
      name:
        personName || title,

      client_name:
        personName || title,

      skill_needed:
        clean(skill.name),

      description:
        snippet,

      contact_email:
        email,

      contact_phone:
        phone,

      contact:
        actionableUrl
          ? link
          : null,

      contact_url:
        actionableUrl
          ? link
          : null,

      contact_name:
        personName,

      status: "active",

      title,

      category:
        clean(skill.category) ||
        "Professional",

      subcategory:
        clean(skill.subcategory) ||
        "SaaS Prospect",

      country:
        findCountry(text),

      city: null,
      budget: null,
      currency: null,

      created_at:
        date.toISOString(),
    }
  );
}
