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

type CollectionStats = {
  queries: number;
  resultsReceived: number;
  blocked: number;
  stale: number;
  wrongType: number;
  noContact: number;
  noSkillMatch: number;
  found: number;
  inserted: number;
  duplicate: number;
  insertErrors: number;
};

function emptyStats(): CollectionStats {
  return {
    queries: 0,
    resultsReceived: 0,
    blocked: 0,
    stale: 0,
    wrongType: 0,
    noContact: 0,
    noSkillMatch: 0,
    found: 0,
    inserted: 0,
    duplicate: 0,
    insertErrors: 0,
  };
}

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

    if (text) {
      terms.push(text);
    }
  };

  add(skill.name);
  add(skill.category);
  add(skill.subcategory);

  if (Array.isArray(skill.tags)) {
    skill.tags.forEach(add);
  } else if (typeof skill.tags === "string") {
    skill.tags
      .split(",")
      .forEach(add);
  }

  const combined =
    terms.join(" ").toLowerCase();

  if (
    combined.includes("quran") ||
    combined.includes("tajweed") ||
    combined.includes("qiraat") ||
    combined.includes("qirat") ||
    combined.includes("hifz") ||
    combined.includes("tafseer") ||
    combined.includes("tafsir")
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

  return uniqueStrings(
    terms
  );
}

function buildQueries(
  skills: SkillRow[],
  type: LeadType
): string[] {
  const queries: string[] = [];

  const skillTerms = uniqueStrings(
    skills.flatMap(
      getSkillSearchTerms
    )
  );

  if (type === "Demand") {
    skillTerms
      .slice(0, 6)
      .forEach((skill) => {
        queries.push(
          `"${skill}" "looking for" tutor OR teacher OR coach`
        );

        queries.push(
          `"${skill}" "need a" tutor OR teacher OR coach`
        );
      });

    queries.push(
      `"recommend a tutor" OR "recommend a teacher" OR "looking for a tutor"`
    );
  }

  if (type === "Supply") {
    skillTerms
      .slice(0, 6)
      .forEach((skill) => {
        queries.push(
          `"${skill}" hiring OR "job opening" OR vacancy`
        );

        queries.push(
          `"${skill}" "applications open" OR "position available"`
        );
      });
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

    professionalSearches
      .slice(0, 6)
      .forEach((profession) => {
        queries.push(
          `"${profession}" "my services" OR "work with me" OR "hire me"`
        );
      });

    skillTerms
      .slice(0, 6)
      .forEach((skill) => {
        queries.push(
          `"${skill}" teacher OR tutor OR coach OR consultant`
        );
      });
  }

  return uniqueStrings(
    queries
  ).slice(
    0,
    MAX_QUERIES_PER_TYPE
  );
}

function parseResultDate(
  result: SearchResult
): Date | null {
  const raw =
    clean(result.date);

  if (!raw) {
    return null;
  }

  const parsed =
    new Date(raw);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

function isFresh(
  result: SearchResult
): boolean {
  const date =
    parseResultDate(result);

  if (!date) {
    return true;
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
    ageMs <= maxAgeMs
  );
}

function getDirectContact(
  result: SearchResult
): {
  contact: string;
  email: string;
  phone: string;
  url: string;
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

  if (email) {
    return {
      contact: email,
      email,
      phone: "",
      url: link,
    };
  }

  const phone =
    extractPhone(combined);

  if (phone) {
    return {
      contact: phone,
      email: "",
      phone,
      url: link,
    };
  }

  if (
    isSpecificSocialOrProfileUrl(
      link
    )
  ) {
    return {
      contact: link,
      email: "",
      phone: "",
      url: link,
    };
  }

  if (
    isDirectContactUrl(link)
  ) {
    return {
      contact: link,
      email: "",
      phone: "",
      url: link,
    };
  }

  return {
    contact: "",
    email: "",
    phone: "",
    url: link,
  };
}

async function inspectContactPage(
  url: string
): Promise<{
  email: string;
  phone: string;
  contactUrl: string;
}> {
  if (
    !isValidHttpUrl(url)
  ) {
    return {
      email: "",
      phone: "",
      contactUrl: "",
    };
  }

  try {
    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; OpportunityHub/1.0)",
        },
      });

    if (!response.ok) {
      return {
        email: "",
        phone: "",
        contactUrl: "",
      };
    }

    const html =
      await response.text();

    const email =
      extractEmail(html);

    const phone =
      extractPhone(html);

    if (email || phone) {
      return {
        email,
        phone,
        contactUrl: url,
      };
    }
  } catch {
    // Ignore page inspection failures.
  }

  return {
    email: "",
    phone: "",
    contactUrl: "",
  };
    }
