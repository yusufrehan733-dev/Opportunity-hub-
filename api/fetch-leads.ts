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
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | string | null;
};

type SearchResult = {
  title: string;
  link: string;
  description?: string;
  snippet?: string;
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
  result: SearchResult;
  skill: SkillRow;
  contact: ContactInfo;
  country: string | null;
  city: string | null;
};

const MAX_AGE_HOURS = 72;
const MAX_RESULTS_PER_SOURCE = 40;

const REMOTE_OK_API =
  "https://remoteok.com/api";

const REMOTE_OK_RSS =
  "https://remoteok.com/remote-jobs.rss";

const WWR_RSS =
  "https://weworkremotely.com/remote-jobs.rss";

const REDDIT_FEEDS = [
  {
    url: "https://www.reddit.com/r/forhire/.rss",
    label: "Reddit r/forhire",
  },
  {
    url: "https://www.reddit.com/r/freelance_forhire/.rss",
    label: "Reddit r/freelance_forhire",
  },
  {
    url: "https://www.reddit.com/r/freelance/.rss",
    label: "Reddit r/freelance",
  },
  {
    url: "https://www.reddit.com/r/Teachers/.rss",
    label: "Reddit r/Teachers",
  },
  {
    url: "https://www.reddit.com/r/OnlineESLTeaching/.rss",
    label: "Reddit r/OnlineESLTeaching",
  },
  {
    url: "https://www.reddit.com/r/Coaching/.rss",
    label: "Reddit r/Coaching",
  },
  {
    url: "https://www.reddit.com/r/smallbusiness/.rss",
    label: "Reddit r/smallbusiness",
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
  process.env.SUPABASE_SERVICE_ROLE ||
  "";

function createSupabase() {
  if (!supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_URL environment variable."
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseKey
  );
}

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

function clean(
  value: unknown
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

function normalizeText(
  value: unknown
): string {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(
  value: unknown
): string {
  const url = clean(value);

  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

function containsAny(
  text: string,
  terms: string[]
): boolean {
  const value = normalizeText(text);

  return terms.some((term) =>
    value.includes(
      normalizeText(term)
    )
  );
}

function toArrayText(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => clean(item))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function extractUrls(
  text: string
): string[] {
  const matches =
    text.match(
      /https?:\/\/[^\s<>"']+/gi
    ) || [];

  return matches
    .map((url) =>
      cleanUrl(
        url.replace(
          /[),.;]+$/,
          ""
        )
      )
    )
    .filter(Boolean);
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
  const match =
    text.match(
      /(?:\+?\d[\d\s().-]{7,}\d)/g
    );

  if (!match?.length) {
    return undefined;
  }

  const phone =
    match.find(
      (value) =>
        value.replace(
          /\D/g,
          ""
        ).length >= 8
    );

  return phone
    ? phone.trim()
    : undefined;
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
    urls.find((url) => {
      const value =
        normalizeText(url);

      return (
        value.includes("contact") ||
        value.includes("profile") ||
        value.includes("about") ||
        value.includes("facebook.com") ||
        value.includes("instagram.com") ||
        value.includes("linkedin.com") ||
        value.includes("x.com") ||
        value.includes("twitter.com") ||
        value.includes("telegram.me") ||
        value.includes("t.me") ||
        value.includes("whatsapp")
      );
    }) ||
    urls[0];

  return {
    email,
    phone,
    url: contactUrl,
  };
}

function isBlockedDomain(
  url: string
): boolean {
  try {
    const hostname =
      new URL(url)
        .hostname
        .toLowerCase()
        .replace(/^www\./, "");

    return BLOCKED_DOMAINS.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(
          `.${domain}`
        )
    );
  } catch {
    return true;
  }
}

function containsBlockedContent(
  text: string
): boolean {
  return containsAny(
    text,
    BLOCKED_CONTENT_TERMS
  );
}

function findCountry(
  text: string
): string | undefined {
  const value =
    normalizeText(text);

  for (
    const [country, terms] of Object.entries(
      COUNTRY_TERMS
    )
  ) {
    if (
      terms.some((term) =>
        value.includes(
          normalizeText(term)
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
    normalizeText(text);

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
    normalizeText(text);

  if (!value) {
    return undefined;
  }

  /*
   * First try the exact skill name.
   */
  for (const skill of skills) {
    const name =
      normalizeText(skill.name);

    if (
      name &&
      (
        value === name ||
        value.includes(name)
      )
    ) {
      return skill;
    }
  }

  /*
   * Then try category, subcategory,
   * and configured tags.
   */
  for (const skill of skills) {
    const terms = [
      skill.category,
      skill.subcategory,
      ...toArrayText(skill.tags),
    ]
      .map(normalizeText)
      .filter(
        (term) =>
          term.length >= 3
      );

    if (
      terms.some((term) =>
        value.includes(term)
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
    .map(clean)
    .filter(Boolean)
    .join(" ");
}

function isProfessionalProfile(
  result: SearchResult,
  skill?: SkillRow
): boolean {
  const text =
    normalizeText(
      resultText(result)
    );

  if (!text) {
    return false;
  }

  /*
   * A matching Opportunity Hub skill is
   * already strong evidence of relevance.
   */
  if (skill) {
    const skillName =
      normalizeText(
        skill.name
      );

    if (
      skillName &&
      text.includes(skillName)
    ) {
      return true;
    }

    const category =
      normalizeText(
        skill.category
      );

    if (
      category &&
      text.includes(category)
    ) {
      return true;
    }

    const subcategory =
      normalizeText(
        skill.subcategory
      );

    if (
      subcategory &&
      text.includes(subcategory)
    ) {
      return true;
    }
  }

  return containsAny(
    text,
    PROFESSIONAL_TERMS
  );
}

function isOrganizationResult(
  result: SearchResult
): boolean {
  return containsAny(
    resultText(result),
    ORGANIZATION_TERMS
  );
}

function hasUsableContact(
  result: SearchResult,
  contact: ContactInfo
): boolean {
  /*
   * Direct email or phone is always usable.
   */
  if (
    contact.email ||
    contact.phone
  ) {
    return true;
  }

  /*
   * For SaaS, the public professional
   * source/profile itself can be the
   * contact path.
   */
  if (
    cleanUrl(result.link)
  ) {
    return true;
  }

  return false;
}

function isSpecificSourcePage(
  result: SearchResult
): boolean {
  const url =
    cleanUrl(result.link);

  if (!url) {
    return false;
  }

  try {
    const parsed =
      new URL(url);

    const path =
      parsed.pathname
        .toLowerCase()
        .replace(
          /\/+$/,
          ""
        );

    if (!path) {
      return false;
    }

    /*
     * Reject obvious generic search/
     * category/index pages.
     */
    const genericPaths = [
      "/",
      "/search",
      "/jobs",
      "/job",
      "/jobs/",
      "/categories",
      "/category",
      "/tag",
      "/tags",
      "/topics",
      "/forum",
      "/forums",
    ];

    if (
      genericPaths.includes(
        path
      )
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isFresh(
  publishedAt?: string
): boolean {
  if (!publishedAt) {
    return false;
  }

  const timestamp =
    Date.parse(
      publishedAt
    );

  if (
    Number.isNaN(timestamp)
  ) {
    return false;
  }

  const age =
    Date.now() -
    timestamp;

  if (age < 0) {
    return true;
  }

  return (
    age <=
    MAX_AGE_HOURS *
      60 *
      60 *
      1000
  );
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
    .map(clean)
    .filter(Boolean)
    .join(" ");
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
    clean(values.title);

  const link =
    cleanUrl(values.link);

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
      clean(values.description),
    snippet:
      clean(values.snippet),
    publishedAt:
      clean(values.publishedAt),
    company:
      clean(values.company),
    author:
      clean(values.author),
    location:
      clean(values.location),
    source:
      values.source,
    sourceType:
      values.sourceType,
  };
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
      Object.keys(item).length
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
            "application/rss+xml, application/xml, text/xml, text/plain, */*",
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
        typeof raw !== "object"
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

      results.push(result);

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
      parseXmlItems(xml);

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
        results.push(result);
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
      parseXmlItems(xml);

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
        results.push(result);
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
        parseXmlItems(xml);

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
          results.push(result);
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
       * A Reddit 429 or unavailable
       * feed must never stop the
       * complete collection run.
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
function classifyResult(
  result: SearchResult,
  skills: SkillRow[]
): {
  type: LeadType | null;
  skill?: SkillRow;
} {
  const text = resultText(result);
  const lower = text.toLowerCase();

  const skill = findMatchingSkill(text, skills);

  if (!skill) {
    return { type: null };
  }

  const hasDemandIntent = containsAny(lower, DEMAND_INTENT_TERMS);
  const hasDemandReject = containsAny(lower, DEMAND_REJECT_TERMS);

  const hasSupplyIntent = containsAny(lower, SUPPLY_INTENT_TERMS);

  const professional =
    isProfessionalProfile(result, skill);

  const organization =
    isOrganizationResult(result);

  /*
   * ---------------------------------------------------------
   * DEMAND
   * ---------------------------------------------------------
   *
   * Demand means a person/client is asking for a service.
   *
   * We deliberately reject normal hiring/job language here.
   */
  if (
    hasDemandIntent &&
    !hasDemandReject &&
    !hasSupplyIntent &&
    !organization
  ) {
    return {
      type: "Demand",
      skill,
    };
  }

  /*
   * ---------------------------------------------------------
   * SUPPLY
   * ---------------------------------------------------------
   *
   * Supply means an organization has an opportunity
   * for someone with the skill.
   *
   * RemoteOK / WWR are treated as supply sources.
   */
  if (
    hasSupplyIntent &&
    organization
  ) {
    return {
      type: "Supply",
      skill,
    };
  }

  if (
    (result.sourceType === "remoteok" ||
      result.sourceType === "wwr") &&
    organization
  ) {
    return {
      type: "Supply",
      skill,
    };
  }

  /*
   * ---------------------------------------------------------
   * SAAS
   * ---------------------------------------------------------
   *
   * SaaS is a professional who matches an Opportunity Hub
   * skill and has a real public professional/profile page.
   *
   * They do NOT have to be looking for clients.
   *
   * SaaS is intentionally not freshness-limited.
   */
  if (
    professional &&
    isSpecificSourcePage(result) &&
    hasUsableContact(result, extractContactInfo(text))
  ) {
    return {
      type: "SaaS",
      skill,
    };
  }

  return {
    type: null,
  };
}


function validateProcessedLead(
  lead: ProcessedLead,
  stats: LeadStats
): boolean {
  const result = lead.result;
  const text = resultText(result);

  /*
   * Basic source validation.
   */
  if (!result.link || !result.title) {
    stats.invalid += 1;
    return false;
  }

  /*
   * Never accept blocked domains/content.
   */
  if (isBlockedDomain(result.link)) {
    stats.blocked += 1;
    return false;
  }

  if (containsBlockedContent(text)) {
    stats.blocked += 1;
    return false;
  }

  /*
   * Demand and Supply must be fresh.
   * SaaS is intentionally exempt from the 72-hour rule.
   */
  if (
    (lead.type === "Demand" || lead.type === "Supply") &&
    !isFresh(result.publishedAt)
  ) {
    stats.stale += 1;
    return false;
  }

  /*
   * Country is required.
   */
  if (!lead.country) {
    stats.invalid += 1;
    return false;
  }

  /*
   * Skill is required for every lead type.
   */
  if (!lead.skill || !clean(lead.skill.name)) {
    stats.noSkill += 1;
    return false;
  }

  /*
   * ---------------------------------------------------------
   * CONTACT RULES
   * ---------------------------------------------------------
   *
   * SaaS:
   *   A real public professional profile/source page is enough.
   *
   * Demand/Supply:
   *   We do NOT accept merely having a generic source/job page.
   *   There must be an actual direct contact path.
   */
  if (lead.type === "SaaS") {
    if (
      !lead.contact.email &&
      !lead.contact.phone &&
      !result.link
    ) {
      stats.noContact += 1;
      return false;
    }
  } else {
    const directContact =
      !!lead.contact.email ||
      !!lead.contact.phone ||
      (
        !!lead.contact.url &&
        lead.contact.url !== result.link
      );

    if (!directContact) {
      stats.noContact += 1;
      return false;
    }
  }

  /*
   * Demand must represent a client/person request,
   * not a job opening.
   */
  if (lead.type === "Demand") {
    const lower = text.toLowerCase();

    if (containsAny(lower, DEMAND_REJECT_TERMS)) {
      stats.wrongType += 1;
      return false;
    }

    if (containsAny(lower, SUPPLY_INTENT_TERMS)) {
      stats.wrongType += 1;
      return false;
    }
  }

  /*
   * Supply must represent an organization/opportunity.
   */
  if (lead.type === "Supply") {
    if (!isOrganizationResult(result)) {
      stats.wrongType += 1;
      return false;
    }
  }

  /*
   * SaaS must actually look like a professional.
   */
  if (lead.type === "SaaS") {
    if (!isProfessionalProfile(result, lead.skill)) {
      stats.wrongType += 1;
      return false;
    }
  }

  stats.accepted += 1;
  return true;
}


function buildProcessedLead(
  result: SearchResult,
  skills: SkillRow[]
): ProcessedLead | null {
  const classified = classifyResult(result, skills);

  if (!classified.type || !classified.skill) {
    return null;
  }

  const text = resultText(result);

  const contact = extractContactInfo(text);

  /*
   * For SaaS, the public profile/source URL is itself the
   * actionable contact path when no email/phone exists.
   */
  if (
    classified.type === "SaaS" &&
    !contact.url &&
    result.link
  ) {
    contact.url = result.link;
  }

  const country =
    findCountry(
      [
        result.location || "",
        result.title || "",
        result.description || "",
        result.snippet || "",
        result.author || "",
        result.company || "",
      ].join(" ")
    ) || null;

  const city =
    findCity(
      [
        result.location || "",
        result.title || "",
        result.description || "",
        result.snippet || "",
      ].join(" ")
    ) || null;

  return {
    type: classified.type,
    result,
    skill: classified.skill,
    contact,
    country,
    city,
  };
}


function processResults(
  results: SearchResult[],
  skills: SkillRow[]
): {
  leads: ProcessedLead[];
  stats: LeadStats;
} {
  const stats = emptyStats();
  const leads: ProcessedLead[] = [];

  stats.found = results.length;

  const seen = new Set<string>();

  for (const result of results) {
    const key = cleanUrl(result.link).toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);

    const lead = buildProcessedLead(result, skills);

    if (!lead) {
      const text = resultText(result);

      if (!findMatchingSkill(text, skills)) {
        stats.noSkill += 1;
      } else {
        stats.wrongType += 1;
      }

      continue;
    }

    if (validateProcessedLead(lead, stats)) {
      leads.push(lead);
    }
  }

  return {
    leads,
    stats,
  };
}
function escapeText(value: unknown): string {
  return clean(value).replace(/[<>]/g, "");
}

function makeLeadTitle(
  lead: ProcessedLead
): string {
  const title = clean(lead.result.title);

  if (title) {
    return title;
  }

  if (lead.type === "SaaS") {
    return `${lead.skill.name} Professional`;
  }

  if (lead.type === "Supply") {
    return `${lead.skill.name} Opportunity`;
  }

  return `${lead.skill.name} Service Request`;
}


function makeDescription(
  lead: ProcessedLead
): string {
  const description =
    clean(lead.result.description) ||
    clean(lead.result.snippet);

  if (description) {
    return description;
  }

  return clean(lead.result.title);
}


function makeContactUrl(
  lead: ProcessedLead
): string | null {
  if (lead.contact.url) {
    return cleanUrl(lead.contact.url);
  }

  if (lead.type === "SaaS") {
    return cleanUrl(lead.result.link) || null;
  }

  return null;
}


function makeSourceUrl(
  lead: ProcessedLead
): string {
  return cleanUrl(lead.result.link);
}


function makeCountry(
  lead: ProcessedLead
): string {
  return clean(lead.country);
}


function makeCity(
  lead: ProcessedLead
): string {
  return clean(lead.city);
}


function makeSkillName(
  lead: ProcessedLead
): string {
  return clean(lead.skill.name);
}


function makeCategory(
  lead: ProcessedLead
): string {
  return clean(lead.skill.category);
}


function makeSubcategory(
  lead: ProcessedLead
): string {
  return clean(lead.skill.subcategory);
}


function makeSourceName(
  lead: ProcessedLead
): string {
  return clean(lead.result.source);
}


function makeContactEmail(
  lead: ProcessedLead
): string | null {
  return lead.contact.email
    ? clean(lead.contact.email)
    : null;
}


function makeContactPhone(
  lead: ProcessedLead
): string | null {
  return lead.contact.phone
    ? clean(lead.contact.phone)
    : null;
}


/*
 * ---------------------------------------------------------
 * DEMAND INSERT
 * ---------------------------------------------------------
 */
async function insertDemandLead(
  supabase: ReturnType<typeof createSupabase>,
  lead: ProcessedLead
): Promise<{
  inserted: boolean;
  duplicate: boolean;
}> {
  const sourceUrl = makeSourceUrl(lead);

  const existing = await supabase
    .from("demand_leads")
    .select("id")
    .eq("source_url", sourceUrl)
    .limit(1);

  if (existing.error) {
    throw new Error(
      `Demand duplicate check failed: ${existing.error.message}`
    );
  }

  if (existing.data && existing.data.length > 0) {
    return {
      inserted: false,
      duplicate: true,
    };
  }

  const row = {
    client_name:
      escapeText(
        lead.result.author ||
        lead.result.company ||
        "Client"
      ),

    skill_needed:
      makeSkillName(lead),

    description:
      makeDescription(lead),

    content:
      makeDescription(lead),

    email:
      makeContactEmail(lead),

    contact_phone:
      makeContactPhone(lead),

    title:
      makeLeadTitle(lead),

    category:
      makeCategory(lead),

    subcategory:
      makeSubcategory(lead),

    country:
      makeCountry(lead),

    city:
      makeCity(lead),

    contact_name:
      escapeText(lead.result.author),

    contact_email:
      makeContactEmail(lead),

    source_url:
      sourceUrl,

    contact_url:
      makeContactUrl(lead),

    status:
      "active",

    created_at:
      lead.result.publishedAt ||
      new Date().toISOString(),
  };

  const inserted = await supabase
    .from("demand_leads")
    .insert(row);

  if (inserted.error) {
    throw new Error(
      `Demand insert failed: ${inserted.error.message}`
    );
  }

  return {
    inserted: true,
    duplicate: false,
  };
}


/*
 * ---------------------------------------------------------
 * SUPPLY INSERT
 * ---------------------------------------------------------
 */
async function insertSupplyLead(
  supabase: ReturnType<typeof createSupabase>,
  lead: ProcessedLead
): Promise<{
  inserted: boolean;
  duplicate: boolean;
}> {
  const sourceUrl = makeSourceUrl(lead);

  const existing = await supabase
    .from("supply_leads")
    .select("id")
    .eq("source_url", sourceUrl)
    .limit(1);

  if (existing.error) {
    throw new Error(
      `Supply duplicate check failed: ${existing.error.message}`
    );
  }

  if (existing.data && existing.data.length > 0) {
    return {
      inserted: false,
      duplicate: true,
    };
  }

  const row = {
    name:
      escapeText(
        lead.result.author ||
        lead.result.company ||
        "Organization"
      ),

    description:
      makeDescription(lead),

    position:
      makeLeadTitle(lead),

    required_skill:
      makeSkillName(lead),

    category:
      makeCategory(lead),

    subcategory:
      makeSubcategory(lead),

    country:
      makeCountry(lead),

    city:
      makeCity(lead),

    contact_email:
      makeContactEmail(lead),

    contact_phone:
      makeContactPhone(lead),

    job_title:
      makeLeadTitle(lead),

    company_name:
      escapeText(lead.result.company),

    company_website:
      makeContactUrl(lead),

    apply_url:
      makeContactUrl(lead),

    source:
      makeSourceName(lead),

    source_url:
      sourceUrl,

    contact_name:
      escapeText(lead.result.author),

    niche:
      makeSkillName(lead),

    contact:
      makeContactUrl(lead),

    created_at:
      lead.result.publishedAt ||
      new Date().toISOString(),
  };

  const inserted = await supabase
    .from("supply_leads")
    .insert(row);

  if (inserted.error) {
    throw new Error(
      `Supply insert failed: ${inserted.error.message}`
    );
  }

  return {
    inserted: true,
    duplicate: false,
  };
}


/*
 * ---------------------------------------------------------
 * SAAS INSERT
 * ---------------------------------------------------------
 */
async function insertSaasLead(
  supabase: ReturnType<typeof createSupabase>,
  lead: ProcessedLead
): Promise<{
  inserted: boolean;
  duplicate: boolean;
}> {
  const sourceUrl = makeSourceUrl(lead);
  const contactUrl = makeContactUrl(lead);

  const existingByContact = contactUrl
    ? await supabase
        .from("saas_leads")
        .select("id")
        .eq("contact_url", contactUrl)
        .limit(1)
    : null;

  if (existingByContact?.error) {
    throw new Error(
      `SaaS duplicate check failed: ${existingByContact.error.message}`
    );
  }

  if (
    existingByContact?.data &&
    existingByContact.data.length > 0
  ) {
    return {
      inserted: false,
      duplicate: true,
    };
  }

  const existingBySource = await supabase
    .from("saas_leads")
    .select("id")
    .eq("source_url", sourceUrl)
    .limit(1);

  if (existingBySource.error) {
    throw new Error(
      `SaaS source duplicate check failed: ${existingBySource.error.message}`
    );
  }

  if (
    existingBySource.data &&
    existingBySource.data.length > 0
  ) {
    return {
      inserted: false,
      duplicate: true,
    };
  }

  const row = {
    name:
      escapeText(
        lead.result.author ||
        lead.result.company ||
        makeLeadTitle(lead)
      ),

    platform:
      makeSourceName(lead),

    niche:
      makeSkillName(lead),

    contact:
      contactUrl,

    status:
      "active",

    created_at:
      lead.result.publishedAt ||
      new Date().toISOString(),

    description:
      makeDescription(lead),

    trial_days:
      14,

    landing_url:
      "https://opportunity-hub-umber.vercel.app/",

    source_url:
      sourceUrl,

    country:
      makeCountry(lead),

    city:
      makeCity(lead),

    contact_url:
      contactUrl,
  };

  const inserted = await supabase
    .from("saas_leads")
    .insert(row);

  if (inserted.error) {
    throw new Error(
      `SaaS insert failed: ${inserted.error.message}`
    );
  }

  return {
    inserted: true,
    duplicate: false,
  };
        }
async function insertProcessedLead(
  supabase: ReturnType<typeof createSupabase>,
  lead: ProcessedLead
): Promise<{
  inserted: boolean;
  duplicate: boolean;
}> {
  if (lead.type === "Demand") {
    return insertDemandLead(supabase, lead);
  }

  if (lead.type === "Supply") {
    return insertSupplyLead(supabase, lead);
  }

  return insertSaasLead(supabase, lead);
}


async function loadSkillsFromSupabase(
  supabase: ReturnType<typeof createSupabase>
): Promise<SkillRow[]> {
  const result = await supabase
    .from("skills")
    .select(
      "id,name,category,subcategory,tags"
    )
    .order("name", {
      ascending: true,
    });

  if (result.error) {
    throw new Error(
      `Skills query failed: ${result.error.message}`
    );
  }

  return (result.data || [])
    .map((row: any) => ({
      id: clean(row.id),
      name: clean(row.name),
      category: clean(row.category) || null,
      subcategory: clean(row.subcategory) || null,
      tags: row.tags ?? null,
    }))
    .filter((row) => !!row.name);
}


function dedupeResults(
  results: SearchResult[]
): SearchResult[] {
  const output: SearchResult[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const link = cleanUrl(result.link);

    if (!link) {
      continue;
    }

    const key = link.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push({
      ...result,
      link,
    });
  }

  return output;
}


async function collectAllSources(): Promise<SearchResult[]> {
  const all: SearchResult[] = [];

  const collectors = [
    collectRemoteOk(),
    collectRemoteOkRss(),
    collectWWR(),
    collectReddit(),
  ];

  const settled = await Promise.allSettled(
    collectors
  );

  for (const result of settled) {
    if (
      result.status === "fulfilled" &&
      Array.isArray(result.value)
    ) {
      all.push(...result.value);
    }
  }

  return dedupeResults(all);
}


async function insertAllProcessedLeads(
  supabase: ReturnType<typeof createSupabase>,
  leads: ProcessedLead[],
  diagnostics: Record<LeadType, LeadStats>,
  insertedByType: InsertedByType
): Promise<void> {
  for (const lead of leads) {
    try {
      const result =
        await insertProcessedLead(
          supabase,
          lead
        );

      if (result.duplicate) {
        diagnostics[lead.type].duplicate += 1;
        continue;
      }

      if (result.inserted) {
        diagnostics[lead.type].inserted += 1;
        insertedByType[lead.type] += 1;
      }
    } catch (error) {
      diagnostics[lead.type].insertErrors += 1;

      console.error(
        `[Lead Collector] ${lead.type} insert error:`,
        error
      );
    }
  }
}


function totalStats(
  diagnostics: Record<LeadType, LeadStats>
): LeadStats {
  const total = emptyStats();

  for (const type of [
    "Demand",
    "Supply",
    "SaaS",
  ] as LeadType[]) {
    const stats = diagnostics[type];

    total.found += stats.found;
    total.accepted += stats.accepted;
    total.inserted += stats.inserted;
    total.duplicate += stats.duplicate;
    total.wrongType += stats.wrongType;
    total.noSkill += stats.noSkill;
    total.noContact += stats.noContact;
    total.blocked += stats.blocked;
    total.stale += stats.stale;
    total.invalid += stats.invalid;
    total.insertErrors += stats.insertErrors;
  }

  return total;
}


function emptyDiagnostics(): Record<LeadType, LeadStats> {
  return {
    Demand: emptyStats(),
    Supply: emptyStats(),
    SaaS: emptyStats(),
  };
}


function diagnosticsForResults(
  results: SearchResult[],
  skills: SkillRow[]
): {
  leads: ProcessedLead[];
  diagnostics: Record<LeadType, LeadStats>;
} {
  const diagnostics = emptyDiagnostics();

  const byType: Record<LeadType, SearchResult[]> = {
    Demand: [],
    Supply: [],
    SaaS: [],
  };

  /*
   * First classify every source result.
   * This lets the diagnostics show exactly which type
   * each result belongs to.
   */
  for (const result of results) {
    const classified =
      classifyResult(result, skills);

    if (!classified.type) {
      const text = resultText(result);

      if (!findMatchingSkill(text, skills)) {
        diagnostics.Demand.noSkill += 1;
        diagnostics.Supply.noSkill += 1;
        diagnostics.SaaS.noSkill += 1;
      }

      continue;
    }

    byType[classified.type].push(result);
  }

  const allLeads: ProcessedLead[] = [];

  for (const type of [
    "Demand",
    "Supply",
    "SaaS",
  ] as LeadType[]) {
    const processed =
      processResults(
        byType[type],
        skills
      );

    diagnostics[type] = processed.stats;

    allLeads.push(...processed.leads);
  }

  return {
    leads: allLeads,
    diagnostics,
  };
}


function buildResponsePayload(
  insertedByType: InsertedByType,
  diagnostics: Record<LeadType, LeadStats>
) {
  const total = totalStats(diagnostics);

  return {
    success: true,

    message:
      `Lead collection completed. ` +
      `Inserted ${total.inserted} real leads.`,

    added: total.inserted,

    inserted: total.inserted,

    insertedByType,

    diagnostics: {
      Demand: diagnostics.Demand,
      Supply: diagnostics.Supply,
      SaaS: diagnostics.SaaS,

      overall: total,
    },
  };
    }
export default async function handler(
  req: any,
  res: any
) {
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  /*
   * Only POST is allowed.
   */
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed.",
    });
  }

  try {
    console.log(
      "[Lead Collector] Starting real lead collection..."
    );

    const supabase = createSupabase();

    /*
     * Load the real Opportunity Hub skill hierarchy.
     */
    const skills =
      await loadSkillsFromSupabase(supabase);

    console.log(
      `[Lead Collector] Loaded ${skills.length} skills.`
    );

    if (!skills.length) {
      return res.status(200).json({
        success: true,
        message:
          "No Opportunity Hub skills were found.",
        added: 0,
        inserted: 0,
        insertedByType: emptyInsertedByType(),
        diagnostics: {
          Demand: emptyStats(),
          Supply: emptyStats(),
          SaaS: emptyStats(),
          overall: emptyStats(),
        },
      });
    }

    /*
     * Collect from all free public sources.
     *
     * No Serper.
     * No paid API.
     */
    const results =
      await collectAllSources();

    console.log(
      `[Lead Collector] Collected ${results.length} source results.`
    );

    /*
     * Classify and validate against the actual
     * Opportunity Hub Gold lead rules.
     */
    const processed =
      diagnosticsForResults(
        results,
        skills
      );

    console.log(
      `[Lead Collector] Accepted ${processed.leads.length} leads.`
    );

    const insertedByType =
      emptyInsertedByType();

    /*
     * Insert only validated leads.
     */
    await insertAllProcessedLeads(
      supabase,
      processed.leads,
      processed.diagnostics,
      insertedByType
    );

    const payload =
      buildResponsePayload(
        insertedByType,
        processed.diagnostics
      );

    console.log(
      "[Lead Collector] Completed:",
      JSON.stringify(
        payload.insertedByType
      )
    );

    return res.status(200).json(
      payload
    );
  } catch (error) {
    console.error(
      "[Lead Collector] Fatal error:",
      error
    );

    /*
     * IMPORTANT:
     * Always return JSON, even for server errors.
     * This prevents the previous:
     *
     * Unexpected token 'A' ... is not valid JSON
     *
     * problem in Admin.tsx.
     */
    const message =
      error instanceof Error
        ? error.message
        : "Unknown lead collector error.";

    return res.status(500).json({
      success: false,

      message:
        `Lead collector failed: ${message}`,

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
