import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type LeadType = "Demand" | "Supply" | "SaaS";

type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
  date?: string;
  searchQuery?: string;
};

type SkillRow = {
  id?: string;
  name: string;
  category?: string;
  subcategory?: string;
  tags?: string[] | string;
};

type LeadStats = {
  found: number;
  accepted: number;
  inserted: number;
  duplicate: number;
  stale: number;
  wrongType: number;
  noContact: number;
  noSkill: number;
  blocked: number;
  insertErrors: number;
};

type InsertedByType = {
  Demand: number;
  Supply: number;
  SaaS: number;
};

type CollectorResult = {
  stats: LeadStats;
  insertedByType: InsertedByType;
};

type ContactInfo = {
  email?: string;
  phone?: string;
  url?: string;
};

const MAX_AGE_HOURS = 72;
const MAX_QUERIES_PER_TYPE = 6;
const RESULTS_PER_SEARCH = 10;

const GOOGLE_SEARCH_URL = "https://www.google.com/search";

const SERPER_API_KEY =
  process.env.SERPER_API_KEY ||
  process.env.VITE_SERPER_API_KEY ||
  "";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
      )
    : null;

/*
 * IMPORTANT:
 * Serper is optional.
 *
 * If Serper has no credits or fails, the collector
 * automatically uses the free Google HTML fallback.
 *
 * Do NOT make Serper mandatory.
 */

const BLOCKED_DOMAINS = [
  "google.com",
  "google.co.uk",
  "google.ca",
  "google.ae",
  "google.com.pk",
  "support.google.com",
  "accounts.google.com",
  "policies.google.com",

  "youtube.com",
  "youtu.be",

  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.ae",

  "daraz.pk",
  "ebay.com",
  "etsy.com",
  "walmart.com",
  "aliexpress.com",

  "udemy.com",
  "coursera.org",
  "skillshare.com",

  "fiverr.com",
  "upwork.com",
  "freelancer.com",
  "peopleperhour.com",
  "guru.com",
];

const BLOCKED_RESULT_TERMS = [
  "feedback",
  "google search",
  "search settings",
  "privacy",
  "terms",
  "advertising",
  "help center",
  "sign in",
  "search preferences",
  "google account",
];

const SAAS_REJECT_TERMS = [
  "amazon",
  "daraz",
  "ebay",
  "etsy",
  "walmart",
  "aliexpress",

  "book",
  "ebook",

  "course",
  "webinar",
  "training course",
  "online course",

  "app",
  "software",
  "plugin",
  "template",

  "directory",
  "marketplace",

  "job board",
  "jobs board",

  "news",
  "article",
  "blog",
  "podcast",

  "product",
  "pricing",
  "shop",
  "store",
  "buy now",
];

const DEMAND_TERMS = [
  "looking for",
  "need a",
  "need an",
  "seeking",
  "wanted",
  "want a",
  "want an",
  "require",
  "requires",
  "required",
  "hiring",
  "hire",
  "help needed",
  "help wanted",
  "client needs",
  "project needed",
  "looking to hire",
  "looking to work with",
];

const SUPPLY_TERMS = [
  "freelance",
  "freelancer",
  "available for",
  "available to",
  "accepting clients",
  "taking clients",
  "open for work",
  "open to work",
  "work with clients",
  "offers",
  "offering",
  "services",
  "service provider",
  "tutor available",
  "teacher available",
  "coach available",
  "consultant available",
  "apply",
  "applications open",
  "now accepting",
];

const PROFESSIONAL_TERMS = [
  "teacher",
  "tutor",
  "trainer",
  "coach",
  "mentor",
  "consultant",
  "advisor",
  "adviser",
  "educator",
  "instructor",
  "professional",
  "freelancer",
  "freelance",
  "consulting",
  "coaching",
  "teaching",
  "training",
];

const DIRECT_CONTACT_TERMS = [
  "contact",
  "email",
  "e-mail",
  "phone",
  "telephone",
  "whatsapp",
  "telegram",
  "linkedin",
  "facebook",
  "instagram",
  "book a call",
  "schedule a call",
  "get in touch",
];

