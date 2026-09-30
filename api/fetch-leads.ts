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

const REDDIT_DEMAND_FEEDS = [
  "https://www.reddit.com/r/forhire/.rss",
  "https://www.reddit.com/r/freelance_forhire/.rss",
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
    const text = normalizeText(value);

    if (text) {
      return text;
    }
  }

  return undefined;
}

function toArrayText(
  value: string[] | string | null | undefined
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\|;]/)
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  return [];
}

function getDomain(url?: string): string {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlockedDomain(
  url?: string
): boolean {
  const domain = getDomain(url);

  if (!domain) {
    return false;
  }

  return BLOCKED_DOMAINS.some(
    (blocked) =>
      domain === blocked ||
      domain.endsWith(`.${blocked}`)
  );
}

function containsBlockedContent(
  text: string
): boolean {
  const value = lower(text);

  return BLOCKED_CONTENT_TERMS.some(
    (term) => value.includes(term)
  );
}

function containsAny(
  text: string,
  terms: string[]
): boolean {
  const value = lower(text);

  return terms.some((term) =>
    value.includes(term)
  );
}

function isFresh(
  publishedAt?: string
): boolean {
  if (!publishedAt) {
    return true;
  }

  const timestamp =
    Date.parse(publishedAt);

  if (Number.isNaN(timestamp)) {
    return true;
  }

  const ageHours =
    (Date.now() - timestamp) /
    (1000 * 60 * 60);

  return (
    ageHours >= -2 &&
    ageHours <= MAX_AGE_HOURS
  );
}

function cleanUrl(
  value: unknown
): string | undefined {
  const raw = normalizeText(value);

  if (!raw) {
    return undefined;
  }

  try {
    const url = new URL(raw);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
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
      url.replace(/[.,;!?]+$/, "")
    )
    .map((url) => cleanUrl(url))
    .filter(
      (url): url is string =>
        Boolean(url)
    );
}

function extractEmail(
  text: string
): string | undefined {
  const match = text.match(
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

  for (const value of matches) {
    const cleaned =
      value.trim();

    const digits =
      cleaned.replace(/\D/g, "");

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
    urls.find((url) => {
      const value =
        lower(url);

      return (
        value.includes("contact") ||
        value.includes("about") ||
        value.includes("profile") ||
        value.includes("facebook") ||
        value.includes("instagram") ||
        value.includes("twitter") ||
        value.includes("x.com") ||
        value.includes("telegram") ||
        value.includes("whatsapp") ||
        value.includes("linkedin")
      );
    });

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
  const value = lower(text);

  for (const [
    country,
    terms,
  ] of Object.entries(
    COUNTRY_TERMS
  )) {
    if (
      terms.some((term) =>
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
  const value = lower(text);

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
  const value = lower(text);

  if (!value) {
    return undefined;
  }

  const ordered =
    [...skills].sort(
      (a, b) =>
        normalizeText(b.name).length -
        normalizeText(a.name).length
    );

  for (const skill of ordered) {
    const skillName =
      normalizeText(skill.name);

    if (!skillName) {
      continue;
    }

    const name =
      lower(skillName);

    if (
      value.includes(name)
    ) {
      return skill;
    }

    const tags =
      toArrayText(skill.tags);

    for (const tag of tags) {
      if (
        tag.length >= 3 &&
        value.includes(
          lower(tag)
        )
      ) {
        return skill;
      }
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
): Array<Record<string, string>> {
  const items: Array<
    Record<string, string>
  > = [];

  const itemMatches =
    xml.match(
      /<(item|entry)\b[\s\S]*?<\/\1>/gi
    ) || [];

  for (const itemXml of itemMatches) {
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

    for (const field of fields) {
      const pattern =
        new RegExp(
          `<${field}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${field}>`,
          "i"
        );

      const match =
        itemXml.match(pattern);

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
      Object.keys(item).length > 0
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
    .replace(/\s+/g, " ")
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
    await fetch(url, {
      method: "GET",
      headers: {
        Accept:
          "application/rss+xml, application/xml, text/xml, application/json, text/plain, */*",
        "User-Agent":
          "OpportunityHub/1.0 public-lead-collector",
      },
    });

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
    await fetch(url, {
      method: "GET",
      headers: {
        Accept:
          "application/json",
        "User-Agent":
          "OpportunityHub/1.0 public-lead-collector",
      },
    });

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
    const feed of REDDIT_DEMAND_FEEDS
  ) {
    try {
      const xml =
        await fetchText(
          feed
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
              "Reddit",
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
      console.error(
        "[LEAD COLLECTOR] Reddit feed error:",
        feed,
        error
      );
    }
  }

  return results;
    }
async function loadSkills(): Promise<SkillRow[]> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured"
    );
  }

  const { data, error } =
    await supabase
      .from("skills")
      .select(
        "id,name,category,subcategory,tags"
      )
      .limit(5000);

  if (error) {
    throw new Error(
      `skills query failed: ${error.message}`
    );
  }

  return (data || [])
    .filter(
      (row): row is SkillRow =>
        Boolean(
          row &&
          normalizeText(row.name)
        )
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
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function classifyResult(
  result: SearchResult,
  skills: SkillRow[]
): {
  type?: LeadType;
  skill?: SkillRow;
} {
  const text =
    resultText(result);

  const skill =
    findMatchingSkill(
      text,
      skills
    );

  if (
    result.sourceType ===
    "reddit"
  ) {
    if (
      containsAny(
        text,
        DEMAND_INTENT_TERMS
      ) &&
      !containsAny(
        text,
        DEMAND_REJECT_TERMS
      )
    ) {
      return {
        type: "Demand",
        skill,
      };
    }

    if (
      containsAny(
        text,
        SUPPLY_INTENT_TERMS
      )
    ) {
      return {
        type: "Supply",
        skill,
      };
    }

    if (
      skill &&
      isProfessionalProfile(
        result,
        skill
      )
    ) {
      return {
        type: "SaaS",
        skill,
      };
    }

    return {};
  }

  if (
    result.sourceType ===
      "remoteok" ||
    result.sourceType ===
      "wwr"
  ) {
    if (
      containsAny(
        text,
        SUPPLY_INTENT_TERMS
      )
    ) {
      return {
        type: "Supply",
        skill,
      };
    }

    return {};
  }

  return {};
}

function buildContactInfo(
  result: SearchResult
): ContactInfo {
  const combined =
    [
      result.description,
      result.snippet,
      result.link,
    ]
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");

  const extracted =
    extractContactInfo(
      combined
    );

  return {
    email:
      extracted.email,
    phone:
      extracted.phone,
    url:
      extracted.url,
  };
}

function validateCommonResult(
  result: SearchResult,
  stats: LeadStats
): boolean {
  stats.found += 1;

  if (
    !isSpecificSourcePage(
      result.link
    )
  ) {
    stats.invalid += 1;
    return false;
  }

  if (
    isBlockedDomain(
      result.link
    )
  ) {
    stats.blocked += 1;
    return false;
  }

  if (
    containsBlockedContent(
      resultText(result)
    )
  ) {
    stats.blocked += 1;
    return false;
  }

  return true;
}

function buildProcessedLead(
  result: SearchResult,
  type: LeadType,
  skill?: SkillRow
): ProcessedLead | null {
  const text =
    resultText(result);

  const contact =
    buildContactInfo(
      result
    );

  const country =
    findCountry(
      getCountryEvidence(
        result
      )
    );

  const city =
    findCity(
      getCountryEvidence(
        result
      )
    );

  const title =
    normalizeText(
      result.title
    );

  if (!title) {
    return null;
  }

  return {
    type,
    title,
    name:
      firstNonEmpty(
        result.author,
        result.company
      ),
    company:
      firstNonEmpty(
        result.company
      ),
    description:
      firstNonEmpty(
        result.description,
        result.snippet,
        text
      ),
    skill:
      skill?.name,
    category:
      skill?.category,
    subcategory:
      skill?.subcategory,
    country,
    city,
    sourceUrl:
      result.link,
    contactUrl:
      contact.url,
    contactEmail:
      contact.email,
    contactPhone:
      contact.phone,
    createdAt:
      result.publishedAt,
  };
}

function validateDemand(
  lead: ProcessedLead,
  stats: LeadStats
): boolean {
  if (!lead.skill) {
    stats.noSkill += 1;
    return false;
  }

  if (
    !lead.country
  ) {
    stats.invalid += 1;
    return false;
  }

  const hasContact =
    Boolean(
      lead.contactEmail ||
      lead.contactPhone ||
      lead.contactUrl
    );

  if (!hasContact) {
    stats.noContact += 1;
    return false;
  }

  if (
    !lead.sourceUrl
  ) {
    stats.invalid += 1;
    return false;
  }

  stats.accepted += 1;
  return true;
}

function validateSupply(
  lead: ProcessedLead,
  result: SearchResult,
  stats: LeadStats
): boolean {
  if (!lead.skill) {
    stats.noSkill += 1;
    return false;
  }

  if (
    !lead.country
  ) {
    stats.invalid += 1;
    return false;
  }

  /*
   * A job application URL by itself is NOT treated
   * as a Gold contact path.
   *
   * We need an email, phone, or a separate public
   * company/contact/profile URL.
   */
  const contact =
    buildContactInfo(
      result
    );

  const hasRealContact =
    Boolean(
      lead.contactEmail ||
      lead.contactPhone ||
      contact.url
    );

  if (!hasRealContact) {
    stats.noContact += 1;
    return false;
  }

  if (
    !lead.sourceUrl
  ) {
    stats.invalid += 1;
    return false;
  }

  stats.accepted += 1;
  return true;
}

function validateSaaS(
  lead: ProcessedLead,
  result: SearchResult,
  stats: LeadStats
): boolean {
  if (!lead.skill) {
    stats.noSkill += 1;
    return false;
  }

  if (
    !lead.country
  ) {
    stats.invalid += 1;
    return false;
  }

  if (
    !isProfessionalProfile(
      result,
      undefined
    )
  ) {
    stats.wrongType += 1;
    return false;
  }

  const contact =
    buildContactInfo(
      result
    );

  const usableProfile =
    Boolean(
      contact.url ||
      lead.contactEmail ||
      lead.contactPhone ||
      lead.sourceUrl
    );

  if (!usableProfile) {
    stats.noContact += 1;
    return false;
  }

  stats.accepted += 1;
  return true;
}

function getSalaryParts(
  value?: string
): {
  range?: string;
  min?: number;
  max?: number;
} {
  const text =
    normalizeText(value);

  if (!text) {
    return {};
  }

  const numbers =
    text.match(
      /\d+(?:[.,]\d+)?/g
    ) || [];

  const parsed =
    numbers
      .map((item) =>
        Number(
          item.replace(
            /,/g,
            ""
          )
        )
      )
      .filter(
        (item) =>
          Number.isFinite(item)
      );

  if (
    parsed.length === 0
  ) {
    return {
      range: text,
    };
  }

  return {
    range: text,
    min:
      parsed[0],
    max:
      parsed.length > 1
        ? parsed[1]
        : parsed[0],
  };
}

function inferBudget(
  lead: ProcessedLead
): {
  budget?: string;
  currency?: string;
} {
  const text =
    normalizeText(
      lead.description
    );

  const money =
    text.match(
      /(?:[$£€₹₨]|USD|GBP|EUR|CAD|AUD|PKR|AED)\s*[\d,]+(?:\.\d+)?/i
    );

  if (!money) {
    return {};
  }

  const value =
    money[0];

  let currency:
    | string
    | undefined;

  const upper =
    value.toUpperCase();

  if (
    upper.includes("$") ||
    upper.includes("USD")
  ) {
    currency =
      "USD";
  } else if (
    upper.includes("£") ||
    upper.includes("GBP")
  ) {
    currency =
      "GBP";
  } else if (
    upper.includes("€") ||
    upper.includes("EUR")
  ) {
    currency =
      "EUR";
  } else if (
    upper.includes("CAD")
  ) {
    currency =
      "CAD";
  } else if (
    upper.includes("AUD")
  ) {
    currency =
      "AUD";
  } else if (
    upper.includes("PKR") ||
    upper.includes("₨") ||
    upper.includes("₹")
  ) {
    currency =
      "PKR";
  } else if (
    upper.includes("AED")
  ) {
    currency =
      "AED";
  }

  return {
    budget: value,
    currency,
  };
}

function cleanNullable(
  value?: string
): string | null {
  const text =
    normalizeText(value);

  return text || null;
    } 
async function leadExists(
  lead: ProcessedLead
): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured"
    );
  }

  const sourceUrl =
    cleanNullable(
      lead.sourceUrl
    );

  if (!sourceUrl) {
    return false;
  }

  let table:
    | "demand_leads"
    | "supply_leads"
    | "saas_leads";

  if (
    lead.type === "Demand"
  ) {
    table =
      "demand_leads";
  } else if (
    lead.type === "Supply"
  ) {
    table =
      "supply_leads";
  } else {
    table =
      "saas_leads";
  }

  const { data, error } =
    await supabase
      .from(table)
      .select("id")
      .eq(
        "source_url",
        sourceUrl
      )
      .limit(1);

  if (error) {
    throw new Error(
      `${table} duplicate check failed: ${error.message}`
    );
  }

  return Boolean(
    data &&
    data.length > 0
  );
}

async function insertDemand(
  lead: ProcessedLead
): Promise<void> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured"
    );
  }

  const budget =
    inferBudget(
      lead
    );

  const row = {
    type:
      "Demand",
    source:
      cleanNullable(
        getDomain(
          lead.sourceUrl
        ) ||
          "public"
      ),
    client_name:
      cleanNullable(
        lead.name ||
          lead.company
      ),
    skill_needed:
      cleanNullable(
        lead.skill
      ),
    description:
      cleanNullable(
        lead.description
      ),
    content:
      cleanNullable(
        lead.description
      ),
    email:
      cleanNullable(
        lead.contactEmail
      ),
    contact_phone:
      cleanNullable(
        lead.contactPhone
      ),
    created_at:
      lead.createdAt ||
      new Date().toISOString(),
    status:
      "active",
    title:
      cleanNullable(
        lead.title
      ),
    category:
      cleanNullable(
        lead.category
      ),
    subcategory:
      cleanNullable(
        lead.subcategory
      ),
    country:
      cleanNullable(
        lead.country
      ),
    city:
      cleanNullable(
        lead.city
      ),
    budget:
      cleanNullable(
        budget.budget
      ),
    currency:
      cleanNullable(
        budget.currency
      ),
    contact_name:
      cleanNullable(
        lead.name
      ),
    contact_email:
      cleanNullable(
        lead.contactEmail
      ),
    source_url:
      cleanNullable(
        lead.sourceUrl
      ),
    contact_url:
      cleanNullable(
        lead.contactUrl
      ),
  };

  const { error } =
    await supabase
      .from(
        "demand_leads"
      )
      .insert(row);

  if (error) {
    throw new Error(
      `demand_leads insert failed: ${error.message}`
    );
  }
}

async function insertSupply(
  lead: ProcessedLead
): Promise<void> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured"
    );
  }

  const salary =
    getSalaryParts(
      lead.salary ||
        lead.description
    );

  const row = {
    company:
      cleanNullable(
        lead.company ||
          lead.name
      ),
    name:
      cleanNullable(
        lead.name ||
          lead.company
      ),
    description:
      cleanNullable(
        lead.description
      ),
    position:
      cleanNullable(
        lead.title
      ),
    required_skill:
      cleanNullable(
        lead.skill
      ),
    category:
      cleanNullable(
        lead.category
      ),
    subcategory:
      cleanNullable(
        lead.subcategory
      ),
    country:
      cleanNullable(
        lead.country
      ),
    city:
      cleanNullable(
        lead.city
      ),
    salary_range:
      cleanNullable(
        salary.range
      ),
    contact_email:
      cleanNullable(
        lead.contactEmail
      ),
    contact_phone:
      cleanNullable(
        lead.contactPhone
      ),
    created_at:
      lead.createdAt ||
      new Date().toISOString(),
    job_title:
      cleanNullable(
        lead.title
      ),
    salary_min:
      salary.min ??
      null,
    salary_max:
      salary.max ??
      null,
    company_website:
      cleanNullable(
        lead.contactUrl
      ),
    apply_url:
      cleanNullable(
        lead.sourceUrl
      ),
    source:
      cleanNullable(
        getDomain(
          lead.sourceUrl
        ) ||
          "public"
      ),
    content:
      cleanNullable(
        lead.description
      ),
    url:
      cleanNullable(
        lead.sourceUrl
      ),
    source_url:
      cleanNullable(
        lead.sourceUrl
      ),
    contact_name:
      cleanNullable(
        lead.name
      ),
    commission:
      null,
    trial_days:
      null,
    landing_url:
      cleanNullable(
        lead.contactUrl
      ),
    nich:
      cleanNullable(
        lead.skill
      ),
  };

  const { error } =
    await supabase
      .from(
        "supply_leads"
      )
      .insert(row);

  if (error) {
    throw new Error(
      `supply_leads insert failed: ${error.message}`
    );
  }
}

