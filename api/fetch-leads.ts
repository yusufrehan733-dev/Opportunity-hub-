import { createClient } from "@supabase/supabase-js";

type LeadType =
  | "Demand"
  | "Supply"
  | "SaaS";

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
  publishedAt?: string;
  company?: string;
  author?: string;
  location?: string;
  description?: string;
  source: string;
  sourceType:
    | "reddit"
    | "remoteok"
    | "wwr"
    | "remoteok_profile";
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

const MAX_RESULTS_PER_SOURCE = 25;

const MAX_SAAS_PROFILES = 40;

const REMOTE_OK_API =
  "https://remoteok.com/api";

const REMOTE_OK_HIRE_BASE =
  "https://remoteok.com/hire-remotely/";

const WWR_RSS =
  "https://weworkremotely.com/remote-jobs.rss";

/*
 * Public Reddit RSS is used only for
 * genuine request/need discovery.
 *
 * We do not scrape private communities,
 * private profiles, or login-only content.
 */
const REDDIT_DEMAND_FEEDS = [
  "https://www.reddit.com/r/forhire/.rss",
  "https://www.reddit.com/r/freelance_forhire/.rss",
  "https://www.reddit.com/r/TutorsHelpingTutors/.rss",
  "https://www.reddit.com/r/TeachersInTransition/.rss",
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

const GENERIC_BLOCK_TERMS = [
  "book",
  "ebook",
  "course",
  "webinar",
  "newsletter",
  "blog",
  "article",
  "news",
  "directory",
  "marketplace",
  "software",
  "app download",
  "product",
  "shopping",
  "store",
  "coupon",
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
  "hire someone",
  "need someone",
  "can anyone recommend",
  "recommend a",
  "does anyone know",
  "help me find",
  "trying to find",
];

const DEMAND_REJECT_TERMS = [
  "hiring teachers",
  "hiring a teacher",
  "hiring tutor",
  "we are hiring",
  "we're hiring",
  "job opening",
  "job vacancy",
  "vacancy",
  "career opportunity",
  "apply now",
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
  "trainer",
  "developer",
  "programmer",
  "designer",
  "writer",
  "marketer",
  "sales",
  "accountant",
  "translator",
  "freelancer",
  "professional",
  "specialist",
  "engineer",
  "manager",
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
    "america",
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
function cleanText(
  value: unknown
): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(
  value: unknown
): string {
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
  const normalized =
    normalize(text);

  return terms.some((term) =>
    normalized.includes(
      normalize(term)
    )
  );
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

function isValidExternalUrl(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed =
      new URL(url);

    if (
      !["http:", "https:"].includes(
        parsed.protocol
      )
    ) {
      return false;
    }

    if (
      isBlockedDomain(url)
    ) {
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
        .map((phone) =>
          phone.trim()
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

function extractContactLinks(
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
          url.replace(
            /[),.;]+$/,
            ""
          )
        )
        .filter(
          isValidExternalUrl
        )
    ),
  ];
}

function getContactInfo(
  result: SearchResult
): ContactInfo {
  const text = [
    result.title,
    result.snippet,
    result.description,
    result.link,
  ]
    .filter(Boolean)
    .join(" ");

  const emails =
    extractEmails(text);

  const phones =
    extractPhones(text);

  const links =
    extractContactLinks(text);

  return {
    email: emails[0],
    phone: phones[0],
    url:
      links[0] ||
      (
        isValidExternalUrl(
          result.link
        )
          ? result.link
          : undefined
      ),
  };
}

function getCountry(
  result: SearchResult
): string | undefined {
  const text = normalize(
    [
      result.title,
      result.snippet,
      result.description,
      result.location,
    ]
      .filter(Boolean)
      .join(" ")
  );

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
  const text = normalize(
    [
      result.title,
      result.snippet,
      result.description,
      result.location,
    ]
      .filter(Boolean)
      .join(" ")
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

  if (
    !Number.isNaN(timestamp)
  ) {
    return new Date(
      timestamp
    );
  }

  const match =
    cleaned.match(
      /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/
    );

  if (!match) {
    return undefined;
  }

  const day =
    Number(match[1]);

  const month =
    Number(match[2]) - 1;

  let year =
    Number(match[3]);

  if (year < 100) {
    year += 2000;
  }

  const date =
    new Date(
      year,
      month,
      day
    );

  return Number.isNaN(
    date.getTime()
  )
    ? undefined
    : date;
}

function isWithin72Hours(
  value?: string
): boolean {
  const date =
    parseDate(value);

  if (!date) {
    return false;
  }

  const age =
    Date.now() -
    date.getTime();

  return (
    age >= 0 &&
    age <=
      MAX_AGE_HOURS *
        60 *
        60 *
        1000
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

  const skillNames = [
    skill.name,
    skill.category,
    skill.subcategory,
  ];

  if (
    Array.isArray(skill.tags)
  ) {
    skillNames.push(
      ...skill.tags
    );
  } else if (
    typeof skill.tags ===
    "string"
  ) {
    skillNames.push(
      skill.tags
    );
  }

  const terms =
    skillNames
      .filter(Boolean)
      .map(normalizeSkillText)
      .filter(
        (term) =>
          term.length >= 2
      );

  return terms.some(
    (term) =>
      normalizedText.includes(
        term
      )
  );
}

function detectSkill(
  result: SearchResult,
  skills: SkillRow[]
): SkillRow | undefined {
  const text = [
    result.title,
    result.snippet,
    result.description,
    result.company,
    result.author,
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * Prefer the longest matching skill
   * so "English Literature" wins over
   * the broader "English" skill.
   */
  const matches =
    skills.filter(
      (skill) =>
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
  if (!skill) {
    return undefined;
  }

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
    cleanText(
      result.title
    ) ||
    "Opportunity"
  );
}

function hasActionableContact(
  contact: ContactInfo
): boolean {
  return Boolean(
    cleanText(
      contact.email
    ) ||
      cleanText(
        contact.phone
      ) ||
      (
        contact.url &&
        isValidExternalUrl(
          contact.url
        )
      )
  );
}

function hasPersonIdentity(
  result: SearchResult
): boolean {
  const author =
    cleanText(
      result.author
    );

  if (author) {
    return true;
  }

  const title =
    getTitle(result);

  /*
   * Look for a normal human-name pattern.
   * This deliberately avoids treating generic
   * labels such as "Online Tutor" as a person.
   */
  const firstPart =
    title
      .split(
        /\s+[|–—-]\s+/
      )[0]
      ?.trim();

  if (!firstPart) {
    return false;
  }

  const cleaned =
    firstPart
      .replace(
        /\b(teacher|tutor|coach|consultant|mentor|advisor|adviser|trainer|developer|designer|writer)\b/gi,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const words =
    cleaned.split(" ");

  if (
    words.length < 2 ||
    words.length > 5
  ) {
    return false;
  }

  return words.every(
    (word) =>
      /^[A-Z][A-Za-z'.-]+$/.test(
        word
      )
  );
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
  const text = [
    result.title,
    result.snippet,
    result.description,
    result.company,
  ]
    .filter(Boolean)
    .join(" ");

  const hasOpportunityIntent =
    containsAny(
      text,
      SUPPLY_INTENT_TERMS
    );

  const hasOrganization =
    containsAny(
      text,
      ORGANIZATION_TERMS
    );

  return (
    hasOpportunityIntent &&
    hasOrganization
  );
}

function isSaasResult(
  result: SearchResult
): boolean {
  const text = [
    result.title,
    result.snippet,
    result.description,
    result.company,
    result.author,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    hasPersonIdentity(
      result
    ) &&
    containsAny(
      text,
      PROFESSIONAL_TERMS
    )
  );
}

function isBlockedContent(
  result: SearchResult
): boolean {
  const text = [
    result.title,
    result.snippet,
    result.description,
  ]
    .filter(Boolean)
    .join(" ");

  return containsAny(
    text,
    GENERIC_BLOCK_TERMS
  );
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

function emptyInsertedByType(): InsertedByType {
  return {
    Demand: 0,
    Supply: 0,
    SaaS: 0,
  };
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

function resultMatchesType(
  result: SearchResult,
  type: LeadType
): boolean {
  if (type === "Demand") {
    return isDemandResult(
      result
    );
  }

  if (type === "Supply") {
    return isSupplyResult(
      result
    );
  }

  return isSaasResult(
    result
  );
}

function getSourceName(
  result: SearchResult
): string {
  return (
    cleanText(
      result.source
    ) ||
    "Public source"
  );
}

function getSourceUrl(
  result: SearchResult
): string {
  return cleanText(
    result.link
  );
}

function buildProcessedLead(
  result: SearchResult,
  type: LeadType,
  skill: SkillRow,
  contact: ContactInfo
): ProcessedLead {
  const country =
    getCountry(result);

  const city =
    getCity(result);

  const description =
    getDescription(
      result
    );

  const title =
    getTitle(result);

  const skillName =
    getSkillText(skill);

  if (type === "Demand") {
    return {
      type,
      title,
      name:
        cleanText(
          result.author
        ) ||
        undefined,
      description,
      skill:
        skillName,
      category:
        cleanText(
          skill.category
        ),
      subcategory:
        cleanText(
          skill.subcategory
        ),
      country,
      city,
      sourceUrl:
        getSourceUrl(
          result
        ),
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

  if (type === "Supply") {
    return {
      type,
      title,
      company:
        cleanText(
          result.company
        ) ||
        undefined,
      description,
      skill:
        skillName,
      category:
        cleanText(
          skill.category
        ),
      subcategory:
        cleanText(
          skill.subcategory
        ),
      country,
      city,
      salary:
        undefined,
      sourceUrl:
        getSourceUrl(
          result
        ),
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

  return {
    type,
    title,
    name:
      cleanText(
        result.author
      ) ||
      undefined,
    company:
      cleanText(
        result.company
      ) ||
      undefined,
    description,
    skill:
      skillName,
    category:
      cleanText(
        skill.category
      ),
    subcategory:
      cleanText(
        skill.subcategory
      ),
    country,
    city,
    sourceUrl:
      getSourceUrl(
        result
      ),
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

function passesGoldRules(
  lead: ProcessedLead
): boolean {
  /*
   * Every lead must have a real source URL.
   */
  if (
    !isValidExternalUrl(
      lead.sourceUrl
    )
  ) {
    return false;
  }

  /*
   * Every lead must have a clearly
   * identified skill.
   */
  if (
    !cleanText(
      lead.skill
    )
  ) {
    return false;
  }

  /*
   * Demand:
   * an identifiable requester + genuine need
   * + actionable contact path.
   */
  if (
    lead.type === "Demand"
  ) {
    return Boolean(
      cleanText(
        lead.name
      ) &&
        cleanText(
          lead.description
        ) &&
        hasActionableContact({
          email:
            lead.contactEmail,
          phone:
            lead.contactPhone,
          url:
            lead.contactUrl ||
            lead.sourceUrl,
        })
    );
  }

  /*
   * Supply:
   * an identifiable organization/opportunity
   * + genuine opportunity language
   * + actionable contact path.
   */
  if (
    lead.type === "Supply"
  ) {
    return Boolean(
      cleanText(
        lead.company
      ) &&
        cleanText(
          lead.title
        ) &&
        cleanText(
          lead.description
        ) &&
        hasActionableContact({
          email:
            lead.contactEmail,
          phone:
            lead.contactPhone,
          url:
            lead.contactUrl ||
            lead.sourceUrl,
        })
    );
  }

  /*
   * SaaS:
   * identifiable professional + matching skill
   * + public actionable profile/source.
   *
   * A public professional profile itself can
   * be the contact path.
   */
  return Boolean(
    cleanText(
      lead.name
    ) &&
      cleanText(
        lead.description
      ) &&
      hasActionableContact({
        email:
          lead.contactEmail,
        phone:
          lead.contactPhone,
        url:
          lead.contactUrl ||
          lead.sourceUrl,
      })
  );
  }
function decodeXml(
  value: string
): string {
  return value
    .replace(
      /<!\[CDATA\[/g,
      ""
    )
    .replace(
      /\]\]>/g,
      ""
    )
    .replace(
      /&amp;/g,
      "&"
    )
    .replace(
      /&lt;/g,
      "<"
    )
    .replace(
      /&gt;/g,
      ">"
    )
    .replace(
      /&quot;/g,
      '"'
    )
    .replace(
      /&#39;/g,
      "'"
    );
}

function extractXmlItems(
  xml: string
): string[] {
  return [
    ...xml.matchAll(
      /<item\b[^>]*>([\s\S]*?)<\/item>/gi
    ),
  ].map(
    (match) =>
      match[1]
  );
}

function extractTag(
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

  return match
    ? decodeXml(
        match[1]
          .replace(
            /<[^>]+>/g,
            " "
          )
          .trim()
      )
    : "";
}

function parseRss(
  xml: string,
  source: string,
  sourceType:
    | "reddit"
    | "wwr"
): SearchResult[] {
  const results: SearchResult[] =
    [];

  for (
    const item of extractXmlItems(
      xml
    )
  ) {
    const title =
      extractTag(
        item,
        "title"
      );

    const link =
      extractTag(
        item,
        "link"
      );

    const description =
      extractTag(
        item,
        "description"
      );

    const publishedAt =
      extractTag(
        item,
        "pubDate"
      ) ||
      extractTag(
        item,
        "published"
      ) ||
      extractTag(
        item,
        "updated"
      );

    const author =
      extractTag(
        item,
        "author"
      ) ||
      extractTag(
        item,
        "dc:creator"
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

async function fetchPublicFeed(
  url: string
): Promise<string> {
  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "OpportunityHub/1.0 public-lead-collector",
        Accept:
          "application/rss+xml, application/xml, text/xml, application/json, text/plain",
      },
    });

  if (!response.ok) {
    throw new Error(
      `Public source returned ${response.status}`
    );
  }

  return response.text();
}

async function fetchRemoteOk(): Promise<SearchResult[]> {
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
      `Remote OK returned ${response.status}`
    );
  }

  const data =
    await response.json();

  if (
    !Array.isArray(data)
  ) {
    return [];
  }

  const results: SearchResult[] =
    [];

  for (
    const item of data
  ) {
    const title =
      cleanText(
        item?.position ||
          item?.title
      );

    const link =
      cleanText(
        item?.url ||
          item?.apply_url
      );

    const description =
      cleanText(
        item?.description
      );

    const company =
      cleanText(
        item?.company
      );

    const location =
      cleanText(
        item?.location
      );

    const publishedAt =
      cleanText(
        item?.date ||
          item?.publication_date
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
      company,
      location,
      publishedAt,
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

async function fetchWwr(): Promise<SearchResult[]> {
  const xml =
    await fetchPublicFeed(
      WWR_RSS
    );

  return parseRss(
    xml,
    "We Work Remotely",
    "wwr"
  );
}

async function fetchRedditDemand(): Promise<SearchResult[]> {
  const all: SearchResult[] =
    [];

  for (
    const feed of
      REDDIT_DEMAND_FEEDS
  ) {
    try {
      const xml =
        await fetchPublicFeed(
          feed
        );

      const results =
        parseRss(
          xml,
          "Reddit public RSS",
          "reddit"
        );

      all.push(
        ...results
      );
    } catch (error) {
      console.warn(
        "[LEAD COLLECTOR] Reddit feed failed",
        feed,
        error
      );
    }

    if (
      all.length >=
      MAX_RESULTS_PER_SOURCE
    ) {
      break;
    }
  }

  return all.slice(
    0,
    MAX_RESULTS_PER_SOURCE
  );
  }

async function loadOpportunitySkills(): Promise<SkillRow[]> {
  if (!supabase) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const { data, error } =
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

  return (data || [])
    .map((row: any) => ({
      id: cleanText(row?.id),
      name: cleanText(row?.name),
      category: cleanText(
        row?.category
      ),
      subcategory: cleanText(
        row?.subcategory
      ),
      tags: row?.tags ?? null,
    }))
    .filter(
      (skill: SkillRow) =>
        Boolean(
          cleanText(skill.name) ||
          cleanText(skill.subcategory) ||
          cleanText(skill.category)
        )
    );
}

function getRedditPostContact(
  result: SearchResult
): ContactInfo {
  const description =
    cleanText(
      result.description ||
        result.snippet
    );

  const emails =
    extractEmails(
      description
    );

  const phones =
    extractPhones(
      description
    );

  const links =
    extractContactLinks(
      description
    );

  return {
    email:
      emails[0],
    phone:
      phones[0],
    url:
      links[0],
  };
}

function getDemandContact(
  result: SearchResult
): ContactInfo {
  if (
    result.sourceType ===
    "reddit"
  ) {
    return getRedditPostContact(
      result
    );
  }

  return {
    email:
      extractEmails(
        getSearchText(result)
      )[0],
    phone:
      extractPhones(
        getSearchText(result)
      )[0],
  };
}

function getSupplyContact(
  result: SearchResult
): ContactInfo {
  const text =
    getSearchText(
      result
    );

  const emails =
    extractEmails(
      text
    );

  const phones =
    extractPhones(
      text
    );

  return {
    email:
      emails[0],
    phone:
      phones[0],
  };
}

function getSaasContact(
  result: SearchResult
): ContactInfo {
  const text =
    getSearchText(
      result
    );

  const emails =
    extractEmails(
      text
    );

  const phones =
    extractPhones(
      text
    );

  const links =
    extractContactLinks(
      text
    );

  return {
    email:
      emails[0],
    phone:
      phones[0],
    url:
      links[0] ||
      (
        isValidExternalUrl(
          result.link
        )
          ? result.link
          : undefined
      ),
  };
}

function sourceAllowsDemand(
  result: SearchResult
): boolean {
  return (
    result.sourceType ===
      "reddit"
  );
}

function sourceAllowsSupply(
  result: SearchResult
): boolean {
  return (
    result.sourceType ===
      "remoteok" ||
    result.sourceType ===
      "wwr"
  );
}

function sourceAllowsSaas(
  result: SearchResult
): boolean {
  return (
    result.sourceType ===
      "remoteok_profile"
  );
}

function hasStrictDemandContact(
  contact: ContactInfo
): boolean {
  return Boolean(
    cleanText(
      contact.email
    ) ||
      cleanText(
        contact.phone
      ) ||
      cleanText(
        contact.url
      )
  );
}

function hasStrictSupplyContact(
  contact: ContactInfo
): boolean {
  return Boolean(
    cleanText(
      contact.email
    ) ||
      cleanText(
        contact.phone
      )
  );
}

function hasStrictSaasContact(
  contact: ContactInfo
): boolean {
  return Boolean(
    cleanText(
      contact.url
    ) ||
      cleanText(
        contact.email
    ) ||
      cleanText(
        contact.phone
      )
  );
}

function isLikelyPersonName(
  value?: string
): boolean {
  const name =
    cleanText(
      value
    );

  if (!name) {
    return false;
  }

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

  const words =
    name
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length < 2 ||
    words.length > 6
  ) {
    return false;
  }

  return words.every(
    (word) =>
      /^[A-Za-z][A-Za-z'.-]*$/.test(
        word
      )
  );
}

function extractPersonFromTitle(
  title: string
): string | undefined {
  const cleaned =
    cleanText(
      title
    );

  const parts =
    cleaned.split(
      /\s+[|–—-]\s+/
    );

  for (
    const part of parts
  ) {
    const candidate =
      cleanText(
        part
      );

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
function buildDemandLead(
  result: SearchResult,
  skill: SkillRow,
  contact: ContactInfo
): ProcessedLead {
  const personName =
    cleanText(
      result.author
    ) ||
    extractPersonFromTitle(
      result.title
    );

  return {
    type: "Demand",
    title: getTitle(
      result
    ),
    name:
      personName ||
      undefined,
    description:
      getDescription(
        result
      ),
    skill:
      getSkillText(
        skill
      ),
    category:
      cleanText(
        skill.category
      ),
    subcategory:
      cleanText(
        skill.subcategory
      ),
    country:
      getCountry(
        result
      ),
    city:
      getCity(
        result
      ),
    sourceUrl:
      getSourceUrl(
        result
      ),
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

function buildSupplyLead(
  result: SearchResult,
  skill: SkillRow,
  contact: ContactInfo
): ProcessedLead {
  const company =
    cleanText(
      result.company
    ) ||
    (
      containsAny(
        getSearchText(
          result
        ),
        ORGANIZATION_TERMS
      )
        ? extractPersonFromTitle(
            result.title
          )
        : ""
    );

  return {
    type: "Supply",
    title:
      getTitle(
        result
      ),
    company:
      company ||
      undefined,
    description:
      getDescription(
        result
      ),
    skill:
      getSkillText(
        skill
      ),
    category:
      cleanText(
        skill.category
      ),
    subcategory:
      cleanText(
        skill.subcategory
      ),
    country:
      getCountry(
        result
      ),
    city:
      getCity(
        result
      ),
    sourceUrl:
      getSourceUrl(
        result
      ),
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

function buildSaasLead(
  result: SearchResult,
  skill: SkillRow,
  contact: ContactInfo
): ProcessedLead {
  const personName =
    cleanText(
      result.author
    ) ||
    extractPersonFromTitle(
      result.title
    );

  return {
    type: "SaaS",
    title:
      getTitle(
        result
      ),
    name:
      personName ||
      undefined,
    company:
      cleanText(
        result.company
      ) ||
      undefined,
    description:
      getDescription(
        result
      ),
    skill:
      getSkillText(
        skill
      ),
    category:
      cleanText(
        skill.category
      ),
    subcategory:
      cleanText(
        skill.subcategory
      ),
    country:
      getCountry(
        result
      ),
    city:
      getCity(
        result
      ),
    sourceUrl:
      getSourceUrl(
        result
      ),
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

function buildLeadForType(
  result: SearchResult,
  type: LeadType,
  skill: SkillRow
): ProcessedLead | undefined {
  if (
    !resultMatchesType(
      result,
      type
    )
  ) {
    return undefined;
  }

  if (
    !skillMatchesText(
      skill,
      getSearchText(
        result
      )
    )
  ) {
    return undefined;
  }

  if (
    type === "Demand"
  ) {
    if (
      !sourceAllowsDemand(
        result
      )
    ) {
      return undefined;
    }

    const contact =
      getDemandContact(
        result
      );

    if (
      !hasStrictDemandContact(
        contact
      )
    ) {
      return undefined;
    }

    return buildDemandLead(
      result,
      skill,
      contact
    );
  }

  if (
    type === "Supply"
  ) {
    if (
      !sourceAllowsSupply(
        result
      )
    ) {
      return undefined;
    }

    const contact =
      getSupplyContact(
        result
      );

    if (
      !hasStrictSupplyContact(
        contact
      )
    ) {
      return undefined;
    }

    return buildSupplyLead(
      result,
      skill,
      contact
    );
  }

  if (
    !sourceAllowsSaas(
      result
    )
  ) {
    return undefined;
  }

  const contact =
    getSaasContact(
      result
    );

  if (
    !hasStrictSaasContact(
      contact
    )
  ) {
    return undefined;
  }

  return buildSaasLead(
    result,
    skill,
    contact
  );
}

function leadDedupeKey(
  lead: ProcessedLead
): string {
  const primary =
    lead.contactEmail ||
    lead.contactPhone ||
    lead.contactUrl ||
    lead.sourceUrl;

  return [
    lead.type,
    normalize(
      lead.name ||
        lead.company ||
        lead.title
    ),
    normalize(
      lead.skill
    ),
    normalize(
      primary
    ),
  ].join(
    "|"
  );
}

function isFreshLead(
  lead: ProcessedLead
): boolean {
  if (
    lead.type ===
    "SaaS"
  ) {
    return true;
  }

  return isWithin72Hours(
    lead.createdAt
  );
}
function mapDemandForInsert(
  lead: ProcessedLead
) {
  return {
    type: "Demand",
    source:
      getSourceNameFromUrl(
        lead.sourceUrl
      ),
    source_url:
      lead.sourceUrl,
    client_name:
      lead.name ||
      "Public client",
    contact_name:
      lead.name ||
      null,
    title:
      lead.title,
    description:
      lead.description ||
      "",
    skill_needed:
      lead.skill ||
      "",
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
    budget:
      lead.budget ||
      null,
    currency:
      lead.currency ||
      null,
    status:
      "new",
    created_at:
      lead.createdAt ||
      new Date().toISOString(),
  };
}

function mapSupplyForInsert(
  lead: ProcessedLead
) {
  return {
    company_name:
      lead.company ||
      "Public organization",
    description:
      lead.description ||
      "",
    position:
      lead.title ||
      "",
    job_title:
      lead.title ||
      "",
    required_skill:
      lead.skill ||
      "",
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
    contact_name:
      null,
    company_website:
      null,
    apply_url:
      null,
    contact_url:
      null,
    source_url:
      lead.sourceUrl,
    source:
      getSourceNameFromUrl(
        lead.sourceUrl
      ),
    salary_range:
      lead.salary ||
      null,
    created_at:
      lead.createdAt ||
      new Date().toISOString(),
  };
}

function mapSaasForInsert(
  lead: ProcessedLead
) {
  return {
    name:
      lead.name ||
      "",
    platform:
      getSourceNameFromUrl(
        lead.sourceUrl
      ),
    niche:
      lead.skill ||
      "",
    contact:
      lead.contactEmail ||
      lead.contactPhone ||
      lead.contactUrl ||
      "",
    contact_url:
      lead.contactUrl ||
      null,
    source_url:
      lead.sourceUrl,
    landing_url:
      lead.contactUrl ||
      lead.sourceUrl,
    country:
      lead.country ||
      null,
    city:
      lead.city ||
      null,
    description:
      lead.description ||
      "",
    status:
      "new",
    created_at:
      new Date().toISOString(),
  };
}

function getSourceNameFromUrl(
  url: string
): string {
  try {
    const hostname =
      new URL(
        url
      ).hostname
        .replace(
          /^www\./,
          ""
        );

    if (
      hostname.includes(
        "reddit.com"
      )
    ) {
      return "Reddit";
    }

    if (
      hostname.includes(
        "remoteok.com"
      )
    ) {
      return "Remote OK";
    }

    if (
      hostname.includes(
        "weworkremotely.com"
      )
    ) {
      return "We Work Remotely";
    }

    return hostname;
  } catch {
    return "Public source";
  }
}

async function demandAlreadyExists(
  lead: ProcessedLead
): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  const sourceUrl =
    cleanText(
      lead.sourceUrl
    );

  if (!sourceUrl) {
    return false;
  }

  const { data, error } =
    await supabase
      .from(
        "demand_leads"
      )
      .select(
        "id"
      )
      .eq(
        "source_url",
        sourceUrl
      )
      .limit(1);

  if (error) {
    throw new Error(
      `Demand duplicate check failed: ${error.message}`
    );
  }

  return Boolean(
    data &&
      data.length > 0
  );
}

async function supplyAlreadyExists(
  lead: ProcessedLead
): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  const sourceUrl =
    cleanText(
      lead.sourceUrl
    );

  if (!sourceUrl) {
    return false;
  }

  const { data, error } =
    await supabase
      .from(
        "supply_leads"
      )
      .select(
        "id"
      )
      .eq(
        "source_url",
        sourceUrl
      )
      .limit(1);

  if (error) {
    throw new Error(
      `Supply duplicate check failed: ${error.message}`
    );
  }

  return Boolean(
    data &&
      data.length > 0
  );
}

async function saasAlreadyExists(
  lead: ProcessedLead
): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  const contact =
    cleanText(
      lead.contactUrl
    ) ||
    cleanText(
      lead.contactEmail
    ) ||
    cleanText(
      lead.contactPhone
    );

  if (contact) {
    const { data, error } =
      await supabase
        .from(
          "saas_leads"
        )
        .select(
          "id"
        )
        .or(
          `contact_url.eq.${contact},contact.eq.${contact}`
        )
        .limit(1);

    if (error) {
      throw new Error(
        `SaaS duplicate check failed: ${error.message}`
      );
    }

    if (
      data &&
      data.length > 0
    ) {
      return true;
    }
  }

  const name =
    cleanText(
      lead.name
    );

  if (!name) {
    return false;
  }

  const { data, error } =
    await supabase
      .from(
        "saas_leads"
      )
      .select(
        "id"
      )
      .ilike(
        "name",
        name
      )
      .limit(1);

  if (error) {
    throw new Error(
      `SaaS name duplicate check failed: ${error.message}`
    );
  }

  return Boolean(
    data &&
      data.length > 0
  );
}
async function insertDemandLead(
  lead: ProcessedLead
): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  const { error } =
    await supabase
      .from(
        "demand_leads"
      )
      .insert(
        mapDemandForInsert(
          lead
        )
      );

  if (error) {
    throw new Error(
      `Demand insert failed: ${error.message}`
    );
  }

  return true;
}

async function insertSupplyLead(
  lead: ProcessedLead
): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  const { error } =
    await supabase
      .from(
        "supply_leads"
      )
      .insert(
        mapSupplyForInsert(
          lead
        )
      );

  if (error) {
    throw new Error(
      `Supply insert failed: ${error.message}`
    );
  }

  return true;
}

async function insertSaasLead(
  lead: ProcessedLead
): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  const { error } =
    await supabase
      .from(
        "saas_leads"
      )
      .insert(
        mapSaasForInsert(
          lead
        )
      );

  if (error) {
    throw new Error(
      `SaaS insert failed: ${error.message}`
    );
  }

  return true;
}

async function insertLead(
  lead: ProcessedLead
): Promise<boolean> {
  if (
    lead.type ===
    "Demand"
  ) {
    return insertDemandLead(
      lead
    );
  }

  if (
    lead.type ===
    "Supply"
  ) {
    return insertSupplyLead(
      lead
    );
  }

  return insertSaasLead(
    lead
  );
}

function createResultKey(
  result: SearchResult
): string {
  return [
    normalize(
      result.title
    ),
    normalize(
      result.link
    ),
    normalize(
      result.source
    ),
  ].join(
    "|"
  );
}

function uniqueResults(
  results: SearchResult[]
): SearchResult[] {
  const seen =
    new Set<string>();

  const output: SearchResult[] =
    [];

  for (
    const result of results
  ) {
    const key =
      createResultKey(
        result
      );

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    output.push(
      result
    );
  }

  return output;
}

async function collectSourceResults(): Promise<SearchResult[]> {
  const all: SearchResult[] =
    [];

  try {
    const remoteOk =
      await fetchRemoteOk();

    all.push(
      ...remoteOk
    );
  } catch (error) {
    console.warn(
      "[LEAD COLLECTOR] Remote OK failed:",
      error
    );
  }

  try {
    const wwr =
      await fetchWwr();

    all.push(
      ...wwr
    );
  } catch (error) {
    console.warn(
      "[LEAD COLLECTOR] We Work Remotely failed:",
      error
    );
  }

  try {
    const reddit =
      await fetchRedditDemand();

    all.push(
      ...reddit
    );
  } catch (error) {
    console.warn(
      "[LEAD COLLECTOR] Reddit collection failed:",
      error
    );
  }

  return uniqueResults(
    all
  );
}

function sourceMatchesType(
  result: SearchResult,
  type: LeadType
): boolean {
  if (
    type === "Demand"
  ) {
    return sourceAllowsDemand(
      result
    );
  }

  if (
    type === "Supply"
  ) {
    return sourceAllowsSupply(
      result
    );
  }

  return sourceAllowsSaas(
    result
  );
}

function updateStatsForRejectedResult(
  stats: LeadStats,
  reason:
    | "wrongType"
    | "noSkill"
    | "noContact"
    | "blocked"
    | "stale"
    | "invalid"
): void {
  if (
    reason ===
    "wrongType"
  ) {
    stats.wrongType += 1;
  }

  if (
    reason ===
    "noSkill"
  ) {
    stats.noSkill += 1;
  }

  if (
    reason ===
    "noContact"
  ) {
    stats.noContact += 1;
  }

  if (
    reason ===
    "blocked"
  ) {
    stats.blocked += 1;
  }

  if (
    reason ===
    "stale"
  ) {
    stats.stale += 1;
  }

  if (
    reason ===
    "invalid"
  ) {
    stats.invalid += 1;
  }
}
async function processResults(
  results: SearchResult[],
  skills: SkillRow[],
  stats: LeadStats,
  insertedByType: InsertedByType
): Promise<void> {
  const seenLeads =
    new Set<string>();

  for (
    const result of results
  ) {
    stats.found += 1;

    if (
      !isValidExternalUrl(
        result.link
      )
    ) {
      updateStatsForRejectedResult(
        stats,
        "invalid"
      );
      continue;
    }

    if (
      isBlockedDomain(
        result.link
      ) ||
      isBlockedContent(
        result
      )
    ) {
      stats.blocked += 1;
      continue;
    }

    const sourceText =
      getSearchText(
        result
      );

    const detectedSkill =
      detectSkill(
        result,
        skills
      );

    if (
      !detectedSkill
    ) {
      stats.noSkill += 1;
      continue;
    }

    let leadType:
      | LeadType
      | undefined;

    if (
      result.sourceType ===
      "reddit"
    ) {
      if (
        isDemandResult(
          result
        )
      ) {
        leadType =
          "Demand";
      } else {
        stats.wrongType += 1;
        continue;
      }
    } else if (
      result.sourceType ===
        "remoteok" ||
      result.sourceType ===
        "wwr"
    ) {
      if (
        isSupplyResult(
          result
        )
      ) {
        leadType =
          "Supply";
      } else {
        stats.wrongType += 1;
        continue;
      }
    } else if (
      result.sourceType ===
      "remoteok_profile"
    ) {
      if (
        isSaasResult(
          result
        )
      ) {
        leadType =
          "SaaS";
      } else {
        stats.wrongType += 1;
        continue;
      }
    }

    if (!leadType) {
      stats.wrongType += 1;
      continue;
    }

    if (
      !sourceMatchesType(
        result,
        leadType
      )
    ) {
      stats.wrongType += 1;
      continue;
    }

    const contact =
      leadType ===
      "Demand"
        ? getDemandContact(
            result
          )
        : leadType ===
          "Supply"
        ? getSupplyContact(
            result
          )
        : getSaasContact(
            result
          );

    if (
      leadType ===
        "Demand" &&
      !hasStrictDemandContact(
        contact
      )
    ) {
      stats.noContact += 1;
      continue;
    }

    if (
      leadType ===
        "Supply" &&
      !hasStrictSupplyContact(
        contact
      )
    ) {
      stats.noContact += 1;
      continue;
    }

    if (
      leadType ===
        "SaaS" &&
      !hasStrictSaasContact(
        contact
      )
    ) {
      stats.noContact += 1;
      continue;
    }

    const lead =
      buildLeadForType(
        result,
        leadType,
        detectedSkill
      );

    if (!lead) {
      stats.invalid += 1;
      continue;
    }

    if (
      !isFreshLead(
        lead
      )
    ) {
      stats.stale += 1;
      continue;
    }

    if (
      !passesGoldRules(
        lead
      )
    ) {
      stats.invalid += 1;
      continue;
    }

    const key =
      leadDedupeKey(
        lead
      );

    if (
      seenLeads.has(
        key
      )
    ) {
      stats.duplicate += 1;
      continue;
    }

    seenLeads.add(
      key
    );

    let exists =
      false;

    try {
      if (
        lead.type ===
        "Demand"
      ) {
        exists =
          await demandAlreadyExists(
            lead
          );
      } else if (
        lead.type ===
        "Supply"
      ) {
        exists =
          await supplyAlreadyExists(
            lead
          );
      } else {
        exists =
          await saasAlreadyExists(
            lead
          );
      }
    } catch (error) {
      stats.insertErrors += 1;

      console.error(
        "[LEAD COLLECTOR] Duplicate check error:",
        error
      );

      continue;
    }

    if (exists) {
      stats.duplicate += 1;
      continue;
    }

    stats.accepted += 1;

    try {
      await insertLead(
        lead
      );

      stats.inserted += 1;

      if (
        lead.type ===
        "Demand"
      ) {
        insertedByType.Demand += 1;
      } else if (
        lead.type ===
        "Supply"
      ) {
        insertedByType.Supply += 1;
      } else {
        insertedByType.SaaS += 1;
      }
    } catch (error) {
      stats.insertErrors += 1;

      console.error(
        `[LEAD COLLECTOR] ${lead.type} insert error:`,
        error
      );
    }
  }
}

function buildDiagnostics(
  stats: LeadStats,
  insertedByType: InsertedByType
) {
  return {
    overall: {
      found:
        stats.found,
      accepted:
        stats.accepted,
      inserted:
        stats.inserted,
      duplicate:
        stats.duplicate,
      wrongType:
        stats.wrongType,
      noSkill:
        stats.noSkill,
      noContact:
        stats.noContact,
      blocked:
        stats.blocked,
      stale:
        stats.stale,
      invalid:
        stats.invalid,
      insertErrors:
        stats.insertErrors,
    },
    insertedByType: {
      Demand:
        insertedByType.Demand,
      Supply:
        insertedByType.Supply,
      SaaS:
        insertedByType.SaaS,
    },
  };
}
async function collectAndInsertLeads(): Promise<{
  stats: LeadStats;
  insertedByType: InsertedByType;
}> {
  if (!supabase) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const stats =
    emptyStats();

  const insertedByType =
    emptyInsertedByType();

  const skills =
    await loadOpportunitySkills();

  if (
    skills.length === 0
  ) {
    throw new Error(
      "No Opportunity Hub skills were found in the skills table."
    );
  }

  const results =
    await collectSourceResults();

  await processResults(
    results,
    skills,
    stats,
    insertedByType
  );

  return {
    stats,
    insertedByType,
  };
}

export default async function handler(
  req: any,
  res: any
) {
  if (
    req.method !==
    "POST"
  ) {
    return res
      .status(405)
      .json({
        success: false,
        error:
          "Method not allowed",
      });
  }

  try {
    const result =
      await collectAndInsertLeads();

    const diagnostics =
      buildDiagnostics(
        result.stats,
        result.insertedByType
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Real lead collection completed.",
        added:
          result.stats
            .inserted,
        inserted:
          result.stats
            .inserted,
        insertedByType:
          result.insertedByType,
        diagnostics,
      });
  } catch (error: any) {
    const message =
      error?.message ||
      String(error) ||
      "Lead collection failed.";

    console.error(
      "LEAD_COLLECTOR_REAL_ERROR:",
      message
    );

    return res
      .status(500)
      .json({
        success: false,
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
        error:
          message,
      });
  }
}
