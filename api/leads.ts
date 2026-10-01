import { createClient } from "@supabase/supabase-js";

type LeadType =
  | "Demand"
  | "Supply"
  | "SaaS";

type Lead = {
  id: string;
  type: LeadType;
  lead_type: LeadType;

  source?: string;
  source_url?: string;

  title?: string;
  name?: string;
  client_name?: string;
  company?: string;

  description?: string;

  skill?: string;
  skill_needed?: string;
  category?: string;
  subcategory?: string;

  country?: string;
  city?: string;

  budget?: string | number;
  currency?: string;

  contact?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_url?: string;

  email?: string;
  phone?: string;

  company_website?: string;
  apply_url?: string;
  landing_url?: string;
  openUrl?: string;

  platform?: string;
  niche?: string;

  status?: string;

  created_at?: string | null;
  createdAt?: string | null;
};

function clean(value: unknown): string {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(
  text: string,
  terms: string[]
): boolean {
  const value = normalize(text);

  return terms.some((term) =>
    value.includes(normalize(term))
  );
}

function isBlockedUrl(
  value: unknown
): boolean {
  const url = normalize(value);

  if (!url) return false;

  const blocked = [
    "amazon.",
    "daraz.",
    "ebay.",
    "fiverr.",
    "upwork.",
    "freelancer.com",
    "peopleperhour.com",
    "guru.com",
    "indeed.com",
    "glassdoor.com",
    "ziprecruiter.com",
    "udemy.com",
    "coursera.org",
    "skillshare.com",
  ];

  return blocked.some((domain) =>
    url.includes(domain)
  );
}

function isBlockedContent(
  lead: any
): boolean {
  const text = normalize(
    [
      lead.title,
      lead.name,
      lead.description,
      lead.niche,
      lead.platform,
      lead.source,
      lead.source_url,
      lead.contact_url,
      lead.landing_url,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return containsAny(text, [
    "ebook",
    "webinar",
    "newsletter",
    "blog post",
    "news article",
    "directory",
    "marketplace",
    "software download",
    "app download",
    "shopping",
    "coupon",
    "product listing",
    "course",
    "online course",
    "training course",
  ]);
}

function getLeadText(
  lead: any
): string {
  return normalize(
    [
      lead.title,
      lead.name,
      lead.client_name,
      lead.company,
      lead.description,
      lead.skill,
      lead.skill_needed,
      lead.category,
      lead.subcategory,
      lead.country,
      lead.city,
      lead.contact,
      lead.contact_name,
      lead.contact_email,
      lead.contact_phone,
      lead.contact_url,
      lead.source_url,
      lead.platform,
      lead.niche,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

/*
 * IMPORTANT:
 * A Demand lead means someone is actually
 * asking for a service.
 *
 * Examples:
 * "I need a Quran teacher"
 * "Looking for a math tutor"
 * "Need a designer"
 *
 * Hiring/job-opening language is NOT Demand.
 */
const DEMAND_TERMS = [
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

/*
 * These phrases mean the record is more
 * likely an employment/supply opportunity.
 */
const HIRING_TERMS = [
  "we are hiring",
  "we're hiring",
  "hiring a",
  "hiring an",
  "hiring teachers",
  "hiring tutors",
  "hiring coaches",
  "job opening",
  "job vacancy",
  "vacancy",
  "career opportunity",
  "apply now",
  "apply here",
  "join our team",
  "position available",
  "open position",
  "recruiting",
  "recruitment",
  "employment opportunity",
];

/*
 * SaaS is NOT "someone who needs a service".
 *
 * SaaS is a professional prospect:
 * teacher, tutor, coach, consultant, etc.
 * who can potentially use Opportunity Hub.
 */
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
  "therapist",
  "instructor",
];

const GENERIC_PAGE_TERMS = [
  "/search",
  "/jobs",
  "/job/",
  "/category",
  "/categories",
  "/tag/",
  "/tags/",
  "/topics/",
  "/forum",
  "/forums",
  "/article/",
  "/articles/",
  "/blog/",
  "/news/",
  "/resources/",
  "/resource/",
  "/courses/",
  "/course/",
  "/training/",
  "/webinar/",
  "/events/",
];

const GENERIC_HOMEPAGE_HOSTS = [
  "frame.io",
  "hightouch.com",
  "lithic.com",
];

function getHost(
  value: unknown
): string {
  const url = clean(value);

  if (!url) return "";

  try {
    return new URL(url).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isGenericHomepage(
  url: unknown
): boolean {
  const value = clean(url);

  if (!value) return true;

  try {
    const parsed = new URL(value);

    const host = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    const path =
      parsed.pathname
        .toLowerCase()
        .replace(/\/+$/, "");

    if (
      GENERIC_HOMEPAGE_HOSTS.includes(
        host
      ) &&
      (path === "" || path === "/")
    ) {
      return true;
    }

    if (
      GENERIC_PAGE_TERMS.some(
        (term) =>
          path.includes(term)
      )
    ) {
      return true;
    }

    return (
      path === "" ||
      path === "/"
    );
  } catch {
    return true;
  }
}

function hasRealContact(
  lead: any,
  type: LeadType
): boolean {
  const email = clean(
    lead.contact_email ||
      lead.email
  );

  const phone = clean(
    lead.contact_phone ||
      lead.phone
  );

  const contact = clean(
    lead.contact
  );

  const contactUrl = clean(
    lead.contact_url
  );

  const sourceUrl = clean(
    lead.source_url
  );

  if (
    email ||
    phone ||
    contact
  ) {
    return true;
  }

  if (
    contactUrl &&
    !isGenericHomepage(contactUrl)
  ) {
    return true;
  }

  /*
   * SaaS may use a specific public
   * professional profile as its contact
   * path, but NOT a generic homepage.
   */
  if (
    type === "SaaS" &&
    sourceUrl &&
    !isGenericHomepage(sourceUrl)
  ) {
    const host =
      getHost(sourceUrl);

    return (
      host.includes("linkedin.") ||
      host.includes("facebook.") ||
      host.includes("instagram.") ||
      host.includes("x.com") ||
      host.includes("twitter.") ||
      host.includes("t.me") ||
      host.includes("telegram.")
    );
  }

  return false;
}
function isGoldDemand(
  lead: any
): boolean {
  const text =
    getLeadText(lead);

  if (!text) return false;

  if (
    isBlockedUrl(
      lead.source_url
    ) ||
    isBlockedUrl(
      lead.contact_url
    )
  ) {
    return false;
  }

  if (
    isBlockedContent(lead)
  ) {
    return false;
  }

  /*
   * Demand must contain actual
   * service-request language.
   */
  if (
    !containsAny(
      text,
      DEMAND_TERMS
    )
  ) {
    return false;
  }

  /*
   * Hiring is Supply, not Demand.
   */
  if (
    containsAny(
      text,
      HIRING_TERMS
    )
  ) {
    return false;
  }

  /*
   * Demand must have a real
   * contact path.
   */
  if (
    !hasRealContact(
      lead,
      "Demand"
    )
  ) {
    return false;
  }

  /*
   * Demand needs a skill.
   */
  const skill =
    clean(
      lead.skill_needed ||
        lead.skill ||
        lead.required_skill ||
        lead.niche
    );

  if (!skill) {
    return false;
  }

  /*
   * Demand needs country information
   * because the Leads page filters it
   * by country.
   */
  if (
    !clean(lead.country)
  ) {
    return false;
  }

  return true;
}

function isGoldSupply(
  lead: any
): boolean {
  const text =
    getLeadText(lead);

  if (!text) return false;

  if (
    isBlockedUrl(
      lead.source_url
    ) ||
    isBlockedUrl(
      lead.contact_url
    )
  ) {
    return false;
  }

  if (
    isBlockedContent(lead)
  ) {
    return false;
  }

  /*
   * Supply must represent an
   * organization/opportunity.
   */
  const organization =
    containsAny(text, [
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
    ]);

  if (!organization) {
    return false;
  }

  /*
   * Supply must contain hiring/
   * opportunity language.
   */
  if (
    !containsAny(
      text,
      HIRING_TERMS
    )
  ) {
    return false;
  }

  /*
   * A Supply record cannot simply
   * be a person looking for clients.
   */
  if (
    containsAny(text, [
      "looking for students",
      "looking for clients",
      "looking for customers",
      "seeking students",
      "seeking clients",
      "seeking customers",
      "i offer",
      "i provide",
      "my services",
    ])
  ) {
    return false;
  }

  if (
    !hasRealContact(
      lead,
      "Supply"
    )
  ) {
    return false;
  }

  const skill =
    clean(
      lead.required_skill ||
        lead.skill_needed ||
        lead.skill ||
        lead.niche
    );

  if (!skill) {
    return false;
  }

  if (
    !clean(lead.country)
  ) {
    return false;
  }

  return true;
}

function isGoldSaas(
  lead: any
): boolean {
  const text =
    getLeadText(lead);

  if (!text) return false;

  if (
    isBlockedUrl(
      lead.source_url
    ) ||
    isBlockedUrl(
      lead.contact_url
    ) ||
    isBlockedUrl(
      lead.landing_url
    )
  ) {
    return false;
  }

  if (
    isBlockedContent(lead)
  ) {
    return false;
  }

  /*
   * SaaS must represent a real
   * professional prospect.
   */
  if (
    !containsAny(
      text,
      PROFESSIONAL_TERMS
    )
  ) {
    return false;
  }

  /*
   * VERY IMPORTANT:
   * Someone actively requesting
   * a service is Demand, not SaaS.
   */
  if (
    containsAny(
      text,
      DEMAND_TERMS
    )
  ) {
    return false;
  }

  /*
   * Hiring/job records are not SaaS.
   */
  if (
    containsAny(
      text,
      HIRING_TERMS
    )
  ) {
    return false;
  }

  /*
   * Reject obvious employment
   * and application pages.
   */
  if (
    containsAny(text, [
      "job listing",
      "job posting",
      "employment opportunity",
      "apply now",
      "apply here",
      "application deadline",
      "submit application",
      "careers page",
      "career page",
    ])
  ) {
    return false;
  }

  /*
   * Reject generic educational
   * content and training pages.
   */
  if (
    containsAny(text, [
      "why should i become",
      "how to become",
      "teacher training",
      "teacher certification",
      "teaching resources",
      "lesson resources",
      "training program",
      "course curriculum",
      "online course",
    ])
  ) {
    return false;
  }

  /*
   * SaaS needs a country.
   * Unlike Demand/Supply, we do
   * NOT require a selected skill here.
   */
  if (
    !clean(lead.country)
  ) {
    return false;
  }

  /*
   * Most important SaaS Gold rule:
   * a generic company homepage is
   * not a contact path.
   */
  if (
    !hasRealContact(
      lead,
      "SaaS"
    )
  ) {
    return false;
  }

  return true;
}

function mapDemand(
  lead: any
): Lead {
  return {
    id: String(lead.id),

    type: "Demand",
    lead_type: "Demand",

    source:
      clean(lead.source),

    source_url:
      clean(lead.source_url),

    title:
      clean(lead.title) ||
      clean(lead.skill_needed) ||
      "Service Request",

    name:
      clean(lead.client_name),

    client_name:
      clean(lead.client_name),

    company:
      clean(lead.company_name) ||
      clean(lead.company),

    description:
      clean(lead.description),

    skill:
      clean(
        lead.skill_needed ||
          lead.skill
      ),

    skill_needed:
      clean(
        lead.skill_needed ||
          lead.skill
      ),

    category:
      clean(lead.category),

    subcategory:
      clean(lead.subcategory),

    country:
      clean(lead.country),

    city:
      clean(lead.city),

    budget:
      lead.budget ??
      "",

    currency:
      clean(lead.currency),

    contact:
      clean(lead.contact) ||
      clean(lead.contact_email) ||
      clean(lead.contact_phone),

    contact_name:
      clean(lead.contact_name),

    contact_email:
      clean(lead.contact_email),

    contact_phone:
      clean(lead.contact_phone),

    contact_url:
      clean(lead.contact_url),

    email:
      clean(lead.contact_email),

    phone:
      clean(lead.contact_phone),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.source_url),

    status:
      clean(lead.status),

    created_at:
      lead.created_at || null,

    createdAt:
      lead.created_at || null,
  };
}

function mapSupply(
  lead: any
): Lead {
  return {
    id: String(lead.id),

    type: "Supply",
    lead_type: "Supply",

    source:
      clean(lead.source),

    source_url:
      clean(lead.source_url),

    title:
      clean(lead.job_title) ||
      clean(lead.position) ||
      clean(lead.name) ||
      "Opportunity",

    name:
      clean(lead.name),

    client_name:
      clean(lead.name),

    company:
      clean(lead.company_name),

    description:
      clean(lead.description),

    skill:
      clean(
        lead.required_skill ||
          lead.skill_needed ||
          lead.skill
      ),

    skill_needed:
      clean(
        lead.required_skill ||
          lead.skill_needed ||
          lead.skill
      ),

    category:
      clean(lead.category),

    subcategory:
      clean(lead.subcategory),

    country:
      clean(lead.country),

    city:
      clean(lead.city),

    budget:
      clean(
        lead.salary_range
      ) ||
      lead.salary_max ||
      lead.salary_min ||
      "",

    currency:
      clean(lead.currency),

    contact:
      clean(lead.contact) ||
      clean(lead.contact_email) ||
      clean(lead.contact_phone),

    contact_name:
      clean(lead.contact_name),

    contact_email:
      clean(lead.contact_email),

    contact_phone:
      clean(lead.contact_phone),

    contact_url:
      clean(lead.contact_url),

    email:
      clean(lead.contact_email),

    phone:
      clean(lead.contact_phone),

    company_website:
      clean(lead.company_website),

    apply_url:
      clean(lead.apply_url),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.apply_url) ||
      clean(lead.company_website) ||
      clean(lead.source_url),

    status:
      clean(lead.status),

    created_at:
      lead.created_at || null,

    createdAt:
      lead.created_at || null,
  };
    }
function mapSaas(
  lead: any
): Lead {
  return {
    id: String(lead.id),

    type: "SaaS",
    lead_type: "SaaS",

    source:
      clean(lead.source),

    source_url:
      clean(lead.source_url),

    name:
      clean(lead.name),

    client_name:
      clean(lead.name),

    company:
      clean(lead.name),

    title:
      clean(lead.name) ||
      "Opportunity Hub Prospect",

    platform:
      clean(lead.platform),

    niche:
      clean(lead.niche),

    description:
      clean(lead.description),

    skill:
      clean(lead.niche),

    skill_needed:
      clean(lead.niche),

    category:
      "SaaS",

    subcategory:
      clean(lead.niche),

    country:
      clean(lead.country),

    city:
      clean(lead.city),

    contact:
      clean(lead.contact),

    email:
      clean(lead.contact),

    contact_email:
      clean(lead.contact),

    contact_url:
      clean(lead.contact_url),

    landing_url:
      clean(lead.landing_url),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.landing_url) ||
      clean(lead.source_url),

    status:
      clean(lead.status),

    created_at:
      lead.created_at || null,

    createdAt:
      lead.created_at || null,
  };
}

function getEnv(
  name: string
): string {
  return clean(
    process.env[name]
  );
}

function getSupabaseClient() {
  const supabaseUrl =
    getEnv("SUPABASE_URL") ||
    getEnv("VITE_SUPABASE_URL");

  const supabaseKey =
    getEnv(
      "SUPABASE_SERVICE_ROLE_KEY"
    ) ||
    getEnv(
      "SUPABASE_SERVICE_ROLE"
    ) ||
    getEnv(
      "SUPABASE_ANON_KEY"
    ) ||
    getEnv(
      "VITE_SUPABASE_ANON_KEY"
    );

  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase URL environment variable."
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "Missing Supabase key environment variable."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseKey
  );
}

function sortByCreatedAt(
  a: any,
  b: any
): number {
  const dateA =
    new Date(
      a.created_at || 0
    ).getTime();

  const dateB =
    new Date(
      b.created_at || 0
    ).getTime();

  return dateB - dateA;
}

async function loadDemandLeads(
  supabase: any
): Promise<Lead[]> {
  try {
    const {
      data,
      error,
    } = await supabase
      .from("demand_leads")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Demand leads load error:",
        error.message
      );

      return [];
    }

    return (data || [])
      .filter(
        isGoldDemand
      )
      .map(
        mapDemand
      );
  } catch (error: any) {
    console.error(
      "Demand leads exception:",
      error?.message ||
        String(error)
    );

    return [];
  }
}

async function loadSupplyLeads(
  supabase: any
): Promise<Lead[]> {
  try {
    const {
      data,
      error,
    } = await supabase
      .from("supply_leads")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Supply leads load error:",
        error.message
      );

      return [];
    }

    return (data || [])
      .filter(
        isGoldSupply
      )
      .map(
        mapSupply
      );
  } catch (error: any) {
    console.error(
      "Supply leads exception:",
      error?.message ||
        String(error)
    );

    return [];
  }
}

