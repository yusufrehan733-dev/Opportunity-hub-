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
  searchQuery?: string;
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

function createSupabase() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase server environment variables are missing."
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
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
  "amazon.sa",
  "amazon.in",
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
    "us",
    "u.s.",
    "america",
    "american",
  ],

  Canada: [
    "canada",
    "canadian",
    "toronto",
    "vancouver",
    "montreal",
    "calgary",
    "ottawa",
    "edmonton",
  ],

  "United Kingdom": [
    "united kingdom",
    "uk",
    "u.k.",
    "britain",
    "great britain",
    "england",
    "scotland",
    "wales",
    "northern ireland",
    "london",
    "manchester",
    "birmingham",
    "glasgow",
    "liverpool",
  ],

  "United Arab Emirates": [
    "united arab emirates",
    "uae",
    "dubai",
    "abu dhabi",
    "sharjah",
    "ajman",
  ],

  Qatar: [
    "qatar",
    "qatari",
    "doha",
  ],

  "Saudi Arabia": [
    "saudi arabia",
    "saudi",
    "riyadh",
    "jeddah",
    "dammam",
  ],

  Kuwait: [
    "kuwait",
    "kuwaiti",
    "kuwait city",
  ],

  Oman: [
    "oman",
    "omani",
    "muscat",
  ],

  Bahrain: [
    "bahrain",
    "bahraini",
    "manama",
  ],

  Australia: [
    "australia",
    "australian",
    "sydney",
    "melbourne",
    "brisbane",
    "perth",
  ],

  Sweden: [
    "sweden",
    "swedish",
    "stockholm",
  ],

  Norway: [
    "norway",
    "norwegian",
    "oslo",
  ],

  Denmark: [
    "denmark",
    "danish",
    "copenhagen",
  ],

  Finland: [
    "finland",
    "finnish",
    "helsinki",
  ],

  Pakistan: [
    "pakistan",
    "pakistani",
    "karachi",
    "lahore",
    "islamabad",
    "rawalpindi",
    "peshawar",
    "abbottabad",
    "multan",
    "faisalabad",
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

  Bangladesh: [
    "bangladesh",
    "bangladeshi",
    "dhaka",
    "chittagong",
  ],

  Germany: [
    "germany",
    "german",
    "berlin",
    "munich",
    "hamburg",
  ],

  France: [
    "france",
    "french",
    "paris",
    "lyon",
  ],

  Netherlands: [
    "netherlands",
    "dutch",
    "amsterdam",
    "rotterdam",
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
  "definition",
  "meaning",
  "wikipedia",
  "encyclopedia",

  "resource",
  "resources",
  "teaching resource",
  "lesson plan",

  "job",
  "jobs",
  "vacancy",
  "vacancies",
  "hiring",
  "recruiting",
  "recruitment",
  "application",
  "applications",

  "course",
  "courses",
  "webinar",
  "webinars",
  "seminar",
  "seminars",

  "article",
  "articles",
  "blog",
  "blogs",
  "news",

  "book",
  "books",
  "ebook",
  "ebooks",

  "app",
  "apps",
  "software",
  "platform",
  "marketplace",

  "directory",
  "directories",
  "listing",
  "listings",

  "review",
  "reviews",
  "comparison",
  "compare",

  "podcast",
  "podcasts",

  "school",
  "academy",
  "university",
  "college",
  "institute",

  "admissions",
  "admission",

  "join us",
  "join our team",
  "our team",
  "benefits",

  "become a teacher",
  "career in teaching",
  "faculty",
  "staff directory",
];
function cleanText(
  value?: string | null
): string {
  if (!value) return "";

  return value
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(
  value?: string | null
): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@._:/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(
  value: string
): string {
  return value
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
    );
}

function decodeHtml(
  value: string
): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/g, "/");
}