async function insertSaaS(
  lead: ProcessedLead
): Promise<void> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured"
    );
  }

  const row = {
    name:
      cleanNullable(
        lead.name ||
          lead.company ||
          lead.title
      ),
    platform:
      cleanNullable(
        getDomain(
          lead.sourceUrl
        ) ||
          "public"
      ),
    niche:
      cleanNullable(
        lead.skill
      ),
    contact:
      cleanNullable(
        lead.contactUrl ||
          lead.contactEmail ||
          lead.contactPhone ||
          lead.sourceUrl
      ),
    status:
      "active",
    created_at:
      lead.createdAt ||
      new Date().toISOString(),
    description:
      cleanNullable(
        lead.description
      ),
    commission:
      null,
    trial_days:
      null,
    landing_url:
      cleanNullable(
        lead.contactUrl
      ),
    source_url:
      cleanNullable(
        lead.sourceUrl
      ),
    country:
      cleanNullable(
        lead.country
      ),
    city:
      cleanNullable(
        lead.city
      ),
  };

  const { error } =
    await supabase
      .from(
        "saas_leads"
      )
      .insert(row);

  if (error) {
    throw new Error(
      `saas_leads insert failed: ${error.message}`
    );
  }
}

async function insertLead(
  lead: ProcessedLead
): Promise<void> {
  if (
    lead.type === "Demand"
  ) {
    await insertDemand(
      lead
    );
    return;
  }

  if (
    lead.type === "Supply"
  ) {
    await insertSupply(
      lead
    );
    return;
  }

  await insertSaaS(
    lead
  );
}

