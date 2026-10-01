import { createClient } from "@supabase/supabase-js";

type LeadType =
  | "Demand"
  | "Supply"
  | "SaaS";

function clean(value: any): string {
  return String(value ?? "").trim();
}

function hasIdentity(...values: any[]): boolean {
  return values.some(
    (value) => clean(value).length > 0
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

function isGoldDemand(
  lead: any
): boolean {
  return (
    hasIdentity(
      lead.client_name,
      lead.contact_name
    ) &&
    hasIdentity(
      lead.title,
      lead.description,
      lead.skill_needed
    ) &&
    hasActionableContact(
      lead.contact_email,
      lead.contact_phone,
      lead.contact_url,
      lead.source_url
    )
  );
}

function isGoldSupply(
  lead: any
): boolean {
  return (
    hasIdentity(
      lead.company_name,
      lead.contact_name
    ) &&
    hasIdentity(
      lead.job_title,
      lead.position,
      lead.description,
      lead.required_skill
    ) &&
    hasActionableContact(
      lead.contact,
      lead.contact_email,
      lead.contact_phone,
      lead.contact_url,
      lead.apply_url,
      lead.company_website,
      lead.source_url
    )
  );
}

function isGoldSaas(
  lead: any
): boolean {
  return (
    hasIdentity(
      lead.name
    ) &&
    hasIdentity(
      lead.niche,
      lead.description,
      lead.platform
    ) &&
    hasActionableContact(
      lead.contact,
      lead.contact_url,
      lead.landing_url,
      lead.source_url
    )
  );
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
  try {
    const {
      data,
      error,
    } = await supabase
      .from("demand_leads")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

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
      error?.message ||
        String(error)
    );

    return [];
  }
}

async function loadSupplyLeads(
  supabase: any
): Promise<any[]> {
  try {
    const {
      data,
      error,
    } = await supabase
      .from("supply_leads")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

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
      error?.message ||
        String(error)
    );

    return [];
  }
}

async function loadSaasLeads(
  supabase: any
): Promise<any[]> {
  try {
    const {
      data,
      error,
    } = await supabase
      .from("saas_leads")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

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
    clean(
      requestedCategory
    ).toLowerCase();

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
      error: "Method not allowed",
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