const SKILL_GROUPS: Record<string, string[]> = {
  math: [
    "math",
    "mathematics",
    "maths",
    "algebra",
    "geometry",
    "calculus",
    "statistics",
    "trigonometry",
  ],

  science: [
    "science",
    "physics",
    "chemistry",
    "biology",
    "environmental science",
  ],

  english: [
    "english",
    "english language",
    "english literature",
    "grammar",
    "writing",
    "creative writing",
    "academic writing",
  ],

  languages: [
    "language",
    "languages",
    "arabic",
    "urdu",
    "french",
    "spanish",
    "german",
    "chinese",
    "mandarin",
    "hindi",
  ],

  quran: [
    "quran",
    "qur'an",
    "tajweed",
    "qirat",
    "qiraat",
    "hifz",
    "hafiz",
    "islamic studies",
    "tafsir",
    "tafseer",
  ],

  teaching: [
    "teaching",
    "teacher",
    "tutor",
    "education",
    "educator",
    "instruction",
    "instructor",
  ],

  coaching: [
    "coach",
    "coaching",
    "mentor",
    "mentoring",
    "consultant",
    "consulting",
    "advisor",
    "adviser",
  ],

  business: [
    "business",
    "business coaching",
    "business consultant",
    "entrepreneurship",
    "startup",
    "management",
    "marketing",
    "sales",
  ],

  technology: [
    "technology",
    "tech",
    "programming",
    "coding",
    "software",
    "web development",
    "development",
    "javascript",
    "python",
    "react",
  ],
};
function emptyStats(): LeadStats {
  return {
    found: 0,
    accepted: 0,
    inserted: 0,
    duplicate: 0,
    stale: 0,
    wrongType: 0,
    noContact: 0,
    noSkill: 0,
    blocked: 0,
    insertErrors: 0,
  };
}

function emptyInsertedByType(): InsertedByType {
  return {
    Demand: 0,
    Supply: 0,
    SaaS: 0,
  };
}

function cleanText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s+#.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(
  text: string,
  terms: string[]
): boolean {
  const normalized = normalize(text);

  return terms.some((term) => {
    const normalizedTerm = normalize(term);

    return (
      normalizedTerm.length > 0 &&
      normalized.includes(normalizedTerm)
    );
  });
}

function domainFromUrl(url?: string): string {
  if (!url) return "";

  try {
    return new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isGoogleOwnedUrl(
  url?: string
): boolean {
  const domain = domainFromUrl(url);

  if (!domain) return true;

  return (
    domain === "google.com" ||
    domain.endsWith(".google.com") ||
    domain.endsWith(".google.co.uk") ||
    domain.endsWith(".google.ca") ||
    domain.endsWith(".google.ae") ||
    domain.endsWith(".google.com.pk")
  );
}

function isBlockedDomain(
  url?: string
): boolean {
  const domain = domainFromUrl(url);

  if (!domain) return true;

  return BLOCKED_DOMAINS.some(
    (blocked) =>
      domain === blocked ||
      domain.endsWith(`.${blocked}`)
  );
}

function isBlockedResult(
  result: SearchResult
): boolean {
  const title = normalize(result.title);
  const snippet = normalize(
    result.snippet || ""
  );
  const link = normalize(result.link);

  const text =
    `${title} ${snippet} ${link}`.trim();

  if (isGoogleOwnedUrl(result.link)) {
    return true;
  }

  if (isBlockedDomain(result.link)) {
    return true;
  }

  /*
   * Only treat these as blocked when they occur
   * in the title/snippet. This avoids accidentally
   * rejecting a legitimate URL because of a harmless
   * path/query parameter.
   */
  if (
    BLOCKED_RESULT_TERMS.some((term) =>
      title.includes(normalize(term))
    )
  ) {
    return true;
  }

  /*
   * SaaS-specific junk filtering.
   *
   * We deliberately do NOT use this list for Demand
   * or Supply, because a legitimate demand/supply
   * page could contain words such as "training".
   */
  if (
    SAAS_REJECT_TERMS.some((term) =>
      text.includes(normalize(term))
    )
  ) {
    return true;
  }

  return false;
}

function normalizeUrl(
  url?: string
): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    parsed.hash = "";

    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
    ];

    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    return parsed
      .toString()
      .replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

function isDirectSocialProfile(
  url?: string
): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    const host =
      parsed.hostname.toLowerCase();

    const path =
      parsed.pathname.toLowerCase();

    if (host.includes("linkedin.com")) {
      return (
        path.includes("/in/") ||
        path.includes("/company/")
      );
    }

    if (host.includes("facebook.com")) {
      return (
        path.length > 1 &&
        !path.startsWith("/search")
      );
    }

    if (host.includes("instagram.com")) {
      return (
        path.length > 1 &&
        !path.startsWith("/explore")
      );
    }

    if (
      host.includes("x.com") ||
      host.includes("twitter.com")
    ) {
      return path.length > 1;
    }

    if (host.includes("t.me")) {
      return path.length > 1;
    }

    return false;
  } catch {
    return false;
  }
}

function isDirectContactPageUrl(
  url?: string
): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    const path =
      parsed.pathname.toLowerCase();

    return [
      "contact",
      "contact-us",
      "get-in-touch",
      "reach-us",
      "hire-me",
      "work-with-me",
      "book-a-call",
      "book-call",
      "consultation",
    ].some((term) =>
      path.includes(term)
    );
  } catch {
    return false;
  }
}

function isValidExternalResultUrl(
  url?: string
): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    if (
      !["http:", "https:"].includes(
        parsed.protocol
      )
    ) {
      return false;
    }

    if (isGoogleOwnedUrl(url)) {
      return false;
    }

    if (isBlockedDomain(url)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
    }