function domainFromUrl(
  value?: string
): string {
  if (!value) return "";

  try {
    const url = new URL(value);

    return url.hostname
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

  if (!domain) return true;

  return BLOCKED_DOMAINS.some(
    (blocked) =>
      domain === blocked ||
      domain.endsWith(`.${blocked}`)
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
  const raw =
    cleanText(result.date);

  if (!raw) {
    return null;
  }

  const timestamp =
    Date.parse(raw);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

function isFresh(
  result: SearchResult
): boolean {
  const date =
    parseResultDate(result);

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
          cleanText(phone)
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
    result.title || "",
    result.snippet || "",
  ]
    .map(cleanText)
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

function detectCity(
  text: string
): string | undefined {
  const normalized =
    normalize(text);

  const cities: Array<
    [string, string]
  > = [
    ["London", "london"],
    ["Manchester", "manchester"],
    ["Birmingham", "birmingham"],
    ["Toronto", "toronto"],
    ["Vancouver", "vancouver"],
    ["Montreal", "montreal"],
    ["Dubai", "dubai"],
    ["Abu Dhabi", "abu dhabi"],
    ["Doha", "doha"],
    ["Riyadh", "riyadh"],
    ["Jeddah", "jeddah"],
    ["Karachi", "karachi"],
    ["Lahore", "lahore"],
    ["Islamabad", "islamabad"],
    ["Rawalpindi", "rawalpindi"],
    ["Peshawar", "peshawar"],
    ["Abbottabad", "abbottabad"],
    ["Delhi", "delhi"],
    ["Mumbai", "mumbai"],
    ["Dhaka", "dhaka"],
    ["Berlin", "berlin"],
    ["Paris", "paris"],
    ["Amsterdam", "amsterdam"],
  ];

  const found =
    cities.find(
      ([, alias]) =>
        normalized.includes(alias)
    );

  return found?.[0];
}

const SKILL_GROUPS: Array<{
  base: string[];
  synonyms: string[];
}> = [
  {
    base: [
      "quran",
      "tajweed",
      "qirat",
      "islamic studies",
      "islamic education",
    ],
    synonyms: [
      "quran teacher",
      "quran tutor",
      "tajweed teacher",
      "tajweed tutor",
      "qirat teacher",
      "qirat tutor",
      "online quran",
      "online tajweed",
      "hifz",
      "hafiz",
    ],
  },

  {
    base: [
      "math",
      "mathematics",
      "algebra",
      "calculus",
      "geometry",
      "statistics",
    ],
    synonyms: [
      "math teacher",
      "math tutor",
      "mathematics teacher",
      "mathematics tutor",
      "calculus tutor",
      "algebra tutor",
      "statistics tutor",
    ],
  },

  {
    base: [
      "teacher",
      "teaching",
      "tutor",
      "tutoring",
      "educator",
      "education",
      "instructor",
    ],
    synonyms: [
      "online teacher",
      "online tutor",
      "private tutor",
      "private teacher",
      "online teaching",
      "education tutor",
    ],
  },

  {
    base: [
      "coach",
      "coaching",
      "mentor",
      "mentoring",
    ],
    synonyms: [
      "professional coach",
      "business coach",
      "life coach",
      "career coach",
      "online coach",
      "mentor",
      "professional mentor",
    ],
  },

  {
    base: [
      "freelancer",
      "freelance",
    ],
    synonyms: [
      "freelance professional",
      "freelance worker",
      "freelance services",
    ],
  },

  {
    base: [
      "developer",
      "programmer",
      "development",
      "coding",
    ],
    synonyms: [
      "web developer",
      "software developer",
      "frontend developer",
      "backend developer",
      "full stack developer",
    ],
  },

  {
    base: [
      "designer",
      "design",
    ],
    synonyms: [
      "graphic designer",
      "web designer",
      "ui designer",
      "ux designer",
    ],
  },

  {
    base: [
      "writer",
      "writing",
      "copywriter",
      "copywriting",
    ],
    synonyms: [
      "content writer",
      "content writing",
      "copywriter",
      "copywriting",
    ],
  },

  {
    base: [
      "accountant",
      "accounting",
      "bookkeeper",
      "bookkeeping",
    ],
    synonyms: [
      "accounting professional",
      "bookkeeping services",
      "accounting services",
    ],
  },

  {
    base: [
      "marketing",
      "marketer",
    ],
    synonyms: [
      "digital marketing",
      "social media marketing",
      "marketing consultant",
    ],
  },

  {
    base: [
      "virtual assistant",
      "virtual assistance",
    ],
    synonyms: [
      "remote assistant",
      "online assistant",
      "virtual assistant",
    ],
  },

  {
    base: [
      "sociology",
    ],
    synonyms: [
      "sociology teacher",
      "sociology tutor",
      "sociology researcher",
    ],
  },

  {
    base: [
      "psychology",
    ],
    synonyms: [
      "psychology teacher",
      "psychology tutor",
      "psychology coach",
    ],
  },

  {
    base: [
      "anthropology",
    ],
    synonyms: [
      "anthropology teacher",
      "anthropology tutor",
    ],
  },

  {
    base: [
      "economics",
    ],
    synonyms: [
      "economics teacher",
      "economics tutor",
    ],
  },

  {
    base: [
      "physics",
    ],
    synonyms: [
      "physics teacher",
      "physics tutor",
    ],
  },

  {
    base: [
      "chemistry",
    ],
    synonyms: [
      "chemistry teacher",
      "chemistry tutor",
    ],
  },
];
function detectSkill(
  text: string,
  skills: SkillRow[]
): SkillRow | null {
  const normalized =
    normalize(text);

  for (
    const skill of skills
  ) {
    const candidates = [
      skill.name,
      skill.category || "",
      skill.subcategory || "",
    ];

    if (
      Array.isArray(
        skill.tags
      )
    ) {
      candidates.push(
        ...skill.tags
      );
    } else if (
      typeof skill.tags ===
      "string"
    ) {
      candidates.push(
        skill.tags
      );
    }

    for (
      const candidate of candidates
    ) {
      const value =
        normalize(candidate);

      if (
        value &&
        normalized.includes(value)
      ) {
        return skill;
      }
    }
  }

  for (
    const group of SKILL_GROUPS
  ) {
    const matched =
      group.base.some(
        (base) =>
          normalized.includes(
            normalize(base)
          )
      ) ||
      group.synonyms.some(
        (synonym) =>
          normalized.includes(
            normalize(synonym)
          )
      );

    if (!matched) {
      continue;
    }

    const matchingSkill =
      skills.find((skill) => {
        const skillText =
          normalize(
            [
              skill.name,
              skill.category || "",
              skill.subcategory || "",
              Array.isArray(
                skill.tags
              )
                ? skill.tags.join(" ")
                : skill.tags || "",
            ].join(" ")
          );

        return group.base.some(
          (base) =>
            skillText.includes(
              normalize(base)
            )
        );
      });

    if (matchingSkill) {
      return matchingSkill;
    }
  }

  return null;
}

function extractContactLinks(
  html: string,
  baseUrl: string
): string[] {
  const links: string[] = [];

  const anchorPattern =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;

  const contactTerms = [
    "contact",
    "get-in-touch",
    "getintouch",
    "reach",
    "about",
    "profile",
    "linkedin",
    "facebook",
    "instagram",
    "twitter",
    "x.com",
    "threads",
    "whatsapp",
    "telegram",
  ];

  let match:
    | RegExpExecArray
    | null;

  while (
    (match =
      anchorPattern.exec(
        html
      )) !== null
  ) {
    const href =
      decodeHtml(
        match[1] || ""
      );

    const normalizedHref =
      normalize(href);

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
  const normalized =
    cleanText(url)
      .toLowerCase();

  return normalized.includes(
    "linkedin.com/in/"
  );
}

function isFacebookPersonProfile(
  url?: string
): boolean {
  const normalized =
    cleanText(url)
      .toLowerCase();

  if (
    !normalized.includes(
      "facebook.com/"
    )
  ) {
    return false;
  }

  if (
    normalized.includes(
      "/pages/"
    ) ||
    normalized.includes(
      "/groups/"
    ) ||
    normalized.includes(
      "/marketplace/"
    ) ||
    normalized.includes(
      "/events/"
    )
  ) {
    return false;
  }

  return true;
}

function isInstagramPersonProfile(
  url?: string
): boolean {
  const normalized =
    cleanText(url)
      .toLowerCase();

  return (
    normalized.includes(
      "instagram.com/"
    ) &&
    !normalized.includes(
      "/p/"
    ) &&
    !normalized.includes(
      "/reel/"
    ) &&
    !normalized.includes(
      "/explore/"
    )
  );
}

function isXPersonProfile(
  url?: string
): boolean {
  const normalized =
    cleanText(url)
      .toLowerCase();

  return (
    normalized.includes(
      "x.com/"
    ) ||
    normalized.includes(
      "twitter.com/"
    )
  );
}

function isThreadsPersonProfile(
  url?: string
): boolean {
  const normalized =
    cleanText(url)
      .toLowerCase();

  return normalized.includes(
    "threads.net/@"
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
    cleanText(result.title);

  if (!title) {
    return undefined;
  }

  const separators = [
    " - ",
    " | ",
    " – ",
    " — ",
    " · ",
  ];

  for (
    const separator of separators
  ) {
    const parts =
      title
        .split(separator)
        .map(cleanText)
        .filter(Boolean);

    if (
      parts.length >= 2
    ) {
      const first =
        parts[0];

      if (
        first.split(/\s+/).length >=
          2 &&
        first.length <= 80
      ) {
        return first;
      }

      const last =
        parts[
          parts.length - 1
        ];

      if (
        last.split(/\s+/).length >=
          2 &&
        last.length <= 80
      ) {
        return last;
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

  const words =
    cleanText(value)
      .split(/\s+/)
      .filter(Boolean);

  const validWords =
    words.filter(
      (word) =>
        /^[A-Za-zÀ-ÖØ-öø-ÿ'.-]+$/.test(
          word
        ) &&
        word.length >= 2
    );

  return validWords.length >= 2;
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
    getSearchText(result);

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
    extractPersonName(result);

  return (
    directProfile ||
    linkedinProfile ||
    !!extractedName
  );
      }
function parseGoogleResults(
  html: string
): SearchResult[] {
  const results: SearchResult[] = [];

  const anchorPattern =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match:
    | RegExpExecArray
    | null;

  while (
    (match =
      anchorPattern.exec(html)) !== null
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

    let url = rawHref;

    if (
      url.startsWith("/url?")
    ) {
      try {
        const parsed =
          new URL(
            `https://www.google.com${url}`
          );

        url =
          parsed.searchParams.get("q") ||
          parsed.searchParams.get("url") ||
          "";
      } catch {
        continue;
      }
    }

    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://")
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
        stripHtml(anchorHtml)
      );

    if (
      !title ||
      title.length < 3
    ) {
      continue;
    }

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
          .slice(title.length)
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

    const result:
      SearchResult = {
      title,
      link: url,
      snippet:
        snippet || title,
    };

    const duplicate =
      results.some(
        (item) =>
          item.link ===
          result.link
      );

    if (duplicate) {
      continue;
    }

    results.push(result);

    if (
      results.length >=
      RESULTS_PER_SEARCH
    ) {
      break;
    }
  }

  return results;
}

async function searchPublicWeb(
  query: string
): Promise<SearchResult[]> {
  const encoded =
    encodeURIComponent(query);

  const url =
    `https://www.google.com/search?q=${encoded}&num=${RESULTS_PER_SEARCH}`;

  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml",
          "Accept-Language":
            "en-US,en;q=0.9",
        },
        redirect: "follow",
      }
    );

  if (!response.ok) {
    throw new Error(
      `Free web search failed: ${response.status}`
    );
  }

  const html =
    await response.text();

  if (!html) {
    return [];
  }

  return parseGoogleResults(
    html
  );
}

async function searchSerper(
  query: string,
  type: LeadType
): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    throw new Error(
      "SERPER_API_KEY is not configured."
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
          type:
            "search",
        }),
      }
    );

  if (!response.ok) {
    const message =
      await response.text();

    throw new Error(
      `Serper request failed: ${response.status} ${message}`
    );
  }

  const data =
    await response.json();

  const organic =
    Array.isArray(
      data?.organic
    )
      ? data.organic
      : [];

  return organic.map(
    (
      item: any,
      index: number
    ) => ({
      title:
        cleanText(
          item?.title
        ),
      link:
        cleanText(
          item?.link
        ),
      snippet:
        cleanText(
          item?.snippet
        ),
      date:
        cleanText(
          item?.date
        ) || undefined,
      position:
        typeof item?.position ===
        "number"
          ? item.position
          : index + 1,
    })
  );
}

