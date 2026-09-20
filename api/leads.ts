import { createClient } from "@supabase/supabase-js";

function clean(value: any): string {
  return String(value ?? "").trim();
}

function hasIdentity(...values: any[]): boolean {
  return values.some((value) => clean(value).length > 0);
}

function hasActionableContact(...values: any[]): boolean {
  return values.some((value) => {
    const text = clean(value);
    if (!text) return false;

    return (
      text.includes("@") ||
      text.startsWith("http://") ||
      text.startsWith("https://") ||
      text.startsWith("+") ||
      /^[0-9()\s.-]{7,}$/.test(text)
    );
  });
}

function isGoldDemand(lead: any): boolean {
  return (
    hasIdentity(
      lead.client_name,
      lead.contact_name
    ) &&
    (
      clean(lead.title) ||
      clean(lead.description) ||
      clean(lead.skill_needed)
    ) &&
    hasActionableContact(
      lead.contact_email,
      lead.contact_phone,
      lead.contact_url,
      lead.source_url
    )
  );
}

function isGoldSupply(lead: any): boolean {
  return (
    hasIdentity(lead.company_name) &&
    (
      clean(lead.job_title) ||
      clean(lead.position) ||
      clean(lead.description) ||
      clean(lead.required_skill)
    ) &&
    hasActionableContact(
      lead.contact_email,
      lead.contact_phone,
      lead.contact_url,
      lead.apply_url,
      lead.company_website,
      lead.source_url
    )
  );
}

function isGoldSaas(lead: any): boolean {
  return (
    hasIdentity(lead.name) &&
    (
      clean(lead.niche) ||
      clean(lead.description)
    ) &&
    hasActionableContact(
      lead.contact,
      lead.contact_url,
      lead.landing_url,
      lead.source_url
    )
  );
}

function mapDemand(lead: any) {
  return {
    id: String(lead.id),
    type: "Demand",
    lead_type: "Demand",

    source: clean(lead.source),
    source_url: clean(lead.source_url),

    client_name: clean(lead.client_name),
    name:
      clean(lead.client_name) ||
      clean(lead.contact_name),
    company: clean(lead.client_name),

    title:
      clean(lead.title) ||
      "Demand Opportunity",

    description: clean(lead.description),

    skill: clean(lead.skill_needed),
    skill_needed: clean(lead.skill_needed),

    category: clean(lead.category),
    subcategory: clean(lead.subcategory),

    country:
      clean(lead.country) ||
      "Global",
    city: clean(lead.city),

    budget: lead.budget ?? null,
    currency: clean(lead.currency),

    contact_name: clean(lead.contact_name),
    contact_email: clean(lead.contact_email),
    contact_phone: clean(lead.contact_phone),
    contact_url: clean(lead.contact_url),

    email: clean(lead.contact_email),
    phone: clean(lead.contact_phone),
    contact: clean(lead.contact_url),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.source_url),

    status: clean(lead.status),

    created_at:
      lead.created_at || null,
    createdAt:
      lead.created_at || null,
  };
}

function mapSupply(lead: any) {
  return {
    id: String(lead.id),
    type: "Supply",
    lead_type: "Supply",

    source: clean(lead.source),
    source_url: clean(lead.source_url),

    client_name: clean(lead.company_name),
    name: clean(lead.company_name),
    company: clean(lead.company_name),

    title:
      clean(lead.job_title) ||
      clean(lead.position) ||
      "Supply Opportunity",

    description: clean(lead.description),

    skill: clean(lead.required_skill),
    skill_needed: clean(lead.required_skill),

    category: clean(lead.category),
    subcategory: clean(lead.subcategory),

    country:
      clean(lead.country) ||
      "Global",
    city: clean(lead.city),

    salary:
      lead.salary_range ??
      lead.salary_min ??
      null,

    salary_range:
      lead.salary_range ?? null,

    salary_min:
      lead.salary_min ?? null,

    salary_max:
      lead.salary_max ?? null,

    contact_name: clean(lead.contact_name),
    contact_email: clean(lead.contact_email),
    contact_phone: clean(lead.contact_phone),

    email: clean(lead.contact_email),
    phone: clean(lead.contact_phone),

    contact:
      clean(lead.contact_email) ||
      clean(lead.contact_phone),

    company_website:
      clean(lead.company_website),

    apply_url:
      clean(lead.apply_url),

    contact_url:
      clean(lead.contact_url),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.apply_url) ||
      clean(lead.company_website) ||
      clean(lead.source_url),

    created_at:
      lead.created_at || null,

    createdAt:
      lead.created_at || null,
  };
}