function extractPersonName(
  title: string
): string | undefined {
  const value = cleanText(title);

  if (!value) {
    return undefined;
  }

  const firstPart = value
    .split(/\s+[|–—-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)[0];

  if (!firstPart) {
    return undefined;
  }

  const cleaned = firstPart
    .replace(
      /\b(teacher|tutor|coach|consultant|mentor|advisor|adviser|trainer)\b/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ");

  if (
    words.length >= 2 &&
    words.length <= 5
  ) {
    const looksLikeName =
      words.every((word) =>
        /^[A-Z][A-Za-z'.-]+$/.test(word)
      );

    if (looksLikeName) {
      return cleaned;
    }
  }

  return undefined;
}

function extractEmails(
  text: string
): string[] {
  const matches = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
  );

  return [
    ...new Set(
      (matches || []).map((email) =>
        email.toLowerCase()
      )
    ),
  ];
}

function extractPhones(
  text: string
): string[] {
  const matches = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/g
  );

  return [
    ...new Set(
      (matches || [])
        .map((phone) =>
          phone.replace(/\s+/g, " ").trim()
        )
        .filter(
          (phone) =>
            phone.replace(/\D/g, "").length >= 8
        ),
    ),
  ];
}

function extractContactLinks(
  html: string,
  baseUrl: string
): string[] {
  const links: string[] = [];

  const regex =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while (
    (match = regex.exec(html)) !== null
  ) {
    const href = match[1];
    const anchorText = normalize(
      match[2]
    );

    if (!href) {
      continue;
    }

    try {
      const absolute =
        new URL(
          href,
          baseUrl
        ).toString();

      if (
        !isValidExternalResultUrl(
          absolute
        )
      ) {
        continue;
      }

      const useful =
        isDirectSocialProfile(
          absolute
        ) ||
        isDirectContactPageUrl(
          absolute
        ) ||
        containsAny(
          anchorText,
          DIRECT_CONTACT_TERMS
        );

      if (useful) {
        links.push(
          normalizeUrl(absolute)
        );
      }
    } catch {
      // Ignore malformed links.
    }
  }

  return [
    ...new Set(links),
  ];
}

async function improveContact(
  result: SearchResult
): Promise<ContactInfo> {
  const directText =
    `${result.title} ${result.snippet || ""}`;

  const directEmails =
    extractEmails(directText);

  const directPhones =
    extractPhones(directText);

  /*
   * A direct LinkedIn/Facebook/Instagram/
   * X/contact page is already a valid
   * contact path.
   */
  if (
    isDirectSocialProfile(
      result.link
    ) ||
    isDirectContactPageUrl(
      result.link
    )
  ) {
    return {
      email: directEmails[0],
      phone: directPhones[0],
      url: normalizeUrl(
        result.link
      ),
    };
  }

  if (
    !result.link ||
    !isValidExternalResultUrl(
      result.link
    )
  ) {
    return {
      email: directEmails[0],
      phone: directPhones[0],
    };
  }

  try {
    const response =
      await fetch(result.link, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; OpportunityHubLeadCollector/1.0)",
          Accept:
            "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });

    if (!response.ok) {
      return {
        email: directEmails[0],
        phone: directPhones[0],
      };
    }

    const html =
      await response.text();

    const pageText =
      cleanText(html);

    const emails = [
      ...directEmails,
      ...extractEmails(
        pageText
      ),
    ];

    const phones = [
      ...directPhones,
      ...extractPhones(
        pageText
      ),
    ];

    const links =
      extractContactLinks(
        html,
        result.link
      );

    return {
      email: [
        ...new Set(emails),
      ][0],

      phone: [
        ...new Set(phones),
      ][0],

      url: links[0],
    };
  } catch {
    return {
      email: directEmails[0],
      phone: directPhones[0],
    };
  }
}

function isIndividualSaasProfile(
  result: SearchResult,
  contact: ContactInfo
): boolean {
  const text = normalize(
    `${result.title} ${result.snippet || ""}`
  );

  if (
    !containsAny(
      text,
      PROFESSIONAL_TERMS
    )
  ) {
    return false;
  }

  const personName =
    extractPersonName(
      result.title
    );

  if (personName) {
    return true;
  }

  if (
    contact.url &&
    isDirectSocialProfile(
      contact.url
    )
  ) {
    return true;
  }

  if (
    isDirectSocialProfile(
      result.link
    )
  ) {
    return true;
  }

  return false;
    }
function resultMatchesType(
  result: SearchResult,
  type: LeadType
): boolean {
  const text = normalize(
    `${result.title} ${result.snippet || ""}`
  );

  if (type === "Demand") {
    return containsAny(
      text,
      DEMAND_TERMS
    );
  }

  if (type === "Supply") {
    return containsAny(
      text,
      SUPPLY_TERMS
    );
  }

  return containsAny(
    text,
    PROFESSIONAL_TERMS
  );
}

function parseDate(
  value?: string
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned =
    cleanText(value);

  if (!cleaned) {
    return undefined;
  }

  const timestamp =
    Date.parse(cleaned);

  if (!Number.isNaN(timestamp)) {
    return new Date(timestamp);
  }

  const match =
    cleaned.match(
      /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/
    );

  if (match) {
    const day =
      Number(match[1]);

    const month =
      Number(match[2]) - 1;

    let year =
      Number(match[3]);

    if (year < 100) {
      year += 2000;
    }

    const parsed =
      new Date(
        year,
        month,
        day
      );

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed;
    }
  }

  return undefined;
}

