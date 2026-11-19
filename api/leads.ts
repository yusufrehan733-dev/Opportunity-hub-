
import { createClient } from "@supabase/supabase-js";

type LeadType = "Demand" | "Supply" | "SaaS";

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
  short_description?: string;
  skill?: string;
  skill_needed?: string;
  required_skill?: string;
  category?: string;
  subcategory?: string;
  country?: string;
  city?: string;
  budget?: string | number;
  currency?: string;
  salary_range?: string;
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
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isEmailAddress(value: unknown): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    clean(value)
  );
}

function isHttpUrl(value: unknown): boolean {
  try {
    const url = new URL(clean(value));

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function shortDescription(
  value: unknown,
  limit = 180
): string {
  const description = clean(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (description.length <= limit) {
    return description;
  }

  const shortened = description.slice(0, limit);
  const lastSpace = shortened.lastIndexOf(" ");

  return (
    shortened.slice(
      0,
      lastSpace > 100 ? lastSpace : limit
    ).trim() + "..."
  );
}

function sortByCreatedAt(
  a: Lead,
  b: Lead
): number {
  const dateA = new Date(
    a.created_at || 0
  ).getTime();

  const dateB = new Date(
    b.created_at || 0
  ).getTime();

  return (
    (Number.isFinite(dateB) ? dateB : 0) -
    (Number.isFinite(dateA) ? dateA : 0)
  );
}
function mapDemand(lead: any): Lead {
  const description = shortDescription(
    lead.description || lead.content
  );

  const contactEmail =
    clean(lead.contact_email);

  const contactPhone =
    clean(lead.contact_phone);

  const contactUrl =
    clean(lead.contact_url);

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

    name: clean(lead.client_name || lead.name),
    client_name: clean(
      lead.client_name || lead.name
    ),

    company: clean(
      lead.company_name || lead.company
    ),

    description,
    short_description: description,

    skill: clean(
      lead.skill_needed ||
      lead.required_skill ||
      lead.skill ||
      lead.category
    ),

    skill_needed: clean(
      lead.skill_needed ||
      lead.required_skill ||
      lead.skill ||
      lead.category
    ),

    category: clean(lead.category),
    subcategory: clean(lead.subcategory),

    country: clean(lead.country),
    city: clean(lead.city),

    budget: lead.budget ?? "",
    currency: clean(lead.currency),

    contact:
      clean(lead.contact) ||
      contactEmail ||
      contactPhone ||
      contactUrl,

    contact_name: clean(lead.contact_name),
    contact_email: contactEmail,
    contact_phone: contactPhone,
    contact_url: contactUrl,

    email: contactEmail,
    phone: contactPhone,

    openUrl:
      contactUrl ||
      clean(lead.source_url),

    status: clean(lead.status),

    created_at: lead.created_at || null,
    createdAt: lead.created_at || null,
  };
}

function mapSupply(lead: any): Lead {
  const description = shortDescription(
    lead.description
  );

  const contactEmail =
    clean(lead.contact_email);

  const contactPhone =
    clean(lead.contact_phone);

  const contactUrl =
    clean(lead.contact_url);

  const applyUrl =
    clean(lead.apply_url);

  const companyWebsite =
    clean(lead.company_website);

  const salaryRange =
    clean(lead.salary_range) ||
    (
      lead.salary_min !== null &&
      lead.salary_min !== undefined
        ? String(lead.salary_min)
        : ""
    );

  return {
    id: String(lead.id),

    type: "Supply",
    lead_type: "Supply",

    source: clean(lead.source),
    source_url: clean(lead.source_url),

    title:
      clean(lead.job_title) ||
      clean(lead.position) ||
      clean(lead.title) ||
      clean(lead.name) ||
      "Opportunity",

    name: clean(lead.name),
    client_name: clean(lead.name),

    company: clean(lead.company_name),
    company_name: clean(lead.company_name),

    description,
    short_description: description,

    skill: clean(
      lead.required_skill ||
      lead.skill_needed ||
      lead.skill ||
      lead.niche
    ),

    skill_needed: clean(
      lead.required_skill ||
      lead.skill_needed ||
      lead.skill ||
      lead.niche
    ),

    required_skill: clean(
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

    salary_range: salaryRange,
    currency: clean(lead.currency),

    contact:
      clean(lead.contact) ||
      contactEmail ||
      contactPhone ||
      contactUrl,

    contact_name: clean(lead.contact_name),
    contact_email: contactEmail,
    contact_phone: contactPhone,
    contact_url: contactUrl,

    email: contactEmail,
    phone: contactPhone,

    company_website: companyWebsite,
    apply_url: applyUrl,

    openUrl:
      contactUrl ||
      applyUrl ||
      clean(lead.source_url) ||
      companyWebsite ||
      clean(lead.landing_url),

    status: clean(lead.status),

    created_at: lead.created_at || null,
    createdAt: lead.created_at || null,
  };
  }
  
function mapSaas(lead: any): Lead {
  const contact = clean(lead.contact);

  const contactEmail =
    isEmailAddress(contact)
      ? contact
      : clean(lead.contact_email);

  const contactUrl =
    clean(lead.contact_url) ||
    (isHttpUrl(contact) ? contact : "");

  const description = shortDescription(
    lead.description
  );

  return {
    id: String(lead.id),

    type: "SaaS",
    lead_type: "SaaS",

    source:
      clean(lead.source) ||
      clean(lead.platform),

    source_url: clean(lead.source_url),

    name: clean(lead.name),
    client_name: clean(lead.name),
    company: clean(lead.name),

    title:
      clean(lead.name) ||
      clean(lead.niche) ||
      "Professional Prospect",

    platform: clean(lead.platform),
    niche: clean(lead.niche),

    description,
    short_description: description,

    skill: clean(lead.niche),
    skill_needed: clean(lead.niche),

    category: "SaaS",
    subcategory: clean(lead.niche),

    country: clean(lead.country),
    city: clean(lead.city),

    contact:
      contact ||
      contactEmail ||
      contactUrl,

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

  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
      }
    
async function loadTable(
  supabase: any,
  table: string
): Promise<{
  rows: any[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        `${table} load error:`,
        error.message
      );

      return {
        rows: [],
        error: error.message,
      };
    }

    return {
      rows: Array.isArray(data) ? data : [],
      error: null,
    };
  } catch (error: any) {
    const message =
      error?.message ||
      `Unable to load ${table}.`;

    console.error(
      `${table} exception:`,
      message
    );

    return {
      rows: [],
      error: message,
    };
  }
}

async function loadAllLeads(
  supabase: any,
  requestedCategory: string
) {
  const includeAll =
    requestedCategory === "all";

  const includeDemand =
    includeAll ||
    requestedCategory === "demand";

  const includeSupply =
    includeAll ||
    requestedCategory === "supply";

  const includeSaas =
    includeAll ||
    requestedCategory === "saas";

  const [
    demandResult,
    supplyResult,
    saasResult,
  ] = await Promise.all([
    includeDemand
      ? loadTable(supabase, "demand_leads")
      : Promise.resolve({
          rows: [],
          error: null,
        }),

    includeSupply
      ? loadTable(supabase, "supply_leads")
      : Promise.resolve({
          rows: [],
          error: null,
        }),

    includeSaas
      ? loadTable(supabase, "saas_leads")
      : Promise.resolve({
          rows: [],
          error: null,
        }),
  ]);

  const demandLeads =
    demandResult.rows.map(mapDemand);

  const supplyLeads =
    supplyResult.rows.map(mapSupply);

  const saasLeads =
    saasResult.rows.map(mapSaas);

  const leads: Lead[] = [
    ...demandLeads,
    ...supplyLeads,
    ...saasLeads,
  ];

  leads.sort(sortByCreatedAt);

  const errors: Record<string, string> = {};

  if (demandResult.error) {
    errors.demand = demandResult.error;
  }

  if (supplyResult.error) {
    errors.supply = supplyResult.error;
  }

  if (saasResult.error) {
    errors.saas = saasResult.error;
  }

  const requestedTables = [
    ...(includeDemand ? ["demand"] : []),
    ...(includeSupply ? ["supply"] : []),
    ...(includeSaas ? ["saas"] : []),
  ];

  const successfulTables =
    requestedTables.length -
    Object.keys(errors).length;

  return {
    leads,

    counts: {
      demand: demandLeads.length,
      supply: supplyLeads.length,
      saas: saasLeads.length,
      total: leads.length,
    },

    errors,
    successfulTables,
    requestedTables: requestedTables.length,
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
    const requestedCategory = normalize(
      req.query?.category || "all"
    );

    const allowedCategories = [
      "all",
      "demand",
      "supply",
      "saas",
    ];

    if (
      !allowedCategories.includes(
        requestedCategory
      )
    ) {
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

    if (
      result.successfulTables === 0 &&
      result.requestedTables > 0
    ) {
      return res.status(500).json({
        success: false,
        message: "Unable to load leads from Supabase.",
        errors: result.errors,
      });
    }

    return res.status(200).json({
      success: true,
      leads: result.leads,
      count: result.leads.length,
      counts: result.counts,
      category: requestedCategory,
      errors: result.errors,
      partial:
        Object.keys(result.errors).length > 0,
    });
  } catch (error: any) {
    const message =
      error?.message ||
      "Unable to load leads.";

    console.error(
      "API /api/leads error:",
      error
    );

    return res.status(500).json({
      success: false,
      message,
    });
  }
        }
