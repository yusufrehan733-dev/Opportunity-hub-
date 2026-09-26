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
  id?: string | null;
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

type CollectedLead = {
  leadType: LeadType;
  title: string;
  name: string;
  description: string;
  skill: string;
  category: string;
  subcategory: string;
  country: string;
  city: string;
  contact: string;
  contactEmail: string;
  contactPhone: string;
  contactUrl: string;
  source: string;
  openUrl: string;
  budget: string;
  currency: string;
};

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function lower(value: unknown): string {
  return clean(value).toLowerCase();
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

function isValidHttpUrl(
  value: string
): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function uniqueStrings(
  values: string[]
): string[] {
  return Array.from(
    new Set(values.filter(Boolean))
  );
}

function escapeRegExp(
  value: string
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

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

const COUNTRY_ALIASES: Record<
  string,
  string[]
> = {
  "United States": [
    "united states",
    "usa",
    "u.s.a.",
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
    "u.a.e.",
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
    "holland",
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

const PROVIDER_TERMS = [
  "my services",
  "hire me",
  "book me",
  "we offer",
  "i offer",
  "i provide",
  "our services",
  "portfolio",
  "available for hire",
];
function containsCountryAlias(
  text: string,
  alias: string
): boolean {
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

function findCountry(
  text: string,
  link = ""
): string {
  const combined =
    `${text} ${link}`;

  for (const country of COUNTRIES) {
    const aliases =
      COUNTRY_ALIASES[country] ||
      [country];

    if (
      aliases.some((alias) =>
        containsCountryAlias(
          combined,
          alias
        )
      )
    ) {
      return country;
    }
  }

  return "";
}

function extractEmail(
  text: string
): string {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match?.[0] || "";
}

function extractPhone(
  text: string
): string {
  const match = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/
  );

  return match?.[0]?.trim() || "";
}

function extractPersonName(
  title: string,
  snippet: string
): string {
  const text =
    `${clean(title)} ${clean(snippet)}`;

  const patterns = [
    /(?:by|from|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*[-|–]/,
  ];

  for (const pattern of patterns) {
    const match =
      text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function isBlocked(
  link: string
): boolean {
  const value = lower(link);

  return BLOCKED_DOMAINS.some(
    (domain) =>
      value.includes(domain)
  );
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

  return socialPatterns.some(
    (pattern) =>
      value.includes(pattern)
  );
}

function isDirectContactUrl(
  link: string
): boolean {
  const value = lower(link);

  if (!isValidHttpUrl(link)) {
    return false;
  }

  if (
    isSpecificSocialOrProfileUrl(
      link
    )
  ) {
    return true;
  }

  const contactTerms = [
    "/contact",
    "/contact-us",
    "/get-in-touch",
    "/reach-me",
    "/book",
    "/booking",
    "/hire",
  ];

  return contactTerms.some(
    (term) =>
      value.includes(term)
  );
}

function isGenericSaasPage(
  result: SearchResult
): boolean {
  const title =
    lower(result.title);

  const snippet =
    lower(result.snippet);

  const link =
    lower(result.link);

  const combined =
    `${title} ${snippet} ${link}`;

  if (
    hasAny(
      combined,
      SAAS_REJECT_TERMS
    )
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

  return blockedPageDomains.some(
    (domain) =>
      link.includes(domain)
  );
}

function hasSaasIdentitySignal(
  result: SearchResult
): boolean {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const link =
    clean(result.link);

  const text =
    `${title} ${snippet}`;

  if (
    isSpecificSocialOrProfileUrl(
      link
    )
  ) {
    return true;
  }

  return hasAny(text, [
    "profile",
    "portfolio",
    "about me",
    "my services",
    "my coaching",
    "my consulting",
    "work with me",
    "hire me",
    "contact me",
    "book me",
    "personal website",
    "professional",
  ]);
}

function isSaasProfessional(
  result: SearchResult
): boolean {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const link =
    clean(result.link);

  if (
    !title ||
    !link ||
    !snippet
  ) {
    return false;
  }

  if (isBlocked(link)) {
    return false;
  }

  if (
    isGenericSaasPage(result)
  ) {
    return false;
  }

  const combined =
    `${title} ${snippet}`;

  if (
    !hasAny(
      combined,
      PROFESSIONAL_TERMS
    )
  ) {
    return false;
  }

  return hasSaasIdentitySignal(
    result
  );
}

function isIndividualSaasProfile(
  result: SearchResult
): boolean {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const link =
    clean(result.link);

  const combined =
    `${title} ${snippet}`;

  if (
    isSpecificSocialOrProfileUrl(
      link
    )
  ) {
    return true;
  }

  const genericPageTerms = [
    "resource center",
    "directory",
    "marketplace",
    "education resources",
    "teacher resources",
    "teaching resources",
    "lesson plans",
    "lesson resources",
    "community",
    "forum",
    "organization",
    "association",
    "school",
    "university",
    "college",
    "institute",
    "platform",
    "company",
    "agency",
    "corporation",
  ];

  if (
    hasAny(
      combined,
      genericPageTerms
    )
  ) {
    return false;
  }

  const personName =
    extractPersonName(
      title,
      snippet
    );

  if (personName) {
    return true;
  }

  return hasAny(combined, [
    "about me",
    "my services",
    "my coaching",
    "my consulting",
    "work with me",
    "hire me",
    "contact me",
    "book me",
    "personal website",
  ]);
  }
function getSkillName(
  skill: SkillRow
): string {
  return (
    clean(skill.name) ||
    clean(skill.subcategory) ||
    clean(skill.category)
  );
}

function getSkillSearchTerms(
  skill: SkillRow
): string[] {
  const terms: string[] = [];

  const add = (value: unknown) => {
    const text = clean(value);

    if (
      text &&
      !terms.some(
        (item) =>
          lower(item) ===
          lower(text)
      )
    ) {
      terms.push(text);
    }
  };

  add(skill.name);
  add(skill.category);
  add(skill.subcategory);

  if (Array.isArray(skill.tags)) {
    skill.tags.forEach(add);
  } else if (
    typeof skill.tags === "string"
  ) {
    skill.tags
      .split(",")
      .forEach(add);
  }

  const combined =
    lower(terms.join(" "));

  if (
    combined.includes("tajweed") ||
    combined.includes("qiraat") ||
    combined.includes("hifz") ||
    combined.includes("tafseer") ||
    combined.includes("tafsir") ||
    combined.includes("quran")
  ) {
    add("Quran");
  }

  if (
    combined.includes("math") ||
    combined.includes("mathematics")
  ) {
    add("Math");
    add("Mathematics");
  }

  if (
    combined.includes("sociology") ||
    combined.includes("social research")
  ) {
    add("Social Research");
    add("Research");
  }

  if (
    combined.includes("psychology")
  ) {
    add("Psychology");
    add("Social Science");
  }

  if (
    combined.includes("anthropology")
  ) {
    add("Anthropology");
    add("Social Science");
  }

  if (
    combined.includes("economics")
  ) {
    add("Economics");
    add("Social Science");
  }

  if (
    combined.includes("physics")
  ) {
    add("Physics");
    add("Science");
  }

  if (
    combined.includes("chemistry")
  ) {
    add("Chemistry");
    add("Science");
  }

  return terms;
}

function buildQueries(
  skills: SkillRow[],
  type: LeadType
): string[] {
  const skillTerms =
    uniqueStrings(
      skills.flatMap(
        (skill) =>
          getSkillSearchTerms(
            skill
          )
      )
    );

  const queries: string[] = [];

  if (type === "Demand") {
    for (
      let i = 0;
      i <
        Math.min(
          MAX_QUERIES_PER_TYPE,
          skillTerms.length
        );
      i++
    ) {
      const skill =
        skillTerms[i];

      queries.push(
        `"${skill}" ("looking for" OR "need a" OR "need someone" OR "seeking" OR "wanted")`
      );
    }

    if (skillTerms[0]) {
      queries.push(
        `"${skillTerms[0]}" ("can anyone recommend" OR "help me find")`
      );
    }
  }

  if (type === "Supply") {
    for (
      let i = 0;
      i <
        Math.min(
          MAX_QUERIES_PER_TYPE,
          skillTerms.length
        );
      i++
    ) {
      const skill =
        skillTerms[i];

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
      i <
        professionalSearches.length &&
        queries.length <
          MAX_QUERIES_PER_TYPE;
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
      i <
        skillTerms.length &&
        queries.length <
          MAX_QUERIES_PER_TYPE;
      i++
    ) {
      queries.push(
        `"${skillTerms[i]}" ("teacher" OR "tutor" OR "coach" OR "consultant" OR "freelancer")`
      );
    }
  }

  return uniqueStrings(
    queries
  );
}

function parseResultDate(
  value: string
): Date | null {
  const text = clean(value);

  if (!text) {
    return null;
  }

  const directDate =
    new Date(text);

  if (
    !Number.isNaN(
      directDate.getTime()
    )
  ) {
    return directDate;
  }

  const relative =
    lower(text).match(
      /(\d+)\s*(minute|minutes|hour|hours|day|days)\s*ago/
    );

  if (relative) {
    const amount =
      Number(relative[1]);

    const unit =
      relative[2];

    const milliseconds =
      unit.startsWith("minute")
        ? amount * 60 * 1000
        : unit.startsWith("hour")
        ? amount * 60 * 60 * 1000
        : amount *
          24 *
          60 *
          60 *
          1000;

    return new Date(
      Date.now() -
        milliseconds
    );
  }

  return null;
}

function isFresh(
  value: string
): boolean {
  const parsed =
    parseResultDate(value);

  if (!parsed) {
    return true;
  }

  const age =
    Date.now() -
    parsed.getTime();

  const maxAge =
    MAX_AGE_HOURS *
    60 *
    60 *
    1000;

  return (
    age >= 0 &&
    age <= maxAge
  );
}

function getDirectContact(
  result: SearchResult
): {
  contact: string;
  contactEmail: string;
  contactPhone: string;
  contactUrl: string;
} {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const link =
    clean(result.link);

  const combined =
    `${title} ${snippet} ${link}`;

  const email =
    extractEmail(combined);

  const phone =
    extractPhone(combined);

  if (email) {
    return {
      contact: email,
      contactEmail: email,
      contactPhone: "",
      contactUrl: "",
    };
  }

  if (phone) {
    return {
      contact: phone,
      contactEmail: "",
      contactPhone: phone,
      contactUrl: "",
    };
  }

  if (
    isSpecificSocialOrProfileUrl(
      link
    )
  ) {
    return {
      contact: link,
      contactEmail: "",
      contactPhone: "",
      contactUrl: link,
    };
  }

  if (
    isDirectContactUrl(link)
  ) {
    return {
      contact: link,
      contactEmail: "",
      contactPhone: "",
      contactUrl: link,
    };
  }

  return {
    contact: "",
    contactEmail: "",
    contactPhone: "",
    contactUrl: "",
  };
      }
function isDemandLead(
  result: SearchResult
): boolean {
  const combined =
    `${clean(result.title)} ${clean(
      result.snippet
    )}`;

  if (
    !hasAny(
      combined,
      DEMAND_SIGNALS
    )
  ) {
    return false;
  }

  if (
    hasAny(
      combined,
      PROVIDER_TERMS
    )
  ) {
    return false;
  }

  return true;
}

function isSupplyLead(
  result: SearchResult
): boolean {
  const combined =
    `${clean(result.title)} ${clean(
      result.snippet
    )}`;

  if (
    !hasAny(
      combined,
      SUPPLY_SIGNALS
    )
  ) {
    return false;
  }

  if (
    hasAny(
      combined,
      DEMAND_SIGNALS
    )
  ) {
    return false;
  }

  return true;
}

function isSaasJobSeeker(
  result: SearchResult
): boolean {
  const combined =
    `${clean(result.title)} ${clean(
      result.snippet
    )}`;

  const jobSeekerTerms = [
    "looking for work",
    "looking for a job",
    "seeking employment",
    "seeking a job",
    "open to work",
    "available for work",
    "available for employment",
    "resume",
    "cv",
    "curriculum vitae",
  ];

  return hasAny(
    combined,
    jobSeekerTerms
  );
}

function hasSaasPersonIdentity(
  result: SearchResult,
  pageText = ""
): string {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const link =
    clean(result.link);

  if (
    isSpecificSocialOrProfileUrl(
      link
    )
  ) {
    return (
      extractPersonName(
        title,
        snippet
      ) ||
      "Professional"
    );
  }

  const resultName =
    extractPersonName(
      title,
      snippet
    );

  if (resultName) {
    return resultName;
  }

  return extractPersonName(
    pageText,
    ""
  );
}

function extractHtmlText(
  html: string
): string {
  return html
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<noscript[\s\S]*?<\/noscript>/gi,
      " "
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function extractContactUrlFromHtml(
  html: string,
  baseUrl: string
): string {
  const matches =
    html.match(
      /href\s*=\s*["']([^"']+)["']/gi
    ) || [];

  const contactTerms = [
    "contact",
    "get-in-touch",
    "reach-me",
    "book",
    "booking",
    "hire",
  ];

  for (const raw of matches) {
    const match =
      raw.match(
        /href\s*=\s*["']([^"']+)["']/i
      );

    const href =
      match?.[1] || "";

    if (!href) {
      continue;
    }

    if (
      !hasAny(
        href,
        contactTerms
      )
    ) {
      continue;
    }

    try {
      const resolved =
        new URL(
          href,
          baseUrl
        ).toString();

      if (
        isValidHttpUrl(
          resolved
        )
      ) {
        return resolved;
      }
    } catch {
      continue;
    }
  }

  return "";
}

async function inspectSaasSource(
  link: string
): Promise<{
  pageText: string;
  email: string;
  phone: string;
  contactUrl: string;
}> {
  if (!isValidHttpUrl(link)) {
    return {
      pageText: "",
      email: "",
      phone: "",
      contactUrl: "",
    };
  }

  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        6000
      );

    const response =
      await fetch(link, {
        method: "GET",
        redirect: "follow",
        signal:
          controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 OpportunityHubLeadCollector/1.0",
        },
      });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        pageText: "",
        email: "",
        phone: "",
        contactUrl: "",
      };
    }

    const html =
      await response.text();

    const pageText =
      extractHtmlText(html);

    const email =
      extractEmail(
        `${html} ${pageText}`
      );

    const phone =
      extractPhone(pageText);

    const contactUrl =
      extractContactUrlFromHtml(
        html,
        link
      );

    return {
      pageText,
      email,
      phone,
      contactUrl,
    };
  } catch {
    return {
      pageText: "",
      email: "",
      phone: "",
      contactUrl: "",
    };
  }
      }
async function searchSerper(
  query: string
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
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
          "Content-Type":
            "application/json",
          "X-API-KEY":
            SERPER_API_KEY,
        },
        body: JSON.stringify({
          q: query,
          num: RESULTS_PER_SEARCH,
          tbs: "qdr:d3",
        }),
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Serper request failed: ${response.status} ${errorText.slice(
        0,
        200
      )}`
    );
  }

  const data =
    (await response.json()) as {
      organic?: SearchResult[];
    };

  return Array.isArray(
    data.organic
  )
    ? data.organic
    : [];
}

function getSupabase() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing"
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );
}

async function loadSkills(): Promise<
  SkillRow[]
> {
  const supabase =
    getSupabase();

  const {
    data,
    error,
  } =
    await supabase
      .from("skills")
      .select(
        "id,name,category,subcategory,tags"
      );

  if (error) {
    throw new Error(
      `Failed to load skills: ${error.message}`
    );
  }

  return Array.isArray(data)
    ? data
    : [];
}

function getLeadTable(
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

async function leadAlreadyExists(
  table: string,
  title: string,
  source: string
): Promise<boolean> {
  const supabase =
    getSupabase();

  const safeTitle =
    clean(title);

  const safeSource =
    clean(source);

  if (safeTitle) {
    const {
      data,
      error,
    } =
      await supabase
        .from(table)
        .select("id")
        .eq(
          "title",
          safeTitle
        )
        .limit(1);

    if (
      !error &&
      Array.isArray(data) &&
      data.length > 0
    ) {
      return true;
    }
  }

  if (safeSource) {
    const {
      data,
      error,
    } =
      await supabase
        .from(table)
        .select("id")
        .eq(
          "source",
          safeSource
        )
        .limit(1);

    if (
      !error &&
      Array.isArray(data) &&
      data.length > 0
    ) {
      return true;
    }
  }

  return false;
}

function createBaseLead(
  type: LeadType,
  result: SearchResult,
  skill: SkillRow,
  contact: {
    contact: string;
    contactEmail: string;
    contactPhone: string;
    contactUrl: string;
  }
): CollectedLead {
  const title =
    clean(result.title) ||
    "Opportunity";

  const description =
    clean(result.snippet);

  const link =
    clean(result.link);

  const combined =
    `${title} ${description}`;

  const skillName =
    getSkillName(skill);

  const country =
    findCountry(
      combined,
      link
    );

  const personName =
    extractPersonName(
      title,
      description
    );

  return {
    leadType: type,
    title,
    name: personName,
    description,
    skill: skillName,
    category:
      clean(skill.category),
    subcategory:
      clean(skill.subcategory),
    country,
    city: "",
    contact:
      contact.contact,
    contactEmail:
      contact.contactEmail,
    contactPhone:
      contact.contactPhone,
    contactUrl:
      contact.contactUrl,
    source: link,
    openUrl: link,
    budget: "",
    currency: "",
  };
}

function hasRequiredContact(
  lead: CollectedLead
): boolean {
  return Boolean(
    clean(lead.contactEmail) ||
      clean(lead.contactPhone) ||
      clean(lead.contactUrl) ||
      clean(lead.contact)
  );
}

function matchesSkill(
  result: SearchResult,
  skill: SkillRow
): boolean {
  const combined =
    `${clean(result.title)} ${clean(
      result.snippet
    )}`;

  const terms =
    getSkillSearchTerms(
      skill
    );

  if (!terms.length) {
    return true;
  }

  return terms.some(
    (term) =>
      lower(combined).includes(
        lower(term)
      )
  );
}

async function insertLead(
  type: LeadType,
  lead: CollectedLead
): Promise<{
  inserted: boolean;
  reason?: string;
}> {
  const table =
    getLeadTable(type);

  if (
    !lead.title ||
    !lead.source
  ) {
    return {
      inserted: false,
      reason:
        "Missing title or source",
    };
  }

  if (
    !hasRequiredContact(lead)
  ) {
    return {
      inserted: false,
      reason:
        "No direct contact",
    };
  }

  const exists =
    await leadAlreadyExists(
      table,
      lead.title,
      lead.source
    );

  if (exists) {
    return {
      inserted: false,
      reason:
        "Already exists",
    };
  }

  const supabase =
    getSupabase();

  const payload = {
    title: lead.title,
    name: lead.name,
    description:
      lead.description,
    content:
      lead.description,
    skill_needed: lead.skill,
    category:
      lead.category,
    subcategory:
      lead.subcategory,
    country:
      lead.country,
    city:
      lead.city,
    budget:
      lead.budget,
    currency:
      lead.currency,
    contact_email:
      lead.contactEmail,
    contact_phone:
      lead.contactPhone,
    source:
      lead.source,
    status: "new",
  };

  const {
    error,
  } =
    await supabase
      .from(table)
      .insert(payload);

  if (error) {
    return {
      inserted: false,
      reason:
        error.message,
    };
  }

  return {
    inserted: true,
  };
                       }
async function collectDemand(
  skills: SkillRow[]
): Promise<{
  found: number;
  inserted: number;
  skipped: number;
}> {
  let found = 0;
  let inserted = 0;
  let skipped = 0;

  const queries =
    buildQueries(
      skills,
      "Demand"
    );

  for (const query of queries) {
    let results: SearchResult[] = [];

    try {
      results =
        await searchSerper(
          query
        );
    } catch {
      continue;
    }

    for (const result of results) {
      const link =
        clean(result.link);

      if (
        !link ||
        !isValidHttpUrl(link) ||
        isBlocked(link)
      ) {
        skipped++;
        continue;
      }

      if (
        !isFresh(
          clean(result.date)
        )
      ) {
        skipped++;
        continue;
      }

      if (
        !isDemandLead(result)
      ) {
        skipped++;
        continue;
      }

      const contact =
        getDirectContact(
          result
        );

      if (!hasRequiredContact({
        leadType: "Demand",
        title: clean(result.title),
        name: "",
        description: clean(result.snippet),
        skill: "",
        category: "",
        subcategory: "",
        country: "",
        city: "",
        contact: contact.contact,
        contactEmail: contact.contactEmail,
        contactPhone: contact.contactPhone,
        contactUrl: contact.contactUrl,
        source: link,
        openUrl: link,
        budget: "",
        currency: "",
      })) {
        skipped++;
        continue;
      }

      let matchedSkill:
        | SkillRow
        | undefined;

      for (const skill of skills) {
        if (
          matchesSkill(
            result,
            skill
          )
        ) {
          matchedSkill =
            skill;
          break;
        }
      }

      if (!matchedSkill) {
        skipped++;
        continue;
      }

      const lead =
        createBaseLead(
          "Demand",
          result,
          matchedSkill,
          contact
        );

      found++;

      const saved =
        await insertLead(
          "Demand",
          lead
        );

      if (saved.inserted) {
        inserted++;
      } else {
        skipped++;
      }
    }
  }

  return {
    found,
    inserted,
    skipped,
  };
}

async function collectSupply(
  skills: SkillRow[]
): Promise<{
  found: number;
  inserted: number;
  skipped: number;
}> {
  let found = 0;
  let inserted = 0;
  let skipped = 0;

  const queries =
    buildQueries(
      skills,
      "Supply"
    );

  for (const query of queries) {
    let results: SearchResult[] = [];

    try {
      results =
        await searchSerper(
          query
        );
    } catch {
      continue;
    }

    for (const result of results) {
      const link =
        clean(result.link);

      if (
        !link ||
        !isValidHttpUrl(link) ||
        isBlocked(link)
      ) {
        skipped++;
        continue;
      }

      if (
        !isFresh(
          clean(result.date)
        )
      ) {
        skipped++;
        continue;
      }

      if (
        !isSupplyLead(result)
      ) {
        skipped++;
        continue;
      }

      const contact =
        getDirectContact(
          result
        );

      if (!contact.contact) {
        skipped++;
        continue;
      }

      let matchedSkill:
        | SkillRow
        | undefined;

      for (const skill of skills) {
        if (
          matchesSkill(
            result,
            skill
          )
        ) {
          matchedSkill =
            skill;
          break;
        }
      }

      if (!matchedSkill) {
        skipped++;
        continue;
      }

      const lead =
        createBaseLead(
          "Supply",
          result,
          matchedSkill,
          contact
        );

      found++;

      const saved =
        await insertLead(
          "Supply",
          lead
        );

      if (saved.inserted) {
        inserted++;
      } else {
        skipped++;
      }
    }
  }

  return {
    found,
    inserted,
    skipped,
  };
}

async function collectSaas(
  skills: SkillRow[]
): Promise<{
  found: number;
  inserted: number;
  skipped: number;
}> {
  let found = 0;
  let inserted = 0;
  let skipped = 0;

  const queries =
    buildQueries(
      skills,
      "SaaS"
    );

  for (const query of queries) {
    let results: SearchResult[] = [];

    try {
      results =
        await searchSerper(
          query
        );
    } catch {
      continue;
    }

    for (const result of results) {
      const link =
        clean(result.link);

      if (
        !link ||
        !isValidHttpUrl(link) ||
        isBlocked(link)
      ) {
        skipped++;
        continue;
      }

      if (
        !isFresh(
          clean(result.date)
        )
      ) {
        skipped++;
        continue;
      }

      if (
        isSaasJobSeeker(result)
      ) {
        skipped++;
        continue;
      }

      if (
        !isSaasProfessional(
          result
        )
      ) {
        skipped++;
        continue;
      }

      if (
        !isIndividualSaasProfile(
          result
        )
      ) {
        skipped++;
        continue;
      }

      const inspection =
        await inspectSaasSource(
          link
        );

      const contact =
        getDirectContact(
          result
        );

      const finalEmail =
        contact.contactEmail ||
        inspection.email;

      const finalPhone =
        contact.contactPhone ||
        inspection.phone;

      const finalUrl =
        contact.contactUrl ||
        inspection.contactUrl ||
        (
          isSpecificSocialOrProfileUrl(
            link
          )
            ? link
            : ""
        );

      const finalContact =
        finalEmail ||
        finalPhone ||
        finalUrl;

      if (!finalContact) {
        skipped++;
        continue;
      }

      const personName =
        hasSaasPersonIdentity(
          result,
          inspection.pageText
        );

      const title =
        clean(result.title) ||
        "Professional";

      const description =
        clean(result.snippet);

      const country =
        findCountry(
          `${title} ${description} ${inspection.pageText}`,
          link
        );

      const lead: CollectedLead = {
        leadType: "SaaS",
        title,
        name:
          personName ||
          "Professional",
        description,
        skill: "",
        category: "",
        subcategory: "",
        country,
        city: "",
        contact:
          finalContact,
        contactEmail:
          finalEmail,
        contactPhone:
          finalPhone,
        contactUrl:
          finalUrl,
        source: link,
        openUrl: link,
        budget: "",
        currency: "",
      };

      found++;

      const saved =
        await insertLead(
          "SaaS",
          lead
        );

      if (saved.inserted) {
        inserted++;
      } else {
        skipped++;
      }
    }
  }

  return {
    found,
    inserted,
    skipped,
  };
}

function json(
  res: VercelResponse,
  body: unknown
) {
  return res
    .status(200)
    .json(body);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (
      req.method !== "POST" &&
      req.method !== "GET"
    ) {
      return json(res, {
        success: false,
        message:
          "Method not allowed",
      });
    }

    if (req.method === "GET") {
      return json(res, {
        success: true,
        message:
          "Real lead collection API is running",
      });
    }

    if (!SUPABASE_URL) {
      return json(res, {
        success: false,
        message:
          "SUPABASE_URL is missing",
      });
    }

    if (
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return json(res, {
        success: false,
        message:
          "SUPABASE_SERVICE_ROLE_KEY is missing",
      });
    }

    if (!SERPER_API_KEY) {
      return json(res, {
        success: false,
        message:
          "SERPER_API_KEY is missing",
      });
    }

    const skills =
      await loadSkills();

    if (!skills.length) {
      return json(res, {
        success: true,
        message:
          "No skills found for lead collection",
        totalFound: 0,
        totalInserted: 0,
        results: {
          Demand: {
            found: 0,
            inserted: 0,
            skipped: 0,
          },
          Supply: {
            found: 0,
            inserted: 0,
            skipped: 0,
          },
          SaaS: {
            found: 0,
            inserted: 0,
            skipped: 0,
          },
        },
      });
    }

    let requestedTypes:
      unknown[] = [
        "Demand",
        "Supply",
        "SaaS",
      ];

    if (
      req.body &&
      typeof req.body === "object" &&
      !Array.isArray(req.body)
    ) {
      const body =
        req.body as {
          types?: unknown;
        };

      if (
        Array.isArray(body.types)
      ) {
        requestedTypes =
          body.types;
      }
    }

    const types: LeadType[] =
      requestedTypes.filter(
        (
          type: unknown
        ): type is LeadType =>
          type === "Demand" ||
          type === "Supply" ||
          type === "SaaS"
      );

    const results: Record<
      LeadType,
      {
        found: number;
        inserted: number;
        skipped: number;
      }
    > = {
      Demand: {
        found: 0,
        inserted: 0,
        skipped: 0,
      },
      Supply: {
        found: 0,
        inserted: 0,
        skipped: 0,
      },
      SaaS: {
        found: 0,
        inserted: 0,
        skipped: 0,
      },
    };

    if (
      types.includes("Demand")
    ) {
      results.Demand =
        await collectDemand(
          skills
        );
    }

    if (
      types.includes("Supply")
    ) {
      results.Supply =
        await collectSupply(
          skills
        );
    }

    if (
      types.includes("SaaS")
    ) {
      results.SaaS =
        await collectSaas(
          skills
        );
    }

    const totalInserted =
      results.Demand.inserted +
      results.Supply.inserted +
      results.SaaS.inserted;

    const totalFound =
      results.Demand.found +
      results.Supply.found +
      results.SaaS.found;

    return json(res, {
      success: true,
      message:
        "Real lead collection completed",
      totalFound,
      totalInserted,
      results,
    });
  } catch (error) {
    console.error(
      "Real lead collection failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Lead collection failed";

    return json(res, {
      success: false,
      message: clean(message),
      totalFound: 0,
      totalInserted: 0,
    });
  }
    }
