import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const SERPER_API_KEY =
  process.env.SERPER_API_KEY ||
  "";

const MAX_AGE_HOURS = 72;
const MAX_QUERIES_PER_TYPE = 6;
const RESULTS_PER_SEARCH = 10;

type LeadType =
  | "Demand"
  | "Supply"
  | "SaaS";

type SkillRow = {
  id?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  tags?: string[] | string;
};

type SearchResult = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  source?: string;
  position?: number;
};

type CollectedLead = {
  leadType: LeadType;
  source: string;
  title: string;
  name?: string;
  company?: string;
  description?: string;
  skill?: string;
  category?: string;
  subcategory?: string;
  country?: string;
  city?: string;
  budget?: string | number;
  currency?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  contactUrl?: string;
  createdAt?: string;
};

type VercelRequest = {
  method?: string;
  body?: any;
  headers?: Record<
    string,
    string | string[] | undefined
  >;
};

type VercelResponse = {
  status: (
    code: number
  ) => VercelResponse;

  json: (body: any) => void;

  setHeader?: (
    name: string,
    value: string
  ) => void;
};

type CollectionStats = {
  found: number;
  accepted: number;
  inserted: number;
  duplicate: number;
  stale: number;
  wrongType: number;
  noContact: number;
  noSkillMatch: number;
  blocked: number;
  insertErrors: number;
};

const COUNTRY_ALIASES: Record<
  string,
  string[]
> = {
  "United States": [
    "united states",
    "usa",
    "us",
    "u.s.",
    "america",
  ],

  Canada: [
    "canada",
    "canadian",
  ],

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
    "united arab emirates",
    "dubai",
    "abu dhabi",
  ],

  Qatar: [
    "qatar",
    "doha",
  ],

  "Saudi Arabia": [
    "saudi arabia",
    "saudi",
    "riyadh",
    "jeddah",
  ],

  Kuwait: [
    "kuwait",
  ],

  Oman: [
    "oman",
    "muscat",
  ],

  Bahrain: [
    "bahrain",
    "manama",
  ],

  Australia: [
    "australia",
    "australian",
  ],

  Sweden: [
    "sweden",
    "swedish",
  ],

  Norway: [
    "norway",
    "norwegian",
  ],

  Denmark: [
    "denmark",
    "danish",
  ],

  Finland: [
    "finland",
    "finnish",
  ],

  Pakistan: [
    "pakistan",
    "pakistani",
    "karachi",
    "lahore",
    "islamabad",
  ],

  India: [
    "india",
    "indian",
  ],

  Bangladesh: [
    "bangladesh",
    "bangladeshi",
  ],

  Germany: [
    "germany",
    "german",
  ],

  France: [
    "france",
    "french",
  ],

  Netherlands: [
    "netherlands",
    "dutch",
  ],
};

const BLOCKED_DOMAINS = [
  "upwork.com",
  "fiverr.com",
  "freelancer.com",
  "peopleperhour.com",
  "guru.com",
  "toptal.com",
  "workana.com",
  "indeed.com",
  "ziprecruiter.com",
  "glassdoor.com",
  "monster.com",
  "careerbuilder.com",
  "simplyhired.com",
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
  "my daughter",
  "my son",
  "my child",
  "my children",
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
  "trainer",
  "educator",
  "instructor",
  "accountant",
  "marketer",
  "mentor",
];

const SAAS_REJECT_TERMS = [
  "dictionary",
  "meaning",
  "definition",
  "wikipedia",
  "resource",
  "resources",
  "job",
  "jobs",
  "vacancy",
  "vacancies",
  "hiring",
  "application",
  "course",
  "courses",
  "webinar",
  "seminar",
  "article",
  "blog",
  "news",
];