function isFreshEnough(
  result: SearchResult,
  type: LeadType
): boolean {
  /*
   * SaaS is intentionally not
   * freshness-limited.
   */
  if (type === "SaaS") {
    return true;
  }

  /*
   * If Google/Serper did not provide
   * a usable date, do not automatically
   * reject the result.
   */
  const date =
    parseDate(result.date);

  if (!date) {
    return true;
  }

  const age =
    Date.now() -
    date.getTime();

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

function getSearchText(
  result: SearchResult
): string {
  return normalize(
    [
      result.title,
      result.snippet || "",
      result.link,
      result.searchQuery || "",
    ].join(" ")
  );
}

function getBudget(
  text: string
): string | undefined {
  const match =
    text.match(
      /(?:[$£€]\s?\d[\d,]*(?:\.\d+)?)|(?:\d[\d,]*(?:\.\d+)?\s?(?:usd|gbp|eur|cad|aud|aed|pkr))/i
    );

  return match
    ? cleanText(match[0])
    : undefined;
}

function getCurrency(
  text: string
): string | undefined {
  const normalized =
    normalize(text);

  if (
    normalized.includes("usd") ||
    normalized.includes("$")
  ) {
    return "USD";
  }

  if (
    normalized.includes("gbp") ||
    normalized.includes("£")
  ) {
    return "GBP";
  }

  if (
    normalized.includes("eur") ||
    normalized.includes("€")
  ) {
    return "EUR";
  }

  if (
    normalized.includes("cad")
  ) {
    return "CAD";
  }

  if (
    normalized.includes("aud")
  ) {
    return "AUD";
  }

  if (
    normalized.includes("aed")
  ) {
    return "AED";
  }

  if (
    normalized.includes("pkr") ||
    normalized.includes("rs ")
  ) {
    return "PKR";
  }

  return undefined;
}

function buildQueries(
  type: LeadType,
  skills: SkillRow[]
): string[] {
  const queries: string[] = [];

  const selectedSkills =
    skills.slice(0, 6);

  for (
    const skill of selectedSkills
  ) {
    const skillName =
      cleanText(skill.name);

    if (!skillName) {
      continue;
    }

    if (type === "Demand") {
      queries.push(
        `"${skillName}" ("looking for" OR "need a" OR "seeking" OR "hiring" OR "wanted")`
      );
      continue;
    }

    if (type === "Supply") {
      queries.push(
        `"${skillName}" ("freelance" OR "available for" OR "offering services" OR "open to work" OR "accepting clients")`
      );
      continue;
    }

    queries.push(
      `"${skillName}" ("teacher" OR "tutor" OR "coach" OR "consultant" OR "mentor") ("LinkedIn" OR "professional profile" OR "profile")`
    );
  }

  return queries
    .slice(
      0,
      MAX_QUERIES_PER_TYPE
    );
}

async function leadAlreadyExists(
  type: LeadType,
  result: SearchResult,
  contact: ContactInfo
): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const sourceUrl =
    normalizeUrl(
      result.link
    );

  if (!sourceUrl) {
    return false;
  }

  if (type === "SaaS") {
    if (contact.url) {
      const { data } =
        await supabase
          .from("saas_leads")
          .select("id")
          .eq(
            "contact_url",
            normalizeUrl(
              contact.url
            )
          )
          .limit(1);

      if (
        data &&
        data.length > 0
      ) {
        return true;
      }
    }

    const { data } =
      await supabase
        .from("saas_leads")
        .select("id")
        .eq(
          "source_url",
          sourceUrl
        )
        .limit(1);

    return Boolean(
      data &&
      data.length > 0
    );
  }

  const table =
    type === "Demand"
      ? "demand_leads"
      : "supply_leads";

  const { data } =
    await supabase
      .from(table)
      .select("id")
      .eq(
        "source_url",
        sourceUrl
      )
      .limit(1);

  return Boolean(
    data &&
    data.length > 0
  );
                       }
