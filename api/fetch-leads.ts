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

const MAX_QUERIES_PER_TYPE = 4;

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
  "job boards",
  "job listings",
  "job listing",
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
  "job openings",
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
function lower(
  value: unknown
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function clean(
  value: unknown
): string {
  return String(value ?? "")
    .trim();
}

function hasAny(
  text: string,
  terms: string[]
): boolean {
  const value =
    lower(text);

  return terms.some(
    (term) =>
      value.includes(
        lower(term)
      )
  );
}

function isBlocked(
  url: string
): boolean {
  const value =
    lower(url);

  return BLOCKED_DOMAINS.some(
    (domain) =>
      value.includes(domain)
  );
}

function findCountry(
  text: string
): string {
  const value =
    lower(text);

  for (
    const country of COUNTRIES
  ) {
    if (
      value.includes(
        lower(country)
      )
    ) {
      if (
        country === "USA"
      ) {
        return "United States";
      }

      if (
        country === "UK"
      ) {
        return "United Kingdom";
      }

      if (
        country === "UAE"
      ) {
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
  const match =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

  return match
    ? match[0]
    : null;
}

function extractPhone(
  text: string
): string | null {
  const match =
    text.match(
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

  if (
    isBlocked(link)
  ) {
    return false;
  }

  return /^https?:\/\//i.test(
    link
  );
}

function parseDate(
  value?: string
): Date | null {
  if (!value) {
    return null;
  }

  const raw =
    value
      .trim()
      .toLowerCase();

  const relative =
    raw.match(
      /^(\d+)\s+(minute|minutes|hour|hours|day|days)\s+ago$/
    );

  if (relative) {
    const amount =
      Number(relative[1]);

    const unit =
      relative[2];

    let milliseconds =
      0;

    if (
      unit.startsWith(
        "minute"
      )
    ) {
      milliseconds =
        amount *
        60 *
        1000;
    } else if (
      unit.startsWith(
        "hour"
      )
    ) {
      milliseconds =
        amount *
        60 *
        60 *
        1000;
    } else if (
      unit.startsWith(
        "day"
      )
    ) {
      milliseconds =
        amount *
        24 *
        60 *
        60 *
        1000;
    }

    return new Date(
      Date.now() -
        milliseconds
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
  return (
    parseDate(
      result.date
    ) ||
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
    ageHours <=
      MAX_AGE_HOURS
  );
}

function extractPersonName(
  title: string,
  snippet: string
): string | null {
  const combined =
    `${title} ${snippet}`
      .trim();

  const email =
    extractEmail(
      combined
    );

  if (email) {
    const beforeEmail =
      combined
        .split(email)[0]
        .trim();

    const words =
      beforeEmail
        .split(/\s+/)
        .filter(Boolean);

    if (
      words.length >= 2
    ) {
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
        candidate.length >=
          4 &&
        candidate.length <=
          80
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
    return separators[0]
      .trim();
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

  if (
    type === "SaaS" &&
    hasAny(
      text,
      SAAS_PROVIDER_SIGNALS
    )
  ) {
    score += 30;
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

  if (
    ageHours <= 24
  ) {
    score += 10;
  } else if (
    ageHours <= 48
  ) {
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
    .eq(
      "source",
      source
    )
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
function uniqueStrings(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) =>
          clean(value)
        )
        .filter(Boolean)
    )
  );
}

function getSkillSearchTerms(
  skill: SkillRow
): string[] {
  const terms: string[] = [];

  if (skill.name) {
    terms.push(
      clean(skill.name)
    );
  }

  if (skill.category) {
    terms.push(
      clean(skill.category)
    );
  }

  if (skill.subcategory) {
    terms.push(
      clean(skill.subcategory)
    );
  }

  if (Array.isArray(skill.tags)) {
    terms.push(
      ...skill.tags.map(
        (tag) => clean(tag)
      )
    );
  } else if (
    typeof skill.tags === "string"
  ) {
    terms.push(
      ...skill.tags
        .split(",")
        .map((tag) =>
          clean(tag)
        )
    );
  }

  const text = lower(
    terms.join(" ")
  );

  /*
   * Add broader parent skills.
   *
   * This lets the collector search for
   * both specialized and broader wording.
   */
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

  if (
    /sociology|social research/.test(
      text
    )
  ) {
    terms.push("Social Research");
    terms.push("Research");
  }

  if (
    /psychology|psychological/.test(
      text
    )
  ) {
    terms.push("Psychology");
  }

  if (
    /anthropology/.test(
      text
    )
  ) {
    terms.push("Anthropology");
    terms.push("Social Science");
  }

  if (
    /economics|economic/.test(
      text
    )
  ) {
    terms.push("Economics");
  }

  if (
    /physics/.test(
      text
    )
  ) {
    terms.push("Physics");
    terms.push("Science");
  }

  if (
    /chemistry/.test(
      text
    )
  ) {
    terms.push("Chemistry");
    terms.push("Science");
  }

  if (
    /biology/.test(
      text
    )
  ) {
    terms.push("Biology");
    terms.push("Science");
  }

  if (
    /fiqh/.test(
      text
    )
  ) {
    terms.push("Fiqh");
    terms.push("Islamic Studies");
  }

  if (
    /islamiyat|islamic studies|islamic/.test(
      text
    )
  ) {
    terms.push(
      "Islamiyat"
    );
    terms.push(
      "Islamic Studies"
    );
  }

  return uniqueStrings(
    terms
  );
}

function getAllSkillSearchTerms(
  skills: SkillRow[]
): string[] {
  const all: string[] = [];

  for (
    const skill of skills
  ) {
    all.push(
      ...getSkillSearchTerms(
        skill
      )
    );
  }

  return uniqueStrings(
    all
  );
}

function quoteSearchTerm(
  term: string
): string {
  const value =
    clean(term)
      .replace(
        /"/g,
        ""
      );

  return `"${value}"`;
}

function buildSkillGroups(
  skills: SkillRow[]
): string[][] {
  const terms =
    getAllSkillSearchTerms(
      skills
    );

  if (
    terms.length === 0
  ) {
    return [
      ["teacher"],
      ["tutor"],
      ["freelancer"],
      ["consultant"],
    ];
  }

  const groupCount =
    Math.min(
      MAX_QUERIES_PER_TYPE,
      Math.max(
        1,
        Math.ceil(
          terms.length / 10
        )
      )
    );

  const groups: string[][] =
    Array.from(
      {
        length:
          groupCount,
      },
      () => []
    );

  terms.forEach(
    (
      term,
      index
    ) => {
      groups[
        index %
          groupCount
      ].push(term);
    }
  );

  return groups;
}

function buildQueries(
  skills: SkillRow[],
  signals: string[],
  type:
    | "Demand"
    | "Supply"
    | "SaaS"
): string[] {
  const groups =
    buildSkillGroups(
      skills
    );

  const signalGroups =
    type === "Demand"
      ? [
          [
            "looking for",
            "need",
            "seeking",
            "wanted",
          ],
          [
            "need someone",
            "help me find",
            "can anyone recommend",
          ],
          [
            "my child needs",
            "my daughter needs",
            "my son needs",
          ],
          [
            "client needs",
            "company needs",
            "urgent",
          ],
        ]
      : type === "Supply"
      ? [
          [
            "hiring",
            "now hiring",
            "job opening",
          ],
          [
            "vacancy",
            "vacancies",
            "position available",
          ],
          [
            "apply now",
            "apply for",
            "applications open",
          ],
          [
            "recruiting",
            "seeking a",
            "looking to hire",
          ],
        ]
      : [
          [
            "teacher",
            "tutor",
            "coach",
          ],
          [
            "consultant",
            "researcher",
            "author",
          ],
          [
            "freelancer",
            "designer",
            "developer",
          ],
          [
            "writer",
            "virtual assistant",
            "professional",
          ],
        ];

  const queries: string[] =
    [];

  for (
    let index = 0;
    index <
    Math.min(
      MAX_QUERIES_PER_TYPE,
      groups.length
    );
    index++
  ) {
    const skillPart =
      groups[index]
        .map(
          quoteSearchTerm
        )
        .join(" OR ");

    const signalPart =
      signalGroups[index]
        .map(
          quoteSearchTerm
        )
        .join(" OR ");

    const query =
      `(${skillPart}) (${signalPart})`;

    queries.push(
      query
    );
  }

  /*
   * Make sure every lead type gets
   * at least one search even when the
   * skills table is temporarily empty.
   */
  if (
    queries.length === 0
  ) {
    queries.push(
      `(${signals
        .slice(0, 6)
        .map(
          quoteSearchTerm
        )
        .join(" OR ")})`
    );
  }

  return queries;
}

function findMatchingSkill(
  text: string,
  skills: SkillRow[]
): {
  name: string;
  category: string;
  subcategory: string;
} | null {
  const value =
    lower(text);

  /*
   * Pass 1:
   * exact skill names first.
   *
   * This prevents a broad skill such as
   * "Math" from hiding a more specific
   * skill such as "Calculus".
   */
  for (
    const skill of skills
  ) {
    const name =
      clean(skill.name);

    if (
      name &&
      value.includes(
        lower(name)
      )
    ) {
      return {
        name,
        category:
          clean(
            skill.category
          ),
        subcategory:
          clean(
            skill.subcategory
          ),
      };
    }
  }

  /*
   * Pass 2:
   * category / subcategory / tags.
   */
  for (
    const skill of skills
  ) {
    const terms =
      getSkillSearchTerms(
        skill
      );

    const matchingTerm =
      terms.find(
        (term) =>
          value.includes(
            lower(term)
          )
      );

    if (
      matchingTerm
    ) {
      return {
        name:
          clean(
            skill.name
          ) ||
          matchingTerm,
        category:
          clean(
            skill.category
          ),
        subcategory:
          clean(
            skill.subcategory
          ),
      };
    }
  }

  return null;
}

function getContactValue(
  result: SearchResult
): {
  email: string | null;
  phone: string | null;
  contact: string | null;
} {
  const text =
    `${clean(
      result.title
    )} ${clean(
      result.snippet
    )} ${clean(
      result.link
    )}`;

  const email =
    extractEmail(
      text
    );

  const phone =
    extractPhone(
      text
    );

  const contact =
    email ||
    phone ||
    (isActionableUrl(
      clean(result.link)
    )
      ? clean(
          result.link
        )
      : null);

  return {
    email,
    phone,
    contact,
  };
}

async function processDemand(
  result: SearchResult,
  skills: SkillRow[]
): Promise<boolean> {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const link =
    clean(result.link);

  const text =
    `${title} ${snippet}`;

  if (
    !title ||
    !link
  ) {
    return false;
  }

  if (
    isBlocked(link)
  ) {
    return false;
  }

  if (
    !isFresh(
      getResultDate(
        result
      )
    )
  ) {
    return false;
  }

  if (
    !isDemand(text)
  ) {
    return false;
  }

  const contact =
    getContactValue(
      result
    );

  if (
    !contact.contact
  ) {
    return false;
  }

  const matchedSkill =
    findMatchingSkill(
      text,
      skills
    );

  if (
    !matchedSkill
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

  const date =
    getResultDate(
      result
    );

  const score =
    calculateScore(
      "Demand",
      title,
      snippet,
      link,
      date,
      Boolean(
        contact.contact
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
      skill_needed:
        matchedSkill.name,
      description:
        snippet,
      contact_email:
        contact.email,
      contact_phone:
        contact.phone,
      contact:
        contact.contact,
      status: "new",
      category:
        matchedSkill.category,
      subcategory:
        matchedSkill.subcategory,
      country:
        findCountry(text),
      city: null,
      budget: null,
      currency: null,
      lead_type: "Demand",
      gold_score: score,
      posted_at:
        date.toISOString(),
    }
  );
        }
async function processSupply(
  result: SearchResult,
  skills: SkillRow[]
): Promise<boolean> {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const link =
    clean(result.link);

  const text =
    `${title} ${snippet}`;

  if (
    !title ||
    !link
  ) {
    return false;
  }

  if (
    isBlocked(link)
  ) {
    return false;
  }

  if (
    !isFresh(
      getResultDate(
        result
      )
    )
  ) {
    return false;
  }

  if (
    !isSupply(text)
  ) {
    return false;
  }

  const contact =
    getContactValue(
      result
    );

  if (
    !contact.contact
  ) {
    return false;
  }

  const matchedSkill =
    findMatchingSkill(
      text,
      skills
    );

  if (
    !matchedSkill
  ) {
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

  const date =
    getResultDate(
      result
    );

  const score =
    calculateScore(
      "Supply",
      title,
      snippet,
      link,
      date,
      Boolean(
        contact.contact
      )
    );

  return insertLead(
    "supply_leads",
    {
      source: link,
      source_url: link,
      title,
      company_name:
        extractPersonName(
          title,
          snippet
        ),
      contact_name:
        extractPersonName(
          title,
          snippet
        ),
      skill:
        matchedSkill.name,
      description:
        snippet,
      contact_email:
        contact.email,
      contact_phone:
        contact.phone,
      contact:
        contact.contact,
      status: "new",
      category:
        matchedSkill.category,
      subcategory:
        matchedSkill.subcategory,
      country:
        findCountry(text),
      city: null,
      salary: null,
      currency: null,
      lead_type: "Supply",
      gold_score: score,
      posted_at:
        date.toISOString(),
    }
  );
}

async function processSaas(
  result: SearchResult,
  skills: SkillRow[]
): Promise<boolean> {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const link =
    clean(result.link);

  const text =
    `${title} ${snippet}`;

  if (
    !title ||
    !link
  ) {
    return false;
  }

  if (
    isBlocked(link)
  ) {
    return false;
  }

  if (
    !isFresh(
      getResultDate(
        result
      )
    )
  ) {
    return false;
  }

  if (
    !isSaasProfessional(
      text
    )
  ) {
    return false;
  }

  const contact =
    getContactValue(
      result
    );

  if (
    !contact.contact
  ) {
    return false;
  }

  /*
   * SaaS prospects do not have to be
   * looking for work.
   *
   * We first try to map them to one
   * of the user's supported skills.
   */
  const matchedSkill =
    findMatchingSkill(
      text,
      skills
    );

  const fallbackSkill =
    matchedSkill || {
      name: "Professional Services",
      category:
        "Freelancing & Business",
      subcategory: "",
    };

  if (
    await alreadyExists(
      "saas_leads",
      link
    )
  ) {
    return false;
  }

  const date =
    getResultDate(
      result
    );

  const score =
    calculateScore(
      "SaaS",
      title,
      snippet,
      link,
      date,
      Boolean(
        contact.contact
      )
    );

  return insertLead(
    "saas_leads",
    {
      source: link,
      source_url: link,
      title,
      name:
        extractPersonName(
          title,
          snippet
        ),
      skill:
        fallbackSkill.name,
      description:
        snippet,
      contact_email:
        contact.email,
      contact_phone:
        contact.phone,
      contact:
        contact.contact,
      status: "new",
      category:
        fallbackSkill.category,
      subcategory:
        fallbackSkill.subcategory,
      country:
        findCountry(text),
      city: null,
      lead_type: "SaaS",
      gold_score: score,
      posted_at:
        date.toISOString(),
    }
  );
      }
async function runSearches(
  type:
    | "Demand"
    | "Supply"
    | "SaaS",
  skills: SkillRow[]
): Promise<number> {
  const queries =
    type === "Demand"
      ? buildQueries(
          skills,
          DEMAND_SIGNALS,
          "Demand"
        )
      : type === "Supply"
      ? buildQueries(
          skills,
          SUPPLY_SIGNALS,
          "Supply"
        )
      : buildQueries(
          skills,
          SAAS_PROVIDER_SIGNALS,
          "SaaS"
        );

  let added = 0;

  for (
    const query of queries
  ) {
    try {
      console.log(
        `Searching ${type}:`,
        query
      );

      const results =
        await searchSerper(
          query
        );

      for (
        const result of results
      ) {
        try {
          let inserted =
            false;

          if (
            type === "Demand"
          ) {
            inserted =
              await processDemand(
                result,
                skills
              );
          } else if (
            type === "Supply"
          ) {
            inserted =
              await processSupply(
                result,
                skills
              );
          } else {
            inserted =
              await processSaas(
                result,
                skills
              );
          }

          if (
            inserted
          ) {
            added++;
          }
        } catch (
          error
        ) {
          console.error(
            `Processing ${type} result failed:`,
            error
          );
        }
      }
    } catch (
      error
    ) {
      console.error(
        `${type} search failed:`,
        error
      );
    }
  }

  return added;
}

async function runCollector(): Promise<{
  demand: number;
  supply: number;
  saas: number;
}> {
  if (
    !supabaseUrl
  ) {
    throw new Error(
      "SUPABASE_URL is missing"
    );
  }

  if (
    !supabaseServiceKey
  ) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing"
    );
  }

  if (
    !serperApiKey
  ) {
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
      skills
    );

  const supply =
    await runSearches(
      "Supply",
      skills
    );

  const saas =
    await runSearches(
      "SaaS",
      skills
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
  if (
    req.method !== "POST"
  ) {
    return res
      .status(405)
      .json({
        error:
          "Method not allowed",
      });
  }

  try {
    const result =
      await runCollector();

    return res
      .status(200)
      .json({
        success: true,
        added:
          result.demand +
          result.supply +
          result.saas,
        demand:
          result.demand,
        supply:
          result.supply,
        saas:
          result.saas,
      });
  } catch (
    error
  ) {
    console.error(
      "Lead collector failed:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Lead collector failed",
      });
  }
}

