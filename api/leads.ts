import { createClient } from "@supabase/supabase-js";

type LeadType =
  | "Demand"
  | "Supply"
  | "SaaS";


function clean(value: any): string {
  return String(value ?? "").trim();
}


function hasIdentity(
  ...values: any[]
): boolean {
  return values.some(
    (value) =>
      clean(value).length > 0
  );
}


function hasActionableContact(
  ...values: any[]
): boolean {
  return values.some((value) => {
    const text = clean(value);

    if (!text) {
      return false;
    }

    return (
      text.includes("@") ||
      text.startsWith("http://") ||
      text.startsWith("https://") ||
      text.startsWith("+") ||
      /^[0-9()\s.-]{7,}$/.test(text)
    );
  });
}


/*
 * ---------------------------------------------------------
 * DEMAND
 * ---------------------------------------------------------
 *
 * Demand must represent a genuine client/request for a
 * service and must have an actionable contact path.
 */
function isGoldDemand(
  lead: any
): boolean {
  const hasIdentityFields =
    hasIdentity(
      lead.client_name,
      lead.contact_name
    );

  const hasOpportunityContent =
    hasIdentity(
      lead.title,
      lead.description,
      lead.skill_needed,
      lead.content
    );

  const hasContact =
    hasActionableContact(
      lead.contact_email,
      lead.contact_phone,
      lead.contact_url,
      lead.source_url
    );

  return (
    hasIdentityFields &&
    hasOpportunityContent &&
    hasContact
  );
}


/*
 * ---------------------------------------------------------
 * SUPPLY
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 * The actual supply_leads table contains a "contact"
 * column. We include it here.
 *
 * Supply can also have:
 * contact_email
 * contact_phone
 * contact_url
 * apply_url
 * company_website
 * source_url
 */
function isGoldSupply(
  lead: any
): boolean {
  const hasIdentityFields =
    hasIdentity(
      lead.company_name,
      lead.contact_name
    );

  const hasOpportunityContent =
    hasIdentity(
      lead.job_title,
      lead.position,
      lead.description,
      lead.required_skill
    );

  const hasContact =
    hasActionableContact(
      lead.contact,
      lead.contact_email,
      lead.contact_phone,
      lead.contact_url,
      lead.apply_url,
      lead.company_website,
      lead.source_url
    );

  return (
    hasIdentityFields &&
    hasOpportunityContent &&
    hasContact
  );
}


/*
 * ---------------------------------------------------------
 * SAAS
 * ---------------------------------------------------------
 *
 * SaaS is a professional prospect.
 * A public profile/contact URL is an actionable contact
 * path, so it is valid even when email/phone is absent.
 */
