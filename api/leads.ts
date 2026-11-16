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
  company_name?: string;
  description?: string;

  skill?: string;
  skill_needed?: string;
  required_skill?: string;
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

function isEmailAddress(
  value: unknown
): boolean {
  const text = clean(value);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function isValidPhone(
  value: unknown
): boolean {
  const digits = clean(value).replace(/\D/g, "");

  return (
    digits.length >= 7 &&
    digits.length <= 15
  );
}

function isHttpUrl(
  value: unknown
): boolean {
  const text = clean(value);

  if (!text) return false;

  try {
    const parsed = new URL(text);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
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

/*
 * Content that is not a genuine
 * service request, work opportunity
 * or professional prospect.
 */
function isBlockedContent(
  lead: any
): boolean {
  const text = normalize([
    lead.title,
    lead.name,
    lead.description,
    lead.niche,
    lead.platform,
    lead.source,
    lead.source_url,
    lead.contact_url,
    lead.landing_url,
  ].filter(Boolean).join(" "));

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
  return normalize([
    lead.title,
    lead.name,
    lead.client_name,
    lead.company,
    lead.company_name,
    lead.description,
    lead.skill,
    lead.skill_needed,
    lead.required_skill,
    lead.category,
    lead.subcategory,
    lead.country,
    lead.city,
    lead.contact,
    lead.contact_name,
    lead.contact_email,
    lead.contact_phone,
    lead.contact_url,
    lead.source,
    lead.source_url,
    lead.platform,
    lead.niche,
  ].filter(Boolean).join(" "));
}

/*
 * DEMAND:
 * Someone actually requesting a service.
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
 * HIRING:
 * Employer or organization recruiting.
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
 * SUPPLY:
 * Hiring and genuine remote-work opportunities.
 */
const SUPPLY_TERMS = [
  ...HIRING_TERMS,
  "remote ok",
  "remote-ok",
  "remote friendly",
  "remote-friendly",
  "we work remotely",
  "work remotely",
  "remote position",
  "remote role",
  "remote opportunity",
  "work from home",
  "worldwide remote",
];

/*
 * SaaS professional prospects:
 * teachers, tutors, coaches,
 * freelancers and other professionals.
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
  
/*
 * Generic homepages are not valid
 * direct contact destinations.
 */
const GENERIC_HOMEPAGE_HOSTS = [
  "google.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "reddit.com",
  "youtube.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
];

function isGenericHomepage(
  value: unknown
): boolean {
  const url = clean(value);

  if (!isHttpUrl(url)) return true;

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");

    return (
      path === "" &&
      GENERIC_HOMEPAGE_HOSTS.some(
        (host) =>
          parsed.hostname === host ||
          parsed.hostname.endsWith("." + host)
      )
    );
  } catch {
    return true;
  }
}

/*
 * A contact must be usable.
 * A generic website homepage alone
 * is not sufficient.
 */
function hasRealContact(
  lead: any,
  type: LeadType
): boolean {
  const email =
    clean(lead.contact_email) ||
    clean(lead.email);

  const phone =
    clean(lead.contact_phone) ||
    clean(lead.phone);

  const contact =
    clean(lead.contact);

  const contactUrl =
    clean(lead.contact_url);

  const applyUrl =
    clean(lead.apply_url);

  const sourceUrl =
    clean(lead.source_url);

  if (
    email &&
    isEmailAddress(email)
  ) {
    return true;
  }

  if (
    phone &&
    isValidPhone(phone)
  ) {
    return true;
  }

  if (
    contact &&
    isEmailAddress(contact)
  ) {
    return true;
  }

  if (
    contact &&
    isValidPhone(contact)
  ) {
    return true;
  }

  if (
    contactUrl &&
    isHttpUrl(contactUrl) &&
    !isBlockedUrl(contactUrl) &&
    !isGenericHomepage(contactUrl)
  ) {
    return true;
  }

  /*
   * Supply opportunities may use
   * a specific application page.
   */
  if (
    type === "Supply" &&
    applyUrl &&
    isHttpUrl(applyUrl) &&
    !isBlockedUrl(applyUrl) &&
    !isGenericHomepage(applyUrl)
  ) {
    return true;
  }

  /*
   * A specific source post or profile
   * can be a contact route when it
   * is not merely a generic homepage.
   */
  if (
    sourceUrl &&
    isHttpUrl(sourceUrl) &&
    !isBlockedUrl(sourceUrl) &&
    !isGenericHomepage(sourceUrl)
  ) {
    return true;
  }

  return false;
}

/*
 * Demand and Supply must be fresh
 * within the last 72 hours.
 *
 * SaaS professional profiles are exempt.
 */
function isFreshWithin72Hours(
  lead: any
): boolean {
  const rawDate =
    lead.created_at ||
    lead.createdAt;

  if (!rawDate) return false;

  const timestamp =
    new Date(rawDate).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const age =
    Date.now() - timestamp;

  const limit =
    72 * 60 * 60 * 1000;

  return (
    age >= -5 * 60 * 1000 &&
    age <= limit
  );
}

/*
 * Demand validation:
 * The record must describe someone
 * requesting a service.
 */
function isGoldDemand(
  lead: any
): boolean {
  if (!lead || isBlockedContent(lead)) {
    return false;
  }

  if (!isFreshWithin72Hours(lead)) {
    return false;
  }

  const text = getLeadText(lead);

  /*
   * Hiring announcements belong
   * to Supply, not Demand.
   */
  if (
    containsAny(text, HIRING_TERMS)
  ) {
    return false;
  }

  if (
    !containsAny(text, DEMAND_TERMS)
  ) {
    return false;
  }

  /*
   * Reject service providers
   * advertising their own services.
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
      "hire me",
      "book my service",
    ])
  ) {
    return false;
  }

  if (
    !hasRealContact(lead, "Demand")
  ) {
    return false;
  }

  const skill = clean(
    lead.skill_needed ||
    lead.required_skill ||
    lead.skill ||
    lead.niche ||
    lead.category
  );

  if (!skill) {
    return false;
  }

  const country = clean(lead.country);

  if (!country) {
    return false;
  }

  return true;
}

/*
 * Supply validation:
 * The record must describe an actual
 * hiring or work opportunity.
 */
function isGoldSupply(
  lead: any
): boolean {
  if (!lead || isBlockedContent(lead)) {
    return false;
  }

  if (!isFreshWithin72Hours(lead)) {
    return false;
  }

  const text = getLeadText(lead);

  if (
    !containsAny(text, SUPPLY_TERMS)
  ) {
    return false;
  }

  /*
   * A service provider looking
   * for clients is not an employer.
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
    !hasRealContact(lead, "Supply")
  ) {
    return false;
  }

  const skill = clean(
    lead.required_skill ||
    lead.skill_needed ||
    lead.skill ||
    lead.niche
  );

  if (!skill) {
    return false;
  }

  const country = clean(lead.country);

  if (!country) {
    return false;
  }

  return true;
}
/*
 * Convert Demand database records
 * into the Leads page format.
 */
function mapDemand(
  lead: any
): Lead {
  return {
    id: String(lead.id),

    type: "Demand",
    lead_type: "Demand",

    source: clean(lead.source),
    source_url: clean(lead.source_url),

    title:
      clean(lead.title) ||
      clean(lead.skill_needed) ||
      "Service Request",

    name: clean(lead.client_name),
    client_name: clean(lead.client_name),

    company:
      clean(lead.company_name) ||
      clean(lead.company),

    description: clean(lead.description),

    skill: clean(
      lead.skill_needed ||
      lead.required_skill ||
      lead.skill
    ),

    skill_needed: clean(
      lead.skill_needed ||
      lead.required_skill ||
      lead.skill
    ),

    category: clean(lead.category),
    subcategory: clean(lead.subcategory),

    country: clean(lead.country),
    city: clean(lead.city),

    budget: lead.budget ?? "",
    currency: clean(lead.currency),

    contact:
      clean(lead.contact) ||
      clean(lead.contact_email) ||
      clean(lead.contact_phone),

    contact_name: clean(lead.contact_name),
    contact_email: clean(lead.contact_email),
    contact_phone: clean(lead.contact_phone),
    contact_url: clean(lead.contact_url),

    email: clean(lead.contact_email),
    phone: clean(lead.contact_phone),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.source_url),

    status: clean(lead.status),

    created_at: lead.created_at || null,
    createdAt: lead.created_at || null,
  };
}

/*
 * Convert Supply database records
 * into the Leads page format.
 */
function mapSupply(
  lead: any
): Lead {
  return {
    id: String(lead.id),

    type: "Supply",
    lead_type: "Supply",

    source: clean(lead.source),
    source_url: clean(lead.source_url),

    title:
      clean(lead.job_title) ||
      clean(lead.position) ||
      clean(lead.name) ||
      "Opportunity",

    name: clean(lead.name),
    client_name: clean(lead.name),

    company: clean(lead.company_name),

    description: clean(lead.description),

    skill: clean(
      lead.required_skill ||
      lead.skill_needed ||
      lead.skill
    ),

    skill_needed: clean(
      lead.required_skill ||
      lead.skill_needed ||
      lead.skill
    ),

    category: clean(lead.category),
    subcategory: clean(lead.subcategory),

    country: clean(lead.country),
    city: clean(lead.city),

    budget:
      clean(lead.salary_range) ||
      lead.salary_max ||
      lead.salary_min ||
      "",

    currency: clean(lead.currency),

    contact:
      clean(lead.contact) ||
      clean(lead.contact_email) ||
      clean(lead.contact_phone),

    contact_name: clean(lead.contact_name),
    contact_email: clean(lead.contact_email),
    contact_phone: clean(lead.contact_phone),
    contact_url: clean(lead.contact_url),

    email: clean(lead.contact_email),
    phone: clean(lead.contact_phone),

    company_website: clean(lead.company_website),
    apply_url: clean(lead.apply_url),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.apply_url) ||
      clean(lead.company_website) ||
      clean(lead.source_url),

    status: clean(lead.status),

    created_at: lead.created_at || null,
    createdAt: lead.created_at || null,
  };
}

/*
 * Convert SaaS professional prospects
 * into the Leads page format.
 */
function mapSaas(
  lead: any
): Lead {
  const contact = clean(lead.contact);

  const contactEmail =
    isEmailAddress(contact)
      ? contact
      : clean(lead.contact_email);

  const contactUrl =
    clean(lead.contact_url) ||
    (isHttpUrl(contact) ? contact : "");

  return {
    id: String(lead.id),

    type: "SaaS",
    lead_type: "SaaS",

    source: clean(lead.source),
    source_url: clean(lead.source_url),

    name: clean(lead.name),
    client_name: clean(lead.name),
    company: clean(lead.name),

    title:
      clean(lead.name) ||
      "Opportunity Hub Prospect",

    platform: clean(lead.platform),
    niche: clean(lead.niche),

    description: clean(lead.description),

    skill: clean(lead.niche),
    skill_needed: clean(lead.niche),

    category: "SaaS",
    subcategory: clean(lead.niche),

    country: clean(lead.country),
    city: clean(lead.city),

    contact:
      contact ||
      contactEmail ||
      clean(lead.contact_phone),

    email: contactEmail,
    contact_email: contactEmail,

    contact_url: contactUrl,

    landing_url: clean(lead.landing_url),

    openUrl:
      contactUrl ||
      clean(lead.landing_url) ||
      clean(lead.source_url),

    status: clean(lead.status),

    created_at: lead.created_at || null,
    createdAt: lead.created_at || null,
  };
}

/*
 * Sort newest records first.
 */
function sortByCreatedAt(
  a: any,
  b: any
): number {
  const dateA =
    new Date(a.created_at || 0).getTime();

  const dateB =
    new Date(b.created_at || 0).getTime();

  return dateB - dateA;
}

/*
 * Load Demand records.
 */
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
      .filter(isGoldDemand)
      .map(mapDemand);

  } catch (error: any) {
    console.error(
      "Demand leads exception:",
      error?.message || String(error)
    );

    return [];
  }
}