function detectSkill(
  result: SearchResult,
  skills: SkillRow[]
): SkillRow | undefined {
  const text =
    getSearchText(result);

  if (!text) {
    return undefined;
  }

  /*
   * First try exact skill names.
   * Longer names are checked first so that
   * specific skills win over broad ones.
   */
  const orderedSkills =
    [...skills].sort(
      (a, b) =>
        cleanText(b.name).length -
        cleanText(a.name).length
    );

  for (
    const skill of orderedSkills
  ) {
    const skillName =
      normalize(skill.name);

    if (
      skillName &&
      text.includes(skillName)
    ) {
      return skill;
    }
  }

  /*
   * Then use the predefined skill groups.
   * This allows, for example, "calculus"
   * to match a user's broader Mathematics skill.
   */
  for (
    const [groupName, terms] of
    Object.entries(SKILL_GROUPS)
  ) {
    const matched =
      terms.some((term) =>
        text.includes(
          normalize(term)
        )
      );

    if (!matched) {
      continue;
    }

    const groupSkill =
      skills.find((skill) => {
        const skillText =
          normalize(
            [
              skill.name,
              skill.category || "",
              skill.subcategory || "",
              Array.isArray(skill.tags)
                ? skill.tags.join(" ")
                : skill.tags || "",
            ].join(" ")
          );

        return (
          skillText.includes(
            normalize(groupName)
          ) ||
          terms.some((term) =>
            skillText.includes(
              normalize(term)
            )
          )
        );
      });

    if (groupSkill) {
      return groupSkill;
    }
  }

  return undefined;
}

function getLeadTitle(
  result: SearchResult,
  type: LeadType
): string {
  const title =
    cleanText(result.title);

  if (title) {
    return title.slice(0, 250);
  }

  if (type === "Demand") {
    return "Client opportunity";
  }

  if (type === "Supply") {
    return "Professional opportunity";
  }

  return "Professional profile";
}

function getCountry(
  result: SearchResult
): string | undefined {
  const text =
    normalize(
      `${result.title} ${result.snippet || ""} ${result.link}`
    );

  const countries: Array<
    [string, string[]]
  > = [
    [
      "United Kingdom",
      [
        "united kingdom",
        "uk",
        "england",
        "scotland",
        "wales",
        "london",
      ],
    ],
    [
      "Canada",
      [
        "canada",
        "canadian",
        "toronto",
        "vancouver",
        "ontario",
      ],
    ],
    [
      "United States",
      [
        "united states",
        "usa",
        "u.s.",
        "america",
        "new york",
        "california",
        "texas",
      ],
    ],
    [
      "United Arab Emirates",
      [
        "united arab emirates",
        "uae",
        "dubai",
        "abu dhabi",
      ],
    ],
    [
      "Australia",
      [
        "australia",
        "australian",
        "sydney",
        "melbourne",
      ],
    ],
    [
      "Pakistan",
      [
        "pakistan",
        "pakistani",
        "karachi",
        "lahore",
        "islamabad",
        "peshawar",
      ],
    ],
    [
      "India",
      [
        "india",
        "indian",
        "delhi",
        "mumbai",
        "bangalore",
      ],
    ],
  ];

  for (
    const [country, terms] of countries
  ) {
    if (
      terms.some((term) =>
        text.includes(
          normalize(term)
        )
      )
    ) {
      return country;
    }
  }

  return undefined;
}

function getCity(
  result: SearchResult
): string | undefined {
  const text =
    normalize(
      `${result.title} ${result.snippet || ""}`
    );

  const cities = [
    "London",
    "Manchester",
    "Birmingham",
    "Toronto",
    "Vancouver",
    "Montreal",
    "Dubai",
    "Abu Dhabi",
    "New York",
    "Los Angeles",
    "Chicago",
    "Sydney",
    "Melbourne",
    "Karachi",
    "Lahore",
    "Islamabad",
    "Peshawar",
    "Delhi",
    "Mumbai",
    "Bangalore",
  ];

  for (
    const city of cities
  ) {
    if (
      text.includes(
        normalize(city)
      )
    ) {
      return city;
    }
  }

  return undefined;
}

function cleanDescription(
  result: SearchResult
): string {
  const snippet =
    cleanText(
      result.snippet || ""
    );

  if (snippet) {
    return snippet.slice(0, 1000);
  }

  return cleanText(
    result.title
  ).slice(0, 1000);
}

function getContactValue(
  contact: ContactInfo
): string | undefined {
  return (
    contact.email ||
    contact.phone ||
    contact.url
  );
}

