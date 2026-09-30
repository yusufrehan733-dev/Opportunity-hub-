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

type SourceType =
  | "reddit"
  | "remoteok"
  | "wwr"
  | "public_profile";

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

const MAX_PROFILE_PAGES = 30;

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
  supabaseUrl && supabaseKey
    ? createClient(
        supabaseUrl,
        supabaseKey
      )
    : null;
function cleanText(
  value: unknown
): string {
  return String(
    value ?? ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function normalize(
  value: unknown
): string {
  return cleanText(
    value
  )
    .toLowerCase()
    .replace(
      /[’']/g,
      ""
    )
    .replace(
      /[^a-z0-9\s-]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
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

function isBlockedDomain(
  url: string
): boolean {
  try {
    const hostname =
      new URL(
        url
      ).hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );

    return BLOCKED_DOMAINS.some(
      (domain) =>
        hostname ===
          domain ||
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
      ![
        "http:",
        "https:",
      ].includes(
        parsed.protocol
      )
    ) {
      return false;
    }

    if (
      isBlockedDomain(
        url
      )
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
      matches.map(
        (email) =>
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
        .map(
          (phone) =>
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
        .map(
          (url) =>
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
  const text =
    normalize(
      getSearchText(
        result
      )
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
            normalize(
              term
            )
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
      getSearchText(
        result
      )
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
    cleanText(
      value
    );

  if (!cleaned) {
    return undefined;
  }

  const timestamp =
    Date.parse(
      cleaned
    );

  if (
    !Number.isNaN(
      timestamp
    )
  ) {
    return new Date(
      timestamp
    );
  }

  return undefined;
}

function isWithin72Hours(
  value?: string
): boolean {
  const date =
    parseDate(
      value
    );

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
  return normalize(
    value
  )
    .replace(
      /\b(i|need|a|an|the|for|to|with|looking|seeking)\b/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function skillMatchesText(
  skill: SkillRow,
  text: string
): boolean {
  const normalizedText =
    normalize(
      text
    );

  const values: string[] =
    [
      skill.name,
      skill.category,
      skill.subcategory,
    ].filter(
      Boolean
    ) as string[];

  if (
    Array.isArray(
      skill.tags
    )
  ) {
    values.push(
      ...skill.tags
    );
  } else if (
    typeof skill.tags ===
    "string"
  ) {
    values.push(
      skill.tags
    );
  }

  const terms =
    values
      .map(
        normalizeSkillText
      )
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
  const text =
    getSearchText(
      result
    );

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
    cleanText(
      skill.name
    ) ||
    cleanText(
      skill.subcategory
    ) ||
    cleanText(
      skill.category
    ) ||
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

function hasOrganizationIdentity(
  result: SearchResult
): boolean {
  const company =
    cleanText(
      result.company
    );

  if (
    company.length >= 2
  ) {
    return true;
  }

  return containsAny(
    getSearchText(
      result
    ),
    ORGANIZATION_TERMS
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
    normalize(
      name
    );

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
    name
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );

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

function isDemandResult(
  result: SearchResult
): boolean {
  const text =
    [
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
    getSearchText(
      result
    );

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
    getSearchText(
      result
    );

  if (
    !isLikelyPersonName(
      result.author
    ) &&
    !isLikelyPersonName(
      extractPersonFromTitle(
        result.title
      )
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
  const text =
    getSearchText(
      result
    );

  return containsAny(
    text,
    BLOCKED_CONTENT_TERMS
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
async function fetchRemoteOkApi(): Promise<SearchResult[]> {
  const response = await fetch(REMOTE_OK_API, {
    method: "GET",
    headers: {
      "User-Agent": "OpportunityHub/1.0 public-lead-collector",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`RemoteOK API returned ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  const results: SearchResult[] = [];

  for (const item of data) {
    if (!item || typeof item !== "object") continue;

    const title = cleanText(item.position || item.title);
    const link = cleanText(item.url || item.apply_url);
    const description = cleanText(
      item.description || item.snippet || ""
    );
    const company = cleanText(item.company);
    const location = cleanText(item.location);
    const publishedAt = cleanText(
      item.date || item.epoch
        ? new Date(
            typeof item.epoch === "number"
              ? item.epoch * 1000
              : item.date
          ).toISOString()
        : ""
    );

    if (!title || !isValidExternalUrl(link)) continue;

    results.push({
      title,
      link,
      snippet: description,
      description,
      publishedAt,
      company,
      location,
      source: "Remote OK",
      sourceType: "remoteok",
    });

    if (results.length >= MAX_RESULTS_PER_SOURCE) break;
  }

  return results;
}

async function fetchPublicSources(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  const jobs = [
    fetchRemoteOkApi()
      .then(items => results.push(...items))
      .catch(error => {
        console.error("RemoteOK API failed:", error);
      }),

    fetchRss(
      REMOTE_OK_RSS,
      "Remote OK RSS",
      "wwr"
    )
      .then(items => results.push(...items))
      .catch(error => {
        console.error("RemoteOK RSS failed:", error);
      }),

    fetchRss(
      WWR_RSS,
      "We Work Remotely",
      "wwr"
    )
      .then(items => results.push(...items))
      .catch(error => {
        console.error("We Work Remotely RSS failed:", error);
      }),
  ];

  for (const feed of REDDIT_DEMAND_FEEDS) {
    jobs.push(
      fetchRss(
        feed,
        "Reddit",
        "reddit"
      )
        .then(items => results.push(...items))
        .catch(error => {
          console.error(`Reddit feed failed ${feed}:`, error);
        })
    );
  }

  await Promise.all(jobs);

  const seen = new Set<string>();

  return results.filter(result => {
    const key = result.link.toLowerCase();

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getLeadType(
  result: SearchResult,
  skill?: SkillRow
): LeadType | undefined {
  if (result.sourceType === "reddit") {
    if (isDemandResult(result)) return "Demand";
    if (isSupplyResult(result)) return "Supply";
    if (isSaasResult(result,skill)) return "SaaS";
    return undefined;
  }

  if (isSupplyResult(result)) {
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
  const country = getCountry(result);
  const city = getCity(result);
  const title = getTitle(result);
  const description = getDescription(result);

  const name =
    cleanText(result.author) ||
    extractPersonFromTitle(title);

  return {
    type,
    title,
    name,
    company: cleanText(result.company) || undefined,
    description: description || undefined,
    skill: getSkillText(skill),
    category: cleanText(skill.category) || undefined,
    subcategory: cleanText(skill.subcategory) || undefined,
    country,
    city,
    sourceUrl: result.link,
    contactUrl: contact.url,
    contactEmail: contact.email,
    contactPhone: contact.phone,
    createdAt: result.publishedAt,
  };
}

function leadIsFreshForDemandSupply(
  result: SearchResult
): boolean {
  return isWithin72Hours(result.publishedAt);
}

function contactIsGold(
  type: LeadType,
  result: SearchResult,
  contact: ContactInfo
): boolean {
  if (type === "Demand") {
    return hasDemandContact(contact);
  }

  if (type === "Supply") {
    return hasSupplyContact(result) || Boolean(
      contact.email ||
      contact.phone ||
      contact.url
    );
  }

  return hasSaasContact(contact);
}

function shouldRejectResult(
  result: SearchResult
): boolean {
  if (!isValidExternalUrl(result.link)) return true;
  if (isBlockedDomain(result.link)) return true;
  if (isBlockedContent(result)) return true;

  return false;
      }
async function loadSkills(): Promise<SkillRow[]> {
  if (!supabase) {
    throw new Error("Supabase environment variables are missing");
  }

  const { data, error } = await supabase
    .from("skills")
    .select("id,name,category,subcategory,tags");

  if (error) {
    throw new Error(`Skills query failed: ${error.message}`);
  }

  return Array.isArray(data)
    ? data.filter(row => cleanText(row?.name))
    : [];
}

async function leadAlreadyExists(
  type: LeadType,
  lead: ProcessedLead
): Promise<boolean> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const table =
    type === "Demand"
      ? "demand_leads"
      : type === "Supply"
        ? "supply_leads"
        : "saas_leads";

  const sourceUrl = cleanText(lead.sourceUrl);
  const contactUrl = cleanText(lead.contactUrl);
  const title = cleanText(lead.title);

  if (sourceUrl) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("source_url", sourceUrl)
      .limit(1);

    if (error) {
      throw new Error(
        `Duplicate check failed: ${error.message}`
      );
    }

    if (data && data.length > 0) return true;
  }

  if (type === "SaaS" && contactUrl) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("contact_url", contactUrl)
      .limit(1);

    if (error) {
      throw new Error(
        `SaaS contact duplicate check failed: ${error.message}`
      );
    }

    if (data && data.length > 0) return true;
  }

  if (type === "SaaS" && title) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("title", title)
      .limit(1);

    if (error) {
      throw new Error(
        `SaaS title duplicate check failed: ${error.message}`
      );
    }

    if (data && data.length > 0) return true;
  }

  return false;
}

function buildDemandRow(
  lead: ProcessedLead
): Record<string, unknown> {
  return {
    title: lead.title,
    name: lead.name || null,
    company: lead.company || null,
    description: lead.description || null,
    skill: lead.skill || null,
    category: lead.category || null,
    subcategory: lead.subcategory || null,
    country: lead.country || null,
    city: lead.city || null,
    budget: lead.budget || null,
    currency: lead.currency || null,
    contact_email: lead.contactEmail || null,
    contact_phone: lead.contactPhone || null,
    contact_url: lead.contactUrl || null,
    source_url: lead.sourceUrl,
    created_at: lead.createdAt || new Date().toISOString(),
  };
}

function buildSupplyRow(
  lead: ProcessedLead
): Record<string, unknown> {
  return {
    title: lead.title,
    name: lead.name || null,
    company: lead.company || null,
    description: lead.description || null,
    skill: lead.skill || null,
    category: lead.category || null,
    subcategory: lead.subcategory || null,
    country: lead.country || null,
    city: lead.city || null,
    budget: lead.budget || null,
    currency: lead.currency || null,
    salary: lead.salary || null,
    contact_email: lead.contactEmail || null,
    contact_phone: lead.contactPhone || null,
    contact_url: lead.contactUrl || null,
    source_url: lead.sourceUrl,
    created_at: lead.createdAt || new Date().toISOString(),
  };
}

function buildSaasRow(
  lead: ProcessedLead
): Record<string, unknown> {
  return {
    title: lead.title,
    name: lead.name || null,
    company: lead.company || null,
    description: lead.description || null,
    skill: lead.skill || null,
    category: lead.category || null,
    subcategory: lead.subcategory || null,
    country: lead.country || null,
    city: lead.city || null,
    contact_email: lead.contactEmail || null,
    contact_phone: lead.contactPhone || null,
    contact_url: lead.contactUrl || null,
    source_url: lead.sourceUrl,
    created_at: lead.createdAt || new Date().toISOString(),
  };
}

async function insertLead(
  lead: ProcessedLead
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const table =
    lead.type === "Demand"
      ? "demand_leads"
      : lead.type === "Supply"
        ? "supply_leads"
        : "saas_leads";

  const row =
    lead.type === "Demand"
      ? buildDemandRow(lead)
      : lead.type === "Supply"
        ? buildSupplyRow(lead)
        : buildSaasRow(lead);

  const { error } = await supabase
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

  if (shouldRejectResult(result)) {
    stats.blocked++;
    return undefined;
  }

  const skill = detectSkill(result, skills);

  if (!skill) {
    stats.noSkill++;
    return undefined;
  }

  const type = getLeadType(result, skill);

  if (!type) {
    stats.wrongType++;
    return undefined;
  }

  if (
    (type === "Demand" || type === "Supply") &&
    !leadIsFreshForDemandSupply(result)
  ) {
    stats.stale++;
    return undefined;
  }

  const contact =
    type === "Demand"
      ? getDemandContact(result)
      : type === "Supply"
        ? getSupplyContact(result)
        : getSaasContact(result);

  if (!contactIsGold(type, result, contact)) {
    stats.noContact++;
    return undefined;
  }

  const lead = makeProcessedLead(
    result,
    type,
    skill,
    contact
  );

  if (!lead.title || !lead.sourceUrl) {
    stats.invalid++;
    return undefined;
  }

  stats.accepted++;

  return lead;
}

async function collectAndInsert(
  results: SearchResult[],
  skills: SkillRow[]
): Promise<{
  stats: LeadStats;
  insertedByType: InsertedByType;
}> {
  const stats = emptyStats();
  const insertedByType = emptyInsertedByType();

  const processed = new Set<string>();

  for (const result of results) {
    const lead = await processResult(
      result,
      skills,
      stats
    );

    if (!lead) continue;

    const dedupeKey = [
      lead.type,
      normalize(lead.title),
      normalize(lead.sourceUrl),
      normalize(lead.contactUrl),
    ].join("|");

    if (processed.has(dedupeKey)) {
      stats.duplicate++;
      continue;
    }

    processed.add(dedupeKey);

    try {
      const exists = await leadAlreadyExists(
        lead.type,
        lead
      );

      if (exists) {
        stats.duplicate++;
        continue;
      }

      await insertLead(lead);

      stats.inserted++;

      insertedByType[lead.type]++;
    } catch (error) {
      stats.insertErrors++;

      console.error(
        `Failed to insert ${lead.type} lead:`,
        error
      );
    }
  }

  return {
    stats,
    insertedByType,
  };
}

function buildDiagnostics(
  stats: LeadStats,
  insertedByType: InsertedByType
) {
  return {
    overall: {
      found: stats.found,
      accepted: stats.accepted,
      inserted: stats.inserted,
      duplicate: stats.duplicate,
      wrongType: stats.wrongType,
      noSkill: stats.noSkill,
      noContact: stats.noContact,
      blocked: stats.blocked,
      stale: stats.stale,
      invalid: stats.invalid,
      insertErrors: stats.insertErrors,
    },
    insertedByType: {
      Demand: insertedByType.Demand,
      Supply: insertedByType.Supply,
      SaaS: insertedByType.SaaS,
    },
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}

export default async function handler(
  req: Request
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        message: "Method not allowed",
      },
      405
    );
  }

  try {
    if (!supabase) {
      return jsonResponse(
        {
          success: false,
          message:
            "Supabase environment variables are missing",
        },
        500
      );
    }

    console.log(
      "Opportunity Hub real lead collector started"
    );

    const skills = await loadSkills();

    if (skills.length === 0) {
      return jsonResponse({
        success: true,
        message:
          "No skills are configured, so no leads were collected.",
        added: 0,
        inserted: 0,
        insertedByType: emptyInsertedByType(),
        diagnostics: {
          overall: emptyStats(),
          insertedByType: emptyInsertedByType(),
        },
      });
    }

    const results = await fetchPublicSources();

    console.log(
      `Public sources returned ${results.length} unique results`
    );

    const collected = await collectAndInsert(
      results,
      skills
    );

    const diagnostics = buildDiagnostics(
      collected.stats,
      collected.insertedByType
    );

    console.log(
      "Lead collector diagnostics:",
      JSON.stringify(diagnostics)
    );

    return jsonResponse({
      success: true,
      message:
        collected.stats.inserted > 0
          ? `Added ${collected.stats.inserted} real leads.`
          : "No new qualifying real leads were found.",
      added: collected.stats.inserted,
      inserted: collected.stats.inserted,
      insertedByType: collected.insertedByType,
      diagnostics,
    });
  } catch (error) {
    console.error(
      "Lead collector failed:",
      error
    );

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Lead collector failed",
        added: 0,
        inserted: 0,
        insertedByType: emptyInsertedByType(),
        diagnostics: {
          overall: emptyStats(),
          insertedByType: emptyInsertedByType(),
        },
      },
      500
    );
  }
          }