function classifyDemand(
  result: SearchResult
): boolean {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const combined =
    `${title} ${snippet}`;

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
      [
        "hiring",
        "job opening",
        "vacancy",
        "apply now",
        "recruiting",
      ]
    )
  ) {
    return false;
  }

  return true;
}

function classifySupply(
  result: SearchResult
): boolean {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const combined =
    `${title} ${snippet}`;

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
      [
        "looking for a tutor",
        "looking for a teacher",
        "need a tutor",
        "need a teacher",
        "recommend a tutor",
        "recommend a teacher",
      ]
    )
  ) {
    return false;
  }

  return true;
}

function classifySaas(
  result: SearchResult
): boolean {
  if (
    !isSaasProfessional(result)
  ) {
    return false;
  }

  if (
    !isIndividualSaasProfile(
      result
    )
  ) {
    return false;
  }

  return true;
}

function getSaasIdentity(
  result: SearchResult
): string {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const personName =
    extractPersonName(
      title,
      snippet
    );

  if (personName) {
    return personName;
  }

  const socialMatch =
    clean(result.link);

  if (
    isSpecificSocialOrProfileUrl(
      socialMatch
    )
  ) {
    return title;
  }

  return title;
}

function getCity(
  result: SearchResult
): string {
  const text =
    `${clean(result.title)} ${clean(result.snippet)}`;

  const patterns = [
    /\b(?:in|based in|located in)\s+([A-Z][A-Za-z .'-]{2,40})/,
    /\b([A-Z][A-Za-z]+),\s*(?:UK|USA|Canada|Australia)\b/,
  ];

  for (const pattern of patterns) {
    const match =
      text.match(pattern);

    if (match?.[1]) {
      return match[1]
        .trim()
        .replace(/[.,]$/, "");
    }
  }

  return "";
}

function getSkillFromResult(
  result: SearchResult,
  skills: SkillRow[]
): SkillRow | null {
  const combined =
    lower(
      `${clean(result.title)} ${clean(result.snippet)}`
    );

  for (const skill of skills) {
    const terms =
      getSkillSearchTerms(
        skill
      );

    if (
      terms.some((term) =>
        combined.includes(
          lower(term)
        )
      )
    ) {
      return skill;
    }
  }

  return skills[0] || null;
}

function getCategory(
  skill: SkillRow | null
): string {
  return skill
    ? clean(skill.category)
    : "";
}

function getSubcategory(
  skill: SkillRow | null
): string {
  return skill
    ? clean(skill.subcategory)
    : "";
}

function getSkillValue(
  skill: SkillRow | null
): string {
  return skill
    ? getSkillName(skill)
    : "";
}

function resultMatchesSkill(
  result: SearchResult,
  skills: SkillRow[]
): boolean {
  if (!skills.length) {
    return false;
  }

  const combined =
    lower(
      `${clean(result.title)} ${clean(result.snippet)}`
    );

  return skills.some(
    (skill) =>
      getSkillSearchTerms(
        skill
      ).some((term) =>
        combined.includes(
          lower(term)
        )
      )
  );
}

function htmlContactUrl(
  html: string,
  baseUrl: string
): string {
  const hrefMatches =
    html.match(
      /href=["']([^"']+)["']/gi
    ) || [];

  const contactTerms = [
    "contact",
    "get-in-touch",
    "reach-me",
    "reach-us",
    "hire",
    "booking",
    "book-me",
  ];

  for (const raw of hrefMatches) {
    const match =
      raw.match(
        /href=["']([^"']+)["']/i
      );

    const href =
      clean(match?.[1]);

    if (!href) {
      continue;
    }

    const value =
      lower(href);

    if (
      !contactTerms.some(
        (term) =>
          value.includes(term)
      )
    ) {
      continue;
    }

    try {
      return new URL(
        href,
        baseUrl
      ).toString();
    } catch {
      continue;
    }
  }

  return "";
}

async function improveContact(
  result: SearchResult
): Promise<{
  contact: string;
  email: string;
  phone: string;
  url: string;
}> {
  const initial =
    getDirectContact(
      result
    );

  if (initial.contact) {
    return initial;
  }

  const link =
    clean(result.link);

  if (
    !isValidHttpUrl(link)
  ) {
    return initial;
  }

  try {
    const response =
      await fetch(link, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; OpportunityHub/1.0)",
        },
      });

    if (!response.ok) {
      return initial;
    }

    const html =
      await response.text();

    const email =
      extractEmail(html);

    const phone =
      extractPhone(html);

    if (email) {
      return {
        contact: email,
        email,
        phone: "",
        url: link,
      };
    }

    if (phone) {
      return {
        contact: phone,
        email: "",
        phone,
        url: link,
      };
    }

    const contactPage =
      htmlContactUrl(
        html,
        link
      );

    if (contactPage) {
      const page =
        await inspectContactPage(
          contactPage
        );

      if (page.email) {
        return {
          contact:
            page.email,
          email:
            page.email,
          phone:
            page.phone,
          url:
            page.contactUrl,
        };
      }

      if (page.phone) {
        return {
          contact:
            page.phone,
          email:
            page.email,
          phone:
            page.phone,
          url:
            page.contactUrl,
        };
      }

      return {
        contact:
          contactPage,
        email: "",
        phone: "",
        url:
          contactPage,
      };
    }
  } catch {
    // Ignore individual page failures.
  }

  return initial;
}
async function searchSerper(
  query: string
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    return [];
  }

  try {
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
            num: RESULTS_PER_SEARCH,
            tbs: "qdr:d3",
          }),
        }
      );

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    return Array.isArray(
      data?.organic
    )
      ? data.organic
      : [];
  } catch {
    return [];
  }
}

