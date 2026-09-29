import { createClient } from "@supabase/supabase-js";
import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

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
  name: string;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | string | null;
};

type SearchResult = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  position?: number;
};

type ContactInfo = {
  email?: string;
  phone?: string;
  url?: string;
};

type CollectedLead = {
  leadType: LeadType;

  source: string;

  title: string;

  name?: string;

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

  lastInsertError?: string;
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
  "coursera.com",
  "skillshare.com",

  "wikipedia.org",
  "medium.com",
];

const SAAS_BLOCKED_PATHS = [
  "/search",
  "/search?",
  "/jobs",
  "/job/",
  "/jobs/",
  "/company/",
  "/companies/",
  "/directory/",
  "/directories/",
  "/marketplace/",
  "/category/",
  "/categories/",
  "/products/",
  "/product/",
  "/courses/",
  "/course/",
  "/events/",
  "/event/",
  "/groups/",
  "/group/",
  "/tags/",
  "/tag/",
  "/reviews/",
  "/review/",
];

const COUNTRY_ALIASES: Record<
  string,
  string[]
> = {
  "United States": [
    "united states",
    "usa",
    "u.s.a",
    "u.s.",
    "us",
    "america",
    "american",
  ],

  Canada: [
    "canada",
    "canadian",
    "toronto",
    "vancouver",
    "montreal",
  ],

  "United Kingdom": [
    "united kingdom",
    "uk",
    "u.k.",
    "britain",
    "british",
    "england",
    "scotland",
    "wales",
    "london",
  ],

  UAE: [
    "united arab emirates",
    "uae",
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

const DEMAND_SIGNALS = [
  "looking for",
  "need a",
  "need an",
  "need someone",
  "seeking",
  "wanted",
  "recommend a",
  "looking to hire",
  "client needs",
  "help needed",
  "assistance needed",
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
  "teaching",
  "tutor",
  "tutoring",
  "coach",
  "coaching",
  "consultant",
  "consulting",
  "freelancer",
  "freelance",
  "designer",
  "developer",
  "programmer",
  "writer",
  "copywriter",
  "researcher",
  "author",
  "virtual assistant",
  "trainer",
  "educator",
  "instructor",
  "accountant",
  "bookkeeper",
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
  "applications",

  "course",
  "courses",
  "online course",
  "webinar",
  "webinars",
  "seminar",
  "seminars",

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

  "encyclopedia",
  "wiki",

  "podcast",
  "podcasts",

  "school",
  "schools",
  "academy",
  "academies",
  "university",
  "universities",
  "college",
  "colleges",
  "institute",
  "institutes",

  "admissions",
  "admission",
  "join us",
  "join our team",
  "join the team",
  "benefits of becoming",
  "become a teacher",
  "becoming a teacher",
  "teacher benefits",
  "career in teaching",

  "faculty",
  "staff directory",
  "faculty directory",
  "teacher directory",
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

  return terms.some(
    (term) =>
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
      matches.map(
        (email) =>
          email
            .trim()
            .toLowerCase()
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
        .map(
          (phone) =>
            phone
              .replace(
                /\s+/g,
                " "
              )
              .trim()
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

function getSearchText(
  result: SearchResult
): string {
  return [
    result.title,
    result.snippet,
    result.link,
    result.date,
  ]
    .filter(Boolean)
    .join(" ");
}

function detectCountry(
  text: string
): string | undefined {
  const normalized =
    normalize(text);

  for (
    const [
      country,
      aliases,
    ] of Object.entries(
      COUNTRY_ALIASES
    )
  ) {
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

  for (
    const skill of skills
  ) {
    const candidates = [
      skill.name,
      skill.category,
      skill.subcategory,
    ].filter(Boolean) as string[];

    const tags =
      Array.isArray(skill.tags)
        ? skill.tags
        : typeof skill.tags === "string"
        ? skill.tags.split(",")
        : [];

    candidates.push(
      ...tags
    );

    if (
      candidates.some(
        (candidate) =>
          normalize(candidate) &&
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
        "career coach",
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
        "graphic design",
        "ui designer",
        "ux designer",
        "ui/ux",
        "user interface",
        "user experience",
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
        "marketer",
        "marketing",
        "digital marketing",
        "social media marketing",
        "seo",
        "search engine optimization",
      ],
      name: "Marketing",
    },

    {
      match: [
        "virtual assistant",
        "virtual assistance",
        "virtual admin",
        "remote assistant",
      ],
      name: "Virtual Assistant",
    },

    {
      match: [
        "sociology",
        "sociologist",
        "social research",
        "social science",
      ],
      name: "Sociology",
    },

    {
      match: [
        "psychology",
        "psychologist",
        "psychological",
      ],
      name: "Psychology",
    },

    {
      match: [
        "anthropology",
        "anthropologist",
        "ethnography",
      ],
      name: "Anthropology",
    },

    {
      match: [
        "economics",
        "economist",
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

  for (
    const group of expandedSkillGroups
  ) {
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
            normalize(skill.name) ===
            normalize(group.name)
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

function extractContactLinks(
  html: string,
  baseUrl: string
): string[] {
  const links: string[] = [];

  const pattern =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;

  const contactTerms = [
    "contact",
    "contact-us",
    "get-in-touch",
    "reach-us",
    "about",
  ];

  let match:
    | RegExpExecArray
    | null;

  while (
    (match =
      pattern.exec(html)) !== null
  ) {
    const href =
      match[1] || "";

    const normalizedHref =
      href.toLowerCase();

    if (
      !contactTerms.some(
        (term) =>
          normalizedHref.includes(
            term
          )
      )
    ) {
      continue;
    }

    try {
      const absolute =
        new URL(
          href,
          baseUrl
        ).toString();

      if (
        !links.includes(
          absolute
        )
      ) {
        links.push(
          absolute
        );
      }
    } catch {
      continue;
    }
  }

  return links;
}

function isSocialOrProfileUrl(
  url?: string
): boolean {
  const normalized =
    normalize(url);

  return (
    normalized.includes(
      "linkedin.com/"
    ) ||
    normalized.includes(
      "facebook.com/"
    ) ||
    normalized.includes(
      "instagram.com/"
    ) ||
    normalized.includes(
      "x.com/"
    ) ||
    normalized.includes(
      "twitter.com/"
    ) ||
    normalized.includes(
      "threads.net/"
    )
  );
    }
function isLinkedInPersonProfile(
  url?: string
): boolean {
  if (!url) return false;

  const normalized =
    url.toLowerCase();

  return (
    normalized.includes(
      "linkedin.com/in/"
    ) &&
    !normalized.includes(
      "/company/"
    ) &&
    !normalized.includes(
      "/jobs/"
    ) &&
    !normalized.includes(
      "/feed/"
    ) &&
    !normalized.includes(
      "/posts/"
    )
  );
}

function isFacebookPersonProfile(
  url?: string
): boolean {
  if (!url) return false;

  const normalized =
    url.toLowerCase();

  if (
    !normalized.includes(
      "facebook.com/"
    )
  ) {
    return false;
  }

  return (
    !normalized.includes(
      "/groups/"
    ) &&
    !normalized.includes(
      "/pages/"
    ) &&
    !normalized.includes(
      "/events/"
    ) &&
    !normalized.includes(
      "/marketplace/"
    ) &&
    !normalized.includes(
      "/watch/"
    ) &&
    !normalized.includes(
      "/jobs/"
    )
  );
}

function isInstagramPersonProfile(
  url?: string
): boolean {
  if (!url) return false;

  const normalized =
    url.toLowerCase();

  if (
    !normalized.includes(
      "instagram.com/"
    )
  ) {
    return false;
  }

  return !normalized.includes(
    "/explore/"
  );
}

function isXPersonProfile(
  url?: string
): boolean {
  if (!url) return false;

  const normalized =
    url.toLowerCase();

  return (
    normalized.includes(
      "x.com/"
    ) ||
    normalized.includes(
      "twitter.com/"
    )
  ) && 
    !normalized.includes(
      "/search"
    ) &&
    !normalized.includes(
      "/hashtag/"
    ) &&
    !normalized.includes(
      "/i/"
    );
}

function isThreadsPersonProfile(
  url?: string
): boolean {
  if (!url) return false;

  const normalized =
    url.toLowerCase();

  return (
    normalized.includes(
      "threads.net/@"
    ) ||
    normalized.includes(
      "threads.com/@"
    )
  );
}

function isDirectSocialProfile(
  url?: string
): boolean {
  return (
    isLinkedInPersonProfile(url) ||
    isFacebookPersonProfile(url) ||
    isInstagramPersonProfile(url) ||
    isXPersonProfile(url) ||
    isThreadsPersonProfile(url)
  );
}

function extractPersonName(
  result: SearchResult
): string | undefined {
  const title =
    cleanText(
      result.title
    );

  if (!title) {
    return undefined;
  }

  const patterns = [
    /^(.+?)['’]s\s+(?:post|profile|page)\b/i,
    /^(.+?)\s*[-|]\s*(?:linkedin|facebook|instagram|x|twitter|threads)\b/i,
    /^(?:profile|about)\s*[-|]\s*(.+)$/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      title.match(pattern);

    if (
      match &&
      match[1]
    ) {
      const name =
        cleanText(
          match[1]
        );

      if (
        hasLikelyPersonName(
          name
        )
      ) {
        return name;
      }
    }
  }

  return undefined;
}

function hasLikelyPersonName(
  value?: string
): boolean {
  if (!value) {
    return false;
  }

  const cleaned =
    cleanText(value);

  if (
    cleaned.length < 4 ||
    cleaned.length > 100
  ) {
    return false;
  }

  const blocked = [
    "teachers net",
    "teacher resources",
    "education resources",
    "professional coach",
    "career coaching",
    "life coaching",
    "online tutoring",
    "tutoring services",
    "freelance services",
    "job opening",
    "job openings",
    "hiring now",
    "company",
    "official",
    "homepage",
    "contact us",
    "about us",
  ];

  if (
    blocked.some(
      (term) =>
        normalize(cleaned) ===
        normalize(term)
    )
  ) {
    return false;
  }

  const words =
    cleaned
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length < 2 ||
    words.length > 5
  ) {
    return false;
  }

  const validWords =
    words.filter(
      (word) =>
        /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]+$/.test(
          word
        )
    );

  return (
    validWords.length >= 2
  );
}

function isSaasProfessional(
  result: SearchResult,
  text: string
): boolean {
  const normalized =
    normalize(text);

  const professionalMatch =
    containsAny(
      normalized,
      PROFESSIONAL_TERMS
    );

  if (
    !professionalMatch
  ) {
    return false;
  }

  if (
    containsAny(
      normalized,
      SAAS_REJECT_TERMS
    )
  ) {
    return false;
  }

  return true;
}

function isIndividualSaasProfile(
  result: SearchResult
): boolean {
  const text =
    getSearchText(
      result
    );

  if (
    !isSaasProfessional(
      result,
      text
    )
  ) {
    return false;
  }

  const directProfile =
    isDirectSocialProfile(
      result.link
    );

  const linkedinProfile =
    isLinkedInPersonProfile(
      result.link
    );

  const extractedName =
    extractPersonName(
      result
    );

  return (
    directProfile ||
    linkedinProfile ||
    !!extractedName
  );
}
async function getDirectContact(
  result: SearchResult
): Promise<ContactInfo> {
  const contact: ContactInfo = {};

  const searchText =
    getSearchText(result);

  const emails =
    extractEmails(
      searchText
    );

  const phones =
    extractPhones(
      searchText
    );

  if (emails.length > 0) {
    contact.email =
      emails[0];
  }

  if (phones.length > 0) {
    contact.phone =
      phones[0];
  }

  if (
    result.link &&
    isDirectSocialProfile(
      result.link
    )
  ) {
    contact.url =
      result.link;
  }

  return contact;
}

async function improveContact(
  result: SearchResult
): Promise<ContactInfo> {
  const contact =
    await getDirectContact(
      result
    );

  /*
   * A direct individual social/profile URL
   * is already a valid contact path.
   */
  if (
    contact.url ||
    contact.email ||
    contact.phone
  ) {
    return contact;
  }

  if (!result.link) {
    return contact;
  }

  try {
    const response =
      await fetch(
        result.link,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; OpportunityHubLeadCollector/1.0)",
            Accept:
              "text/html,application/xhtml+xml",
          },
          redirect:
            "follow",
        }
      );

    if (!response.ok) {
      return contact;
    }

    const html =
      await response.text();

    const emails =
      extractEmails(
        html
      );

    const phones =
      extractPhones(
        html
      );

    if (
      emails.length > 0 &&
      !contact.email
    ) {
      contact.email =
        emails[0];
    }

    if (
      phones.length > 0 &&
      !contact.phone
    ) {
      contact.phone =
        phones[0];
    }

    const contactLinks =
      extractContactLinks(
        html,
        result.link
      );

    if (
      contactLinks.length > 0 &&
      !contact.url
    ) {
      contact.url =
        contactLinks[0];
    }
  } catch {
    /*
     * Some public pages block server-side requests.
     * The search result itself may still provide
     * a valid direct profile/contact path.
     */
  }

  return contact;
}

function buildSkillSearchTerms(
  skills: SkillRow[]
): string[] {
  const terms =
    new Set<string>();

  for (
    const skill of skills
  ) {
    if (skill.name) {
      terms.add(
        skill.name
      );
    }

    if (skill.category) {
      terms.add(
        skill.category
      );
    }

    if (skill.subcategory) {
      terms.add(
        skill.subcategory
      );
    }

    if (
      typeof skill.tags ===
      "string"
    ) {
      skill.tags
        .split(",")
        .map(
          (value) =>
            value.trim()
        )
        .filter(Boolean)
        .forEach(
          (value) =>
            terms.add(value)
        );
    }

    if (
      Array.isArray(
        skill.tags
      )
    ) {
      skill.tags
        .filter(Boolean)
        .forEach(
          (value) =>
            terms.add(value)
        );
    }
  }

  /*
   * These are search synonyms only.
   * They do not change the actual skill stored
   * against an accepted lead.
   */
  const synonymGroups = [
    {
      base: [
        "quran",
        "tajweed",
        "tajwid",
        "qirat",
        "qiraat",
        "hifz",
        "tafseer",
        "tafsir",
      ],
      synonyms: [
        "Quran teacher",
        "Quran tutor",
        "Islamic teacher",
        "Islamic tutor",
        "Quran instructor",
      ],
    },

    {
      base: [
        "teaching",
        "teacher",
        "education",
        "educator",
        "tutor",
      ],
      synonyms: [
        "teacher",
        "tutor",
        "educator",
        "instructor",
        "teaching professional",
      ],
    },

    {
      base: [
        "coaching",
        "coach",
        "mentor",
        "mentoring",
      ],
      synonyms: [
        "coach",
        "professional coach",
        "mentor",
        "career coach",
        "life coach",
        "business coach",
      ],
    },

    {
      base: [
        "freelancing",
        "freelance",
        "freelancer",
      ],
      synonyms: [
        "freelancer",
        "freelance professional",
        "independent professional",
      ],
    },

    {
      base: [
        "development",
        "developer",
        "programming",
      ],
      synonyms: [
        "developer",
        "software developer",
        "web developer",
        "programmer",
      ],
    },

    {
      base: [
        "design",
        "designer",
      ],
      synonyms: [
        "designer",
        "graphic designer",
        "web designer",
        "UI designer",
        "UX designer",
      ],
    },

    {
      base: [
        "writing",
        "writer",
        "copywriting",
      ],
      synonyms: [
        "writer",
        "content writer",
        "copywriter",
        "freelance writer",
      ],
    },

    {
      base: [
        "marketing",
        "marketer",
      ],
      synonyms: [
        "marketer",
        "digital marketer",
        "marketing professional",
        "SEO professional",
      ],
    },

    {
      base: [
        "accounting",
        "accountant",
        "bookkeeping",
      ],
      synonyms: [
        "accountant",
        "bookkeeper",
        "accounting professional",
      ],
    },

    {
      base: [
        "virtual assistant",
        "virtual assistance",
      ],
      synonyms: [
        "virtual assistant",
        "remote assistant",
        "virtual admin",
      ],
    },
  ];

  for (
    const group of synonymGroups
  ) {
    const matched =
      group.base.some(
        (base) =>
          [...terms].some(
            (term) =>
              normalize(
                term
              ).includes(
                normalize(
                  base
                )
              ) ||
              normalize(
                base
              ).includes(
                normalize(
                  term
                )
              )
          )
      );

    if (matched) {
      group.synonyms.forEach(
        (synonym) =>
          terms.add(
            synonym
          )
      );
    }
  }

  return [
    ...terms,
  ]
    .map(
      (value) =>
        cleanText(value)
    )
    .filter(Boolean)
    .slice(
      0,
      30
    );
      }
function buildQueries(
  type: LeadType,
  skills: SkillRow[]
): string[] {
  const skillTerms =
    buildSkillSearchTerms(
      skills
    );

  if (
    skillTerms.length === 0
  ) {
    return [];
  }

  const queries: string[] = [];

  if (type === "Demand") {
    for (
      const skill of skillTerms
    ) {
      queries.push(
        `"${skill}" ("looking for" OR "need a" OR "need someone" OR "seeking" OR "wanted" OR "recommend a" OR "looking to hire")`
      );
    }
  }

  if (type === "Supply") {
    for (
      const skill of skillTerms
    ) {
      queries.push(
        `"${skill}" ("hiring" OR "we are hiring" OR "job opening" OR "vacancy" OR "position available" OR "applications open" OR "recruiting")`
      );
    }
  }

  if (type === "SaaS") {
    for (
      const skill of skillTerms
    ) {
      queries.push(
        `"${skill}" ("teacher" OR "tutor" OR "coach" OR "consultant" OR "mentor") ("LinkedIn" OR "professional profile" OR "profile")`
      );
    }
  }

  return [
    ...new Set(
      queries
    ),
  ].slice(
    0,
    MAX_QUERIES_PER_TYPE
  );
}

async function searchSerper(
  query: string,
  type: LeadType
): Promise<SearchResult[]> {
  if (
    !SERPER_API_KEY
  ) {
    throw new Error(
      "SERPER_API_KEY is not configured."
    );
  }

  const body: Record<
    string,
    unknown
  > = {
    q: query,
    num: RESULTS_PER_SEARCH,
  };

  if (
    type === "Demand" ||
    type === "Supply"
  ) {
    body.tbs =
      "qdr:d3";
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
        body:
          JSON.stringify(
            body
          ),
      }
    );

  const raw =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Serper request failed: ${response.status} ${raw}`
    );
  }

  let data: {
    organic?: SearchResult[];
  };

  try {
    data =
      JSON.parse(raw);
  } catch {
    throw new Error(
      "Serper returned invalid JSON."
    );
  }

  return Array.isArray(
    data.organic
  )
    ? data.organic
    : [];
}

/*
 * Free fallback.
 *
 * We deliberately keep this separate from the Serper
 * function so the existing paid search path remains
 * untouched when Serper credits are available.
 */
async function searchPublicWeb(
  query: string
): Promise<SearchResult[]> {
  const encoded =
    encodeURIComponent(
      query
    );

  const endpoints = [
    `https://www.google.com/search?q=${encoded}&num=${RESULTS_PER_SEARCH}`,
    `https://www.google.com/search?q=${encoded}&num=${RESULTS_PER_SEARCH}&filter=0`,
  ];

  for (
    const endpoint of endpoints
  ) {
    try {
      const response =
        await fetch(
          endpoint,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
              Accept:
                "text/html,application/xhtml+xml",
              "Accept-Language":
                "en-US,en;q=0.9",
            },
            redirect:
              "follow",
          }
        );

      if (!response.ok) {
        continue;
      }

      const html =
        await response.text();

      const results =
        parseGoogleResults(
          html
        );

      if (
        results.length > 0
      ) {
        return results;
      }
    } catch {
      continue;
    }
  }

  return [];
}

function decodeHtml(
  value: string
): string {
  return value
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
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
      /&#x27;/gi,
      "'"
    )
    .replace(
      /&#x2F;/gi,
      "/"
    );
}

function stripHtml(
  value: string
): string {
  return decodeHtml(
    value
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
  );
}
function parseGoogleResults(
  html: string
): SearchResult[] {
  const results: SearchResult[] =
    [];

  const anchorPattern =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match:
    | RegExpExecArray
    | null;

  while (
    (match =
      anchorPattern.exec(
        html
      )) !== null
  ) {
    const rawHref =
      decodeHtml(
        match[1] || ""
      );

    const anchorHtml =
      match[2] || "";

    if (!rawHref) {
      continue;
    }

    let url =
      rawHref;

    if (
      url.startsWith(
        "/url?"
      )
    ) {
      try {
        const parsed =
          new URL(
            `https://www.google.com${url}`
          );

        url =
          parsed.searchParams.get(
            "q"
          ) ||
          parsed.searchParams.get(
            "url"
          ) ||
          "";
      } catch {
        continue;
      }
    }

    if (
      !url.startsWith(
        "http://"
      ) &&
      !url.startsWith(
        "https://"
      )
    ) {
      continue;
    }

    if (
      url.includes(
        "google.com/search"
      ) ||
      url.includes(
        "google.com/preferences"
      ) ||
      url.includes(
        "google.com/accounts"
      )
    ) {
      continue;
    }

    const title =
      cleanText(
        stripHtml(
          anchorHtml
        )
      );

    if (
      !title ||
      title.length < 3
    ) {
      continue;
    }

    /*
     * Capture the surrounding Google result text.
     * This gives the collector access to the actual
     * search-result context, not just the title.
     */
    const anchorStart =
      match.index;

    const surroundingStart =
      Math.max(
        0,
        anchorStart - 500
      );

    const surroundingEnd =
      Math.min(
        html.length,
        anchorStart +
          match[0].length +
          2500
      );

    const surroundingHtml =
      html.slice(
        surroundingStart,
        surroundingEnd
      );

    const surroundingText =
      cleanText(
        stripHtml(
          surroundingHtml
        )
      );

    let snippet =
      surroundingText;

    if (
      title &&
      snippet
        .toLowerCase()
        .startsWith(
          title.toLowerCase()
        )
    ) {
      snippet =
        snippet
          .slice(
            title.length
          )
          .trim();
    }

    if (
      snippet.length >
      1500
    ) {
      snippet =
        snippet.slice(
          0,
          1500
        );
    }

    const result: SearchResult = {
      title,
      link: url,
      snippet:
        snippet ||
        title,
    };

    const duplicate =
      results.some(
        (item) =>
          item.link ===
          result.link
      );

    if (
      duplicate
    ) {
      continue;
    }

    results.push(
      result
    );

    if (
      results.length >=
      RESULTS_PER_SEARCH
    ) {
      break;
    }
  }

  return results;
    }

async function searchWithFallback(
  query: string,
  type: LeadType
): Promise<SearchResult[]> {
  /*
   * Serper remains the first choice.
   */
  if (
    SERPER_API_KEY
  ) {
    try {
      return await searchSerper(
        query,
        type
      );
    } catch {
      /*
       * Important:
       * Do NOT throw here.
       *
       * A missing/out-of-credit Serper account
       * should not stop the entire lead collector.
       */
    }
  }

  /*
   * Free fallback.
   */
  return await searchPublicWeb(
    query
  );
    }
function resultMatchesType(
  result: SearchResult,
  type: LeadType
): boolean {
  const text =
    getSearchText(
      result
    );

  if (type === "SaaS") {
    return isIndividualSaasProfile(
      result
    );
  }

  if (type === "Demand") {
    return containsAny(
      text,
      [
        ...DEMAND_SIGNALS,
        "client needs",
        "help needed",
        "assistance needed",
        "looking for someone",
        "need help",
        "need a teacher",
        "need a tutor",
        "need a coach",
        "seeking a teacher",
        "seeking a tutor",
      ]
    );
  }

  return containsAny(
    text,
    [
      ...SUPPLY_SIGNALS,
      "hiring for",
      "we're hiring",
      "we are looking for",
      "join our team",
      "open position",
      "open positions",
      "employment opportunity",
      "career opportunity",
    ]
  );
}

async function loadSkills(
  supabase: ReturnType<
    typeof createSupabase
  >
): Promise<SkillRow[]> {
  const {
    data,
    error,
  } = await supabase
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
    throw new Error(
      `Could not load skills: ${error.message}`
    );
  }

  return Array.isArray(data)
    ? data
        .filter(
          (row) =>
            row &&
            typeof row.name ===
              "string" &&
            row.name.trim()
        )
        .map(
          (row) =>
            row as SkillRow
        )
    : [];
}

function leadInsertPayload(
  lead: CollectedLead
): Record<
  string,
  unknown
> {
  if (
    lead.leadType ===
    "SaaS"
  ) {
    return {
      name:
        lead.name ||
        lead.contactName ||
        lead.title,

      platform:
        "Opportunity Hub",

      nich:
        lead.skill ||
        lead.category ||
        "Professional",

      contect:
        lead.contactEmail ||
        lead.contactPhone ||
        lead.contactUrl ||
        null,

      status:
        "active",

      description:
        lead.description ||
        lead.title,

      commission:
        null,

      trial_days:
        null,

      landing_url:
        lead.contactUrl ||
        lead.source,

      source_url:
        lead.source,

      contect_url:
        lead.contactUrl ||
        null,

      country:
        lead.country ||
        null,

      city:
        lead.city ||
        null,
    };
  }

  return {
    source:
      lead.source,

    name:
      lead.name ||
      lead.contactName ||
      null,

    skill_needed:
      lead.skill ||
      null,

    description:
      lead.description ||
      lead.title,

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
      lead.createdAt ||
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

  if (
    lead.leadType ===
    "SaaS"
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(table)
      .select("id")
      .eq(
        "source_url",
        lead.source
      )
      .limit(1);

    if (error) {
      throw new Error(
        `Duplicate check failed: ${error.message}`
      );
    }

    return (
      Array.isArray(data) &&
      data.length > 0
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(table)
    .select("id")
    .eq(
      "source",
      lead.source
    )
    .limit(1);

  if (error) {
    throw new Error(
      `Duplicate check failed: ${error.message}`
    );
  }

  return (
    Array.isArray(data) &&
    data.length > 0
  );
}
async function processResult(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<CollectedLead | null> {
  stats.found += 1;

  const link =
    cleanText(
      result.link
    );

  if (!link) {
    stats.blocked += 1;
    return null;
  }

  if (
    isBlockedDomain(link)
  ) {
    stats.blocked += 1;
    return null;
  }

  /*
   * Reject generic/category/search pages for SaaS.
   * A professional must lead to an actual profile
   * or a direct professional page.
   */
  if (
    type === "SaaS"
  ) {
    const lowerUrl =
      link.toLowerCase();

    if (
      SAAS_BLOCKED_PATHS.some(
        (path) =>
          lowerUrl.includes(
            path
          )
      )
    ) {
      stats.blocked += 1;
      return null;
    }
  }

  /*
   * Demand and Supply must be recent.
   * SaaS is intentionally not restricted by the
   * 72-hour freshness rule.
   */
  if (
    type === "Demand" ||
    type === "Supply"
  ) {
    if (
      !isFresh(result)
    ) {
      stats.stale += 1;
      return null;
    }
  }

  if (
    !resultMatchesType(
      result,
      type
    )
  ) {
    stats.wrongType += 1;
    return null;
  }

  const searchText =
    getSearchText(
      result
    );

  const matchedSkill =
    detectSkill(
      searchText,
      skills
    );

  if (!matchedSkill) {
    stats.noSkillMatch += 1;
    return null;
  }

  if (
    type === "SaaS" &&
    !isIndividualSaasProfile(
      result
    )
  ) {
    stats.wrongType += 1;
    return null;
  }

  const contact =
    await improveContact(
      result
    );

  /*
   * Gold rule:
   * every accepted lead needs a real direct
   * contact path.
   */
  if (
    !contact.email &&
    !contact.phone &&
    !contact.url
  ) {
    stats.noContact += 1;
    return null;
  }

  const title =
    cleanText(
      result.title
    );

  if (!title) {
    stats.blocked += 1;
    return null;
  }

  const extractedName =
    extractPersonName(
      result
    );

  const name =
    extractedName ||
    undefined;

  if (
    type === "SaaS" &&
    !hasLikelyPersonName(
      name
    )
  ) {
    stats.wrongType += 1;
    return null;
  }

  const country =
    detectCountry(
      searchText
    );

  if (!country) {
    stats.wrongType += 1;
    return null;
  }

  const description =
    cleanText(
      result.snippet ||
        searchText
    );

  const source =
    link;

  stats.accepted += 1;

  return {
    leadType:
      type,

    source,

    title,

    name,

    description,

    skill:
      matchedSkill.name,

    category:
      matchedSkill.category ||
      undefined,

    subcategory:
      matchedSkill.subcategory ||
      undefined,

    country,

    contactEmail:
      contact.email,

    contactPhone:
      contact.phone,

    contactName:
      name,

    contactUrl:
      contact.url,

    createdAt:
      parseResultDate(
        result
      )?.toISOString() ||
      new Date().toISOString(),
  };
}

async function collectLeadsForType(
  supabase: ReturnType<
    typeof createSupabase
  >,
  type: LeadType,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<number> {
  const queries =
    buildQueries(
      type,
      skills
    );

  if (
    queries.length === 0
  ) {
    return 0;
  }

  let inserted = 0;

  for (
    const query of queries
  ) {
    let results: SearchResult[] =
      [];

    try {
      results =
        await searchWithFallback(
          query,
          type
        );
    } catch {
      /*
       * One failed query must never turn the
       * entire API response into non-JSON.
       */
      continue;
    }

    for (
      const result of results
    ) {
      try {
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

        const exists =
          await leadAlreadyExists(
            supabase,
            lead
          );

        if (exists) {
          stats.duplicate += 1;
          continue;
        }

        const table =
          tableForType(
            type
          );

        const payload =
          leadInsertPayload(
            lead
          );

        const {
          error,
        } = await supabase
          .from(table)
          .insert(
            payload
          );

        if (error) {
          stats.insertErrors += 1;
          stats.lastInsertError =
            error.message;
          continue;
        }

        stats.inserted += 1;
        inserted += 1;
      } catch (error) {
        stats.insertErrors += 1;

        stats.lastInsertError =
          error instanceof Error
            ? error.message
            : String(error);
      }
    }
  }

  return inserted;
      }
function getBearerToken(
  req: VercelRequest
): string | null {
  const authorization =
    req.headers.authorization;

  if (
    typeof authorization !==
    "string"
  ) {
    return null;
  }

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return null;
  }

  const token =
    authorization
      .slice(7)
      .trim();

  return token || null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /*
   * Always return JSON.
   * This prevents the old:
   * "Unexpected token 'A'..."
   * frontend error when the server sends
   * plain-text errors.
   */
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  if (
    req.method !== "POST"
  ) {
    return res
      .status(405)
      .json({
        success: false,
        ok: false,
        error:
          "Method not allowed. Use POST.",
        insertedByType: {
          Demand: 0,
          Supply: 0,
          SaaS: 0,
        },
        totalInserted: 0,
      });
  }

  try {
    const supabase =
      createSupabase();

    const token =
      getBearerToken(req);

    if (!token) {
      return res
        .status(401)
        .json({
          success: false,
          ok: false,
          error:
            "Authentication token is required.",
          insertedByType: {
            Demand: 0,
            Supply: 0,
            SaaS: 0,
          },
          totalInserted: 0,
        });
    }

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser(
        token
      );

    if (
      userError ||
      !userData.user
    ) {
      return res
        .status(401)
        .json({
          success: false,
          ok: false,
          error:
            "Invalid or expired authentication token.",
          insertedByType: {
            Demand: 0,
            Supply: 0,
            SaaS: 0,
          },
          totalInserted: 0,
        });
    }

    const skills =
      await loadSkills(
        supabase
      );

    const stats =
      emptyStats();

    const insertedByType = {
      Demand: 0,
      Supply: 0,
      SaaS: 0,
    };

    const leadTypes: LeadType[] =
      [
        "Demand",
        "Supply",
        "SaaS",
      ];

    for (
      const type of leadTypes
    ) {
      insertedByType[type] =
        await collectLeadsForType(
          supabase,
          type,
          skills,
          stats
        );
    }

    const totalInserted =
      insertedByType.Demand +
      insertedByType.Supply +
      insertedByType.SaaS;

    return res
      .status(200)
      .json({
        success: true,
        ok: true,
        insertedByType,
        totalInserted,
        stats,
      });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return res
      .status(500)
      .json({
        success: false,
        ok: false,
        error: message,
        insertedByType: {
          Demand: 0,
          Supply: 0,
          SaaS: 0,
        },
        totalInserted: 0,
        stats: emptyStats(),
      });
  }
}
