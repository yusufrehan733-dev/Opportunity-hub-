import { createClient } from "@supabase/supabase-js";

type LeadType =
  | "Demand"
  | "Supply"
  | "SaaS";

type SourceType =
  | "reddit"
  | "remoteok"
  | "wwr";

type SkillRow = {
  id?: string;
  name: string;
  category?: string;
  subcategory?: string;
  tags?: string[] | string | null;
};

type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
  description?: string;
  publishedAt?: string;
  company?: string;
  author?: string;
  location?: string;
  source: string;
  sourceType: SourceType;
};

type ContactInfo = {
  email?: string;
  phone?: string;
  url?: string;
};

type LeadStats = {
  found: number;
  accepted: number;
  inserted: number;
  duplicate: number;
  wrongType: number;
  noSkill: number;
  noContact: number;
  blocked: number;
  stale: number;
  invalid: number;
  insertErrors: number;
};

type InsertedByType = {
  Demand: number;
  Supply: number;
  SaaS: number;
};

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

  salary?: string;

  sourceUrl: string;

  contactUrl?: string;

  contactEmail?: string;

  contactPhone?: string;

  createdAt?: string;
};

const MAX_AGE_HOURS = 72;

const MAX_RESULTS_PER_SOURCE = 40;

const REMOTE_OK_API =
  "https://remoteok.com/api";

const REMOTE_OK_RSS =
  "https://remoteok.com/remote-jobs.rss";

const WWR_RSS =
  "https://weworkremotely.com/remote-jobs.rss";

/*
 * Free public Reddit RSS feeds.
 *
 * These are used for Demand and SaaS discovery.
 * They do NOT replace the Gold validation rules.
 */
const REDDIT_FEEDS = [
  {
    url:
      "https://www.reddit.com/r/forhire/.rss",
    label:
      "Reddit r/forhire",
  },
  {
    url:
      "https://www.reddit.com/r/freelance_forhire/.rss",
    label:
      "Reddit r/freelance_forhire",
  },
  {
    url:
      "https://www.reddit.com/r/freelance/.rss",
    label:
      "Reddit r/freelance",
  },
  {
    url:
      "https://www.reddit.com/r/Teachers/.rss",
    label:
      "Reddit r/Teachers",
  },
  {
    url:
      "https://www.reddit.com/r/OnlineESLTeaching/.rss",
    label:
      "Reddit r/OnlineESLTeaching",
  },
  {
    url:
      "https://www.reddit.com/r/Coaching/.rss",
    label:
      "Reddit r/Coaching",
  },
  {
    url:
      "https://www.reddit.com/r/smallbusiness/.rss",
    label:
      "Reddit r/smallbusiness",
  },
];

const BLOCKED_DOMAINS = [
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "daraz.pk",
  "ebay.com",
  "udemy.com",
  "coursera.org",
  "skillshare.com",
  "fiverr.com",
  "upwork.com",
  "freelancer.com",
  "peopleperhour.com",
  "guru.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
];

const BLOCKED_CONTENT_TERMS = [
  "ebook",
  "course",
  "webinar",
  "newsletter",
  "blog post",
  "article",
  "news article",
  "directory",
  "marketplace",
  "software download",
  "app download",
  "shopping",
  "coupon",
  "product listing",
];

const DEMAND_INTENT_TERMS = [
  "i need",
  "need a",
  "need an",
  "looking for",
  "seeking",
  "wanted",
  "want a",
  "want an",
  "need someone",
  "hire someone",
  "can anyone recommend",
  "recommend a",
  "does anyone know",
  "help me find",
  "trying to find",
];

const DEMAND_REJECT_TERMS = [
  "we are hiring",
  "we're hiring",
  "hiring teachers",
  "hiring a teacher",
  "hiring tutor",
  "hiring tutors",
  "hiring coach",
  "hiring coaches",
  "job opening",
  "job vacancy",
  "vacancy",
  "career opportunity",
  "apply now",
  "join our team",
];

const SUPPLY_INTENT_TERMS = [
  "hiring",
  "we are looking for",
  "we're looking for",
  "looking for a",
  "looking for an",
  "seeking a",
  "seeking an",
  "join our team",
  "job opening",
  "job vacancy",
  "vacancy",
  "position available",
  "open position",
  "recruiting",
  "recruitment",
  "teachers wanted",
  "tutors wanted",
  "coaches wanted",
];

const PROFESSIONAL_TERMS = [
  "teacher",
  "tutor",
  "educator",
  "coach",
  "consultant",
  "mentor",
  "advisor",
  "adviser",
  "trainer",
  "developer",
  "programmer",
  "designer",
  "writer",
  "marketer",
  "accountant",
  "translator",
  "freelancer",
  "professional",
  "specialist",
  "engineer",
  "manager",
  "therapist",
  "instructor",
];

const ORGANIZATION_TERMS = [
  "school",
  "academy",
  "institute",
  "university",
  "college",
  "company",
  "agency",
  "organization",
  "organisation",
  "center",
  "centre",
  "training center",
  "training centre",
];

const COUNTRY_TERMS: Record<
  string,
  string[]