function getDiagnosticsMessage(
  stats: LeadStats
): string {
  return [
    `Found ${stats.found}`,
    `Accepted ${stats.accepted}`,
    `Inserted ${stats.inserted}`,
    `Duplicates ${stats.duplicate}`,
    `Wrong type ${stats.wrongType}`,
    `No skill ${stats.noSkill}`,
    `No contact ${stats.noContact}`,
    `Blocked ${stats.blocked}`,
    `Stale ${stats.stale}`,
    `Invalid ${stats.invalid}`,
    `Insert errors ${stats.insertErrors}`,
  ].join(
    " | "
  );
        }
async function processResults(
  results: SearchResult[],
  skills: SkillRow[],
  statsByType: Record<
    LeadType,
    LeadStats
  >,
  insertedByType: InsertedByType
): Promise<void> {
  const seen =
    new Set<string>();

  for (
    const result of results
  ) {
    const sourceKey =
      `${result.sourceType}|${result.link}`;

    if (
      seen.has(sourceKey)
    ) {
      continue;
    }

    seen.add(
      sourceKey
    );

    const classification =
      classifyResult(
        result,
        skills
      );

    if (
      !classification.type
    ) {
      /*
       * We count source results here under Demand
       * only for diagnostics if they came from Reddit
       * and were not classifiable. This keeps the
       * overall "found" number meaningful without
       * pretending an unqualified result is a lead.
       */
      if (
        result.sourceType ===
        "reddit"
      ) {
        statsByType.Demand.found +=
          1;
      }

      continue;
    }

    const type =
      classification.type;

    const stats =
      statsByType[type];

    /*
     * validateCommonResult increments found exactly
     * once for every classified candidate.
     */
    if (
      !validateCommonResult(
        result,
        stats
      )
    ) {
      continue;
    }

    if (
      result.publishedAt &&
      !isFresh(
        result.publishedAt
      ) &&
      type !== "SaaS"
    ) {
      stats.stale += 1;
      continue;
    }

    const lead =
      buildProcessedLead(
        result,
        type,
        classification.skill
      );

    if (!lead) {
      stats.invalid += 1;
      continue;
    }

    let valid =
      false;

    if (
      type === "Demand"
    ) {
      valid =
        validateDemand(
          lead,
          stats
        );
    } else if (
      type === "Supply"
    ) {
      valid =
        validateSupply(
          lead,
          result,
          stats
        );
    } else {
      valid =
        validateSaaS(
          lead,
          result,
          stats
        );
    }

    if (!valid) {
      continue;
    }

    try {
      const exists =
        await leadExists(
          lead
        );

      if (exists) {
        stats.duplicate +=
          1;
        continue;
      }

      await insertLead(
        lead
      );

      stats.inserted +=
        1;

      insertedByType[
        type
      ] += 1;
    } catch (error) {
      stats.insertErrors +=
        1;

      console.error(
        `[LEAD COLLECTOR] ${type} insert error:`,
        error
      );
    }
  }
}