function createSupabase() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function normalize(
  value?: string | null
): string {
  return (value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(
  value?: string | null
): string {
  return (value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function tableForType(
  type: LeadType
): string {
  if (type === "Demand") {
    return "demand_leads";
  }

  if (type === "Supply") {
    return "supply_leads";
  }

  return "saas_leads";
}

function domainFromUrl(
  url?: string
): string {
  if (!url) {
    return "";
  }

  try {
    return new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlockedDomain(
  url?: string
): boolean {
  const domain =
    domainFromUrl(url);

  if (!domain) {
    return false;
  }

  return BLOCKED_DOMAINS.some(
    (blocked) =>
      domain === blocked ||
      domain.endsWith(
        `.${blocked}`
      )
  );
}

function containsAny(
  text: string,
  terms: string[]
): boolean {
  const normalized =
    normalize(text);

  return terms.some((term) =>
    normalized.includes(
      normalize(term)
    )
  );
}

function parseResultDate(
  result: SearchResult
): Date | null {
  if (!result.date) {
    return null;
  }

  const parsed =
    new Date(result.date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

/*
 * Demand and Supply freshness rule.
 * SaaS intentionally does NOT use this.
 */
function isFresh(
  result: SearchResult
): boolean {
  const date =
    parseResultDate(result);

  if (!date) {
    return false;
  }

  const ageMs =
    Date.now() -
    date.getTime();

  const maxAgeMs =
    MAX_AGE_HOURS *
    60 *
    60 *
    1000;

  return (
    ageMs >= 0 &&
    ageMs <= maxAgeMs
  );
}
function extractEmails(
  text: string
): string[] {
  const matches =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) || [];

  return [
    ...new Set(
      matches.map((email) =>
        email.trim().toLowerCase()
      )
    ),
  ];
}

function extractPhones(
  text: string
): string[] {
  const matches =
    text.match(
      /(?:\+?\d[\d\s().-]{7,}\d)/g
    ) || [];

  return [
    ...new Set(
      matches
        .map((phone) =>
          phone.replace(/[^\d+]/g, "")
        )
        .filter(
          (phone) =>
            phone.replace(
              /\D/g,
              ""
            ).length >= 8
        )
    ),
  ];
}

function isSocialOrProfileUrl(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  const value =
    normalize(url);

  return (
    value.includes(
      "linkedin.com/in/"
    ) ||
    value.includes(
      "linkedin.com/posts/"
    ) ||
    value.includes(
      "facebook.com/"
    ) ||
    value.includes(
      "instagram.com/"
    ) ||
    value.includes(
      "x.com/"
    ) ||
    value.includes(
      "twitter.com/"
    ) ||
    value.includes(
      "t.me/"
    ) ||
    value.includes(
      "telegram.me/"
    )
  );
}

function isDirectContactUrl(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  const value =
    normalize(url);

  return (
    value.includes("/contact") ||
    value.includes(
      "/contact-us"
    ) ||
    value.includes(
      "/contactus"
    ) ||
    value.includes(
      "/get-in-touch"
    ) ||
    value.includes(
      "/reach-us"
    ) ||
    value.includes(
      "/admissions"
    ) ||
    value.includes(
      "/employment"
    ) ||
    value.includes(
      "/careers"
    ) ||
    value.includes(
      "/staff"
    ) ||
    value.includes(
      "/team"
    ) ||
    value.includes(
      "/faculty"
    )
  );
}

function extractPersonName(
  text: string
): string | undefined {
  const patterns = [
    /(?:by|from|contact|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})['’]s\s+(?:post|profile|page)/,
  ];

  for (const pattern of patterns) {
    const match =
      text.match(pattern);

    if (match?.[1]) {
      return cleanText(
        match[1]
      );
    }
  }

  return undefined;
}

function detectCountry(
  text: string
): string | undefined {
  const normalized =
    normalize(text);

  for (const [
    country,
    aliases,
  ] of Object.entries(
    COUNTRY_ALIASES
  )) {
    if (
      aliases.some(
        (alias) =>
          normalized.includes(
            normalize(alias)
          )
      )
    ) {
      return country;
    }
  }

  return undefined;
}

function detectSkill(
  text: string,
  skills: SkillRow[]
): SkillRow | undefined {
  const normalized =
    normalize(text);

  for (const skill of skills) {
    const candidates = [
      skill.name,
      skill.category,
      skill.subcategory,
    ].filter(Boolean) as string[];

    const tags =
      Array.isArray(skill.tags)
        ? skill.tags
        : typeof skill.tags ===
          "string"
        ? skill.tags.split(",")
        : [];

    candidates.push(...tags);

    if (
      candidates.some(
        (candidate) =>
          normalized.includes(
            normalize(candidate)
          )
      )
    ) {
      return skill;
    }
  }

  const expandedSkillGroups = [
    {
      match: [
        "quran",
        "tajweed",
        "tajwid",
        "qiraat",
        "qirat",
        "hifz",
        "hafiz",
        "tafseer",
        "tafsir",
        "islamic studies",
      ],
      name: "Quran",
    },
    {
      match: [
        "math",
        "mathematics",
        "calculus",
        "algebra",
        "geometry",
      ],
      name: "Mathematics",
    },
    {
      match: [
        "sociology",
        "social research",
        "social science",
      ],
      name: "Sociology",
    },
    {
      match: [
        "psychology",
        "psychological",
      ],
      name: "Psychology",
    },
    {
      match: [
        "anthropology",
        "ethnography",
      ],
      name: "Anthropology",
    },
    {
      match: [
        "economics",
        "economic research",
      ],
      name: "Economics",
    },
    {
      match: [
        "physics",
        "physicist",
      ],
      name: "Physics",
    },
    {
      match: [
        "chemistry",
        "chemist",
      ],
      name: "Chemistry",
    },
  ];

  for (const group of expandedSkillGroups) {
    if (
      group.match.some(
        (term) =>
          normalized.includes(
            normalize(term)
          )
      )
    ) {
      const existing =
        skills.find(
          (skill) =>
            normalize(
              skill.name
            ) ===
            normalize(
              group.name
            )
        );

      return (
        existing || {
          name: group.name,
        }
      );
    }
  }

  return undefined;
}

function getSearchText(
  result: SearchResult
): string {
  return [
    result.title,
    result.snippet,
    result.link,
    result.source,
  ]
    .filter(Boolean)
    .join(" ");
}

function getDirectContact(
  result: SearchResult
): {
  email?: string;
  phone?: string;
  url?: string;
} {
  const text =
    getSearchText(result);

  const emails =
    extractEmails(text);

  const phones =
    extractPhones(text);

  if (emails.length > 0) {
    return {
      email: emails[0],
      phone: phones[0],
      url: result.link,
    };
  }

  if (phones.length > 0) {
    return {
      phone: phones[0],
      url: result.link,
    };
  }

  if (
    isSocialOrProfileUrl(
      result.link
    ) ||
    isDirectContactUrl(
      result.link
    )
  ) {
    return {
      url: result.link,
    };
  }

  return {};
}
function isSaasProfessional(
  text: string
): boolean {
  const normalized =
    normalize(text);

  return PROFESSIONAL_TERMS.some(
    (term) =>
      normalized.includes(
        normalize(term)
      )
  );
}

function isIndividualSaasProfile(
  result: SearchResult
): boolean {
  const text =
    getSearchText(result);

  const normalized =
    normalize(text);

  if (
    SAAS_REJECT_TERMS.some(
      (term) =>
        normalized.includes(
          normalize(term)
        )
    )
  ) {
    return false;
  }

  if (
    !isSaasProfessional(text)
  ) {
    return false;
  }

  const personName =
    extractPersonName(text);

  if (personName) {
    return true;
  }

  if (
    isSocialOrProfileUrl(
      result.link
    )
  ) {
    return true;
  }

  const title =
    normalize(
      result.title
    );

  const hasNamePattern =
    /^[a-z]+(?:\s+[a-z]+){1,3}\b/i.test(
      title
    );

  return hasNamePattern;
}

async function improveContact(
  result: SearchResult
): Promise<{
  email?: string;
  phone?: string;
  url?: string;
}> {
  const initial =
    getDirectContact(result);

  if (
    initial.email ||
    initial.phone ||
    initial.url
  ) {
    return initial;
  }

  if (!result.link) {
    return {};
  }

  try {
    const response =
      await fetch(
        result.link,
        {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 Opportunity-Hub-Lead-Collector",
            Accept:
              "text/html,application/xhtml+xml",
          },
        }
      );

    if (!response.ok) {
      return {};
    }

    const html =
      await response.text();

    const emails =
      extractEmails(html);

    const phones =
      extractPhones(
        html.replace(
          /<[^>]*>/g,
          " "
        )
      );

    if (
      emails.length > 0 ||
      phones.length > 0
    ) {
      return {
        email: emails[0],
        phone: phones[0],
        url: result.link,
      };
    }

    const contactMatch =
      html.match(
        /href=["']([^"']*(?:contact|contact-us|get-in-touch|reach-us|admissions|employment|careers|staff|team|faculty)[^"']*)["']/i
      );

    if (contactMatch?.[1]) {
      try {
        const contactUrl =
          new URL(
            contactMatch[1],
            result.link
          ).toString();

        return {
          url: contactUrl,
        };
      } catch {
        return {};
      }
    }
  } catch {
    return {};
  }

  return {};
}

function buildSkillSearchTerms(
  skill?: SkillRow
): string[] {
  if (!skill) {
    return PROFESSIONAL_TERMS.slice(
      0,
      10
    );
  }

  const terms = [
    skill.name,
    skill.category,
    skill.subcategory,
  ].filter(Boolean) as string[];

  const normalized =
    normalize(
      [
        skill.name,
        skill.category,
        skill.subcategory,
      ]
        .filter(Boolean)
        .join(" ")
    );

  if (
    normalized.includes(
      "quran"
    ) ||
    normalized.includes(
      "tajweed"
    ) ||
    normalized.includes(
      "qirat"
    ) ||
    normalized.includes(
      "hifz"
    ) ||
    normalized.includes(
      "tafseer"
    ) ||
    normalized.includes(
      "tafsir"
    )
  ) {
    terms.push(
      "Quran",
      "Quran teacher",
      "Quran tutor",
      "Tajweed",
      "Tajwid",
      "Qiraat",
      "Hifz",
      "Islamic studies"
    );
  }

  if (
    normalized.includes(
      "math"
    ) ||
    normalized.includes(
      "mathematics"
    ) ||
    normalized.includes(
      "calculus"
    ) ||
    normalized.includes(
      "algebra"
    ) ||
    normalized.includes(
      "geometry"
    )
  ) {
    terms.push(
      "Math",
      "Mathematics",
      "Math teacher",
      "Math tutor",
      "Calculus",
      "Algebra",
      "Geometry"
    );
  }

  if (
    normalized.includes(
      "coach"
    ) ||
    normalized.includes(
      "coaching"
    ) ||
    normalized.includes(
      "mentor"
    )
  ) {
    terms.push(
      "coach",
      "coaching",
      "mentor",
      "mentoring",
      "professional coach",
      "career coach",
      "life coach"
    );
  }

  return [
    ...new Set(
      terms
        .map(
          (term) =>
            cleanText(term)
        )
        .filter(Boolean)
    ),
  ];
}
function buildQueries(
  type: LeadType,
  skills: SkillRow[]
): string[] {
  const skillTerms =
    skills.length > 0
      ? buildSkillSearchTerms(
          skills[0]
        )
      : PROFESSIONAL_TERMS;

  const selected =
    skillTerms.slice(
      0,
      MAX_QUERIES_PER_TYPE
    );

  if (type === "Demand") {
    return selected.map(
      (skill) =>
        `"${skill}" ("looking for" OR "need" OR "seeking" OR "recommend")`
    );
  }

  if (type === "Supply") {
    return selected.map(
      (skill) =>
        `"${skill}" ("hiring" OR "job opening" OR vacancy OR "position available" OR "applications open")`
    );
  }

  return selected.map(
    (skill) =>
      `"${skill}" ("teacher" OR "tutor" OR "coach" OR "consultant" OR "mentor") ("LinkedIn" OR "profile" OR "post")`
  );
}

async function searchSerper(
  query: string,
  type: LeadType
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    throw new Error(
      "SERPER_API_KEY is missing."
    );
  }

  const response =
    await fetch(
      "https://google.serper.dev/search",
      {
        method: "POST",

        headers: {
          "X-API-KEY":
            SERPER_API_KEY,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          q: query,

          num:
            RESULTS_PER_SEARCH,

          ...(type !== "SaaS"
            ? {
                tbs: "qdr:d3",
              }
            : {}),
        }),
      }
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Serper request failed: ${response.status} ${body.slice(
        0,
        300
      )}`
    );
  }

  const data =
    await response.json();

  return Array.isArray(
    data?.organic
  )
    ? data.organic
    : [];
}

async function loadSkills(
  supabase: ReturnType<
    typeof createSupabase
  >
): Promise<SkillRow[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from("skills")
      .select(
        "id,name,category,subcategory,tags"
      )
      .limit(1000);

  if (error) {
    throw new Error(
      `Could not load skills: ${error.message}`
    );
  }

  return Array.isArray(data)
    ? data
    : [];
}

function leadInsertPayload(
  lead: CollectedLead
): Record<string, any> {
  if (
    lead.leadType === "SaaS"
  ) {
    const contact =
      lead.contactEmail ||
      lead.contactPhone ||
      lead.contactName ||
      lead.contactUrl ||
      null;

    return {
      name:
        lead.name ||
        lead.contactName ||
        lead.title,

      platform:
        lead.company ||
        lead.source ||
        "Opportunity Hub",

      niche:
        lead.skill ||
        lead.category ||
        lead.subcategory ||
        null,

      contact,

      status: "active",

      description:
        lead.description ||
        lead.title ||
        null,

      commission: null,

      trial_days: 14,

      landing_url:
        lead.contactUrl ||
        null,

      source_url:
        lead.source ||
        null,

      contact_url:
        lead.contactUrl ||
        null,

      country:
        lead.country ||
        null,

      city:
        lead.city ||
        null,

      created_at:
        new Date().toISOString(),
    };
  }

  return {
    type:
      lead.leadType,

    source:
      lead.source,

    client_name:
      lead.name ||
      lead.title,

    skill_needed:
      lead.skill ||
      null,

    description:
      lead.description ||
      null,

    contact_email:
      lead.contactEmail ||
      null,

    contact_phone:
      lead.contactPhone ||
      null,

    contact_name:
      lead.contactName ||
      lead.name ||
      null,

    status:
      "active",

    title:
      lead.title,

    category:
      lead.category ||
      null,

    subcategory:
      lead.subcategory ||
      null,

    country:
      lead.country ||
      null,

    city:
      lead.city ||
      null,

    budget:
      lead.budget ||
      null,

    currency:
      lead.currency ||
      null,

    contact_url:
      lead.contactUrl ||
      null,

    created_at:
      new Date().toISOString(),
  };
}
async function leadAlreadyExists(
  supabase: ReturnType<
    typeof createSupabase
  >,
  lead: CollectedLead
): Promise<boolean> {
  const table =
    tableForType(
      lead.leadType
    );

  let query =
    supabase
      .from(table)
      .select("id")
      .limit(1);

  if (
    lead.leadType === "SaaS"
  ) {
    if (lead.contactUrl) {
      query = query.eq(
        "contact_url",
        lead.contactUrl
      );
    } else if (lead.source) {
      query = query.eq(
        "source_url",
        lead.source
      );
    } else if (lead.name) {
      query = query.eq(
        "name",
        lead.name
      );
    }
  } else if (lead.source) {
    query = query.eq(
      "source",
      lead.source
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw new Error(
      `Duplicate check failed for ${table}: ${error.message}`
    );
  }

  return (
    Array.isArray(data) &&
    data.length > 0
  );
}

function resultMatchesType(
  result: SearchResult,
  type: LeadType
): boolean {
  const text =
    getSearchText(result);

  if (type === "SaaS") {
    return isIndividualSaasProfile(
      result
    );
  }

  if (type === "Demand") {
    return containsAny(
      text,
      DEMAND_SIGNALS
    );
  }

  if (type === "Supply") {
    return containsAny(
      text,
      SUPPLY_SIGNALS
    );
  }

  return false;
}

async function processResult(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<
  CollectedLead | null
> {
  stats.found++;

  if (
    !result.link ||
    isBlockedDomain(
      result.link
    )
  ) {
    stats.blocked++;
    return null;
  }

  /*
   * Demand and Supply:
   * 72-hour freshness.
   *
   * SaaS:
   * no freshness restriction.
   */
  if (
    type !== "SaaS" &&
    !isFresh(result)
  ) {
    stats.stale++;
    return null;
  }

  if (
    !resultMatchesType(
      result,
      type
    )
  ) {
    stats.wrongType++;
    return null;
  }

  const text =
    getSearchText(result);

  const detectedSkill =
    detectSkill(
      text,
      skills
    );

  if (!detectedSkill) {
    stats.noSkillMatch++;
    return null;
  }

  const contact =
    await improveContact(
      result
    );

  if (
    !contact.email &&
    !contact.phone &&
    !contact.url
  ) {
    stats.noContact++;
    return null;
  }

  const title =
    cleanText(
      result.title ||
        "Real opportunity"
    );

  const description =
    cleanText(
      result.snippet ||
        title
    );

  const personName =
    extractPersonName(
      text
    );

  const country =
    detectCountry(text);

  /*
   * SaaS requires an identifiable
   * supported country.
   */
  if (
    type === "SaaS" &&
    !country
  ) {
    stats.wrongType++;
    return null;
  }

  const lead: CollectedLead = {
    leadType: type,

    source:
      result.link,

    title,

    name:
      personName,

    description,

    skill:
      detectedSkill.name,

    category:
      detectedSkill.category,

    subcategory:
      detectedSkill.subcategory,

    country,

    contactEmail:
      contact.email,

    contactPhone:
      contact.phone,

    contactName:
      personName,

    contactUrl:
      contact.url ||
      result.link,

    createdAt:
      parseResultDate(
        result
      )?.toISOString(),
  };

  stats.accepted++;

  return lead;
}
async function collectType(
  supabase: ReturnType<typeof createSupabase>,
  type: LeadType,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<CollectedLead[]> {
  const queries =
    buildQueries(
      type,
      skills
    );

  const collected: CollectedLead[] = [];

  for (const query of queries) {
    let results: SearchResult[] = [];

    try {
      results =
        await searchSerper(
          query,
          type
        );
    } catch (error) {
      stats.insertErrors++;

      continue;
    }

    for (const result of results) {
      const lead =
        await processResult(
          result,
          type,
          skills,
          stats
        );

      if (!lead) {
        continue;
      }

      const duplicate =
        await leadAlreadyExists(
          supabase,
          lead
        );

      if (duplicate) {
        stats.duplicate++;

        continue;
      }

      collected.push(lead);
    }
  }

  return collected;
}

async function insertLeads(
  supabase: ReturnType<typeof createSupabase>,
  leads: CollectedLead[],
  stats: CollectionStats
): Promise<void> {
  for (const lead of leads) {
    const table =
      tableForType(
        lead.leadType
      );

    const payload =
      leadInsertPayload(
        lead
      );

    const {
      error
    } =
      await supabase
        .from(table)
        .insert(payload);

    if (error) {
      stats.insertErrors++;

      continue;
    }

    stats.inserted++;
  }
}

async function collectDemand(
  supabase: ReturnType<typeof createSupabase>,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<CollectedLead[]> {
  return collectType(
    supabase,
    "Demand",
    skills,
    stats
  );
}

async function collectSupply(
  supabase: ReturnType<typeof createSupabase>,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<CollectedLead[]> {
  return collectType(
    supabase,
    "Supply",
    skills,
    stats
  );
}

async function collectSaas(
  supabase: ReturnType<typeof createSupabase>,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<CollectedLead[]> {
  return collectType(
    supabase,
    "SaaS",
    skills,
    stats
  );
}

function emptyStats(): CollectionStats {
  return {
    found: 0,
    accepted: 0,
    inserted: 0,
    duplicate: 0,
    stale: 0,
    wrongType: 0,
    noContact: 0,
    noSkillMatch: 0,
    blocked: 0,
    insertErrors: 0,
  };
}
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({
        ok: false,
        error:
          "Method not allowed",
      });
  }

  try {
    const supabase =
      createSupabase();

    const skills =
      await loadSkills(
        supabase
      );

    const demandStats =
      emptyStats();

    const supplyStats =
      emptyStats();

    const saasStats =
      emptyStats();

    const demand =
      await collectDemand(
        supabase,
        skills,
        demandStats
      );

    const supply =
      await collectSupply(
        supabase,
        skills,
        supplyStats
      );

    const saas =
      await collectSaas(
        supabase,
        skills,
        saasStats
      );

    await insertLeads(
      supabase,
      demand,
      demandStats
    );

    await insertLeads(
      supabase,
      supply,
      supplyStats
    );

    await insertLeads(
      supabase,
      saas,
      saasStats
    );

    return res
      .status(200)
      .json({
        ok: true,

        message:
          "Real lead collection completed.",

        results: {
          Demand: demandStats,
          Supply: supplyStats,
          SaaS: saasStats,
        },

        totalInserted:
          demandStats.inserted +
          supplyStats.inserted +
          saasStats.inserted,

        totalAccepted:
          demandStats.accepted +
          supplyStats.accepted +
          saasStats.accepted,
      });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error.";

    return res
      .status(500)
      .json({
        ok: false,
        error: message,
      });
  }
}