/*
 * Load Supply records.
 */
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
      .filter(isGoldSupply)
      .map(mapSupply);

  } catch (error: any) {
    console.error(
      "Supply leads exception:",
      error?.message || String(error)
    );

    return [];
  }
}

/*
 * Load SaaS professional prospects.
 */
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
      .filter(isGoldSaas)
      .map(mapSaas);

  } catch (error: any) {
    console.error(
      "SaaS leads exception:",
      error?.message || String(error)
    );

    return [];
  }
    }
function isGoldSaas(lead: Lead): boolean {
  const text = getLeadText(lead);

  if (!text || isBlockedContent(text)) {
    return false;
  }

  if (!containsAny(text, PROFESSIONAL_TERMS)) {
    return false;
  }

  if (
    containsAny(text, DEMAND_TERMS) ||
    containsAny(text, HIRING_TERMS)
  ) {
    return false;
  }

  const skill = clean(
    lead.skill ||
    lead.skill_needed ||
    lead.required_skill ||
    lead.niche ||
    lead.category
  );

  const country = clean(lead.country);

  if (!skill || !country) {
    return false;
  }

  return hasRealContact(lead, "SaaS");
}

function getEnv(name: string): string {
  return clean(process.env[name]);
}

function getSupabaseClient() {
  const supabaseUrl =
    getEnv("SUPABASE_URL") ||
    getEnv("VITE_SUPABASE_URL");

  const supabaseKey =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_SERVICE_ROLE") ||
    getEnv("SUPABASE_ANON_KEY") ||
    getEnv("VITE_SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase URL or API key environment variable."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function loadAllLeads(
  supabase: any,
  requestedCategory: string
) {
  const normalizedCategory =
    normalize(requestedCategory);

  const includeAll =
    !normalizedCategory ||
    normalizedCategory === "all";

  const includeDemand =
    includeAll || normalizedCategory === "demand";

  const includeSupply =
    includeAll || normalizedCategory === "supply";

  const includeSaas =
    includeAll || normalizedCategory === "saas";

  const [
    demandLeads,
    supplyLeads,
    saasLeads,
  ] = await Promise.all([
    includeDemand
      ? loadDemandLeads(supabase)
      : Promise.resolve([]),

    includeSupply
      ? loadSupplyLeads(supabase)
      : Promise.resolve([]),

    includeSaas
      ? loadSaasLeads(supabase)
      : Promise.resolve([]),
  ]);

  const leads = [
    ...demandLeads,
    ...supplyLeads,
    ...saasLeads,
  ];

  sortByCreatedAt(leads);

  return {
    leads,
    counts: {
      demand: demandLeads.length,
      supply: supplyLeads.length,
      saas: saasLeads.length,
      total: leads.length,
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

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use GET.",
    });
  }

  try {
    const requestedCategory = clean(
      req.query?.category || "all"
    ).toLowerCase();

    const allowedCategories = [
      "all",
      "demand",
      "supply",
      "saas",
    ];

    if (!allowedCategories.includes(requestedCategory)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid category. Use all, demand, supply, or saas.",
      });
    }

    const supabase = getSupabaseClient();

    const result = await loadAllLeads(
      supabase,
      requestedCategory
    );

    return res.status(200).json({
      success: true,
      leads: result.leads,
      count: result.leads.length,
      counts: result.counts,
      category: requestedCategory,
    });
  } catch (error: any) {
    const message =
      error?.message || "Unable to load leads.";

    console.error("API /api/leads error:", error);

    return res.status(500).json({
      success: false,
      message,
    });
  }
}