function mapSaas(lead: any) {
  return {
    id: String(lead.id),
    type: "SaaS",
    lead_type: "SaaS",

    source: clean(lead.source),

    name: clean(lead.name),
    client_name: clean(lead.name),
    company: clean(lead.name),

    title:
      clean(lead.name) ||
      "Opportunity Hub Prospect",

    platform: clean(lead.platform),
    niche: clean(lead.niche),

    description:
      clean(lead.description),

    skill: clean(lead.niche),
    skill_needed: clean(lead.niche),

    category: "SaaS",
    subcategory: clean(lead.niche),

    country:
      clean(lead.country) ||
      "Global",

    city: clean(lead.city),

    contact: clean(lead.contact),
    email: clean(lead.contact),

    contact_url:
      clean(lead.contact_url),

    landing_url:
      clean(lead.landing_url),

    source_url:
      clean(lead.source_url),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.landing_url) ||
      clean(lead.source_url),

    created_at:
      lead.created_at || null,

    createdAt:
      lead.created_at || null,
  };
}

function getEnv(name: string): string {
  return clean(process.env[name]);
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
      error: "Method not allowed",
    });
  }

  try {
    const supabaseUrl =
      getEnv("SUPABASE_URL") ||
      getEnv("VITE_SUPABASE_URL");

    const supabaseKey =
      getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
      getEnv("SUPABASE_ANON_KEY") ||
      getEnv("VITE_SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase environment variables are missing."
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    const requestedCategory =
      clean(req.query?.category || "all")
        .toLowerCase();

    let demandLeads: any[] = [];
    let supplyLeads: any[] = [];
    let saasLeads: any[] = [];

    if (
      requestedCategory === "all" ||
      requestedCategory === "demand"
    ) {
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
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        throw new Error(
          `Demand leads: ${error.message}`
        );
      }

      demandLeads = (data || [])
        .filter(isGoldDemand)
        .map(mapDemand);
    }

    if (
      requestedCategory === "all" ||
      requestedCategory === "supply"
    ) {
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
              "country",
              "city",
              "salary_range",
              "contact_email",
              "contact_phone",
              "created_at",
              "job_title",
              "salary_min",
              "salary_max",
              "company_website",
              "apply_url",
              "source_url",
              "contact_url",
              "source",
              "contact_name",
              "subcategory",
            ].join(",")
          )
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        throw new Error(
          `Supply leads: ${error.message}`
        );
      }

      supplyLeads = (data || [])
        .filter(isGoldSupply)
        .map(mapSupply);
    }

    if (
      requestedCategory === "all" ||
      requestedCategory === "saas"
    ) {
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
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        throw new Error(
          `SaaS leads: ${error.message}`
        );
      }

      saasLeads = (data || [])
        .filter(isGoldSaas)
        .map(mapSaas);
    }

    const leads = [
      ...demandLeads,
      ...supplyLeads,
      ...saasLeads,
    ].sort((a, b) => {
      const dateA =
        new Date(
          a.created_at || 0
        ).getTime();

      const dateB =
        new Date(
          b.created_at || 0
        ).getTime();

      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      leads,
      count: leads.length,
      counts: {
        demand: demandLeads.length,
        supply: supplyLeads.length,
        saas: saasLeads.length,
      },
    });
} catch (error: any) {
  const message =
    error?.message ||
    String(error) ||
    "Unable to load leads";

  console.error("LEADS_API_REAL_ERROR:", message);

  return res.status(500).json({
    success: false,
    leads: [],
    count: 0,
    error: message,
  });
  }
