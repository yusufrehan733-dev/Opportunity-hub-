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

const SAAS_BLOCKED_PATHS = [
  "/company/",
  "/school/",
  "/schools/",
  "/jobs/",
  "/job/",
  "/search",
  "/feed/",
  "/learning/",
  "/events/",
  "/groups/",
  "/group/",
  "/pages/",
  "/marketplace/",
  "/category/",
  "/categories/",
  "/tag/",
  "/tags/",
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
  "/courses/",
  "/course/",
  "/webinar/",
  "/webinars/",
  "/seminar/",
  "/seminars/",
  "/pricing/",
  "/product/",
  "/products/",
  "/shop/",
  "/store/",
  "/books/",
  "/book/",
  "/ebook/",
  "/download/",
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
        .map((phone) =>
          phone
            .replace(/\s+/g, " ")
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
  if (!url) {
    return false;
  }

  try {
    const parsed =
      new URL(url);

    const host =
      parsed.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    if (
      host !==
      "linkedin.com"
    ) {
      return false;
    }

    const path =
      parsed.pathname
        .toLowerCase()
        .replace(
          /\/+/g,
          "/"
        );

    if (
      !path.startsWith(
        "/in/"
      )
    ) {
      return false;
    }

    const slug =
      path
        .replace(
          /^\/in\//,
          ""
        )
        .replace(
          /\/$/,
          ""
        );

    if (!slug) {
      return false;
    }

    const blockedSlugTerms = [
      "search",
      "jobs",
      "company",
      "school",
      "learning",
      "feed",
      "groups",
      "events",
      "directory",
    ];

    return !blockedSlugTerms.some(
      (term) =>
        slug.includes(term)
    );
  } catch {
    return false;
  }
}

function isFacebookPersonProfile(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed =
      new URL(url);

    const host =
      parsed.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    if (
      host !==
      "facebook.com"
    ) {
      return false;
    }

    const path =
      parsed.pathname
        .toLowerCase()
        .replace(
          /\/+/g,
          "/"
        );

    if (
      !path ||
      path === "/"
    ) {
      return false;
    }

    const blocked = [
      "/pages/",
      "/groups/",
      "/events/",
      "/marketplace/",
      "/watch/",
      "/search/",
      "/gaming/",
      "/reel/",
      "/reels/",
    ];

    if (
      blocked.some(
        (item) =>
          path.startsWith(item)
      )
    ) {
      return false;
    }

    const firstPart =
      path
        .split("/")
        .filter(Boolean)[0] ||
      "";

    const blockedNames = [
      "pages",
      "groups",
      "events",
      "marketplace",
      "watch",
      "search",
      "gaming",
      "reel",
      "reels",
      "login",
      "share",
    ];

    return (
      firstPart.length > 1 &&
      !blockedNames.includes(
        firstPart
      )
    );
  } catch {
    return false;
  }
}

function isInstagramPersonProfile(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed =
      new URL(url);

    const host =
      parsed.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    if (
      host !==
      "instagram.com"
    ) {
      return false;
    }

    const path =
      parsed.pathname
        .toLowerCase()
        .replace(
          /\/+/g,
          "/"
        );

    const parts =
      path
        .split("/")
        .filter(Boolean);

    if (
      parts.length !== 1
    ) {
      return false;
    }

    const username =
      parts[0];

    const blockedNames = [
      "explore",
      "accounts",
      "direct",
      "reels",
      "stories",
      "p",
      "about",
      "developer",
      "privacy",
      "terms",
    ];

    return (
      username.length > 1 &&
      !blockedNames.includes(
        username
      )
    );
  } catch {
    return false;
  }
}

function isXPersonProfile(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed =
      new URL(url);

    const host =
      parsed.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    if (
      host !==
        "x.com" &&
      host !==
        "twitter.com"
    ) {
      return false;
    }

    const parts =
      parsed.pathname
        .split("/")
        .filter(Boolean);

    if (
      parts.length !== 1
    ) {
      return false;
    }

    const username =
      parts[0].toLowerCase();

    const blockedNames = [
      "search",
      "explore",
      "home",
      "notifications",
      "messages",
      "settings",
      "i",
      "compose",
      "intent",
    ];

    return (
      username.length > 1 &&
      !blockedNames.includes(
        username
      )
    );
  } catch {
    return false;
  }
}