function hasValidContact(
  contact: ContactInfo
): boolean {
  return Boolean(
    contact.email ||
    contact.phone ||
    contact.url
  );
}
async function searchSerper(
  query: string
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    throw new Error(
      "Serper API key is not configured"
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
          num: RESULTS_PER_SEARCH,
        }),
      }
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Serper request failed: ${response.status} ${body}`
    );
  }

  const data =
    await response.json();

  const organic =
    Array.isArray(data?.organic)
      ? data.organic
      : [];

  return organic
    .map((item: any) => ({
      title:
        cleanText(item?.title),
      link:
        cleanText(item?.link),
      snippet:
        cleanText(item?.snippet),
      date:
        cleanText(
          item?.date
        ),
      searchQuery:
        query,
    }))
    .filter(
      (item: SearchResult) =>
        Boolean(
          item.title &&
          item.link
        )
    )
    .slice(
      0,
      RESULTS_PER_SEARCH
    );
}

function parseGoogleResults(
  html: string,
  query: string
): SearchResult[] {
  const results: SearchResult[] = [];

  /*
   * Google HTML contains many navigation,
   * feedback and internal links.
   *
   * We only accept anchors that look like
   * genuine external search results.
   */
  const anchorRegex =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while (
    (match = anchorRegex.exec(html)) !== null
  ) {
    const rawHref =
      match[1];

    const rawContent =
      match[2];

    if (!rawHref) {
      continue;
    }

    let link = "";

    try {
      /*
       * Google often wraps results in:
       * /url?q=https://example.com...
       */
      if (
        rawHref.startsWith(
          "/url?"
        )
      ) {
        const parsed =
          new URL(
            `https://www.google.com${rawHref}`
          );

        link =
          parsed.searchParams.get(
            "q"
          ) ||
          parsed.searchParams.get(
            "url"
          ) ||
          "";
      } else if (
        rawHref.startsWith(
          "http://"
        ) ||
        rawHref.startsWith(
          "https://"
        )
      ) {
        link = rawHref;
      }
    } catch {
      continue;
    }

    link =
      normalizeUrl(link);

    if (
      !isValidExternalResultUrl(
        link
      )
    ) {
      continue;
    }

    const content =
      cleanText(
        rawContent
      );

    if (!content) {
      continue;
    }

    const title =
      content.slice(0, 300);

    /*
     * Prevent Google support/navigation
     * pages from entering the collector.
     */
    if (
      isGoogleOwnedUrl(link) ||
      isBlockedDomain(link)
    ) {
      continue;
    }

    if (
      BLOCKED_RESULT_TERMS.some(
        (term) =>
          normalize(title).includes(
            normalize(term)
          )
      )
    ) {
      continue;
    }

    /*
     * Google may expose the same result
     * multiple times through different
     * result containers.
     */
    if (
      results.some(
        (item) =>
          normalizeUrl(
            item.link
          ) === link
      )
    ) {
      continue;
    }

    results.push({
      title,
      link,
      snippet: "",
      searchQuery: query,
    });

    if (
      results.length >=
      RESULTS_PER_SEARCH
    ) {
      break;
    }
  }

  return results;
}

async function searchGoogleFallback(
  query: string
): Promise<SearchResult[]> {
  const url =
    `${GOOGLE_SEARCH_URL}?q=${encodeURIComponent(
      query
    )}&num=${RESULTS_PER_SEARCH}`;

  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml",
        "Accept-Language":
          "en-US,en;q=0.9",
      },
    });

  if (!response.ok) {
    throw new Error(
      `Google fallback failed: ${response.status}`
    );
  }

  const html =
    await response.text();

  return parseGoogleResults(
    html,
    query
  );
}

async function searchWithFallback(
  query: string
): Promise<SearchResult[]> {
  /*
   * First try Serper when available.
   *
   * If Serper has no credits, is missing,
   * or returns an error, immediately use
   * free Google HTML search.
   */
  if (SERPER_API_KEY) {
    try {
      const results =
        await searchSerper(
          query
        );

      if (
        results.length > 0
      ) {
        return results;
      }
    } catch (error) {
      console.warn(
        "[LEAD COLLECTOR] Serper failed; using Google fallback.",
        error
      );
    }
  }

  return searchGoogleFallback(
    query
  );
  }
type ProcessedLead = {
  type: LeadType;
  title: string;
  name?: string;
  company?: string;
  description?: string;
  skill?: string;
  category?: string;
  subcategory?: string;
  country?: string;
  city?: string;
  budget?: string;
  currency?: string;
  sourceUrl: string;
  contactUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
};