> = {
  "United States": [
    "united states",
    "united states of america",
    "usa",
    "u.s.a",
    "u.s.",
    "new york",
    "los angeles",
    "chicago",
    "houston",
    "california",
    "texas",
    "florida",
  ],

  Canada: [
    "canada",
    "canadian",
    "toronto",
    "vancouver",
    "montreal",
    "calgary",
    "ottawa",
  ],

  "United Kingdom": [
    "united kingdom",
    "uk",
    "u.k.",
    "england",
    "scotland",
    "wales",
    "london",
    "manchester",
    "birmingham",
    "liverpool",
  ],

  "United Arab Emirates": [
    "united arab emirates",
    "uae",
    "dubai",
    "abu dhabi",
    "sharjah",
  ],

  Australia: [
    "australia",
    "australian",
    "sydney",
    "melbourne",
    "brisbane",
    "perth",
  ],

  Pakistan: [
    "pakistan",
    "pakistani",
    "karachi",
    "lahore",
    "islamabad",
    "peshawar",
    "rawalpindi",
    "abbottabad",
    "mansehra",
  ],

  India: [
    "india",
    "indian",
    "delhi",
    "mumbai",
    "bangalore",
    "bengaluru",
    "hyderabad",
    "chennai",
  ],
};

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

const supabase =
  supabaseUrl &&
  supabaseKey
    ? createClient(
        supabaseUrl,
        supabaseKey
      )
    : null;

function emptyInsertedByType(): InsertedByType {
  return {
    Demand: 0,
    Supply: 0,
    SaaS: 0,
  };
}

function emptyStats(): LeadStats {
  return {
    found: 0,
    accepted: 0,
    inserted: 0,
    duplicate: 0,
    wrongType: 0,
    noSkill: 0,
    noContact: 0,
    blocked: 0,
    stale: 0,
    invalid: 0,
    insertErrors: 0,
  };
  }
function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function firstNonEmpty(
  ...values: unknown[]
): string | undefined {
  for (const value of values) {
    const text =
      normalizeText(value);

    if (text) {
      return text;
    }
  }

  return undefined;
}

function toArrayText(
  value:
    | string[]
    | string
    | null
    | undefined
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        normalizeText(item)
      )
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\|;]/)
      .map((item) =>
        normalizeText(item)
      )
      .filter(Boolean);
  }

  return [];
}