function createSupabase() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken:
          false,
        persistSession: false,
      },
    }
  );
}

async function loadSkills(
  supabase: ReturnType<
    typeof createSupabase
  >
): Promise<SkillRow[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } =
    await supabase
      .from("skills")
      .select(
        "id,name,category,subcategory,tags"
      )
      .limit(500);

  if (error) {
    throw new Error(
      `Skills load failed: ${error.message}`
    );
  }

  return Array.isArray(data)
    ? data
    : [];
}

async function leadAlreadyExists(
  supabase: ReturnType<
    typeof createSupabase
  >,
  lead: CollectedLead
): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const source =
    clean(lead.source);

  const openUrl =
    clean(lead.openUrl);

  if (!source && !openUrl) {
    return false;
  }

  let query =
    supabase
      .from("leads")
      .select("id")
      .limit(1);

  if (openUrl) {
    query =
      query.eq(
        "source",
        source
      );
  }

  const { data, error } =
    await query;

  if (error) {
    return false;
  }

  if (
    Array.isArray(data) &&
    data.length > 0
  ) {
    return true;
  }

  return false;
}

function createBaseLead(
  type: LeadType,
  result: SearchResult,
  skill: SkillRow | null,
  contact: {
    contact: string;
    email: string;
    phone: string;
    url: string;
  }
): CollectedLead {
  const title =
    clean(result.title) ||
    `${type} opportunity`;

  const description =
    clean(result.snippet);

  const source =
    clean(result.link);

  const country =
    findCountry(
      `${title} ${description}`,
      source
    );

  return {
    leadType: type,
    title,
    name:
      type === "SaaS"
        ? getSaasIdentity(result)
        : extractPersonName(
            title,
            description
          ),
    description,
    skill:
      getSkillValue(skill),
    category:
      getCategory(skill),
    subcategory:
      getSubcategory(skill),
    country,
    city:
      getCity(result),
    contact:
      contact.contact,
    contactEmail:
      contact.email,
    contactPhone:
      contact.phone,
    contactUrl:
      contact.url,
    source,
    openUrl:
      source,
    budget: "",
    currency: "",
  };
}

