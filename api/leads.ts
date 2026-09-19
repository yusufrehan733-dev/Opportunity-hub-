import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || "";

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase server environment variables"
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

function json(
  data: any,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
}

function clean(value: any) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function hasIdentity(
  ...values: any[]
) {
  return values.some(
    (value) =>
      clean(value).length >= 2
  );
}

function hasActionableContact(
  ...values: any[]
) {
  return values.some((value) => {
    const text = clean(value);

    if (!text) {
      return false;
    }

    if (
      text.includes("@") &&
      text.includes(".")
    ) {
      return true;
    }

    if (
      /^[+()\d\s.-]{7,}$/.test(text)
    ) {
      return true;
    }

    if (
      /^https?:\/\//i.test(text) ||
      /^www\./i.test(text)
    ) {
      return true;
    }

    return false;
  });
}

function isGoldDemand(
  lead: any
) {
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

function isGoldSupply(
  lead: any
) {
  return (
    hasIdentity(
      lead.company_name
    ) &&
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

function isGoldSaas(
  lead: any
) {
  return (
    hasIdentity(lead.name) &&
    (
      clean(lead.niche) ||
      clean(lead.description)
    ) &&
    hasActionableContact(
      lead.contect,
      lead.contact_url,
      lead.landing_url,
      lead.source_url
    )
  );
}

function mapDemand(
  lead: any
) {
  return {
    id: String(lead.id),
    type: "Demand",

    source: clean(lead.source),
    source_url: clean(
      lead.source_url
    ),

    client_name: clean(
      lead.client_name
    ),

    name:
      clean(lead.client_name) ||
      clean(lead.contact_name),

    company: clean(
      lead.client_name
    ),

    skill: clean(
      lead.skill_needed
    ),

    skill_needed: clean(
      lead.skill_needed
    ),

    description: clean(
      lead.description
    ),

    title:
      clean(lead.title) ||
      "Demand Opportunity",

    category: clean(
      lead.category
    ),

    subcategory: clean(
      lead.subcategory
    ),

    country:
      clean(lead.country) ||
      "Global",

    city: clean(lead.city),

    budget:
      lead.budget ?? null,

    currency: clean(
      lead.currency
    ),

    contact_name: clean(
      lead.contact_name
    ),

    contact_email: clean(
      lead.contact_email
    ),

    contact_phone: clean(
      lead.contact_phone
    ),

    contact_url: clean(
      lead.contact_url
    ),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.source_url),

    status: clean(
      lead.status
    ),

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
    type: "Supply",

    source: clean(lead.source),

    source_url: clean(
      lead.source_url
    ),

    client_name: clean(
      lead.company_name
    ),

    name: clean(
      lead.company_name
    ),

    company: clean(
      lead.company_name
    ),

    title:
      clean(lead.job_title) ||
      clean(lead.position) ||
      "Supply Opportunity",

    description: clean(
      lead.description
    ),

    skill: clean(
      lead.required_skill
    ),

    skill_needed: clean(
      lead.required_skill
    ),

    category: clean(
      lead.category
    ),

    subcategory: clean(
      lead.subcategory
    ),

    country:
      clean(lead.country) ||
      "Global",

    city: clean(lead.city),

    salary:
      lead.salary_range ??
      lead.salary_min ??
      null,

    salary_range:
      lead.salary_range ??
      null,

    salary_min:
      lead.salary_min ?? null,

    salary_max:
      lead.salary_max ?? null,

    contact_name: clean(
      lead.contact_name
    ),

    contact_email: clean(
      lead.contact_email
    ),

    contact_phone: clean(
      lead.contact_phone
    ),

    contact:
      clean(lead.contact_email) ||
      clean(lead.contact_phone),

    company_website: clean(
      lead.company_website
    ),

    apply_url: clean(
      lead.apply_url
    ),

    contact_url: clean(
      lead.contact_url
    ),

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

function mapSaas(
  lead: any
) {
  return {
    id: String(lead.id),
    type: "SaaS",

    source: clean(
      lead.source
    ),

    name: clean(
      lead.name
    ),

    client_name: clean(
      lead.name
    ),

    company: clean(
      lead.name
    ),

    title:
      clean(lead.name) ||
      "Opportunity Hub Prospect",

    platform: clean(
      lead.platform
    ),

    niche: clean(
      lead.niche
    ),

    description: clean(
      lead.description
    ),

    skill: clean(
      lead.niche
    ),

    skill_needed: clean(
      lead.niche
    ),

    category: "SaaS",

    subcategory: clean(
      lead.niche
    ),

    country:
      clean(lead.country) ||
      "Global",

    city: clean(
      lead.city
    ),

    contact: clean(
      lead.contect
    ),

    contect: clean(
      lead.contect
    ),

    contact_email: clean(
      lead.contect
    ),

    source_url: clean(
      lead.source_url
    ),

    contact_url: clean(
      lead.contact_url
    ),

    landing_url: clean(
      lead.landing_url
    ),

    openUrl:
      clean(lead.contact_url) ||
      clean(lead.landing_url) ||
      clean(lead.source_url),

    commission:
      lead.commission ?? null,

    trial_days:
      lead.trial_days ?? null,

    status: clean(
      lead.status
    ),

    created_at:
      lead.created_at || null,

    createdAt:
      lead.created_at || null,
  };
}

async function handler(
  req: Request
) {
  if (req.method !== "GET") {
    return json(
      {
        success: false,
        leads: [],
        count: 0,
        error:
          "Method not allowed",
      },
      405
    );
  }

  try {
    const url = new URL(
      req.url,
      "https://opportunity-hub-umber.vercel.app"
    );

    const requestedCategory =
      (
        url.searchParams.get(
          "category"
        ) || "all"
      )
        .trim()
        .toLowerCase();

    const seventyTwoHoursAgo =
      new Date(
        Date.now() -
          72 *
            60 *
            60 *
            1000
      ).toISOString();

    let demandLeads: any[] = [];
    let supplyLeads: any[] = [];
    let saasLeads: any[] = [];

    if (
      requestedCategory === "all" ||
      requestedCategory ===
        "demand"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("demand_leads")
        .select(`
          id,
          type,
          source,
          source_url,
          client_name,
          skill_needed,
          description,
          contact_email,
          contact_phone,
          contact_url,
          created_at,
          status,
          title,
          category,
          subcategory,
          country,
          city,
          budget,
          currency,
          contact_name
        `)
        .gte(
          "created_at",
          seventyTwoHoursAgo
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

      demandLeads =
        (data || [])
          .filter(isGoldDemand)
          .map(mapDemand);
    }

    if (
      requestedCategory === "all" ||
      requestedCategory ===
        "supply"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("supply_leads")
        .select(`
          id,
          company_name,
          description,
          position,
          required_skill,
          category,
          country,
          city,
          salary_range,
          contact_email,
          contact_phone,
          created_at,
          job_title,
          salary_min,
          salary_max,
          company_website,
          apply_url,
          source_url,
          contact_url
        `)
        .gte(
          "created_at",
          seventyTwoHoursAgo
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

      supplyLeads =
        (data || [])
          .filter(isGoldSupply)
          .map(mapSupply);
    }

    if (
      requestedCategory === "all" ||
      requestedCategory ===
        "saas"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("saas_leads")
        .select(`
          id,
          name,
          platform,
          niche,
          contect,
          status,
          created_at,
          description,
          commission,
          trial_days,
          landing_url,
          source_url,
          contact_url
        `)
        .gte(
          "created_at",
          seventyTwoHoursAgo
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

      saasLeads =
        (data || [])
          .filter(isGoldSaas)
          .map(mapSaas);
    }

    const leads = [
      ...demandLeads,
      ...supplyLeads,
      ...saasLeads,
    ].sort((a, b) => {
      const dateA = new Date(
        a.created_at || 0
      ).getTime();

      const dateB = new Date(
        b.created_at || 0
      ).getTime();

      return dateB - dateA;
    });

    return json({
      success: true,
      leads,
      count: leads.length,

      counts: {
        demand:
          demandLeads.length,
        supply:
          supplyLeads.length,
        saas:
          saasLeads.length,
      },
    });
  } catch (error: any) {
    console.error(
      "Leads API error:",
      error
    );

    return json(
      {
        success: false,
        leads: [],
        count: 0,
        error:
          error?.message ||
          "Unable to load leads",
      },
      500
    );
  }
}

export async function GET(
  req: Request
) {
  return handler(req);
}