function isThreadsPersonProfile(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed =
      new URL(url);

    const host =
      parsed.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    if (
      host !==
      "threads.net"
    ) {
      return false;
    }

    const parts =
      parsed.pathname
        .split("/")
        .filter(Boolean);

    if (
      parts.length !== 2 ||
      parts[0] !==
        "@"
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isDirectSocialProfile(
  url?: string
): boolean {
  return (
    isLinkedInPersonProfile(
      url
    ) ||
    isFacebookPersonProfile(
      url
    ) ||
    isInstagramPersonProfile(
      url
    ) ||
    isXPersonProfile(
      url
    ) ||
    isThreadsPersonProfile(
      url
    )
  );
    }
function extractPersonName(
  text: string
): string | undefined {
  const cleaned =
    cleanText(text);

  const patterns = [
    /^([A-ZÀ-Ý][a-zà-ÿ'’-]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ'’-]+){1,3})\s*[-|–—]/,

    /^([A-ZÀ-Ý][a-zà-ÿ'’-]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ'’-]+){1,3})['’]s\s+(?:Post|Profile)/i,

    /^([A-ZÀ-Ý][a-zà-ÿ'’-]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ'’-]+){1,3})\s+(?:is|as)\s+/i,
  ];

  const genericTerms =
    new Set([
      ...PROFESSIONAL_TERMS,

      "professional",
      "profile",
      "linkedin",
      "facebook",
      "instagram",
      "twitter",
      "threads",
      "post",

      "teacher",
      "teaching",
      "tutor",
      "coach",
      "mentor",
      "consultant",
      "designer",
      "developer",
      "writer",
      "researcher",
      "author",
      "educator",
      "instructor",
    ]);

  for (
    const pattern of patterns
  ) {
    const match =
      cleaned.match(
        pattern
      );

    if (
      !match?.[1]
    ) {
      continue;
    }

    const candidate =
      cleanText(
        match[1]
      );

    const words =
      candidate.split(
        /\s+/
      );

    if (
      words.length < 2 ||
      words.length > 4
    ) {
      continue;
    }

    if (
      words.some(
        (word) =>
          genericTerms.has(
            normalize(
              word
            )
          )
      )
    ) {
      continue;
    }

    return candidate;
  }

  const words =
    cleaned
      .replace(
        /[^A-Za-zÀ-ÿ'’-]+/g,
        " "
      )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  for (
    let i = 0;
    i < words.length - 1;
    i++
  ) {
    const first =
      words[i];

    const second =
      words[i + 1];

    if (
      !/^[A-ZÀ-Ý][a-zà-ÿ'’-]+$/.test(
        first
      ) ||
      !/^[A-ZÀ-Ý][a-zà-ÿ'’-]+$/.test(
        second
      )
    ) {
      continue;
    }

    if (
      genericTerms.has(
        normalize(first)
      ) ||
      genericTerms.has(
        normalize(second)
      )
    ) {
      continue;
    }

    return `${first} ${second}`;
  }

  return undefined;
}

function hasLikelyPersonName(
  result: SearchResult
): boolean {
  const title =
    cleanText(
      result.title
    );

  const snippet =
    cleanText(
      result.snippet
    );

  const combined =
    `${title} ${snippet}`;

  const personName =
    extractPersonName(
      combined
    );

  return Boolean(
    personName
  );
}

function isSaasProfessional(
  text: string
): boolean {
  return containsAny(
    text,
    PROFESSIONAL_TERMS
  );
}

function isIndividualSaasProfile(
  result: SearchResult
): boolean {
  const text =
    getSearchText(
      result
    );

  const normalized =
    normalize(text);

  const url =
    result.link || "";

  if (!url) {
    return false;
  }

  if (
    isBlockedDomain(url)
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

  const lowerUrl =
    url.toLowerCase();

  if (
    SAAS_BLOCKED_PATHS.some(
      (path) =>
        lowerUrl.includes(
          path
        )
    )
  ) {
    return false;
  }

  if (
    normalized.includes(
      "join us"
    ) ||
    normalized.includes(
      "join our team"
    ) ||
    normalized.includes(
      "benefits of becoming"
    ) ||
    normalized.includes(
      "become a teacher"
    ) ||
    normalized.includes(
      "teacher benefits"
    ) ||
    normalized.includes(
      "career in teaching"
    )
  ) {
    return false;
  }

  if (
    !isSaasProfessional(
      text
    )
  ) {
    return false;
  }

  const isSocial =
    isSocialOrProfileUrl(
      url
    );

  if (isSocial) {
    if (
      !isDirectSocialProfile(
        url
      )
    ) {
      return false;
    }

    return hasLikelyPersonName(
      result
    );
  }

  const title =
    normalize(
      result.title
    );

  const genericOrganizationTerms = [
    "school",
    "academy",
    "university",
    "college",
    "institute",
    "education center",
    "training center",
    "company",
    "corporation",
    "organization",
    "organisation",
    "foundation",
    "association",
    "agency",
    "department",
    "faculty",
    "admissions",
    "careers",
    "employment",
    "staff",
    "team",
  ];

  if (
    genericOrganizationTerms.some(
      (term) =>
        title.includes(
          normalize(term)
        )
    )
  ) {
    return false;
  }

  if (
    genericOrganizationTerms.some(
      (term) =>
        normalized.includes(
          normalize(term)
        )
    )
  ) {
    return false;
  }

  return hasLikelyPersonName(
    result
  );
}

function getDirectContact(
  result: SearchResult
): ContactInfo {
  const text =
    getSearchText(
      result
    );

  const emails =
    extractEmails(text);

  const phones =
    extractPhones(text);

  return {
    email:
      emails[0],
    phone:
      phones[0],
  };
      }
async function improveContact(
  result: SearchResult
): Promise<ContactInfo> {
  const initial =
    getDirectContact(
      result
    );

  if (
    initial.email ||
    initial.phone
  ) {
    return {
      ...initial,
      url:
        result.link,
    };
  }

  if (!result.link) {
    return {};
  }

  /*
   * A direct individual social profile
   * is itself a valid contact path.
   *
   * We do not fetch LinkedIn/Facebook/etc.
   * because those sites commonly block
   * automated requests.
   */
  if (
    isDirectSocialProfile(
      result.link
    )
  ) {
    return {
      ...initial,
      url:
        result.link,
    };
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

    if (
      !response.ok
    ) {
      return {
        ...initial,
        url:
          result.link,
      };
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

    const contactLinks =
      extractContactLinks(
        html,
        result.link
      );

    return {
      email:
        initial.email ||
        emails[0],

      phone:
        initial.phone ||
        phones[0],

      url:
        contactLinks[0] ||
        result.link,
    };
  } catch {
    return {
      ...initial,
      url:
        result.link,
    };
  }
}

function buildSkillSearchTerms(
  skill: SkillRow
): string[] {
  const name =
    cleanText(
      skill.name
    );

  const normalized =
    normalize(name);

  if (
    [
      "quran",
      "tajweed",
      "tajwid",
      "qiraat",
      "qirat",
      "hifz",
      "tafseer",
      "tafsir",
      "islamic studies",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "Quran",
      "Quran teacher",
      "Quran tutor",
      "Tajweed",
      "Tajwid",
      "Qiraat",
      "Hifz",
      "Islamic studies",
    ];
  }

  if (
    [
      "math",
      "mathematics",
      "calculus",
      "algebra",
      "geometry",
      "statistics",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "Math",
      "Mathematics",
      "Math teacher",
      "Math tutor",
      "Calculus",
      "Algebra",
      "Geometry",
    ];
  }

  if (
    [
      "coach",
      "coaching",
      "mentor",
      "mentoring",
      "guide",
      "guidance",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "coach",
      "coaching",
      "mentor",
      "mentoring",
      "professional coach",
      "career coach",
      "life coach",
    ];
  }

  if (
    [
      "teacher",
      "teaching",
      "educator",
      "education",
      "instructor",
      "tutor",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "teacher",
      "teaching",
      "tutor",
      "tutoring",
      "educator",
      "instructor",
    ];
  }

  if (
    [
      "freelancer",
      "freelance",
      "freelancing",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "freelancer",
      "freelance",
      "freelance professional",
      "freelance service",
    ];
  }

  if (
    [
      "designer",
      "design",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "designer",
      "graphic designer",
      "UI designer",
      "UX designer",
    ];
  }

  if (
    [
      "writer",
      "writing",
      "copywriter",
      "copywriting",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "writer",
      "content writer",
      "copywriter",
      "freelance writer",
    ];
  }

  if (
    [
      "developer",
      "development",
      "programmer",
      "programming",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "developer",
      "web developer",
      "software developer",
      "programmer",
    ];
  }

  if (
    [
      "accountant",
      "accounting",
      "bookkeeper",
      "bookkeeping",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "accountant",
      "accounting",
      "bookkeeper",
    ];
  }

  if (
    [
      "marketing",
      "marketer",
      "digital marketing",
      "seo",
    ].some(
      (term) =>
        normalized.includes(
          term
        )
    )
  ) {
    return [
      "marketing",
      "marketer",
      "digital marketer",
      "SEO specialist",
    ];
  }

  return [
    name,
    skill.category || "",
    skill.subcategory || "",
  ].filter(Boolean);
      }
function buildQueries(
  type: LeadType,
  skills: SkillRow[]
): string[] {
  const allTerms =
    skills.length > 0
      ? skills.flatMap(
          (skill) =>
            buildSkillSearchTerms(
              skill
            )
        )
      : PROFESSIONAL_TERMS;

  const selected = [
    ...new Set(
      allTerms
        .map((term) =>
          cleanText(term)
        )
        .filter(Boolean)
    ),
  ].slice(
    0,
    MAX_QUERIES_PER_TYPE
  );

  if (
    type === "Demand"
  ) {
    return selected.map(
      (skill) =>
        `"${skill}" ("looking for" OR "need a" OR "need an" OR "need someone" OR "seeking" OR "wanted" OR "recommend a")`
    );
  }

  if (
    type === "Supply"
  ) {
    return selected.map(
      (skill) =>
        `"${skill}" ("hiring" OR "we are hiring" OR "job opening" OR "vacancy" OR "position available" OR "applications open" OR "recruiting")`
    );
  }

  /*
   * SaaS searches for individual
   * professional profiles.
   */
  return selected.map(
    (skill) =>
      `"${skill}" ("teacher" OR "tutor" OR "coach" OR "consultant" OR "mentor" OR "freelancer") ("profile" OR "professional")`
  );
}

async function searchSerper(
  query: string,
  type: LeadType
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    throw new Error(
      "SERPER_API_KEY is missing."
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

          num:
            RESULTS_PER_SEARCH,

          ...(type !== "SaaS"
            ? {
                tbs:
                  "qdr:d3",
              }
            : {}),
        }),
      }
    );

  if (
    !response.ok
  ) {
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

function resultMatchesType(
  result: SearchResult,
  type: LeadType
): boolean {
  const text =
    getSearchText(
      result
    );

  if (
    type === "SaaS"
  ) {
    return isIndividualSaasProfile(
      result
    );
  }

  if (
    type === "Demand"
  ) {
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

  if (
    type === "Supply"
  ) {
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

function leadInsertPayload(
  lead: CollectedLead
) {
  /*
   * SaaS has a smaller schema than
   * Demand/Supply.
   *
   * Keep only fields that belong
   * to the existing SaaS lead table.
   */
  if (
    lead.leadType === "SaaS"
  ) {
    return {
      source:
        lead.source,

      name:
        lead.name ||
        null,

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

      country:
        lead.country ||
        null,

      city:
        lead.city ||
        null,

      contact_url:
        lead.contactUrl ||
        null,

      created_at:
        lead.createdAt ||
        new Date().toISOString(),
    };
  }

  /*
   * Demand and Supply use the
   * larger lead schema.
   */
  return {
    source:
      lead.source,

    name:
      lead.name ||
      null,

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

  let query =
    supabase
      .from(table)
      .select("id")
      .limit(1);

  /*
   * SaaS profiles are checked
   * by their direct profile URL.
   *
   * Other lead types use source.
   */
  if (
    lead.leadType === "SaaS" &&
    lead.contactUrl
  ) {
    query =
      query.eq(
        "contact_url",
        lead.contactUrl
      );
  } else if (
    lead.source
  ) {
    query =
      query.eq(
        "source",
        lead.source
      );
  }

  const {
    data,
    error,
  } =
    await query;

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

async function processResult(
  result: SearchResult,
  type: LeadType,
  skills: SkillRow[],
  stats: CollectionStats
): Promise<CollectedLead | null> {
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
   * Demand and Supply must be
   * fresh within 72 hours.
   *
   * SaaS profiles do not use
   * the freshness restriction.
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
    getSearchText(
      result
    );

  const detectedSkill =
    detectSkill(
      text,
      skills
    );

  if (
    !detectedSkill
  ) {
    stats.noSkillMatch++;
    return null;
  }

  /*
   * SaaS must represent an
   * actual individual professional.
   */
  if (
    type === "SaaS" &&
    !hasLikelyPersonName(
      result
    )
  ) {
    stats.wrongType++;
    return null;
  }

  const contact =
    await improveContact(
      result
    );

  /*
   * A valid profile URL counts
   * as a direct contact path.
   */
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
      `${title} ${description}`
    );

  const country =
    detectCountry(
      text
    );

  if (!country) {
    stats.wrongType++;
    return null;
  }

  /*
   * SaaS must have a person name.
   * Demand/Supply may represent
   * a client or organization.
   */
  if (
    type === "SaaS" &&
    !personName
  ) {
    stats.wrongType++;
    return null;
  }

  const lead: CollectedLead = {
    leadType:
      type,

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

  let insertedCount = 0;

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
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Serper search failed.";

      throw new Error(
        `${type} lead search failed: ${message}`
      );
    }

    for (
      const result of results
    ) {
      let lead:
        | CollectedLead
        | null = null;

      try {
        lead =
          await processResult(
            result,
            type,
            skills,
            stats
          );
      } catch (error) {
        stats.wrongType++;
        continue;
      }

      if (!lead) {
        continue;
      }

      try {
        const exists =
          await leadAlreadyExists(
            supabase,
            lead
          );

        if (exists) {
          stats.duplicate++;
          continue;
        }

        const table =
          tableForType(
            type
          );

        /*
         * IMPORTANT:
         * leadInsertPayload() keeps
         * SaaS free of budget/currency,
         * while Demand/Supply retain them.
         */
        const payload =
          leadInsertPayload(
            lead
          );

        const {
          error:
            insertError,
        } =
          await supabase
            .from(table)
            .insert(
              payload
            );

        if (
          insertError
        ) {
          stats.insertErrors++;

          stats.lastInsertError =
            insertError.message;

          continue;
        }

        stats.inserted++;
        insertedCount++;
      } catch (error) {
        stats.insertErrors++;

        stats.lastInsertError =
          error instanceof Error
            ? error.message
            : String(error);

        continue;
      }
    }
  }

  return insertedCount;
}

function getBearerToken(
  request: VercelRequest
): string | null {
  const header =
    request.headers.authorization;

  if (
    typeof header !==
    "string"
  ) {
    return null;
  }

  if (
    !header
      .toLowerCase()
      .startsWith(
        "bearer "
      )
  ) {
    return null;
  }

  const token =
    header
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
   */
  res.setHeader(
    "Content-Type",
    "application/json"
  );

  if (
    req.method !== "POST"
  ) {
    return res
      .status(405)
      .json({
        success: false,
        error:
          "Method not allowed.",
      });
  }

  try {
    const supabase =
      createSupabase();

    /*
     * Validate that the request
     * contains a real Supabase
     * session token.
     */
    const token =
      getBearerToken(
        req
      );

    if (!token) {
      return res
        .status(401)
        .json({
          success: false,
          error:
            "Authorization token is missing.",
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
      !userData?.user
    ) {
      return res
        .status(401)
        .json({
          success: false,
          error:
            "Invalid or expired session.",
        });
    }

    const skills =
      await loadSkills(
        supabase
      );

    const stats =
      emptyStats();

    const insertedByType:
      Record<
        LeadType,
        number
      > = {
        Demand: 0,
        Supply: 0,
        SaaS: 0,
      };

    for (
      const type of [
        "Demand",
        "Supply",
        "SaaS",
      ] as LeadType[]
    ) {
      insertedByType[
        type
      ] =
        await collectLeadsForType(
          supabase,
          type,
          skills,
          stats
        );
    }

    const totalInserted =
      Object.values(
        insertedByType
      ).reduce(
        (
          total,
          value
        ) =>
          total + value,
        0
      );

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
        : "Lead collection failed.";

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
      });
  }
}