function hasRequiredContact(
  lead: CollectedLead
): boolean {
  return Boolean(
    clean(lead.contact) ||
      clean(lead.contactEmail) ||
      clean(lead.contactPhone) ||
      clean(lead.contactUrl)
  );
}

function leadInsertPayload(
  lead: CollectedLead
) {
  return {
    lead_type:
      lead.leadType,

    title:
      lead.title,

    name:
      lead.name,

    description:
      lead.description,

    content:
      lead.description,

    skill_needed:
      lead.skill,

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

    contact:
      lead.contact,

    source:
      lead.source,

    open_url:
      lead.openUrl,

    status:
      "active",
  };
}

async function insertLead(
  supabase: ReturnType<
    typeof createSupabase
  >,
  lead: CollectedLead,
  stats: CollectionStats
): Promise<boolean> {
  if (!supabase) {
    stats.insertErrors++;
    return false;
  }

  const exists =
    await leadAlreadyExists(
      supabase,
      lead
    );

  if (exists) {
    stats.duplicate++;
    return false;
  }

  const payload =
    leadInsertPayload(
      lead
    );

  const { error } =
    await supabase
      .from("leads")
      .insert(payload);

  if (error) {
    stats.insertErrors++;
    return false;
  }

  stats.inserted++;
  return true;
}

