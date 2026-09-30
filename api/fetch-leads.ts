import { createClient } from "@supabase/supabase-js";

type LeadType = "Demand" | "Supply" | "SaaS";

type SkillRow = {
  id?: string;
  name: string;
  category?: string;
  subcategory?: string;
  tags?: string[] | string | null;
};

type SourceType =
  | "reddit"
  | "remoteok"
  | "wwr";

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

const COUNTRY_TERMS: Record<string, string[]> = {
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
  supabaseUrl && supabaseKey
    ? createClient(
        supabaseUrl,
        supabaseKey
      )
    : null;

/*
 * IMPORTANT:
 * This function is intentionally defined near
 * the top of the file so the handler can never
 * fail with:
 *
 * ReferenceError:
 * emptyInsertedByType is not defined
 */
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
function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(
  text: string,
  terms: string[]
): boolean {
  const normalized = normalize(text);

  return terms.some((term) =>
    normalized.includes(normalize(term))
  );
}

function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return BLOCKED_DOMAINS.some(
      (domain) =>
        hostname === domain ||
        hostname.endsWith(`.${domain}`)
    );
  } catch {
    return true;
  }
}

function isValidExternalUrl(
  url?: string
): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
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
        email.toLowerCase()
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
        .map((phone) => phone.trim())
        .filter(
          (phone) =>
            phone.replace(/\D/g, "").length >= 8
        )
    ),
  ];
}

function extractLinks(
  text: string
): string[] {
  const matches =
    text.match(
      /https?:\/\/[^\s"'<>]+/gi
    ) || [];

  return [
    ...new Set(
      matches
        .map((url) =>
          url.replace(/[),.;]+$/, "")
        )
        .filter(isValidExternalUrl)
    ),
  ];
}

function getSearchText(
  result: SearchResult
): string {
  return [
    result.title,
    result.snippet,
    result.description,
    result.company,
    result.author,
    result.location,
  ]
    .filter(Boolean)
    .join(" ");
}