async function loadSaasLeads(
  supabase: any
): Promise<Lead[]> {
  try {
    const {
      data,
      error,
    } = await supabase
      .from("saas_leads")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "SaaS leads load error:",
        error.message
      );

      return [];
    }

    return (data || [])
      .filter(
        isGoldSaas
      )
      .map(
        mapSaas
      );
  } catch (error: any) {
    console.error(
      "SaaS leads exception:",
      error?.message ||
        String(error)
    );

    return [];
  }
      }
async function loadAllLeads(
  supabase: any,
  requestedCategory: string
) {
  const category =
    normalize(
      requestedCategory
    ) || "all";

  let demandLeads: Lead[] = [];
  let supplyLeads: Lead[] = [];
  let saasLeads: Lead[] = [];

  /*
   * Only load the table requested.
   *
   * Demand -> demand_leads
   * Supply -> supply_leads
   * SaaS    -> saas_leads
   * All     -> all three
   */
  if (
    category === "all" ||
    category === "demand"
  ) {
    demandLeads =
      await loadDemandLeads(
        supabase
      );
  }

  if (
    category === "all" ||
    category === "supply"
  ) {
    supplyLeads =
      await loadSupplyLeads(
        supabase
      );
  }

  if (
    category === "all" ||
    category === "saas"
  ) {
    saasLeads =
      await loadSaasLeads(
        supabase
      );
  }

  const leads: Lead[] = [
    ...demandLeads,
    ...supplyLeads,
    ...saasLeads,
  ].sort(
    sortByCreatedAt
  );

  return {
    leads,

    counts: {
      demand:
        demandLeads.length,

      supply:
        supplyLeads.length,

      saas:
        saasLeads.length,

      total:
        leads.length,
    },
  };
}

