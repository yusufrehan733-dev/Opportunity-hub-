import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL =
  process.env.SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SERPER_API_KEY =
  process.env.SERPER_API_KEY || "";

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
  skill?: string | null;
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

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

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

const GENERIC_TERMS = [
  "free seminar",
  "free webinar",
  "webinar",
  "seminar",
  "enroll now",
  "register now",
  "free trial",
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
  "therapist",
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

const SAAS_IDENTITY_TERMS = [
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
  "consultant",
  "coach",
  "mentor",
  "teacher",
  "tutor",
  "trainer",
];

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

function isBlocked(link: string): boolean {
  const value = lower(link);

  return BLOCKED_DOMAINS.some((domain) =>
    value.includes(domain)
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
function escapeRegExp(
  value: string
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

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
  link: string = ""
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

function isGenericSaasPage(
  result: SearchResult
): boolean {
  const title = lower(result.title);
  const snippet =
    lower(result.snippet);
  const link = lower(result.link);

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

  if (
    blockedPageDomains.some(
      (domain) =>
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

  return hasAny(
    text,
    SAAS_IDENTITY_TERMS
  );
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

  if (
    isBlocked(link)
  ) {
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

  /*
   * Generic organization/resource pages
   * are not accepted as individual SaaS
   * prospects.
   */
  const genericPageTerms = [
    "resources",
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

  /*
   * A named person is a strong identity
   * signal. We require a plausible person
   * name unless the URL itself is a specific
   * individual social/profile URL.
   */
  const personName =
    extractPersonName(
      title,
      snippet
    );

  if (personName) {
    return true;
  }

  /*
   * Personal-service wording can also
   * identify an individual professional.
   */
  return hasAny(
    combined,
    [
      "about me",
      "my services",
      "my coaching",
      "my consulting",
      "work with me",
      "hire me",
      "contact me",
      "book me",
      "personal website",
    ]
  );
}
function getSkillName(
  skill: SkillRow
): string {
  return (
    clean(skill.name) ||
    clean(skill.skill) ||
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
          lower(item) === lower(text)
      )
    ) {
      terms.push(text);
    }
  };

  add(skill.name);
  add(skill.skill);
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
    combined.includes(
      "sociology"
    ) ||
    combined.includes(
      "social research"
    )
  ) {
    add("Social Research");
    add("Research");
  }

  if (
    combined.includes(
      "psychology"
    )
  ) {
    add("Psychology");
    add("Social Science");
  }

  if (
    combined.includes(
      "anthropology"
    )
  ) {
    add("Anthropology");
    add("Social Science");
  }

  if (
    combined.includes(
      "economics"
    )
  ) {
    add("Economics");
    add("Social Science");
  }

  if (
    combined.includes(
      "physics"
    )
  ) {
    add("Physics");
    add("Science");
  }

  if (
    combined.includes(
      "chemistry"
    )
  ) {
    add("Chemistry");
    add("Science");
  }

  if (
    combined.includes(
      "biology"
    )
  ) {
    add("Biology");
    add("Science");
  }

  if (
    combined.includes("fiqh")
  ) {
    add("Fiqh");
    add("Islamic Studies");
  }

  if (
    combined.includes(
      "islamiyat"
    ) ||
    combined.includes(
      "islamic studies"
    ) ||
    combined === "islamic"
  ) {
    add("Islamiyat");
    add("Islamic Studies");
  }

  return terms;
}

function getAllSkillSearchTerms(
  skills: SkillRow[]
): string[] {
  const terms: string[] = [];

  for (const skill of skills) {
    for (
      const term of getSkillSearchTerms(
        skill
      )
    ) {
      if (
        !terms.some(
          (item) =>
            lower(item) ===
            lower(term)
        )
      ) {
        terms.push(term);
      }
    }
  }

  return terms;
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

  for (const skill of skills) {
    const name =
      getSkillName(skill);

    if (
      name &&
      value.includes(
        lower(name)
      )
    ) {
      return {
        name,
        category:
          clean(skill.category),
        subcategory:
          clean(skill.subcategory),
      };
    }
  }

  for (const skill of skills) {
    const terms =
      getSkillSearchTerms(skill);

    const matchingTerm =
      terms.find((term) =>
        value.includes(
          lower(term)
        )
      );

    if (matchingTerm) {
      return {
        name:
          clean(skill.name) ||
          matchingTerm,
        category:
          clean(skill.category),
        subcategory:
          clean(skill.subcategory),
      };
    }
  }

  return null;
}

function getSearchSkillTerms(
  skills: SkillRow[]
): string[] {
  const terms =
    getAllSkillSearchTerms(
      skills
    );

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

function uniqueStrings(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values.filter(Boolean)
    )
  );
}

function buildQueries(
  skills: SkillRow[],
  type: LeadType
): string[] {
  const skillTerms =
    getSearchSkillTerms(skills);

  const queries: string[] = [];

  if (
    type === "Demand"
  ) {
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

  if (
    type === "Supply"
  ) {
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

  if (
    type === "SaaS"
  ) {
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
        : amount * 24 * 60 * 60 * 1000;

    return new Date(
      Date.now() - milliseconds
    );
  }

  return null;
}

function isFresh(
  value: string
): boolean {
  /*
   * Serper searches are already restricted
   * to the last 72 hours. If Serper does not
   * return a readable date, we accept the
   * result because the query itself uses the
   * freshness window.
   */
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
      contactPhone: phone,
      contactUrl: link,
    };
  }

  if (phone) {
    return {
      contact: phone,
      contactEmail: "",
      contactPhone: phone,
      contactUrl: link,
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

  const contactPageTerms = [
    "/contact",
    "/contact-us",
    "/get-in-touch",
    "/reach-me",
    "/book",
    "/booking",
  ];

  if (
    contactPageTerms.some(
      (term) =>
        lower(link).includes(term)
    )
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

  /*
   * A demand post should not be classified
   * as an opportunity simply because it also
   * contains a professional term.
   */
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
  pageText: string = ""
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
      ) || "Professional"
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

async function inspectSaasSource(
  link: string
): Promise<{
  pageText: string;
  email: string;
  phone: string;
  contactUrl: string;
}> {
  if (
    !isValidHttpUrl(link)
  ) {
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
    throw new Error(
      `Serper request failed: ${response.status}`
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

async function loadSkills(): Promise<
  SkillRow[]
> {
  const { data, error } =
    await supabase
      .from("skills")
      .select(
        "id,name,skill,category,subcategory,tags"
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

async function leadAlreadyExists(
  table: string,
  title: string,
  source: string
): Promise<boolean> {
  const { data, error } =
    await supabase
      .from(table)
      .select("id")
      .eq("title", title)
      .eq("source", source)
      .limit(1);

  if (error) {
    return false;
  }

  return (
    Array.isArray(data) &&
    data.length > 0
  );
}

async function insertLead(
  table: string,
  lead: Record<string, unknown>
): Promise<void> {
  const { error } =
    await supabase
      .from(table)
      .insert(lead);

  if (error) {
    throw new Error(
      `Supabase insert failed for ${table}: ${error.message}`
    );
  }
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

function buildLead(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[],
  saasEvidence?: {
    pageText: string;
    email: string;
    phone: string;
    contactUrl: string;
    personName: string;
  }
): Record<string, unknown> | null {
  const title =
    clean(result.title);

  const snippet =
    clean(result.snippet);

  const link =
    clean(result.link);

  if (
    !title ||
    !snippet ||
    !link ||
    !isValidHttpUrl(link)
  ) {
    return null;
  }

  if (
    isBlocked(link)
  ) {
    return null;
  }

  if (
    !isFresh(
      clean(result.date)
    )
  ) {
    return null;
  }

  const combined =
    `${title} ${snippet}`;

  let matchedSkill:
    | {
        name: string;
        category: string;
        subcategory: string;
      }
    | null = null;

  if (
    type === "Demand" ||
    type === "Supply"
  ) {
    matchedSkill =
      findMatchingSkill(
        combined,
        skills
      );

    if (!matchedSkill) {
      return null;
    }
  }

  let contact =
    getDirectContact(result);

  if (type === "SaaS") {
    if (
      !saasEvidence
    ) {
      return null;
    }

    if (
      !saasEvidence.personName
    ) {
      return null;
    }

    if (
      !saasEvidence.email &&
      !saasEvidence.phone &&
      !saasEvidence.contactUrl &&
      !contact.contact
    ) {
      return null;
    }

    if (
      saasEvidence.email
    ) {
      contact = {
        contact:
          saasEvidence.email,
        contactEmail:
          saasEvidence.email,
        contactPhone:
          saasEvidence.phone,
        contactUrl:
          saasEvidence.contactUrl ||
          link,
      };
    } else if (
      saasEvidence.phone
    ) {
      contact = {
        contact:
          saasEvidence.phone,
        contactEmail: "",
        contactPhone:
          saasEvidence.phone,
        contactUrl:
          saasEvidence.contactUrl ||
          link,
      };
    } else if (
      saasEvidence.contactUrl
    ) {
      contact = {
        contact:
          saasEvidence.contactUrl,
        contactEmail: "",
        contactPhone: "",
        contactUrl:
          saasEvidence.contactUrl,
      };
    }
  }

  /*
   * Gold rule:
   * every saved lead must have a real
   * direct contact path.
   */
  if (!contact.contact) {
    return null;
  }

  const country =
    findCountry(
      `${title} ${snippet} ${
        saasEvidence?.pageText || ""
      }`,
      link
    );

  /*
   * SaaS leads are country-based.
   * We do not require an exact skill-name
   * match for SaaS.
   */
  if (
    type === "SaaS" &&
    !country
  ) {
    return null;
  }

  let name =
    clean(
      saasEvidence?.personName
    );

  if (!name) {
    name =
      extractPersonName(
        title,
        snippet
      );
  }

  if (!name) {
    name = title;
  }

  const category =
    matchedSkill?.category ||
    "Professional Services";

  const subcategory =
    matchedSkill?.subcategory ||
    "";

  const skillNeeded =
    matchedSkill?.name ||
    (type === "SaaS"
      ? "Professional Services"
      : "");

  const description =
    type === "SaaS"
      ? [
          name !== title
            ? `${name} — ${title}`
            : title,
          snippet,
          saasEvidence?.pageText
            ? saasEvidence.pageText.slice(
                0,
                500
              )
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      : snippet;

  return {
    type,
    source: link,
    client_name: name,
    skill_needed:
      skillNeeded,
    description,
    contact_email:
      contact.contactEmail,
    contact_phone:
      contact.contactPhone,
    contact_name:
      name,
    contact_url:
      contact.contactUrl ||
      link,
    status: "new",
    title,
    category,
    subcategory,
    country,
    city: "",
    budget: "",
    currency: "",
    created_at:
      new Date().toISOString(),
  };
}

async function processResult(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[]
): Promise<boolean> {
  const title =
    clean(result.title);

  const link =
    clean(result.link);

  if (
    !title ||
    !link
  ) {
    return false;
  }

  if (
    await leadAlreadyExists(
      getLeadTable(type),
      title,
      link
    )
  ) {
    return false;
  }

  if (
    type === "Demand" &&
    !isDemandLead(result)
  ) {
    return false;
  }

  if (
    type === "Supply" &&
    !isSupplyLead(result)
  ) {
    return false;
  }

  let saasEvidence:
    | {
        pageText: string;
        email: string;
        phone: string;
        contactUrl: string;
        personName: string;
      }
    | undefined;

  if (
    type === "SaaS"
  ) {
    if (
      isGenericSaasPage(
        result
      )
    ) {
      return false;
    }

    if (
      isSaasJobSeeker(
        result
      )
    ) {
      return false;
    }

    if (
      !isSaasProfessional(
        result
      )
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

    const inspection =
      await inspectSaasSource(
        link
      );

    const personName =
      hasSaasPersonIdentity(
        result,
        inspection.pageText
      );

    /*
     * A SaaS prospect must represent
     * an identifiable individual professional,
     * not a generic resource or organization.
     */
    if (!personName) {
      return false;
    }

    const sourceCountry =
      findCountry(
        `${clean(
          result.title
        )} ${clean(
          result.snippet
        )} ${inspection.pageText}`,
        link
      );

    /*
     * Country is mandatory for SaaS.
     * This prevents "global" / unknown-country
     * records from becoming user leads.
     */
    if (!sourceCountry) {
      return false;
    }

    saasEvidence = {
      pageText:
        inspection.pageText,
      email:
        inspection.email,
      phone:
        inspection.phone,
      contactUrl:
        inspection.contactUrl,
      personName,
    };
  }

  const lead =
    buildLead(
      result,
      type,
      skills,
      saasEvidence
    );

  if (!lead) {
    return false;
  }

  await insertLead(
    getLeadTable(type),
    lead
  );

  return true;
}

async function runType(
  type: LeadType,
  skills: SkillRow[]
): Promise<{
  searched: number;
  added: number;
}> {
  const queries =
    buildQueries(
      skills,
      type
    );

  let searched = 0;
  let added = 0;

  const seen =
    new Set<string>();

  for (const query of queries) {
    if (
      searched >=
      MAX_QUERIES_PER_TYPE
    ) {
      break;
    }

    searched++;

    let results:
      SearchResult[] = [];

    try {
      results =
        await searchSerper(
          query
        );
    } catch {
      continue;
    }

    for (const result of results) {
      const key =
        lower(
          clean(result.link)
        );

      if (
        !key ||
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      try {
        const inserted =
          await processResult(
            result,
            type,
            skills
          );

        if (inserted) {
          added++;
        }
      } catch {
        /*
         * One bad result must never stop
         * the remaining lead collection.
         */
        continue;
      }
    }
  }

  return {
    searched,
    added,
  };
}

async function runCollector(): Promise<{
  Demand: {
    searched: number;
    added: number;
  };
  Supply: {
    searched: number;
    added: number;
  };
  SaaS: {
    searched: number;
    added: number;
  };
}> {
  const skills =
    await loadSkills();

  /*
   * Keep all three lead categories active.
   * Demand/Supply use exact skill matching.
   * SaaS uses country + individual-professional
   * matching instead of exact skill matching.
   */
  const demand =
    await runType(
      "Demand",
      skills
    );

  const supply =
    await runType(
      "Supply",
      skills
    );

  const saas =
    await runType(
      "SaaS",
      skills
    );

  return {
    Demand: demand,
    Supply: supply,
    SaaS: saas,
  };
}

router.post(
  "/fetchLeads",
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      const result =
        await runCollector();

      return res.status(200).json({
        success: true,
        message:
          "Lead collection completed",
        result,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Lead collection failed";

      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

export default router;