async function collectAllSources(): Promise<
  SearchResult[]
> {
  const [
    remoteOkApi,
    remoteOkRss,
    wwr,
    reddit,
  ] = await Promise.all([
    collectRemoteOk(),
    collectRemoteOkRss(),
    collectWWR(),
    collectReddit(),
  ]);

  return [
    ...remoteOkApi,
    ...remoteOkRss,
    ...wwr,
    ...reddit,
  ];
}

function makeStatsByType(): Record<
  LeadType,
  LeadStats
> {
  return {
    Demand:
      emptyStats(),
    Supply:
      emptyStats(),
    SaaS:
      emptyStats(),
  };
}

function combineStats(
  statsByType: Record<
    LeadType,
    LeadStats
  >
): LeadStats {
  const combined =
    emptyStats();

  for (
    const type of [
      "Demand",
      "Supply",
      "SaaS",
    ] as LeadType[]
  ) {
    const stats =
      statsByType[type];

    combined.found +=
      stats.found;

    combined.accepted +=
      stats.accepted;

    combined.inserted +=
      stats.inserted;

    combined.duplicate +=
      stats.duplicate;

    combined.wrongType +=
      stats.wrongType;

    combined.noSkill +=
      stats.noSkill;

    combined.noContact +=
      stats.noContact;

    combined.blocked +=
      stats.blocked;

    combined.stale +=
      stats.stale;

    combined.invalid +=
      stats.invalid;

    combined.insertErrors +=
      stats.insertErrors;
  }

  return combined;
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
  statsByType: Record<
    LeadType,
    LeadStats
  >
) {
  const overall =
    combineStats(
      statsByType
    );

  return {
    overall,
    Demand:
      statsByType.Demand,
    Supply:
      statsByType.Supply,
    SaaS:
      statsByType.SaaS,
  };
}