async function processResult(
  type: LeadType,
  result: SearchResult,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<CollectedLead | null> {
  stats.resultsReceived++;

  const link =
    clean(result.link);

  if (
    !link ||
    isBlocked(link)
  ) {
    stats.blocked++;
    return null;
  }

  if (
    !isFresh(result)
  ) {
    stats.stale++;
    return null;
  }

  let validType =
    false;

  if (type === "Demand") {
    validType =
      classifyDemand(
        result
      );
  }

  if (type === "Supply") {
    validType =
      classifySupply(
        result
      );
  }

  if (type === "SaaS") {
    validType =
      classifySaas(
        result
      );
  }

  if (!validType) {
    stats.wrongType++;
    return null;
  }

  if (
    type !== "SaaS" &&
    !resultMatchesSkill(
      result,
      skills
    )
  ) {
    stats.noSkillMatch++;
    return null;
  }

  const skill =
    type === "SaaS"
      ? getSkillFromResult(
          result,
          skills
        )
      : getSkillFromResult(
          result,
          skills
        );

  const contact =
    await improveContact(
      result
    );

  if (
    !contact.contact
  ) {
    stats.noContact++;
    return null;
  }

  const lead =
    createBaseLead(
      type,
      result,
      skill,
      contact
    );

  if (
    !hasRequiredContact(
      lead
    )
  ) {
    stats.noContact++;
    return null;
  }

  stats.found++;

  return lead;
}

async function collectType(
  type: LeadType,
  skills: SkillRow[],
  supabase: ReturnType<
    typeof createSupabase
  >,
  stats: CollectionStats
): Promise<CollectedLead[]> {
  const leads: CollectedLead[] = [];

  const queries =
    buildQueries(
      skills,
      type
    );

  for (
    const query of queries
  ) {
    stats.queries++;

    const results =
      await searchSerper(
        query
      );

    for (
      const result of results
    ) {
      const lead =
        await processResult(
          type,
          result,
          skills,
          stats
        );

      if (!lead) {
        continue;
      }

      leads.push(lead);

      await insertLead(
        supabase,
        lead,
        stats
      );
    }
  }

  return leads;
  }
function json(
  res: VercelResponse,
  status: number,
  body: unknown
) {
  return res
    .status(status)
    .json(body);
}

async function collectDemand(
  skills: SkillRow[],
  supabase: ReturnType<
    typeof createSupabase
  >
) {
  const stats =
    emptyStats();

  const leads =
    await collectType(
      "Demand",
      skills,
      supabase,
      stats
    );

  return {
    type: "Demand",
    found: stats.found,
    inserted: stats.inserted,
    stats,
    leads,
  };
}

async function collectSupply(
  skills: SkillRow[],
  supabase: ReturnType<
    typeof createSupabase
  >
) {
  const stats =
    emptyStats();

  const leads =
    await collectType(
      "Supply",
      skills,
      supabase,
      stats
    );

  return {
    type: "Supply",
    found: stats.found,
    inserted: stats.inserted,
    stats,
    leads,
  };
}

async function collectSaas(
  skills: SkillRow[],
  supabase: ReturnType<
    typeof createSupabase
  >
) {
  const stats =
    emptyStats();

  const leads =
    await collectType(
      "SaaS",
      skills,
      supabase,
      stats
    );

  return {
    type: "SaaS",
    found: stats.found,
    inserted: stats.inserted,
    stats,
    leads,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (
    req.method === "GET"
  ) {
    return json(
      res,
      200,
      {
        success: true,
        message:
          "Real lead collection API is running",
      }
    );
  }

  if (
    req.method !== "POST"
  ) {
    return json(
      res,
      405,
      {
        success: false,
        message:
          "Method not allowed",
      }
    );
  }

  try {
    if (
      !SUPABASE_URL
    ) {
      return json(
        res,
        200,
        {
          success: false,
          message:
            "SUPABASE_URL is missing",
        }
      );
    }

    if (
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return json(
        res,
        200,
        {
          success: false,
          message:
            "SUPABASE_SERVICE_ROLE_KEY is missing",
        }
      );
    }

    if (
      !SERPER_API_KEY
    ) {
      return json(
        res,
        200,
        {
          success: false,
          message:
            "SERPER_API_KEY is missing",
        }
      );
    }

    const supabase =
      createSupabase();

    if (!supabase) {
      return json(
        res,
        200,
        {
          success: false,
          message:
            "Supabase client could not be created",
        }
      );
    }

    const skills =
      await loadSkills(
        supabase
      );

    const body =
      req.body &&
      typeof req.body ===
        "object"
        ? req.body as {
            types?: LeadType[];
          }
        : {};

    const requestedTypes =
      Array.isArray(
        body.types
      ) &&
      body.types.length
        ? body.types
        : [
            "Demand",
            "Supply",
            "SaaS",
          ];

    const results: Record<
      string,
      unknown
    > = {};

    if (
      requestedTypes.includes(
        "Demand"
      )
    ) {
      results.Demand =
        await collectDemand(
          skills,
          supabase
        );
    }

    if (
      requestedTypes.includes(
        "Supply"
      )
    ) {
      results.Supply =
        await collectSupply(
          skills,
          supabase
        );
    }

    if (
      requestedTypes.includes(
        "SaaS"
      )
    ) {
      results.SaaS =
        await collectSaas(
          skills,
          supabase
        );
    }

    const demand =
      results.Demand as
        | {
            found?: number;
            inserted?: number;
          }
        | undefined;

    const supply =
      results.Supply as
        | {
            found?: number;
            inserted?: number;
          }
        | undefined;

    const saas =
      results.SaaS as
        | {
            found?: number;
            inserted?: number;
          }
        | undefined;

    const totalFound =
      (demand?.found || 0) +
      (supply?.found || 0) +
      (saas?.found || 0);

    const totalInserted =
      (demand?.inserted || 0) +
      (supply?.inserted || 0) +
      (saas?.inserted || 0);

    return json(
      res,
      200,
      {
        success: true,

        message:
          `Added ${totalInserted} leads — ` +
          `Demand: ${
            demand?.inserted || 0
          }, ` +
          `Supply: ${
            supply?.inserted || 0
          }, ` +
          `SaaS: ${
            saas?.inserted || 0
          }`,

        totalFound,

        totalInserted,

        results,
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return json(
      res,
      200,
      {
        success: false,
        message:
          `Lead collector error: ${message}`,
      }
    );
  }
        }