export default async function handler(
  req: any,
  res: any
) {
  if (
    req.method !== "GET"
  ) {
    return res.status(405).json({
      success: false,

      leads: [],

      count: 0,

      counts: {
        demand: 0,
        supply: 0,
        saas: 0,
        total: 0,
      },

      error:
        "Method not allowed",
    });
  }

  try {
    const supabase =
      getSupabaseClient();

    /*
     * The Leads page may send:
     *
     * ?category=demand
     * ?category=supply
     * ?category=saas
     * ?category=all
     *
     * Default = all.
     */
    const requestedCategory =
      clean(
        req.query?.category ||
          "all"
      );

    const allowedCategories = [
      "all",
      "demand",
      "supply",
      "saas",
    ];

    const normalizedCategory =
      normalize(
        requestedCategory
      );

    /*
     * Never silently interpret an
     * unknown category as a different
     * lead type.
     */
    if (
      !allowedCategories.includes(
        normalizedCategory
      )
    ) {
      return res.status(400).json({
        success: false,

        leads: [],

        count: 0,

        counts: {
          demand: 0,
          supply: 0,
          saas: 0,
          total: 0,
        },

        error:
          "Invalid lead category. Use all, demand, supply, or saas.",
      });
    }

    const result =
      await loadAllLeads(
        supabase,
        normalizedCategory
      );

    return res.status(200).json({
      success: true,

      leads:
        result.leads,

      count:
        result.leads.length,

      counts:
        result.counts,

      category:
        normalizedCategory,
    });
  } catch (error: any) {
    const message =
      error?.message ||
      String(error) ||
      "Unable to load leads";

    console.error(
      "LEADS_API_REAL_ERROR:",
      message
    );

    return res.status(500).json({
      success: false,

      leads: [],

      count: 0,

      counts: {
        demand: 0,
        supply: 0,
        saas: 0,
        total: 0,
      },

      error: message,
    });
  }
}
