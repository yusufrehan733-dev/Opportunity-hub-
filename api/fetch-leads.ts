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

  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.ae",
  "amazon.in",
  "amazon.com.au",
  "amazon.de",
  "amazon.fr",

  "daraz.pk",
  "daraz.com",
  "ebay.com",
  "etsy.com",
  "walmart.com",
  "aliexpress.com",

  "udemy.com",
  "coursera.org",
  "skillshare.com",

  "wikipedia.org",
  "medium.com",
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
  "teaching resources",
  "teacher resources",
  "educational resources",

  "job",
  "jobs",
  "job board",
  "vacancy",
  "vacancies",
  "hiring",
  "application",

  "course",
  "courses",
  "online course",
  "webinar",
  "seminar",

  "article",
  "articles",
  "blog",
  "blogs",
  "news",
  "news article",

  "book",
  "books",
  "ebook",
  "e-book",

  "amazon",
  "daraz",
  "ebay",
  "etsy",
  "walmart",
  "aliexpress",

  "app",
  "apps",
  "application software",
  "software",
  "saas product",
  "platform",
  "marketplace",

  "directory",
  "directories",
  "listing",
  "listings",

  "reviews",
  "review",
  "comparison",
  "comparisons",

  "definition",
  "encyclopedia",
  "wiki",

  "podcast",
  "podcasts",
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
        "islamic education",
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
        "statistics",
      ],
      name: "Mathematics",
    },

    {
      match: [
        "teacher",
        "teaching",
        "educator",
        "education",
        "instructor",
        "tutor",
        "tutoring",
      ],
      name: "Teaching",
    },

    {
      match: [
        "coach",
        "coaching",
        "mentor",
        "mentoring",
        "guide",
        "guidance",
        "professional coach",
        "life coach",
      ],
      name: "Coaching",
    },

    {
      match: [
        "freelancer",
        "freelance",
        "freelancing",
      ],
      name: "Freelancing",
    },

    {
      match: [
        "developer",
        "development",
        "programmer",
        "programming",
        "software engineer",
        "web developer",
        "app developer",
      ],
      name: "Development",
    },

    {
      match: [
        "designer",
        "design",
        "graphic designer",
        "ui designer",
        "ux designer",
        "ui/ux",
      ],
      name: "Design",
    },

    {
      match: [
        "writer",
        "writing",
        "copywriter",
        "copywriting",
        "content writer",
        "content writing",
      ],
      name: "Writing",
    },

    {
      match: [
        "accountant",
        "accounting",
        "bookkeeper",
        "bookkeeping",
      ],
      name: "Accounting",
    },

    {
      match: [
        "marketing",
        "marketer",
        "digital marketing",
        "social media marketing",
        "seo",
      ],
      name: "Marketing",
    },

    {
      match: [
        "virtual assistant",
        "virtual assistance",
        "va",
      ],
      name: "Virtual Assistant",
    },
  ];

  for (const group of expandedSkillGroups) {
    if (
      group.match.some((term) =>
        normalized.includes(
          normalize(term)
        )
      )
    ) {
      return {
        name: group.name,
      };
    }
  }

  return undefined;
        }
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

function hasLikelyPersonName(
  result: SearchResult
): boolean {
  const text =
    getSearchText(result);

  const extracted =
    extractPersonName(text);

  if (extracted) {
    return true;
  }

  const title =
    cleanText(result.title);

  if (!title) {
    return false;
  }

  /*
   * Avoid treating generic professional titles
   * as a person's name.
   */
  const genericTitleTerms = [
    "teacher",
    "teaching",
    "tutor",
    "tutoring",
    "coach",
    "coaching",
    "mentor",
    "mentoring",
    "consultant",
    "consulting",
    "freelancer",
    "freelancing",
    "educator",
    "education",
    "instructor",
    "trainer",
    "training",
    "designer",
    "developer",
    "writer",
    "accountant",
    "marketer",
    "virtual assistant",
  ];

  const titleNormalized =
    normalize(title);

  if (
    genericTitleTerms.some(
      (term) =>
        titleNormalized ===
        normalize(term)
    )
  ) {
    return false;
  }

  /*
   * A short title containing a likely
   * first/last name can be useful, but
   * only when the result is not obviously
   * a generic resource/product page.
   */
  const words =
    title
      .replace(
        /[^A-Za-zÀ-ÿ'’-]+/g,
        " "
      )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length >= 2 &&
    words.length <= 4
  ) {
    const capitalizedWords =
      words.filter((word) =>
        /^[A-ZÀ-Ý][a-zà-ÿ'’-]+$/.test(
          word
        )
      );

    if (
      capitalizedWords.length >= 2
    ) {
      return true;
    }
  }

  return false;
}