function isGoldSaas(
  lead: any
): boolean {
  const hasName =
    hasIdentity(
      lead.name
    );

  const hasProfessionalContext =
    hasIdentity(
      lead.niche,
      lead.description,
      lead.platform
    );

  const hasContact =
    hasActionableContact(
      lead.contact,
      lead.contact_url,
      lead.landing_url,
      lead.source_url
    );

  return (
    hasName &&
    hasProfessionalContext &&
    hasContact
  );
}
function mapDemand(
  lead: any
) {
  return {
    id: String(lead.id),

    type: "Demand" as LeadType,
    lead_type: "Demand",

    source:
      clean(lead.source),

    source_url:
      clean(lead.source_url),

    client_name:
      clean(lead.client_name),

    name:
      clean(lead.client_name) ||
      clean(lead.contact_name),

    company:
      clean(lead.client_name),

    title:
      clean(lead.title) ||
      "Demand Opportunity",

    description:
      clean(lead.description) ||
      clean(lead.content),

    content:
      clean(lead.content),

    skill:
      clean(lead.skill_needed),

    skill_needed:
      clean(lead.skill_needed),

    category:
      clean(lead.category),

    subcategory:
      clean(lead.subcategory),

    country:
      clean(lead.country),

    city:
      clean(lead.city),

    budget:
      lead.budget ?? null,

    currency:
      clean(lead.currency),

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

    contact:
      clean(lead.contact_url) ||
      clean(lead.contact_email) ||
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
) {
  return {
    id: String(lead.id),

    type: "Supply" as LeadType,
    lead_type: "Supply",

    source:
      clean(lead.source),

    source_url:
      clean(lead.source_url),

    client_name:
      clean(lead.company_name),

    name:
      clean(lead.company_name),

    company:
      clean(lead.company_name),

    company_name:
      clean(lead.company_name),

    title:
      clean(lead.job_title) ||
      clean(lead.position) ||
      "Supply Opportunity",

    description:
      clean(lead.description),

    skill:
      clean(lead.required_skill),

    skill_needed:
      clean(lead.required_skill),

    required_skill:
      clean(lead.required_skill),

    category:
      clean(lead.category),

    subcategory:
      clean(lead.subcategory),

    country:
      clean(lead.country),

    city:
      clean(lead.city),

    salary:
      lead.salary_range ??
      lead.salary_min ??
      null,

    salary_range:
      lead.salary_range ??
      null,

    salary_min:
      lead.salary_min ??
      null,

    salary_max:
      lead.salary_max ??
      null,

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
) {
  return {
    id: String(lead.id),

    type: "SaaS" as LeadType,
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


function normalizeCategory(
  value: any
): string {
  return clean(value)
    .toLowerCase();
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
): Promise<any[]> {
  const { data, error } =
    await supabase
      .from("demand_leads")
      .select(
        [
          "id",
          "type",
          "source",
          "source_url",
          "client_name",
          "skill_needed",
          "description",
          "content",
          "contact_email",
          "contact_phone",
          "contact_url",
          "created_at",
          "status",
          "title",
          "category",
          "subcategory",
          "country",
          "city",
          "budget",
          "currency",
          "contact_name",
        ].join(",")
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (error) {
    throw new Error(
      `Demand leads: ${error.message}`
    );
  }

  return (data || [])
    .filter(isGoldDemand)
    .map(mapDemand);
}


async function loadSupplyLeads(
  supabase: any
): Promise<any[]> {
  const { data, error } =
    await supabase
      .from("supply_leads")
      .select(
        [
          "id",
          "company_name",
          "description",
          "position",
          "required_skill",
          "category",
          "subcategory",
          "country",
          "city",
          "salary_range",
          "salary_min",
          "salary_max",
          "currency",
          "contact",
          "contact_name",
          "contact_email",
          "contact_phone",
          "contact_url",
          "company_website",
          "apply_url",
          "source",
          "source_url",
          "created_at",
          "status",
          "job_title",
        ].join(",")
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (error) {
    throw new Error(
      `Supply leads: ${error.message}`
    );
  }

  return (data || [])
    .filter(isGoldSupply)
    .map(mapSupply);
}


async function loadSaasLeads(
  supabase: any
): Promise<any[]> {
  const { data, error } =
    await supabase
      .from("saas_leads")
      .select(
        [
          "id",
          "name",
          "platform",
          "niche",
          "contact",
          "status",
          "created_at",
          "description",
          "commission",
          "trial_days",
          "landing_url",
          "source_url",
          "contact_url",
          "country",
          "city",
        ].join(",")
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (error) {
    throw new Error(
      `SaaS leads: ${error.message}`
    );
  }

  return (data || [])
    .filter(isGoldSaas)
    .map(mapSaas);
}
async function loadAllLeads(
  supabase: any,
  requestedCategory: string
) {
  const category =
    normalizeCategory(
      requestedCategory
    );

  let demandLeads: any[] = [];
  let supplyLeads: any[] = [];
  let saasLeads: any[] = [];

  if (
    category === "" ||
    category === "all" ||
    category === "demand"
  ) {
    demandLeads =
      await loadDemandLeads(
        supabase
      );
  }

  if (
    category === "" ||
    category === "all" ||
    category === "supply"
  ) {
    supplyLeads =
      await loadSupplyLeads(
        supabase
      );
  }

  if (
    category === "" ||
    category === "all" ||
    category === "saas"
  ) {
    saasLeads =
      await loadSaasLeads(
        supabase
      );
  }

  const leads = [
    ...demandLeads,
    ...supplyLeads,
    ...saasLeads,
  ].sort(sortByCreatedAt);

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
  if (req.method !== "GET") {
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

    const requestedCategory =
      clean(
        req.query?.category ||
        "all"
      );

    const result =
      await loadAllLeads(
        supabase,
        requestedCategory
      );

    return res.status(200).json({
      success: true,

      leads:
        result.leads,

      count:
        result.leads.length,

      counts:
        result.counts,
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