async function collectAndInsertLeads() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  console.log(
    "[LEAD COLLECTOR] Loading skills..."
  );

  const skills =
    await loadSkills();

  console.log(
    `[LEAD COLLECTOR] Loaded ${skills.length} skills`
  );

  console.log(
    "[LEAD COLLECTOR] Collecting public sources..."
  );

  const results =
    await collectAllSources();

  console.log(
    `[LEAD COLLECTOR] Collected ${results.length} source results`
  );

  const statsByType =
    makeStatsByType();

  const insertedByType =
    emptyInsertedByType();

  await processResults(
    results,
    skills,
    statsByType,
    insertedByType
  );

  const diagnostics =
    buildDiagnostics(
      statsByType
    );

  const inserted =
    totalInserted(
      insertedByType
    );

  console.log(
    "[LEAD COLLECTOR] Completed:",
    {
      inserted,
      insertedByType,
      diagnostics,
    }
  );

  return {
    success: true,
    message:
      inserted > 0
        ? `Added ${inserted} real leads`
        : "No new qualifying leads found",
    added:
      inserted,
    inserted,
    insertedByType,
    diagnostics,
    sourceResults:
      results.length,
    skillsLoaded:
      skills.length,
  };
  }
function sendJson(
  res: any,
  status: number,
  payload: unknown
): void {
  res.status(status);
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );
  res.end(
    JSON.stringify(payload)
  );
}

export default async function handler(
  req: any,
  res: any
) {
  if (
    req.method !== "POST"
  ) {
    sendJson(
      res,
      405,
      {
        success: false,
        message:
          "Method not allowed",
      }
    );
    return;
  }

  try {
    console.log(
      "[LEAD COLLECTOR] Fetch request received"
    );

    const result =
      await collectAndInsertLeads();

    sendJson(
      res,
      200,
      result
    );
  } catch (error) {
    console.error(
      "[LEAD COLLECTOR] Fatal error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Lead collector failed";

    sendJson(
      res,
      500,
      {
        success: false,
        message,
        added: 0,
        inserted: 0,
        insertedByType:
          emptyInsertedByType(),
        diagnostics: {
          overall:
            emptyStats(),
          Demand:
            emptyStats(),
          Supply:
            emptyStats(),
          SaaS:
            emptyStats(),
        },
      }
    );
  }
}
