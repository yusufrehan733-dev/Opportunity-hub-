import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (
  !supabaseUrl ||
  !supabaseServiceKey
) {
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
  return typeof value === "string"
    ? value.trim()
    : "";
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

function hasIdentity(
  ...values: any[]
) {
  return values.some(
    (value) =>
      clean(value).length >= 2
  );
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
      lead.source
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
      lead.apply_url,
      lead.company_website
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
      lead.contact,
      lead.content_email,
      lead.landing_url
    )
  );
}

export default async function handler(
  req: any
) {
  if (req.method !== "GET") {
    return json(
      {
        success: false,
        error:
          "Method not allowed",
      },
      405
    );
  }

  try {
    const protocol =
      req.headers?.["x-forwarded-proto"] ||
      "https";

    const host =
      req.headers?.host ||
      "localhost";

    const url = new URL(
      req.url || "/api/leads",
      `${protocol}://${host}`
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
          72 * 60 * 60 * 1000
      ).toISOString();

    let demandLeads: any[] = [];
    let supplyLeads: any[] = [];
    let saasLeads: any[] = [];
    /*
     * DEMAND
     */

    if (
      requestedCategory === "all" ||
      requestedCategory === "demand"
    ) {
      const { data, error } =
        await supabase
          .from("demand_leads")
          .select(`
            id,
            type,
            source,
            client_name,
            skill_needed,
            description,
            contact_email,
            contact_phone,
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
        .map((lead) => ({
          id: lead.id,
          type: "Demand",
          title:
            lead.title ||
            lead.client_name ||
            "Opportunity",
          description:
            lead.description || "",
          source:
            lead.source || "",
          skill:
            lead.skill_needed || "",
          country:
            lead.country || "Global",
          city:
            lead.city || "",
          contact_email:
            lead.contact_email ||
            null,
          contact_phone:
            lead.contact_phone ||
            null,
          contact_name:
            lead.contact_name ||
            null,
          budget:
            lead.budget || null,
          currency:
            lead.currency || null,
          category:
            lead.category || "",
          subcategory:
            lead.subcategory || "",
          status:
            lead.status || "new",
          created_at:
            lead.created_at,
          isLocked: false,
          gold_quality: true,
        }));
    }

    /*
     * SUPPLY
     */

    if (
      requestedCategory === "all" ||
      requestedCategory === "supply"
    ) {
      const { data, error } =
        await supabase
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
            contact,
            contact_phone,
            created_at,
            job_title,
            salary_min,
            salary_max,
            company_website,
            apply_url
          `)
          .gte(
            "created_at",
            seventyTwoHoursAgo
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
        .map((lead) => ({
          id: lead.id,
          type: "Supply",
          title:
            lead.job_title ||
            lead.position ||
            "Opportunity",
          description:
            lead.description || "",
          source:
            lead.company_website || "",
          skill:
            lead.required_skill || "",
          country:
            lead.country || "Global",
          city:
            lead.city || "",
          contact
            lead.contact ||
            null,
          contact:
            lead.contact ||
            null,
          contact_name:
            lead.company_name ||
            null,
          budget:
            lead.salary_range || null,
          currency: null,
          category:
            lead.category || "",
          subcategory: "",
          status: "new",
          created_at:
            lead.created_at,
          company_name:
            lead.company_name || "",
          company_website:
            lead.company_website ||
            null,
          apply_url:
            lead.apply_url || null,
          salary_min:
            lead.salary_min || null,
          salary_max:
            lead.salary_max || null,
          salary_range:
            lead.salary_range || null,
          isLocked: false,
          gold_quality: true,
        }));
      }
    /*
     * SAAS
     */

    if (
      requestedCategory === "all" ||
      requestedCategory === "saas"
    ) {
      const { data, error } =
        await supabase
          .from("saas_leads")
          .select(`
            id,
            name,
            platform,
            niche,
            contact,
            content_email,
            status,
            created_at,
            description,
            commission,
            trial_days,
            landing_url
          `)
          .gte(
            "created_at",
            seventyTwoHoursAgo
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
        .map((lead) => ({
          id: lead.id,
          type: "SaaS",
          title:
            lead.name ||
            "Potential Opportunity Hub Customer",
          description:
            lead.description || "",
          source:
            lead.platform || "",
          skill:
            lead.niche || "",
          country: "Global",
          city: "",
          contact:
            lead.content || null,
          contact_phone:
            lead.contact || null,
          contact_name:
            lead.name || null,
          budget: null,
          currency: null,
          category: "SaaS",
          subcategory:
            lead.niche || "",
          status:
            lead.status || "new",
          created_at:
            lead.created_at,
          platform:
            lead.platform || "",
          contact:
            lead.contact || "",
          commission:
            lead.commission || null,
          trial_days:
            lead.trial_days || null,
          landing_url:
            lead.landing_url || null,
          isLocked: false,
          gold_quality: true,
        }));
    }
    const leads = [
      ...demandLeads,
      ...supplyLeads,
      ...saasLeads,
    ].sort(
      (a, b) =>
        new Date(
          b.created_at
        ).getTime() -
        new Date(
          a.created_at
        ).getTime()
    );

    return json({
      success: true,
      leads,
      count: leads.length,
      freshness: "72_hours",
      quality: "gold",
      categories: {
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