function getDomain(
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
    getDomain(url);

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

function containsBlockedContent(
  text: string
): boolean {
  const value =
    lower(text);

  return BLOCKED_CONTENT_TERMS.some(
    (term) =>
      value.includes(term)
  );
}

function containsAny(
  text: string,
  terms: string[]
): boolean {
  const value =
    lower(text);

  return terms.some(
    (term) =>
      value.includes(
        term
      )
  );
}

function isFresh(
  publishedAt?: string
): boolean {
  if (!publishedAt) {
    return true;
  }

  const timestamp =
    Date.parse(
      publishedAt
    );

  if (
    Number.isNaN(timestamp)
  ) {
    return true;
  }

  const ageHours =
    (Date.now() -
      timestamp) /
    (1000 * 60 * 60);

  return (
    ageHours >= -2 &&
    ageHours <=
      MAX_AGE_HOURS
  );
}

function cleanUrl(
  value: unknown
): string | undefined {
  const raw =
    normalizeText(value);

  if (!raw) {
    return undefined;
  }

  try {
    const url =
      new URL(raw);

    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function extractUrls(
  text: string
): string[] {
  const matches =
    text.match(
      /https?:\/\/[^\s<>"')]+/gi
    ) || [];

  return matches
    .map((url) =>
      url.replace(
        /[.,;!?]+$/,
        ""
      )
    )
    .map((url) =>
      cleanUrl(url)
    )
    .filter(
      (
        url
      ): url is string =>
        Boolean(url)
    );
}

function extractEmail(
  text: string
): string | undefined {
  const match =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

  return match?.[0]
    ? match[0].toLowerCase()
    : undefined;
}

function extractPhone(
  text: string
): string | undefined {
  const matches =
    text.match(
      /(?:\+?\d[\d\s().-]{7,}\d)/g
    ) || [];

  for (
    const value of matches
  ) {
    const cleaned =
      value.trim();

    const digits =
      cleaned.replace(
        /\D/g,
        ""
      );

    if (
      digits.length >= 8 &&
      digits.length <= 15
    ) {
      return cleaned;
    }
  }

  return undefined;
}

function extractContactInfo(
  text: string
): ContactInfo {
  const email =
    extractEmail(text);

  const phone =
    extractPhone(text);

  const urls =
    extractUrls(text);

  const contactUrl =
    urls.find(
      (url) => {
        const value =
          lower(url);

        return (
          value.includes(
            "contact"
          ) ||
          value.includes(
            "about"
          ) ||
          value.includes(
            "profile"
          ) ||
          value.includes(
            "facebook"
          ) ||
          value.includes(
            "instagram"
          ) ||
          value.includes(
            "twitter"
          ) ||
          value.includes(
            "x.com"
          ) ||
          value.includes(
            "telegram"
          ) ||
          value.includes(
            "whatsapp"
          ) ||
          value.includes(
            "linkedin"
          )
        );
      }
    );

  return {
    email,
    phone,
    url:
      contactUrl ||
      urls[0],
  };
}

function findCountry(
  text: string
): string | undefined {
  const value =
    lower(text);

  for (
    const [
      country,
      terms,
    ] of Object.entries(
      COUNTRY_TERMS
    )
  ) {
    if (
      terms.some(
        (term) =>
          value.includes(
            term.toLowerCase()
          )
      )
    ) {
      return country;
    }
  }

  return undefined;
}

function findCity(
  text: string
): string | undefined {
  const value =
    lower(text);

  const cities = [
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Toronto",
    "Vancouver",
    "Montreal",
    "Calgary",
    "Ottawa",
    "London",
    "Manchester",
    "Birmingham",
    "Liverpool",
    "Dubai",
    "Abu Dhabi",
    "Sharjah",
    "Sydney",
    "Melbourne",
    "Brisbane",
    "Perth",
    "Karachi",
    "Lahore",
    "Islamabad",
    "Peshawar",
    "Rawalpindi",
    "Abbottabad",
    "Mansehra",
    "Delhi",
    "Mumbai",
    "Bangalore",
    "Bengaluru",
    "Hyderabad",
    "Chennai",
  ];

  return cities.find(
    (city) =>
      value.includes(
        city.toLowerCase()
      )
  );
      }
function findMatchingSkill(
  text: string,
  skills: SkillRow[]
): SkillRow | undefined {
  const value =
    lower(text);

  if (!value) {
    return undefined;
  }

  const ordered =
    [...skills].sort(
      (a, b) =>
        normalizeText(
          b.name
        ).length -
        normalizeText(
          a.name
        ).length
    );

  for (
    const skill of ordered
  ) {
    const skillName =
      normalizeText(
        skill.name
      );

    if (!skillName) {
      continue;
    }

    const name =
      lower(skillName);

    /*
     * Exact phrase match.
     */
    if (
      value.includes(name)
    ) {
      return skill;
    }

    /*
     * Tag match.
     */
    const tags =
      toArrayText(
        skill.tags
      );

    for (
      const tag of tags
    ) {
      if (
        tag.length >= 3 &&
        value.includes(
          lower(tag)
        )
      ) {
        return skill;
      }
    }

    /*
     * Common professional
     * wording variations.
     *
     * Example:
     * "Software Engineer"
     * can match
     * "Software Engineering".
     */
    const normalizedName =
      name
        .replace(
          /\b(engineering|engineer)\b/g,
          "engineer"
        )
        .replace(
          /\b(development|developer)\b/g,
          "developer"
        )
        .replace(
          /\b(designing|designer|design)\b/g,
          "design"
        )
        .replace(
          /\b(writing|writer)\b/g,
          "writer"
        )
        .replace(
          /\b(marketing|marketer)\b/g,
          "marketing"
        )
        .replace(
          /\b(accounting|accountant)\b/g,
          "accounting"
        )
        .replace(
          /\b(translating|translator|translation)\b/g,
          "translation"
        )
        .replace(
          /\b(teaching|teacher|tutor|tutoring)\b/g,
          "teaching"
        )
        .replace(
          /\b(coaching|coach)\b/g,
          "coaching"
        )
        .replace(
          /\b(consulting|consultant)\b/g,
          "consulting"
        )
        .replace(
          /\b(training|trainer)\b/g,
          "training"
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (
      normalizedName &&
      value.includes(
        normalizedName
      )
    ) {
      return skill;
    }
  }

  return undefined;
}

function getCountryEvidence(
  result: SearchResult
): string {
  return [
    result.location,
    result.title,
    result.description,
    result.snippet,
    result.company,
    result.author,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function isProfessionalProfile(
  result: SearchResult,
  skill?: SkillRow
): boolean {
  const text = [
    result.title,
    result.description,
    result.snippet,
    result.company,
    result.author,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  if (
    skill &&
    lower(text).includes(
      lower(skill.name)
    )
  ) {
    return true;
  }

  return containsAny(
    text,
    PROFESSIONAL_TERMS
  );
}

function isOrganizationResult(
  result: SearchResult
): boolean {
  const text = [
    result.title,
    result.description,
    result.snippet,
    result.company,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  return containsAny(
    text,
    ORGANIZATION_TERMS
  );
}

function hasUsableContact(
  contact: ContactInfo
): boolean {
  return Boolean(
    contact.email ||
    contact.phone ||
    contact.url
  );
}

function isSpecificSourcePage(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  const domain =
    getDomain(url);

  if (!domain) {
    return false;
  }

  return ![
    "google.com",
    "bing.com",
    "yahoo.com",
    "duckduckgo.com",
  ].includes(domain);
}

function parseXmlItems(
  xml: string
): Array<
  Record<string, string>
> {
  const items: Array<
    Record<string, string>
  > = [];

  const itemMatches =
    xml.match(
      /<(item|entry)\b[\s\S]*?<\/\1>/gi
    ) || [];

  for (
    const itemXml of itemMatches
  ) {
    const item: Record<
      string,
      string
    > = {};

    const fields = [
      "title",
      "link",
      "description",
      "content",
      "summary",
      "pubDate",
      "published",
      "updated",
      "author",
      "name",
      "company",
      "location",
      "category",
    ];

    for (
      const field of fields
    ) {
      const pattern =
        new RegExp(
          `<${field}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${field}>`,
          "i"
        );

      const match =
        itemXml.match(
          pattern
        );

      if (match?.[1]) {
        item[field] =
          decodeXml(
            stripHtml(
              match[1]
            )
          );
      }
    }

    const linkHref =
      itemXml.match(
        /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i
      );

    if (
      linkHref?.[1] &&
      !item.link
    ) {
      item.link =
        decodeXml(
          linkHref[1]
        );
    }

    if (
      Object.keys(
        item
      ).length > 0
    ) {
      items.push(item);
    }
  }

  return items;
}

function stripHtml(
  value: string
): string {
  return value
    .replace(
      /<script\b[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style\b[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /<!\[CDATA\[/g,
      " "
    )
    .replace(
      /\]\]>/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function decodeXml(
  value: string
): string {
  return value
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;|&apos;/gi,
      "'"
    )
    .replace(
      /&#x27;/gi,
      "'"
    )
    .replace(
      /&#(\d+);/g,
      (_, code) =>
        String.fromCharCode(
          Number(code)
        )
    );
}

async function fetchText(
  url: string
): Promise<string> {
  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers: {
          Accept:
            "application/rss+xml, application/xml, text/xml, application/json, text/plain, */*",
          "User-Agent":
            "OpportunityHub/1.0 public-lead-collector",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

async function fetchJson(
  url: string
): Promise<unknown> {
  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
          "User-Agent":
            "OpportunityHub/1.0 public-lead-collector",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}`
    );
  }

  return response.json();
    }
function makeSearchResult(
  values: {
    title?: unknown;
    link?: unknown;
    description?: unknown;
    snippet?: unknown;
    publishedAt?: unknown;
    company?: unknown;
    author?: unknown;
    location?: unknown;
    source: string;
    sourceType: SourceType;
  }
): SearchResult | null {
  const title =
    normalizeText(
      values.title
    );

  const link =
    cleanUrl(
      values.link
    );

  if (
    !title ||
    !link
  ) {
    return null;
  }

  return {
    title,
    link,
    description:
      normalizeText(
        values.description
      ),
    snippet:
      normalizeText(
        values.snippet
      ),
    publishedAt:
      normalizeText(
        values.publishedAt
      ),
    company:
      normalizeText(
        values.company
      ),
    author:
      normalizeText(
        values.author
      ),
    location:
      normalizeText(
        values.location
      ),
    source:
      values.source,
    sourceType:
      values.sourceType,
  };
}

async function collectRemoteOk(): Promise<
  SearchResult[]
> {
  const results: SearchResult[] =
    [];

  try {
    const data =
      await fetchJson(
        REMOTE_OK_API
      );

    if (
      !Array.isArray(data)
    ) {
      return results;
    }

    for (
      const raw of data
    ) {
      if (
        !raw ||
        typeof raw !==
          "object"
      ) {
        continue;
      }

      const row =
        raw as Record<
          string,
          unknown
        >;

      const result =
        makeSearchResult({
          title:
            row.position ||
            row.title,

          link:
            row.url ||
            row.apply_url ||
            row.application_url,

          description:
            row.description,

          snippet:
            row.description,

          publishedAt:
            row.date ||
            row.created_at,

          company:
            row.company,

          location:
            row.location,

          source:
            "Remote OK",

          sourceType:
            "remoteok",
        });

      if (!result) {
        continue;
      }

      results.push(
        result
      );

      if (
        results.length >=
        MAX_RESULTS_PER_SOURCE
      ) {
        break;
      }
    }
  } catch (error) {
    console.error(
      "[LEAD COLLECTOR] Remote OK API error:",
      error
    );
  }

  return results;
}

async function collectRemoteOkRss(): Promise<
  SearchResult[]
> {
  const results: SearchResult[] =
    [];

  try {
    const xml =
      await fetchText(
        REMOTE_OK_RSS
      );

    const items =
      parseXmlItems(
        xml
      );

    for (
      const item of items
    ) {
      const result =
        makeSearchResult({
          title:
            item.title,

          link:
            item.link,

          description:
            item.description ||
            item.content,

          snippet:
            item.description ||
            item.content,

          publishedAt:
            item.pubDate ||
            item.published ||
            item.updated,

          company:
            item.company,

          location:
            item.location,

          source:
            "Remote OK RSS",

          sourceType:
            "remoteok",
        });

      if (result) {
        results.push(
          result
        );
      }

      if (
        results.length >=
        MAX_RESULTS_PER_SOURCE
      ) {
        break;
      }
    }
  } catch (error) {
    console.error(
      "[LEAD COLLECTOR] Remote OK RSS error:",
      error
    );
  }

  return results;
}

async function collectWWR(): Promise<
  SearchResult[]
> {
  const results: SearchResult[] =
    [];

  try {
    const xml =
      await fetchText(
        WWR_RSS
      );

    const items =
      parseXmlItems(
        xml
      );

    for (
      const item of items
    ) {
      const result =
        makeSearchResult({
          title:
            item.title,

          link:
            item.link,

          description:
            item.description ||
            item.content,

          snippet:
            item.description ||
            item.content,

          publishedAt:
            item.pubDate ||
            item.published ||
            item.updated,

          company:
            item.company,

          location:
            item.location,

          source:
            "We Work Remotely",

          sourceType:
            "wwr",
        });

      if (result) {
        results.push(
          result
        );
      }

      if (
        results.length >=
        MAX_RESULTS_PER_SOURCE
      ) {
        break;
      }
    }
  } catch (error) {
    console.error(
      "[LEAD COLLECTOR] WWR RSS error:",
      error
    );
  }

  return results;
}

async function collectReddit(): Promise<
  SearchResult[]
> {
  const results: SearchResult[] =
    [];

  for (
    const feed of REDDIT_FEEDS
  ) {
    try {
      const xml =
        await fetchText(
          feed.url
        );

      const items =
        parseXmlItems(
          xml
        );

      for (
        const item of items
      ) {
        const result =
          makeSearchResult({
            title:
              item.title,

            link:
              item.link,

            description:
              item.description ||
              item.content,

            snippet:
              item.description ||
              item.content,

            publishedAt:
              item.pubDate ||
              item.published ||
              item.updated,

            author:
              item.author ||
              item.name,

            source:
              feed.label,

            sourceType:
              "reddit",
          });

        if (result) {
          results.push(
            result
          );
        }

        if (
          results.length >=
          MAX_RESULTS_PER_SOURCE
        ) {
          break;
        }
      }
    } catch (error) {
      /*
       * Reddit 429 / unavailable feed
       * must never kill the complete
       * lead collection run.
       */
      console.error(
        "[LEAD COLLECTOR] Reddit feed error:",
        feed.url,
        error
      );
    }
  }

  return results;
}

function resultText(
  result: SearchResult
): string {
  return [
    result.title,
    result.description,
    result.snippet,
    result.company,
    result.author,
    result.location,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
        }
function classifyResult(
  result: SearchResult,
  matchingSkill: SkillRow | null
): LeadType | null {
  const text = resultText(result);
  const sourceType = result.sourceType;

  /*
   * Demand:
   * A person or organization is actively asking for a service.
   * We must avoid turning ordinary hiring/job posts into Demand.
   */
  if (
    sourceType === "reddit" &&
    matchingSkill &&
    containsAny(text, DEMAND_INTENT_TERMS) &&
    !containsAny(text, SUPPLY_INTENT_TERMS)
  ) {
    return "Demand";
  }

  /*
   * Supply:
   * RemoteOK and We Work Remotely are opportunity sources.
   * Keep the existing working Supply behavior.
   */
  if (
    (sourceType === "remoteok" || sourceType === "wwr") &&
    matchingSkill
  ) {
    return "Supply";
  }

  /*
   * SaaS:
   * A real professional who matches one of our skills can be a SaaS
   * prospect even when they are not currently asking for work.
   *
   * SaaS does NOT require a fresh post.
   */
  if (
    sourceType === "reddit" &&
    matchingSkill &&
    isProfessionalProfile(text) &&
    getCountryEvidence(result)
  ) {
    return "SaaS";
  }

  return null;
}

function buildContactInfo(result: SearchResult): ContactInfo {
  const combined = resultText(result);
  const extracted = extractContactInfo(combined);

  const contactUrl =
    cleanUrl(result.contactUrl) ||
    cleanUrl(result.url) ||
    null;

  return {
    email: extracted.email,
    phone: extracted.phone,
    contactUrl,
  };
}

function validateCommonResult(
  result: SearchResult
): {
  ok: boolean;
  reason?: keyof LeadStats;
} {
  const url = cleanUrl(result.url);

  if (!url) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  if (isBlockedDomain(url)) {
    return {
      ok: false,
      reason: "blocked",
    };
  }

  const text = resultText(result);

  if (!text.trim()) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  if (containsBlockedContent(text)) {
    return {
      ok: false,
      reason: "blocked",
    };
  }

  if (!isSpecificSourcePage(result)) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  return {
    ok: true,
  };
}

function buildProcessedLead(
  result: SearchResult,
  type: LeadType,
  matchingSkill: SkillRow
): ProcessedLead {
  const contact = buildContactInfo(result);

  const country =
    findCountry(resultText(result)) ||
    result.country ||
    null;

  const city =
    findCity(resultText(result)) ||
    result.city ||
    null;

  return {
    type,
    result,
    skill: matchingSkill,
    contact,
    country,
    city,
  };
}

function validateDemand(
  lead: ProcessedLead
): {
  ok: boolean;
  reason?: keyof LeadStats;
} {
  const common = validateCommonResult(lead.result);

  if (!common.ok) {
    return common;
  }

  if (!lead.skill) {
    return {
      ok: false,
      reason: "noSkill",
    };
  }

  if (!lead.country) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  if (!hasUsableContact(lead.result, lead.contact)) {
    return {
      ok: false,
      reason: "noContact",
    };
  }

  if (!isFresh(lead.result.publishedAt)) {
    return {
      ok: false,
      reason: "stale",
    };
  }

  const text = resultText(lead.result);

  if (!containsAny(text, DEMAND_INTENT_TERMS)) {
    return {
      ok: false,
      reason: "wrongType",
    };
  }

  /*
   * Hiring language belongs to Supply, not Demand.
   */
  if (containsAny(text, SUPPLY_INTENT_TERMS)) {
    return {
      ok: false,
      reason: "wrongType",
    };
  }

  return {
    ok: true,
  };
}

function validateSupply(
  lead: ProcessedLead
): {
  ok: boolean;
  reason?: keyof LeadStats;
} {
  const common = validateCommonResult(lead.result);

  if (!common.ok) {
    return common;
  }

  if (!lead.skill) {
    return {
      ok: false,
      reason: "noSkill",
    };
  }

  if (!lead.country) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  if (!hasUsableContact(lead.result, lead.contact)) {
    return {
      ok: false,
      reason: "noContact",
    };
  }

  if (!isFresh(lead.result.publishedAt)) {
    return {
      ok: false,
      reason: "stale",
    };
  }

  return {
    ok: true,
  };
}

function validateSaaS(
  lead: ProcessedLead
): {
  ok: boolean;
  reason?: keyof LeadStats;
} {
  const common = validateCommonResult(lead.result);

  if (!common.ok) {
    return common;
  }

  if (!lead.skill) {
    return {
      ok: false,
      reason: "noSkill",
    };
  }

  if (!lead.country) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  /*
   * For SaaS, a real public professional profile/source page is itself
   * an actionable contact path. Freshness is intentionally NOT required.
   */
  if (!hasUsableContact(lead.result, lead.contact)) {
    return {
      ok: false,
      reason: "noContact",
    };
  }

  if (!isProfessionalProfile(resultText(lead.result))) {
    return {
      ok: false,
      reason: "wrongType",
    };
  }

  return {
    ok: true,
  };
}
function getSalaryParts(result: SearchResult): {
  salaryRange: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
} {
  const text = resultText(result);

  const rangeMatch = text.match(
    /(?:\$|USD\s*)?(\d{2,7}(?:\.\d+)?)\s*(?:-|to|–)\s*(?:\$|USD\s*)?(\d{2,7}(?:\.\d+)?)/i
  );

  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);

    if (Number.isFinite(min) && Number.isFinite(max)) {
      return {
        salaryRange: `${min}-${max}`,
        salaryMin: min,
        salaryMax: max,
      };
    }
  }

  const singleMatch = text.match(
    /(?:salary|budget|pay|rate)[^\d]{0,30}(?:\$|USD\s*)?(\d{2,7}(?:\.\d+)?)/i
  );

  if (singleMatch) {
    const value = Number(singleMatch[1]);

    if (Number.isFinite(value)) {
      return {
        salaryRange: String(value),
        salaryMin: value,
        salaryMax: value,
      };
    }
  }

  return {
    salaryRange: null,
    salaryMin: null,
    salaryMax: null,
  };
}

function inferBudget(result: SearchResult): string | null {
  const salary = getSalaryParts(result);

  if (salary.salaryRange) {
    return salary.salaryRange;
  }

  const text = resultText(result);

  const budgetMatch = text.match(
    /(?:budget|pay|rate|payment)[^\d]{0,30}(?:\$|USD\s*)?(\d{2,7}(?:\.\d+)?)/i
  );

  if (budgetMatch) {
    return budgetMatch[1];
  }

  return null;
}

function cleanNullable(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text ? text : null;
}

async function leadExists(
  supabase: ReturnType<typeof createSupabase>,
  type: LeadType,
  result: SearchResult
): Promise<boolean> {
  const sourceUrl = cleanUrl(result.url);

  if (!sourceUrl) {
    return true;
  }

  const table =
    type === "Demand"
      ? "demand_leads"
      : type === "Supply"
        ? "supply_leads"
        : "saas_leads";

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("source_url", sourceUrl)
    .limit(1);

  if (error) {
    throw new Error(
      `Duplicate check failed for ${type}: ${error.message}`
    );
  }

  return Array.isArray(data) && data.length > 0;
}

async function insertDemand(
  supabase: ReturnType<typeof createSupabase>,
  lead: ProcessedLead
): Promise<void> {
  const result = lead.result;
  const contact = lead.contact;

  const payload = {
    client_name:
      cleanNullable(result.name) ||
      cleanNullable(result.company) ||
      "Unknown client",

    skill_needed: lead.skill?.name || null,

    description:
      cleanNullable(result.description) ||
      cleanNullable(result.content) ||
      null,

    content:
      cleanNullable(result.content) ||
      cleanNullable(result.description) ||
      null,

    email: contact.email,

    contact_phone: contact.phone,

    title:
      cleanNullable(result.title) ||
      cleanNullable(result.name) ||
      "Service request",

    category: lead.skill?.category || null,

    subcategory: lead.skill?.subcategory || null,

    country: lead.country,

    city: lead.city,

    budget: inferBudget(result),

    currency: "USD",

    contact_name:
      cleanNullable(result.name) ||
      cleanNullable(result.company) ||
      null,

    contact_email: contact.email,

    source_url: cleanUrl(result.url),

    contact_url: contact.contactUrl,
  };

  const { error } = await supabase
    .from("demand_leads")
    .insert(payload);

  if (error) {
    throw new Error(
      `Demand insert failed: ${error.message}`
    );
  }
}

async function insertSupply(
  supabase: ReturnType<typeof createSupabase>,
  lead: ProcessedLead
): Promise<void> {
  const result = lead.result;
  const contact = lead.contact;
  const salary = getSalaryParts(result);

  const payload = {
    company_name:
      cleanNullable(result.company) ||
      cleanNullable(result.name) ||
      "Unknown organization",

    name:
      cleanNullable(result.name) ||
      cleanNullable(result.company) ||
      null,

    description:
      cleanNullable(result.description) ||
      cleanNullable(result.content) ||
      null,

    position:
      cleanNullable(result.title) ||
      cleanNullable(result.position) ||
      "Opportunity",

    required_skill: lead.skill?.name || null,

    category: lead.skill?.category || null,

    subcategory: lead.skill?.subcategory || null,

    country: lead.country,

    city: lead.city,

    salary_range: salary.salaryRange,

    contact_email: contact.email,

    contact_phone: contact.phone,

    created_at:
      result.publishedAt ||
      new Date().toISOString(),

    job_title:
      cleanNullable(result.title) ||
      cleanNullable(result.position) ||
      null,

    salary_min: salary.salaryMin,

    salary_max: salary.salaryMax,

    company_website:
      cleanUrl(result.companyWebsite) ||
      null,

    apply_url:
      cleanUrl(result.applyUrl) ||
      cleanUrl(result.url),

    source:
      cleanNullable(result.source) ||
      result.sourceType,

    contact:
      cleanNullable(result.content) ||
      cleanNullable(result.description) ||
      contact.contactUrl ||
      null,

    source_url: cleanUrl(result.url),

    contact_name:
      cleanNullable(result.name) ||
      cleanNullable(result.company) ||
      null,

    commission: null,

    trial_days: null,

    landing_url: null,

    niche:
      lead.skill?.category ||
      lead.skill?.subcategory ||
      lead.skill?.name ||
      null,
  };

  const { error } = await supabase
    .from("supply_leads")
    .insert(payload);

  if (error) {
    throw new Error(
      `Supply insert failed: ${error.message}`
    );
  }
}

async function insertSaaS(
  supabase: ReturnType<typeof createSupabase>,
  lead: ProcessedLead
): Promise<void> {
  const result = lead.result;
  const contact = lead.contact;

  const payload = {
    name:
      cleanNullable(result.name) ||
      cleanNullable(result.company) ||
      "Professional",

    platform:
      cleanNullable(result.platform) ||
      cleanNullable(result.source) ||
      result.sourceType,

    niche:
      lead.skill?.category ||
      lead.skill?.subcategory ||
      lead.skill?.name ||
      null,

    contact:
      contact.contactUrl ||
      contact.email ||
      contact.phone ||
      cleanUrl(result.url),

    status: "active",

    created_at: new Date().toISOString(),

    description:
      cleanNullable(result.description) ||
      cleanNullable(result.content) ||
      null,

    commission: null,

    trial_days: null,

    landing_url: null,

    source_url: cleanUrl(result.url),

    country: lead.country,

    city: lead.city,
  };

  const { error } = await supabase
    .from("saas_leads")
    .insert(payload);

  if (error) {
    throw new Error(
      `SaaS insert failed: ${error.message}`
    );
  }
      }
async function insertLead(
  supabase: ReturnType<typeof createSupabase>,
  lead: ProcessedLead
): Promise<void> {
  if (lead.type === "Demand") {
    await insertDemand(supabase, lead);
    return;
  }

  if (lead.type === "Supply") {
    await insertSupply(supabase, lead);
    return;
  }

  await insertSaaS(supabase, lead);
}

function incrementStat(
  stats: LeadStats,
  key: keyof LeadStats
): void {
  stats[key] += 1;
}

async function processResults(
  supabase: ReturnType<typeof createSupabase>,
  results: SearchResult[],
  skills: SkillRow[]
): Promise<{
  insertedByType: InsertedByType;
  statsByType: {
    Demand: LeadStats;
    Supply: LeadStats;
    SaaS: LeadStats;
  };
}> {
  const insertedByType = emptyInsertedByType();

  const statsByType = {
    Demand: emptyStats(),
    Supply: emptyStats(),
    SaaS: emptyStats(),
  };

  for (const result of results) {
    const matchingSkill = findMatchingSkill(
      resultText(result),
      skills
    );

    const type = classifyResult(
      result,
      matchingSkill
    );

    if (!type) {
      /*
       * We only count a result against the most useful
       * diagnostic bucket when it clearly matched a skill.
       */
      if (!matchingSkill) {
        statsByType.Supply.noSkill += 1;
      }

      continue;
    }

    const stats = statsByType[type];

    stats.found += 1;

    const processed = buildProcessedLead(
      result,
      type,
      matchingSkill as SkillRow
    );

    let validation:
      | { ok: boolean; reason?: keyof LeadStats };

    if (type === "Demand") {
      validation = validateDemand(processed);
    } else if (type === "Supply") {
      validation = validateSupply(processed);
    } else {
      validation = validateSaaS(processed);
    }

    if (!validation.ok) {
      if (validation.reason) {
        incrementStat(
          stats,
          validation.reason
        );
      }

      continue;
    }

    stats.accepted += 1;

    try {
      const duplicate = await leadExists(
        supabase,
        type,
        result
      );

      if (duplicate) {
        stats.duplicate += 1;
        continue;
      }

      await insertLead(
        supabase,
        processed
      );

      stats.inserted += 1;
      insertedByType[type] += 1;
    } catch (error) {
      stats.insertErrors += 1;

      console.error(
        `${type} lead insert error:`,
        error
      );
    }
  }

  return {
    insertedByType,
    statsByType,
  };
}

async function collectAllSources(): Promise<SearchResult[]> {
  const collected: SearchResult[] = [];

  /*
   * Supply sources.
   */
  const remoteOk = await collectRemoteOk();
  collected.push(...remoteOk);

  const remoteOkRss = await collectRemoteOkRss();
  collected.push(...remoteOkRss);

  const wwr = await collectWWR();
  collected.push(...wwr);

  /*
   * Demand + SaaS discovery.
   *
   * Reddit is intentionally isolated from the job feeds because
   * professional/request posts have a different meaning from
   * ordinary job listings.
   */
  const reddit = await collectReddit();
  collected.push(...reddit);

  /*
   * Remove exact duplicate URLs before classification.
   */
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const result of collected) {
    const url = cleanUrl(result.url);

    if (!url) {
      continue;
    }

    if (seen.has(url)) {
      continue;
    }

    seen.add(url);
    unique.push(result);
  }

  return unique;
}

function makeStatsByType(): {
  Demand: LeadStats;
  Supply: LeadStats;
  SaaS: LeadStats;
} {
  return {
    Demand: emptyStats(),
    Supply: emptyStats(),
    SaaS: emptyStats(),
  };
}

function combineStats(
  target: LeadStats,
  source: LeadStats
): void {
  target.found += source.found;
  target.accepted += source.accepted;
  target.inserted += source.inserted;
  target.duplicate += source.duplicate;
  target.wrongType += source.wrongType;
  target.noSkill += source.noSkill;
  target.noContact += source.noContact;
  target.blocked += source.blocked;
  target.stale += source.stale;
  target.invalid += source.invalid;
  target.insertErrors += source.insertErrors;
}

function totalInserted(
  insertedByType: InsertedByType
): number {
  return (
    insertedByType.Demand +
    insertedByType.Supply +
    insertedByType.SaaS
  );
}
function buildDiagnostics(
  statsByType: {
    Demand: LeadStats;
    Supply: LeadStats;
    SaaS: LeadStats;
  }
) {
  const overall = makeStatsByType();

  combineStats(
    overall.Demand,
    statsByType.Demand
  );

  combineStats(
    overall.Supply,
    statsByType.Supply
  );

  combineStats(
    overall.SaaS,
    statsByType.SaaS
  );

  const totals: LeadStats = emptyStats();

  combineStats(
    totals,
    statsByType.Demand
  );

  combineStats(
    totals,
    statsByType.Supply
  );

  combineStats(
    totals,
    statsByType.SaaS
  );

  return {
    Demand: statsByType.Demand,
    Supply: statsByType.Supply,
    SaaS: statsByType.SaaS,
    overall: totals,
  };
}

async function loadSkills(
  supabase: ReturnType<typeof createSupabase>
): Promise<SkillRow[]> {
  const { data, error } = await supabase
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
    ? data.map((row: any) => ({
        id: String(row.id),
        name: String(row.name || ""),
        category: cleanNullable(row.category),
        subcategory: cleanNullable(row.subcategory),
        tags: toArrayText(row.tags),
      }))
    : [];
}

async function collectAndInsertLeads(): Promise<{
  success: boolean;
  message: string;
  added: number;
  inserted: number;
  insertedByType: InsertedByType;
  diagnostics: ReturnType<typeof buildDiagnostics>;
}> {
  const supabase = createSupabase();

  const skills = await loadSkills(
    supabase
  );

  if (skills.length === 0) {
    throw new Error(
      "No skills were loaded from Supabase."
    );
  }

  const results =
    await collectAllSources();

  const processed =
    await processResults(
      supabase,
      results,
      skills
    );

  const inserted =
    totalInserted(
      processed.insertedByType
    );

  const diagnostics =
    buildDiagnostics(
      processed.statsByType
    );

  return {
    success: true,

    message:
      inserted > 0
        ? `Added ${inserted} leads — Demand: ${processed.insertedByType.Demand}, Supply: ${processed.insertedByType.Supply}, SaaS: ${processed.insertedByType.SaaS}`
        : "No new qualifying leads were found.",

    added: inserted,

    inserted,

    insertedByType:
      processed.insertedByType,

    diagnostics,
  };
}

export default async function handler(
  req: any,
  res: any
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
    return;
  }

  try {
    const result =
      await collectAndInsertLeads();

    res.status(200).json(result);
  } catch (error) {
    console.error(
      "Lead collector error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Lead collector failed.";

    /*
     * Always return JSON so Admin does not hit:
     * "Unexpected token 'A' ... is not valid JSON"
     */
    res.status(500).json({
      success: false,
      message,
      added: 0,
      inserted: 0,
      insertedByType:
        emptyInsertedByType(),
      diagnostics: {
        Demand: emptyStats(),
        Supply: emptyStats(),
        SaaS: emptyStats(),
        overall: emptyStats(),
      },
    });
  }
}
function createSupabase() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL environment variable."
    );
  }

  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createClient(url, key);
}