function getCountry(
  result: SearchResult
): string | undefined {
  const text = normalize(
    getSearchText(result)
  );

  for (
    const [country, terms] of Object.entries(
      COUNTRY_TERMS
    )
  ) {
    if (
      terms.some((term) =>
        text.includes(normalize(term))
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
  const text = normalize(
    getSearchText(result)
  );

  const cities = [
    "London",
    "Manchester",
    "Birmingham",
    "Liverpool",
    "Toronto",
    "Vancouver",
    "Montreal",
    "Calgary",
    "Ottawa",
    "Dubai",
    "Abu Dhabi",
    "Sharjah",
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
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

  for (const city of cities) {
    if (
      text.includes(normalize(city))
    ) {
      return city;
    }
  }

  return undefined;
}

function parseDate(
  value?: string
): Date | undefined {
  if (!value) return undefined;

  const cleaned = cleanText(value);

  if (!cleaned) return undefined;

  const timestamp =
    Date.parse(cleaned);

  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp);
}

function isWithin72Hours(
  value?: string
): boolean {
  const date = parseDate(value);

  if (!date) return false;

  const age =
    Date.now() - date.getTime();

  return (
    age >= 0 &&
    age <=
      72 * 60 * 60 * 1000
  );
}

function normalizeSkillText(
  value: unknown
): string {
  return normalize(value)
    .replace(
      /\b(i|need|a|an|the|for|to|with|looking|seeking)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function skillMatchesText(
  skill: SkillRow,
  text: string
): boolean {
  const normalizedText =
    normalize(text);

  const values: string[] = [
    skill.name,
    skill.category,
    skill.subcategory,
  ].filter(Boolean) as string[];

  if (Array.isArray(skill.tags)) {
    values.push(...skill.tags);
  } else if (
    typeof skill.tags === "string"
  ) {
    values.push(skill.tags);
  }

  const terms = values
    .map(normalizeSkillText)
    .filter(
      (term) => term.length >= 2
    );

  return terms.some((term) =>
    normalizedText.includes(term)
  );
}

function detectSkill(
  result: SearchResult,
  skills: SkillRow[]
): SkillRow | undefined {
  const text =
    getSearchText(result);

  const matches =
    skills.filter((skill) =>
      skillMatchesText(
        skill,
        text
      )
    );

  matches.sort(
    (a, b) =>
      normalizeSkillText(
        b.name
      ).length -
      normalizeSkillText(
        a.name
      ).length
  );

  return matches[0];
}

function getSkillText(
  skill?: SkillRow
): string | undefined {
  if (!skill) return undefined;

  return (
    cleanText(skill.name) ||
    cleanText(skill.subcategory) ||
    cleanText(skill.category) ||
    undefined
  );
      }
function getDescription(
  result: SearchResult
): string {
  return cleanText(
    result.description ||
      result.snippet ||
      ""
  );
}

function getTitle(
  result: SearchResult
): string {
  return (
    cleanText(result.title) ||
    "Opportunity"
  );
}

function hasOrganizationIdentity(
  result: SearchResult
): boolean {
  const company =
    cleanText(result.company);

  if (company.length >= 2) {
    return true;
  }

  return containsAny(
    getSearchText(result),
    ORGANIZATION_TERMS
  );
}

function isLikelyPersonName(
  value?: string
): boolean {
  const name = cleanText(value);

  if (!name) return false;

  if (
    name.length < 4 ||
    name.length > 100
  ) {
    return false;
  }

  const normalized =
    normalize(name);

  if (
    containsAny(
      normalized,
      ORGANIZATION_TERMS
    )
  ) {
    return false;
  }

  if (
    containsAny(
      normalized,
      PROFESSIONAL_TERMS
    )
  ) {
    return false;
  }

  const words =
    name.split(/\s+/)
      .filter(Boolean);

  if (
    words.length < 2 ||
    words.length > 6
  ) {
    return false;
  }

  return words.every((word) =>
    /^[A-Za-z][A-Za-z'.-]*$/.test(
      word
    )
  );
}

function extractPersonFromTitle(
  title: string
): string | undefined {
  const cleaned =
    cleanText(title);

  const parts =
    cleaned.split(
      /\s+[|–—-]\s+/
    );

  for (const part of parts) {
    const candidate =
      cleanText(part);

    if (
      isLikelyPersonName(
        candidate
      )
    ) {
      return candidate;
    }
  }

  return undefined;
}

function isDemandResult(
  result: SearchResult
): boolean {
  const text = [
    result.title,
    result.snippet,
    result.description,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    containsAny(
      text,
      DEMAND_REJECT_TERMS
    )
  ) {
    return false;
  }

  return containsAny(
    text,
    DEMAND_INTENT_TERMS
  );
}

function isSupplyResult(
  result: SearchResult
): boolean {
  const text =
    getSearchText(result);

  return (
    containsAny(
      text,
      SUPPLY_INTENT_TERMS
    ) &&
    hasOrganizationIdentity(
      result
    )
  );
}

function isSaasResult(
  result: SearchResult,
  skill?: SkillRow
): boolean {
  const text =
    getSearchText(result);

  const personName =
    result.author ||
    extractPersonFromTitle(
      result.title
    );

  if (
    !isLikelyPersonName(
      personName
    )
  ) {
    return false;
  }

  if (
    skill &&
    skillMatchesText(
      skill,
      text
    )
  ) {
    return true;
  }

  return containsAny(
    text,
    PROFESSIONAL_TERMS
  );
}

function isBlockedContent(
  result: SearchResult
): boolean {
  return containsAny(
    getSearchText(result),
    BLOCKED_CONTENT_TERMS
  );
}

function getSourceName(
  result: SearchResult
): string {
  return (
    cleanText(result.source) ||
    "Public source"
  );
}

function extractContactInfo(
  text: string
): ContactInfo {
  const emails =
    extractEmails(text);

  const phones =
    extractPhones(text);

  const links =
    extractLinks(text);

  return {
    email: emails[0],
    phone: phones[0],
    url: links[0],
  };
}

function getDemandContact(
  result: SearchResult
): ContactInfo {
  return extractContactInfo(
    [
      result.title,
      result.description,
      result.snippet,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getSupplyContact(
  result: SearchResult
): ContactInfo {
  const text =
    getSearchText(result);

  return {
    email:
      extractEmails(text)[0],
    phone:
      extractPhones(text)[0],
    url:
      isValidExternalUrl(
        result.link
      )
        ? result.link
        : undefined,
  };
}

function getSaasContact(
  result: SearchResult
): ContactInfo {
  const text =
    getSearchText(result);

  const extracted =
    extractContactInfo(text);

  return {
    email: extracted.email,
    phone: extracted.phone,
    url:
      extracted.url ||
      (isValidExternalUrl(
        result.link
      )
        ? result.link
        : undefined),
  };
}

function hasDemandContact(
  contact: ContactInfo
): boolean {
  return Boolean(
    contact.email ||
      contact.phone ||
      contact.url
  );
}

function hasSupplyContact(
  contact: ContactInfo
): boolean {
  return Boolean(
    contact.url ||
      contact.email ||
      contact.phone
  );
}

function hasSaasContact(
  contact: ContactInfo
): boolean {
  return Boolean(
    contact.url ||
      contact.email ||
      contact.phone
  );
}

function isValidLeadSource(
  result: SearchResult
): boolean {
  return (
    isValidExternalUrl(
      result.link
    ) &&
    !isBlockedDomain(
      result.link
    ) &&
    !isBlockedContent(
      result
    )
  );
    }
function parseXmlItems(
  xml: string
): string[] {
  return [
    ...xml.matchAll(
      /<item\b[^>]*>([\s\S]*?)<\/item>/gi
    ),
  ].map(
    (match) => match[1]
  );
}

function decodeXml(
  value: string
): string {
  return value
    .replace(
      /<!\[CDATA\[/gi,
      ""
    )
    .replace(
      /\]\]>/gi,
      ""
    )
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
      /&#39;/gi,
      "'"
    );
}

function extractXmlTag(
  xml: string,
  tag: string
): string {
  const match =
    xml.match(
      new RegExp(
        `<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        "i"
      )
    );

  if (!match) {
    return "";
  }

  return decodeXml(
    match[1]
      .replace(
        /<[^>]+>/g,
        " "
      )
      .trim()
  );
}

function parseRss(
  xml: string,
  source: string,
  sourceType:
    | "reddit"
    | "wwr"
): SearchResult[] {
  const results:
    SearchResult[] = [];

  for (
    const item of parseXmlItems(xml)
  ) {
    const title =
      extractXmlTag(
        item,
        "title"
      );

    const link =
      extractXmlTag(
        item,
        "link"
      );

    const description =
      extractXmlTag(
        item,
        "description"
      );

    const publishedAt =
      extractXmlTag(
        item,
        "pubDate"
      ) ||
      extractXmlTag(
        item,
        "published"
      ) ||
      extractXmlTag(
        item,
        "updated"
      );

    const author =
      extractXmlTag(
        item,
        "dc:creator"
      ) ||
      extractXmlTag(
        item,
        "author"
      );

    if (
      !title ||
      !isValidExternalUrl(
        link
      )
    ) {
      continue;
    }

    results.push({
      title,
      link,
      snippet:
        description,
      description,
      publishedAt,
      author,
      source,
      sourceType,
    });

    if (
      results.length >=
      MAX_RESULTS_PER_SOURCE
    ) {
      break;
    }
  }

  return results;
}

async function fetchText(
  url: string,
  accept: string
): Promise<string> {
  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "OpportunityHub/1.0 public-lead-collector",
        Accept: accept,
      },
    });

  if (!response.ok) {
    throw new Error(
      `Public source returned ${response.status}`
    );
  }

  return response.text();
}

async function fetchRss(
  url: string,
  source: string,
  sourceType:
    | "reddit"
    | "wwr"
): Promise<SearchResult[]> {
  const xml =
    await fetchText(
      url,
      "application/rss+xml, application/xml, text/xml"
    );

  return parseRss(
    xml,
    source,
    sourceType
  );
}

async function fetchRemoteOkApi()
  : Promise<SearchResult[]> {
  const response =
    await fetch(
      REMOTE_OK_API,
      {
        method: "GET",
        headers: {
          "User-Agent":
            "OpportunityHub/1.0 public-lead-collector",
          Accept:
            "application/json",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `RemoteOK API returned ${response.status}`
    );
  }

  const data =
    await response.json();

  if (!Array.isArray(data)) {
    return [];
  }

  const results:
    SearchResult[] = [];

  for (
    const item of data
  ) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const title =
      cleanText(
        item.position ||
          item.title
      );

    const link =
      cleanText(
        item.url ||
          item.apply_url
      );

    const description =
      cleanText(
        item.description ||
          item.snippet ||
          ""
      );

    const company =
      cleanText(
        item.company
      );

    const location =
      cleanText(
        item.location
      );

    let publishedAt =
      cleanText(
        item.date
      );

    if (
      !publishedAt &&
      typeof item.epoch ===
        "number"
    ) {
      publishedAt =
        new Date(
          item.epoch * 1000
        ).toISOString();
    }

    if (
      !title ||
      !isValidExternalUrl(
        link
      )
    ) {
      continue;
    }

    results.push({
      title,
      link,
      snippet:
        description,
      description,
      publishedAt,
      company,
      location,
      source:
        "Remote OK",
      sourceType:
        "remoteok",
    });

    if (
      results.length >=
      MAX_RESULTS_PER_SOURCE
    ) {
      break;
    }
  }

  return results;
}

async function safeFetch(
  label: string,
  operation: () => Promise<SearchResult[]>
): Promise<SearchResult[]> {
  try {
    return await operation();
  } catch (error) {
    console.error(
      `[LEAD COLLECTOR] ${label} failed:`,
      error
    );

    return [];
  }
}
async function fetchPublicSources(): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];

  const sourceRequests = [
    safeFetch(
      "Remote OK API",
      () => fetchRemoteOkApi()
    ),

    safeFetch(
      "Remote OK RSS",
      () =>
        fetchRss(
          REMOTE_OK_RSS,
          "Remote OK RSS",
          "wwr"
        )
    ),

    safeFetch(
      "We Work Remotely RSS",
      () =>
        fetchRss(
          WWR_RSS,
          "We Work Remotely",
          "wwr"
        )
    ),
  ];

  for (
    const feed of REDDIT_DEMAND_FEEDS
  ) {
    sourceRequests.push(
      safeFetch(
        `Reddit ${feed}`,
        () =>
          fetchRss(
            feed,
            "Reddit",
            "reddit"
          )
      )
    );
  }

  const sourceResults =
    await Promise.all(
      sourceRequests
    );

  for (
    const results of sourceResults
  ) {
    allResults.push(
      ...results
    );
  }

  const seen =
    new Set<string>();

  return allResults.filter(
    (result) => {
      const key =
        cleanText(
          result.link
        ).toLowerCase();

      if (!key) {
        return false;
      }

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

function getLeadType(
  result: SearchResult,
  skill?: SkillRow
): LeadType | undefined {
  /*
   * Reddit can contain direct requests,
   * organization opportunities, or
   * identifiable professionals.
   *
   * Job feeds are treated as Supply,
   * never automatically as Demand.
   */
  if (
    result.sourceType ===
    "reddit"
  ) {
    if (
      isDemandResult(
        result
      )
    ) {
      return "Demand";
    }

    if (
      isSupplyResult(
        result
      )
    ) {
      return "Supply";
    }

    if (
      isSaasResult(
        result,
        skill
      )
    ) {
      return "SaaS";
    }

    return undefined;
  }

  if (
    isSupplyResult(
      result
    )
  ) {
    return "Supply";
  }

  return undefined;
}

function makeProcessedLead(
  result: SearchResult,
  type: LeadType,
  skill: SkillRow,
  contact: ContactInfo
): ProcessedLead {
  const country =
    getCountry(result);

  const city =
    getCity(result);

  const title =
    getTitle(result);

  const description =
    getDescription(result);

  const name =
    cleanText(
      result.author
    ) ||
    extractPersonFromTitle(
      title
    );

  return {
    type,
    title,
    name:
      name || undefined,
    company:
      cleanText(
        result.company
      ) || undefined,
    description:
      description ||
      undefined,
    skill:
      getSkillText(
        skill
      ),
    category:
      cleanText(
        skill.category
      ) || undefined,
    subcategory:
      cleanText(
        skill.subcategory
      ) || undefined,
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

function leadIsFreshForDemandSupply(
  result: SearchResult
): boolean {
  return isWithin72Hours(
    result.publishedAt
  );
}

function contactIsGold(
  type: LeadType,
  contact: ContactInfo
): boolean {
  if (
    type === "Demand"
  ) {
    return hasDemandContact(
      contact
    );
  }

  if (
    type === "Supply"
  ) {
    return hasSupplyContact(
      contact
    );
  }

  if (
    type === "SaaS"
  ) {
    return hasSaasContact(
      contact
    );
  }

  return false;
}

function shouldRejectResult(
  result: SearchResult
): boolean {
  if (
    !isValidLeadSource(
      result
    )
  ) {
    return true;
  }

  return false;
}

async function loadSkills(): Promise<SkillRow[]> {
  if (!supabase) {
    throw new Error(
      "Supabase environment variables are missing"
    );
  }

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
      `Skills query failed: ${error.message}`
    );
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(
    (row) =>
      row &&
      cleanText(
        row.name
      )
  );
          }
async function leadAlreadyExists(
  type: LeadType,
  lead: ProcessedLead
): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured"
    );
  }

  const table =
    type === "Demand"
      ? "demand_leads"
      : type === "Supply"
        ? "supply_leads"
        : "saas_leads";

  const sourceUrl =
    cleanText(
      lead.sourceUrl
    );

  if (sourceUrl) {
    const {
      data,
      error,
    } =
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
        `Duplicate check failed: ${error.message}`
      );
    }

    if (
      data &&
      data.length > 0
    ) {
      return true;
    }
  }

  if (
    type === "SaaS" &&
    lead.contactUrl
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(table)
        .select("id")
        .eq(
          "contact_url",
          lead.contactUrl
        )
        .limit(1);

    if (error) {
      throw new Error(
        `SaaS contact duplicate check failed: ${error.message}`
      );
    }

    if (
      data &&
      data.length > 0
    ) {
      return true;
    }
  }

  return false;
}

function buildDemandRow(
  lead: ProcessedLead
): Record<string, unknown> {
  return {
    title:
      lead.title,
    name:
      lead.name ||
      null,
    company:
      lead.company ||
      null,
    description:
      lead.description ||
      null,
    skill:
      lead.skill ||
      null,
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
    contact_email:
      lead.contactEmail ||
      null,
    contact_phone:
      lead.contactPhone ||
      null,
    contact_url:
      lead.contactUrl ||
      null,
    source_url:
      lead.sourceUrl,
    created_at:
      lead.createdAt ||
      new Date().toISOString(),
  };
}

function buildSupplyRow(
  lead: ProcessedLead
): Record<string, unknown> {
  return {
    title:
      lead.title,
    name:
      lead.name ||
      null,
    company:
      lead.company ||
      null,
    description:
      lead.description ||
      null,
    skill:
      lead.skill ||
      null,
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
    salary:
      lead.salary ||
      null,
    contact_email:
      lead.contactEmail ||
      null,
    contact_phone:
      lead.contactPhone ||
      null,
    contact_url:
      lead.contactUrl ||
      null,
    source_url:
      lead.sourceUrl,
    created_at:
      lead.createdAt ||
      new Date().toISOString(),
  };
}

function buildSaasRow(
  lead: ProcessedLead
): Record<string, unknown> {
  return {
    title:
      lead.title,
    name:
      lead.name ||
      null,
    company:
      lead.company ||
      null,
    description:
      lead.description ||
      null,
    skill:
      lead.skill ||
      null,
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
    contact_email:
      lead.contactEmail ||
      null,
    contact_phone:
      lead.contactPhone ||
      null,
    contact_url:
      lead.contactUrl ||
      null,
    source_url:
      lead.sourceUrl,
    created_at:
      lead.createdAt ||
      new Date().toISOString(),
  };
}

async function insertLead(
  lead: ProcessedLead
): Promise<void> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured"
    );
  }

  const table =
    lead.type === "Demand"
      ? "demand_leads"
      : lead.type === "Supply"
        ? "supply_leads"
        : "saas_leads";

  const row =
    lead.type === "Demand"
      ? buildDemandRow(
          lead
        )
      : lead.type === "Supply"
        ? buildSupplyRow(
            lead
          )
        : buildSaasRow(
            lead
          );

  const {
    error,
  } =
    await supabase
      .from(table)
      .insert(row);

  if (error) {
    throw new Error(
      `${table} insert failed: ${error.message}`
    );
  }
}

async function processResult(
  result: SearchResult,
  skills: SkillRow[],
  stats: LeadStats
): Promise<ProcessedLead | undefined> {
  stats.found++;

  if (
    shouldRejectResult(
      result
    )
  ) {
    stats.blocked++;
    return undefined;
  }

  const skill =
    detectSkill(
      result,
      skills
    );

  if (!skill) {
    stats.noSkill++;
    return undefined;
  }

  const type =
    getLeadType(
      result,
      skill
    );

  if (!type) {
    stats.wrongType++;
    return undefined;
  }

  if (
    (
      type === "Demand" ||
      type === "Supply"
    ) &&
    !leadIsFreshForDemandSupply(
      result
    )
  ) {
    stats.stale++;
    return undefined;
  }

  const contact =
    type === "Demand"
      ? getDemandContact(
          result
        )
      : type === "Supply"
        ? getSupplyContact(
            result
          )
        : getSaasContact(
            result
          );

  if (
    !contactIsGold(
      type,
      contact
    )
  ) {
    stats.noContact++;
    return undefined;
  }

  const lead =
    makeProcessedLead(
      result,
      type,
      skill,
      contact
    );

  if (
    !lead.title ||
    !lead.sourceUrl
  ) {
    stats.invalid++;
    return undefined;
  }

  stats.accepted++;

  return lead;
    }
async function collectAndInsertLeads(): Promise<{
  added: number;
  insertedByType: InsertedByType;
  diagnostics: LeadStats;
}> {
  const stats = emptyStats();
  const insertedByType =
    emptyInsertedByType();

  if (!supabase) {
    throw new Error(
      "Supabase environment variables are missing"
    );
  }

  const skills =
    await loadSkills();

  if (
    skills.length === 0
  ) {
    console.warn(
      "[LEAD COLLECTOR] No skills found in Supabase"
    );

    return {
      added: 0,
      insertedByType,
      diagnostics: stats,
    };
  }

  const results =
    await fetchPublicSources();

  console.log(
    `[LEAD COLLECTOR] Public source results: ${results.length}`
  );

  const processed:
    ProcessedLead[] = [];

  for (
    const result of results
  ) {
    try {
      const lead =
        await processResult(
          result,
          skills,
          stats
        );

      if (!lead) {
        continue;
      }

      processed.push(
        lead
      );
    } catch (error) {
      stats.invalid++;

      console.error(
        "[LEAD COLLECTOR] Result processing failed:",
        error
      );
    }
  }

  console.log(
    `[LEAD COLLECTOR] Gold candidates: ${processed.length}`
  );

  const seenInThisRun =
    new Set<string>();

  for (
    const lead of processed
  ) {
    const duplicateKey =
      [
        lead.type,
        lead.sourceUrl,
        lead.contactUrl || "",
      ]
        .join("|")
        .toLowerCase();

    if (
      seenInThisRun.has(
        duplicateKey
      )
    ) {
      stats.duplicate++;
      continue;
    }

    seenInThisRun.add(
      duplicateKey
    );

    try {
      const exists =
        await leadAlreadyExists(
          lead.type,
          lead
        );

      if (exists) {
        stats.duplicate++;
        continue;
      }

      await insertLead(
        lead
      );

      stats.inserted++;

      insertedByType[
        lead.type
      ]++;

      console.log(
        `[LEAD COLLECTOR] Inserted ${lead.type}: ${lead.title}`
      );
    } catch (error) {
      stats.insertErrors++;

      console.error(
        `[LEAD COLLECTOR] ${lead.type} insert error:`,
        error
      );
    }
  }

  return {
    added:
      stats.inserted,
    insertedByType,
    diagnostics: stats,
  };
}

function sendJson(
  res: any,
  statusCode: number,
  body: Record<string, unknown>
): void {
  res.status(statusCode);

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.json(body);
}

function getRequestMethod(
  req: any
): string {
  return cleanText(
    req?.method
  ).toUpperCase();
}

export default async function handler(
  req: any,
  res: any
): Promise<void> {
  const method =
    getRequestMethod(req);

  if (
    method !== "POST" &&
    method !== "GET"
  ) {
    sendJson(
      res,
      405,
      {
        success: false,
        message:
          "Method not allowed",
        added: 0,
        inserted: 0,
        insertedByType:
          emptyInsertedByType(),
        diagnostics: {
          overall:
            emptyStats(),
        },
      }
    );

    return;
  }

  try {
    console.log(
      "[LEAD COLLECTOR] Starting public-source collection..."
    );

    const result =
      await collectAndInsertLeads();

    console.log(
      "[LEAD COLLECTOR] Collection complete:",
      JSON.stringify(
        result
      )
    );

    sendJson(
      res,
      200,
      {
        success: true,
        message:
          result.added > 0
            ? `Added ${result.added} real leads`
            : "No new qualifying leads found",
        added:
          result.added,
        inserted:
          result.added,
        insertedByType:
          result.insertedByType,
        diagnostics: {
          overall:
            result.diagnostics,
          insertedByType:
            result.insertedByType,
        },
      }
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
          insertedByType:
            emptyInsertedByType(),
        },
      }
    );
  }
}