async function searchWithFallback(
  query: string,
  type: LeadType
): Promise<SearchResult[]> {
  if (SERPER_API_KEY) {
    try {
      return await searchSerper(
        query,
        type
      );
    } catch {
      // Fall through to free search.
    }
  }

  return searchPublicWeb(
    query
  );
}
function buildQueries(
  type: LeadType,
  skills: SkillRow[]
): string[] {
  const queries: string[] = [];

  const usableSkills =
    skills
      .map(
        (skill) =>
          cleanText(
            skill.name
          )
      )
      .filter(Boolean);

  const selectedSkills =
    usableSkills.slice(
      0,
      MAX_QUERIES_PER_TYPE
    );

  for (
    const skill of selectedSkills
  ) {
    if (
      type === "Demand"
    ) {
      queries.push(
        `"${skill}" ("looking for" OR "need a" OR "need someone" OR "seeking" OR "wanted" OR "recommend a" OR "looking to hire")`
      );
    }

    if (
      type === "Supply"
    ) {
      queries.push(
        `"${skill}" ("hiring" OR "we are hiring" OR "job opening" OR "vacancy" OR "position available" OR "applications open" OR "recruiting")`
      );
    }

    if (
      type === "SaaS"
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

function resultMatchesType(
  result: SearchResult,
  type: LeadType
): boolean {
  const text =
    getSearchText(result);

  const queryContext =
    normalize(
      result.searchQuery
    );

  if (
    type === "SaaS"
  ) {
    if (
      isIndividualSaasProfile(
        result
      )
    ) {
      return true;
    }

    const link =
      cleanText(
        result.link
      ).toLowerCase();

    const individualProfileUrl =
      link.includes(
        "linkedin.com/in/"
      ) ||
      link.includes(
        "facebook.com/"
      ) ||
      link.includes(
        "instagram.com/"
      ) ||
      link.includes(
        "x.com/"
      ) ||
      link.includes(
        "twitter.com/"
      ) ||
      link.includes(
        "threads.net/@"
      );

    const professionalProfile =
      containsAny(
        text,
        PROFESSIONAL_TERMS
      );

    const personName =
      hasLikelyPersonName(
        extractPersonName(
          result
        )
      );

    return (
      individualProfileUrl &&
      professionalProfile &&
      personName
    );
  }

  if (
    type === "Demand"
  ) {
    const directDemand =
      containsAny(
        text,
        [
          ...DEMAND_SIGNALS,
          "looking for someone",
          "looking for a",
          "looking for an",
          "need help",
          "need a teacher",
          "need a tutor",
          "need a coach",
          "need a consultant",
          "need a mentor",
          "teacher needed",
          "tutor needed",
          "coach needed",
          "consultant needed",
          "mentor needed",
          "teacher wanted",
          "tutor wanted",
          "coach wanted",
          "seeking a teacher",
          "seeking a tutor",
          "seeking a coach",
          "seeking a consultant",
          "seeking a mentor",
          "seeking services",
          "request for",
          "requesting",
          "service needed",
          "services needed",
          "private tutor needed",
          "online tutor needed",
          "online teacher needed",
        ]
      );

    if (
      directDemand
    ) {
      return true;
    }

    return (
      queryContext.includes(
        "looking for"
      ) ||
      queryContext.includes(
        "need a"
      ) ||
      queryContext.includes(
        "need someone"
      ) ||
      queryContext.includes(
        "seeking"
      ) ||
      queryContext.includes(
        "wanted"
      ) ||
      queryContext.includes(
        "recommend a"
      ) ||
      queryContext.includes(
        "looking to hire"
      )
    );
  }

  if (
    type === "Supply"
  ) {
    const directSupply =
      containsAny(
        text,
        [
          ...SUPPLY_SIGNALS,
          "open positions",
          "open role",
          "open roles",
          "employment opportunity",
          "employment opportunities",
          "career opportunity",
          "career opportunities",
          "positions available",
          "vacant position",
          "vacancy for",
          "seeking applicants",
          "accepting applications",
          "applications are open",
          "now recruiting",
          "currently recruiting",
          "teacher vacancy",
          "tutor vacancy",
          "coach vacancy",
          "teaching position",
          "teaching opportunity",
          "tutoring position",
          "coaching position",
        ]
      );

    if (
      directSupply
    ) {
      return true;
    }

    return (
      queryContext.includes(
        "hiring"
      ) ||
      queryContext.includes(
        "we are hiring"
      ) ||
      queryContext.includes(
        "job opening"
      ) ||
      queryContext.includes(
        "vacancy"
      ) ||
      queryContext.includes(
        "position available"
      ) ||
      queryContext.includes(
        "applications open"
      ) ||
      queryContext.includes(
        "recruiting"
      )
    );
  }

  return false;
}

function tableForType(
  type: LeadType
): string {
  if (
    type === "Demand"
  ) {
    return "demand_leads";
  }

  if (
    type === "Supply"
  ) {
    return "supply_leads";
  }

  return "saas_leads";
    }
function leadInsertPayload(
  lead: CollectedLead
): Record<string, unknown> {
  if (
    lead.leadType ===
    "SaaS"
  ) {
    return {
      name:
        lead.name ||
        lead.title,

      platform:
        "Opportunity Hub",

      nich:
        lead.skill ||
        "",

      contect:
        lead.contactEmail ||
        lead.contactPhone ||
        lead.contactUrl ||
        "",

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
        lead.source,

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
      "Real Opportunity",

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

async function improveContact(
  result: SearchResult
): Promise<ContactInfo> {
  const text =
    getSearchText(result);

  const emails =
    extractEmails(text);

  const phones =
    extractPhones(text);

  if (
    emails.length ||
    phones.length
  ) {
    return {
      email:
        emails[0],
      phone:
        phones[0],
      url:
        cleanText(
          result.link
        ) || undefined,
    };
  }

  const source =
    cleanText(
      result.link
    );

  if (!source) {
    return {};
  }

  try {
    const response =
      await fetch(
        source,
        {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml",
            "Accept-Language":
              "en-US,en;q=0.9",
          },
          redirect: "follow",
        }
      );

    if (!response.ok) {
      return {
        url: source,
      };
    }

    const html =
      await response.text();

    const pageText =
      cleanText(
        stripHtml(html)
      );

    const pageEmails =
      extractEmails(
        `${html} ${pageText}`
      );

    const pagePhones =
      extractPhones(
        `${html} ${pageText}`
      );

    const contactLinks =
      extractContactLinks(
        html,
        source
      );

    return {
      email:
        pageEmails[0],
      phone:
        pagePhones[0],
      url:
        contactLinks[0] ||
        source,
    };
  } catch {
    return {
      url: source,
    };
  }
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

  const diagnosticTitle =
    cleanText(
      result.title
    ) || "(no title)";

  const diagnosticUrl =
    link || "(no URL)";

  const diagnosticQuery =
    cleanText(
      result.searchQuery
    ) || "(no query)";

  if (!link) {
    stats.blocked += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason:
          "blocked/no-url",
        title:
          diagnosticTitle,
        url:
          diagnosticUrl,
        query:
          diagnosticQuery,
      })
    );

    return null;
  }

  if (
    isBlockedDomain(link)
  ) {
    stats.blocked += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason:
          "blocked-domain",
        title:
          diagnosticTitle,
        url:
          diagnosticUrl,
        query:
          diagnosticQuery,
      })
    );

    return null;
  }

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

      console.log(
        "[LEAD DIAGNOSTIC]",
        JSON.stringify({
          type,
          reason:
            "saas-blocked-path",
          title:
            diagnosticTitle,
          url:
            diagnosticUrl,
          query:
            diagnosticQuery,
        })
      );

      return null;
    }
  }

  if (
    type === "Demand" ||
    type === "Supply"
  ) {
    if (
      !isFresh(result)
    ) {
      stats.stale += 1;

      console.log(
        "[LEAD DIAGNOSTIC]",
        JSON.stringify({
          type,
          reason: "stale",
          title:
            diagnosticTitle,
          url:
            diagnosticUrl,
          query:
            diagnosticQuery,
        })
      );

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

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason:
          "wrong-type",
        title:
          diagnosticTitle,
        url:
          diagnosticUrl,
        query:
          diagnosticQuery,
        snippet:
          cleanText(
            result.snippet
          ).slice(
            0,
            500
          ),
      })
    );

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

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason:
          "no-skill-match",
        title:
          diagnosticTitle,
        url:
          diagnosticUrl,
        query:
          diagnosticQuery,
        text:
          searchText.slice(
            0,
            1000
          ),
      })
    );

    return null;
  }

  if (
    type === "SaaS" &&
    !isIndividualSaasProfile(
      result
    )
  ) {
    stats.wrongType += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason:
          "not-individual-saas-profile",
        title:
          diagnosticTitle,
        url:
          diagnosticUrl,
        query:
          diagnosticQuery,
      })
    );

    return null;
  }

  const contact =
    await improveContact(
      result
    );

  if (
    !contact.email &&
    !contact.phone &&
    !contact.url
  ) {
    stats.noContact += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason:
          "no-contact",
        title:
          diagnosticTitle,
        url:
          diagnosticUrl,
        query:
          diagnosticQuery,
      })
    );

    return null;
  }

  const title =
    cleanText(
      result.title
    );

  if (!title) {
    stats.blocked += 1;

    console.log(
      "[LEAD DIAGNOSTIC]",
      JSON.stringify({
        type,
        reason:
          "empty-title",
        url:
          diagnosticUrl,
        query:
          diagnosticQuery,
      })
    );

    return null;
  }

  const countryText =
    [
      title,
      result.snippet || "",
      contact.url || "",
    ].join(" ");

  const country =
    detectCountry(
      countryText
    );

  const city =
    detectCity(
      countryText
    );

  const description =
    cleanText(
      result.snippet ||
        title
    );

  const source =
    cleanText(
      result.link
    );

  const lead:
    CollectedLead = {
    leadType:
      type,

    source,

    title,

    name:
      extractPersonName(
        result
      ),

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

    city,

    contactEmail:
      contact.email,

    contactPhone:
      contact.phone,

    contactName:
      extractPersonName(
        result
      ),

    contactUrl:
      contact.url ||
      source,

    createdAt:
      parseResultDate(
        result
      )?.toISOString() ||
      new Date().toISOString(),
  };

  stats.accepted += 1;

  console.log(
    "[LEAD DIAGNOSTIC]",
    JSON.stringify({
      type,
      reason:
        "accepted",
      title:
        diagnosticTitle,
      url:
        diagnosticUrl,
      query:
        diagnosticQuery,
      skill:
        matchedSkill.name,
      country:
        country || null,
    })
  );

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

  if (
    queries.length === 0
  ) {
    return 0;
  }

  let inserted = 0;

  for (
    const query of queries
  ) {
    let results:
      SearchResult[] = [];

    console.log(
      "[LEAD DIAGNOSTIC] SEARCH",
      JSON.stringify({
        type,
        query,
      })
    );

    try {
      results =
        await searchWithFallback(
          query,
          type
        );
    } catch (
      error
    ) {
      stats.insertErrors += 1;

      stats.lastInsertError =
        error instanceof Error
          ? error.message
          : String(error);

      console.log(
        "[LEAD DIAGNOSTIC] SEARCH ERROR",
        JSON.stringify({
          type,
          query,
          error:
            stats.lastInsertError,
        })
      );

      continue;
    }

    console.log(
      "[LEAD DIAGNOSTIC] SEARCH RESULTS",
      JSON.stringify({
        type,
        query,
        count:
          results.length,
        results:
          results.map(
            (result) => ({
              title:
                cleanText(
                  result.title
                ),
              url:
                cleanText(
                  result.link
                ),
              snippet:
                cleanText(
                  result.snippet
                ).slice(
                  0,
                  500
                ),
            })
          ),
      })
    );

    for (
      const result of results
    ) {
      try {
        const contextualResult =
          {
            ...result,
            searchQuery:
              query,
          };

        const lead =
          await processResult(
            contextualResult,
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

          console.log(
            "[LEAD DIAGNOSTIC]",
            JSON.stringify({
              type,
              reason:
                "duplicate",
              title:
                lead.title,
              url:
                lead.source,
              query,
            })
          );

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

          console.log(
            "[LEAD DIAGNOSTIC] INSERT ERROR",
            JSON.stringify({
              type,
              title:
                lead.title,
              url:
                lead.source,
              error:
                error.message,
            })
          );

          continue;
        }

        stats.inserted += 1;
        inserted += 1;

        console.log(
          "[LEAD DIAGNOSTIC]",
          JSON.stringify({
            type,
            reason:
              "inserted",
            title:
              lead.title,
            url:
              lead.source,
            skill:
              lead.skill,
            country:
              lead.country ||
              null,
          })
        );
      } catch (
        error
      ) {
        stats.insertErrors += 1;

        stats.lastInsertError =
          error instanceof Error
            ? error.message
            : String(error);

        console.log(
          "[LEAD DIAGNOSTIC] PROCESS ERROR",
          JSON.stringify({
            type,
            query,
            error:
              stats.lastInsertError,
          })
        );
      }
    }
  }

  return inserted;
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
   * frontend error.
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

    const leadTypes:
      LeadType[] = [
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
  } catch (
    error
  ) {
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
        stats:
          emptyStats(),
      });
  }
    }