async function processResult(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[],
  stats: LeadStats
): Promise<ProcessedLead | null> {
  /*
   * Every result must first be a genuine
   * external URL.
   */
  if (
    !isValidExternalResultUrl(
      result.link
    )
  ) {
    stats.blocked += 1;
    return null;
  }

  /*
   * Reject Google/navigation/junk results.
   */
  if (
    isBlockedResult(result)
  ) {
    stats.blocked += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "blocked",
        title: result.title,
        url: result.link,
        query:
          result.searchQuery,
      })
    );

    return null;
  }

  /*
   * The result must actually look like
   * the requested lead type.
   */
  if (
    !resultMatchesType(
      result,
      type
    )
  ) {
    stats.wrongType += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "wrong-type",
        title: result.title,
        url: result.link,
        query:
          result.searchQuery,
      })
    );

    return null;
  }

  /*
   * Demand and Supply are limited to
   * the 72-hour freshness window.
   */
  if (
    !isFreshEnough(
      result,
      type
    )
  ) {
    stats.stale += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "stale",
        title: result.title,
        url: result.link,
      })
    );

    return null;
  }

  /*
   * Match the result to an actual skill
   * from the Supabase skills table.
   */
  const matchedSkill =
    detectSkill(
      result,
      skills
    );

  if (!matchedSkill) {
    stats.noSkill += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "no-skill",
        title: result.title,
        url: result.link,
        query:
          result.searchQuery,
      })
    );

    return null;
  }

  /*
   * Find a real direct contact path.
   *
   * We do not accept a generic source URL
   * merely because the page exists.
   */
  const contact =
    await improveContact(
      result
    );

  if (
    !hasValidContact(contact)
  ) {
    stats.noContact += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason: "no-contact",
        title: result.title,
        url: result.link,
        query:
          result.searchQuery,
      })
    );

    return null;
  }

  /*
   * SaaS has an additional requirement:
   * it must represent an identifiable
   * individual professional/profile,
   * not a generic company, product,
   * article, course, or directory.
   */
  if (
    type === "SaaS" &&
    !isIndividualSaasProfile(
      result,
      contact
    )
  ) {
    stats.wrongType += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason:
          "not-individual-saas-profile",
        title: result.title,
        url: result.link,
        contactUrl:
          contact.url,
      })
    );

    return null;
  }

  const searchText =
    getSearchText(result);

  const personName =
    extractPersonName(
      result.title
    );

  const country =
    getCountry(result);

  const city =
    getCity(result);

  const budget =
    getBudget(searchText);

  const currency =
    getCurrency(searchText);

  const sourceUrl =
    normalizeUrl(
      result.link
    );

  const contactUrl =
    contact.url
      ? normalizeUrl(
          contact.url
        )
      : undefined;

  /*
   * For SaaS, the person's name is
   * more useful than a generic title.
   */
  let name =
    personName;

  if (
    type === "SaaS" &&
    !name
  ) {
    name =
      cleanText(
        result.title
      );
  }

  /*
   * Keep the original title as the
   * lead title. This preserves useful
   * context from the source.
   */
  const lead: ProcessedLead = {
    type,

    title:
      getLeadTitle(
        result,
        type
      ),

    name,

    description:
      cleanDescription(
        result
      ),

    skill:
      matchedSkill.name,

    category:
      matchedSkill.category,

    subcategory:
      matchedSkill.subcategory,

    country,

    city,

    budget,

    currency,

    sourceUrl,

    contactUrl,

    contactEmail:
      contact.email,

    contactPhone:
      contact.phone,
  };

  /*
   * Only count as accepted after every
   * Gold-standard validation has passed.
   */
  stats.accepted += 1;

  return lead;
}

async function insertLead(
  lead: ProcessedLead,
  stats: LeadStats
): Promise<boolean> {
  if (!supabase) {
    stats.insertErrors += 1;

    console.error(
      "[LEAD COLLECTOR] Supabase is not configured."
    );

    return false;
  }

  const table =
    lead.type === "Demand"
      ? "demand_leads"
      : lead.type === "Supply"
        ? "supply_leads"
        : "saas_leads";

  /*
   * Keep the database payload compatible
   * with the lead fields used by the
   * Opportunity Hub Leads page.
   */
  const payload: Record<
    string,
    unknown
  > = {
    title:
      lead.title,

    name:
      lead.name,

    company:
      lead.company,

    description:
      lead.description,

    skill:
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

    source_url:
      lead.sourceUrl,

    contact_url:
      lead.contactUrl,

    contact_email:
      lead.contactEmail,

    contact_phone:
      lead.contactPhone,
  };

  /*
   * Remove undefined values so Supabase
   * receives only fields that actually
   * exist in the collected lead.
   */
  for (
    const key of Object.keys(payload)
  ) {
    if (
      payload[key] === undefined
    ) {
      delete payload[key];
    }
  }

  const { error } =
    await supabase
      .from(table)
      .insert(payload);

  if (error) {
    stats.insertErrors += 1;

    console.error(
      "[LEAD COLLECTOR] Insert error",
      JSON.stringify({
        type: lead.type,
        table,
        title: lead.title,
        error: error.message,
        code: error.code,
        details:
          error.details,
        hint: error.hint,
      })
    );

    return false;
  }

  stats.inserted += 1;

  return true;
  }
async function collectLeadsForType(
  type: LeadType,
  skills: SkillRow[]
): Promise<CollectorResult> {
  const stats =
    emptyStats();

  const insertedByType =
    emptyInsertedByType();

  const queries =
    buildQueries(
      type,
      skills
    );

  /*
   * Each query is searched independently.
   * This keeps the free Google fallback
   * simple and avoids one failed search
   * stopping the whole collector.
   */
  for (
    const query of queries
  ) {
    let results: SearchResult[] = [];

    try {
      results =
        await searchWithFallback(
          query
        );
    } catch (error) {
      console.error(
        "[LEAD COLLECTOR] Search failed",
        JSON.stringify({
          type,
          query,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        })
      );

      continue;
    }

    stats.found +=
      results.length;

    /*
     * Process every genuine search result.
     */
    for (
      const result of results
    ) {
      const processed =
        await processResult(
          result,
          type,
          skills,
          stats
        );

      if (!processed) {
        continue;
      }

      const contact: ContactInfo = {
        email:
          processed.contactEmail,
        phone:
          processed.contactPhone,
        url:
          processed.contactUrl,
      };

      const duplicate =
        await leadAlreadyExists(
          type,
          result,
          contact
        );

      if (duplicate) {
        stats.duplicate += 1;

        console.log(
          "[LEAD DIAGNOSTIC]",
          JSON.stringify({
            type,
            reason: "duplicate",
            title:
              processed.title,
            url:
              processed.sourceUrl,
          })
        );

        continue;
      }

      const inserted =
        await insertLead(
          processed,
          stats
        );

      if (inserted) {
        insertedByType[type] += 1;
      }
    }
  }

  return {
    stats,
    insertedByType,
  };
}