function isIndividualSaasProfile(
  result: SearchResult
): boolean {
  const text =
    getSearchText(result);

  const normalized =
    normalize(text);

  /*
   * Reject known non-person content
   * before checking professional keywords.
   */
  if (
    isBlockedDomain(result.link)
  ) {
    return false;
  }

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

  /*
   * Product/e-commerce and content URLs
   * should never become SaaS prospects.
   */
  const url =
    normalize(result.link);

  const blockedPathTerms = [
    "/product/",
    "/products/",
    "/shop/",
    "/store/",
    "/book/",
    "/books/",
    "/ebook/",
    "/course/",
    "/courses/",
    "/blog/",
    "/article/",
    "/articles/",
    "/news/",
    "/wiki/",
    "/dictionary/",
    "/definition/",
    "/resources/",
    "/resource/",
    "/directory/",
    "/directories/",
    "/category/",
    "/categories/",
    "/tag/",
    "/tags/",
    "/search",
    "/pricing",
    "/download/",
  ];

  if (
    blockedPathTerms.some(
      (term) =>
        url.includes(term)
    )
  ) {
    return false;
  }

  if (
    !isSaasProfessional(text)
  ) {
    return false;
  }

  /*
   * A SaaS prospect needs to look like
   * an actual individual professional,
   * not merely a page mentioning one.
   */
  if (
    isSocialOrProfileUrl(
      result.link
    )
  ) {
    return hasLikelyPersonName(result);
  }

  if (
    !hasLikelyPersonName(result)
  ) {
    return false;
  }

  return true;
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

  /*
   * Demand and Supply must have an
   * actual opportunity signal.
   *
   * We allow several natural-language
   * variations because Google snippets
   * do not always use the exact phrase
   * used in our query.
   */
  if (type === "Demand") {
    return containsAny(
      text,
      [
        ...DEMAND_SIGNALS,
        "looking for someone",
        "looking for a tutor",
        "looking for a teacher",
        "looking for a coach",
        "looking for a mentor",
        "need help",
        "need help with",
        "need tutoring",
        "need teaching",
        "need coaching",
        "need training",
        "seeking help",
        "seeking a tutor",
        "seeking a teacher",
        "seeking a coach",
        "seeking a mentor",
        "private tutor needed",
        "teacher needed",
        "tutor needed",
        "coach needed",
        "mentor needed",
        "wanted tutor",
        "wanted teacher",
        "wanted coach",
        "wanted mentor",
      ]
    );
  }

  if (type === "Supply") {
    return containsAny(
      text,
      [
        ...SUPPLY_SIGNALS,
        "hiring a",
        "hiring an",
        "hiring someone",
        "looking to hire",
        "looking to recruit",
        "staff needed",
        "teacher vacancy",
        "tutor vacancy",
        "coach vacancy",
        "teacher position",
        "tutor position",
        "coach position",
        "teacher opportunity",
        "tutor opportunity",
        "coach opportunity",
        "teaching opportunity",
        "employment opportunity",
        "work opportunity",
        "join our team",
        "join the team",
        "send your cv",
        "send your resume",
        "submit your cv",
        "submit your resume",
      ]
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
   * keep the 72-hour freshness rule.
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

  /*
   * A lead is not accepted unless we
   * can find a direct contact path.
   */
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
   * Every SaaS lead must have a
   * supported country so the Leads
   * page can filter it correctly.
   */
  if (
    type === "SaaS" &&
    !country
  ) {
    stats.wrongType++;
    return null;
  }

  /*
   * Demand and Supply also need a
   * detectable country because users
   * filter these leads by country.
   */
  if (
    type !== "SaaS" &&
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
  supabase: ReturnType<
    typeof createSupabase
  >,
  type: LeadType,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<
  CollectedLead[]
> {
  const queries =
    buildQueries(
      type,
      skills
    );

  const collected:
    CollectedLead[] = [];

  for (
    const query of queries
  ) {
    let results:
      SearchResult[] = [];

    try {
      results =
        await searchSerper(
          query,
          type
        );
    } catch {
      stats.insertErrors++;

      continue;
    }

    for (
      const result of results
    ) {
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

      /*
       * Also prevent the same URL from
       * being collected twice during the
       * current fetch before insertion.
       */
      const alreadyCollected =
        collected.some(
          (existing) =>
            existing.source ===
            lead.source
        );

      if (
        alreadyCollected
      ) {
        stats.duplicate++;

        continue;
      }

      collected.push(
        lead
      );
    }
  }

  return collected;
}

async function insertLeads(
  supabase: ReturnType<
    typeof createSupabase
  >,
  leads: CollectedLead[],
  stats: CollectionStats
): Promise<void> {
  for (
    const lead of leads
  ) {
    const table =
      tableForType(
        lead.leadType
      );

    const payload =
      leadInsertPayload(
        lead
      );

    const {
      error,
    } =
      await supabase
        .from(table)
        .insert(
          payload
        );

    if (error) {
      stats.insertErrors++;

      continue;
    }

    stats.inserted++;
  }
}
  async function collectDemand(
  supabase: ReturnType<
    typeof createSupabase
  >,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<
  CollectedLead[]
> {
  return collectType(
    supabase,
    "Demand",
    skills,
    stats
  );
}

async function collectSupply(
  supabase: ReturnType<
    typeof createSupabase
  >,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<
  CollectedLead[]
> {
  return collectType(
    supabase,
    "Supply",
    skills,
    stats
  );
}

async function collectSaas(
  supabase: ReturnType<
    typeof createSupabase
  >,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<
  CollectedLead[]
> {
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
  /*
   * Only the Admin fetch action should
   * call this endpoint with POST.
   */
  if (
    req.method !== "POST"
  ) {
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

    /*
     * Load the real skill hierarchy
     * from Supabase.
     */
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

    /*
     * Collect all three lead types
     * independently.
     */
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

    /*
     * Insert only after collection has
     * completed for each category.
     */
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

    /*
     * Keep this response structure stable.
     * Admin reads:
     *
     * data.results.Demand
     * data.results.Supply
     * data.results.SaaS
     */
    return res
      .status(200)
      .json({
        ok: true,

        message:
          "Real lead collection completed.",

        results: {
          Demand:
            demandStats,

          Supply:
            supplyStats,

          SaaS:
            saasStats,
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

    /*
     * Always return JSON so the frontend
     * never receives a plain-text server
     * error that causes JSON.parse() to fail.
     */
    return res
      .status(500)
      .json({
        ok: false,
        error: message,
      });
  }
}