async function loadSkills(): Promise<
  SkillRow[]
> {
  if (!supabase) {
    return [];
  }

  /*
   * IMPORTANT:
   * The actual skills table does NOT have
   * a created_at column.
   *
   * Keep this select limited to the
   * columns that exist in the table.
   */
  const { data, error } =
    await supabase
      .from("skills")
      .select(
        "id,name,category,subcategory,tags"
      )
      .order(
        "name",
        {
          ascending: true,
        }
      );

  if (error) {
    console.error(
      "[LEAD COLLECTOR] Failed to load skills",
      JSON.stringify({
        message:
          error.message,
        code:
          error.code,
        details:
          error.details,
        hint:
          error.hint,
      })
    );

    return [];
  }

  return Array.isArray(data)
    ? data
    : [];
}

function combineStats(
  statsList: LeadStats[]
): LeadStats {
  const combined =
    emptyStats();

  for (
    const stats of statsList
  ) {
    combined.found +=
      stats.found;

    combined.accepted +=
      stats.accepted;

    combined.inserted +=
      stats.inserted;

    combined.duplicate +=
      stats.duplicate;

    combined.stale +=
      stats.stale;

    combined.wrongType +=
      stats.wrongType;

    combined.noContact +=
      stats.noContact;

    combined.noSkill +=
      stats.noSkill;

    combined.blocked +=
      stats.blocked;

    combined.insertErrors +=
      stats.insertErrors;
  }

  return combined;
}

function jsonResponse(
  res: VercelResponse,
  status: number,
  body: Record<
    string,
    unknown
  >
) {
  res.status(status);
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  return res.json(body);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /*
   * Always return JSON.
   *
   * This prevents the old:
   * "Unexpected token 'A' ..."
   * frontend parsing error.
   */
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  if (req.method !== "POST") {
    return jsonResponse(
      res,
      405,
      {
        ok: false,
        error:
          "Method not allowed",
      }
    );
  }

  try {
    if (!supabase) {
      return jsonResponse(
        res,
        500,
        {
          ok: false,
          error:
            "Supabase server configuration is missing.",
        }
      );
    }

    const skills =
      await loadSkills();

    if (
      skills.length === 0
    ) {
      return jsonResponse(
        res,
        200,
        {
          ok: true,
          message:
            "No skills were loaded, so no leads were collected.",
          added: 0,
          demand: 0,
          supply: 0,
          saas: 0,
          insertedByType:
            emptyInsertedByType(),
          diagnostics: {
            overall:
              emptyStats(),
            insertedByType:
              emptyInsertedByType(),
          },
        }
      );
    }

    /*
     * Run Demand, Supply and SaaS using
     * the same Gold validation rules.
     */
    const demand =
      await collectLeadsForType(
        "Demand",
        skills
      );

    const supply =
      await collectLeadsForType(
        "Supply",
        skills
      );

    const saas =
      await collectLeadsForType(
        "SaaS",
        skills
      );

    const insertedByType: InsertedByType = {
      Demand:
        demand.insertedByType.Demand,

      Supply:
        supply.insertedByType.Supply,

      SaaS:
        saas.insertedByType.SaaS,
    };

    const overall =
      combineStats([
        demand.stats,
        supply.stats,
        saas.stats,
      ]);

    const added =
      insertedByType.Demand +
      insertedByType.Supply +
      insertedByType.SaaS;

    console.log(
      "[LEAD COLLECTOR] Complete",
      JSON.stringify({
        added,
        insertedByType,
        diagnostics: {
          overall,
          insertedByType,
        },
      })
    );

    return jsonResponse(
      res,
      200,
      {
        ok: true,

        message:
          `Added ${added} leads — Demand: ${insertedByType.Demand}, Supply: ${insertedByType.Supply}, SaaS: ${insertedByType.SaaS}`,

        added,

        demand:
          insertedByType.Demand,

        supply:
          insertedByType.Supply,

        saas:
          insertedByType.SaaS,

        insertedByType,

        diagnostics: {
          overall,
          insertedByType,
        },
      }
    );
  } catch (error) {
    console.error(
      "[LEAD COLLECTOR] Fatal error",
      error
    );

    return jsonResponse(
      res,
      500,
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Lead collector failed.",
      }
    );
  }
    }
