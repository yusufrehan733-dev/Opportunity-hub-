import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase server environment variables");
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey
);

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function hasContact(...values: any[]) {
  return values.some(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0
  );
}

export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return json(
      { success: false, error: "Method not allowed" },
      405
    );
  }

  try {
    const url = new URL(req.url);

    const requestedCategory =
      (url.searchParams.get("category") || "all")
        .trim()
        .toLowerCase();

    const seventyTwoHoursAgo = new Date(
      Date.now() - 72 * 60 * 60 * 1000
    ).toISOString();

    /*
     * DEMAND
     */
    let demandLeads: any[] = [];

    if (
      requestedCategory === "all" ||
      requestedCategory === "demand"
    ) {
      const { data, error } = await supabase
        .from("demand_lead")
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
        .gte("created_at", seventyTwoHoursAgo)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Demand leads error:",
          error
        );
        throw new Error(
          `Demand leads: ${error.message}`
        );
      }

      demandLeads = (data || [])
        .filter((lead) =>
          hasContact(
            lead.contact_email,
            lead.contact_phone,
            lead.source
          )
        )
        .map((lead) => ({
          id: lead.id,
          type: "Demand",
          title:
            lead.title ||
            lead.client_name ||
            "Opportunity",
          description: lead.description || "",
          source: lead.source || "",
          skill: lead.skill_needed || "",
          country: lead.country || "Global",
          city: lead.city || "",
          contact_email:
            lead.contact_email || null,
          contact_phone:
            lead.contact_phone || null,
          contact_name:
            lead.contact_name || null,
          budget: lead.budget || null,
          currency: lead.currency || null,
          category: lead.category || "",
          subcategory:
            lead.subcategory || "",
          status: lead.status || "new",
          created_at: lead.created_at,
          isLocked: false,
        }));
    }

    /*
     * SUPPLY
     */
    let supplyLeads: any[] = [];

    if (
      requestedCategory === "all" ||
      requestedCategory === "supply"
    ) {
      const { data, error } = await supabase
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
          apply_url
        `)
        .gte("created_at", seventyTwoHoursAgo)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Supply leads error:",
          error
        );
        throw new Error(
          `Supply leads: ${error.message}`
        );
      }

      supplyLeads = (data || [])
        .filter((lead) =>
          hasContact(
            lead.contact_email,
            lead.contact_phone,
            lead.apply_url,
            lead.company_website
          )
        )
        .map((lead) => ({
          id: lead.id,
          type: "Supply",
          title:
            lead.job_title ||
            lead.position ||
            "Opportunity",
          description: lead.description || "",
          source:
            lead.company_website || "",
          skill:
            lead.required_skill || "",
          country:
            lead.country || "Global",
          city: lead.city || "",
          contact_email:
            lead.contact_email || null,
          contact_phone:
            lead.contact_phone || null,
          contact_name:
            lead.company_name || null,
          budget:
            lead.salary_range ||
            null,
          currency: null,
          category:
            lead.category || "",
          subcategory: "",
          status: "new",
          created_at: lead.created_at,
          company_name:
            lead.company_name || "",
          company_website:
            lead.company_website || null,
          apply_url:
            lead.apply_url || null,
          salary_min:
            lead.salary_min || null,
          salary_max:
            lead.salary_max || null,
          salary_range:
            lead.salary_range || null,
          isLocked: false,
        }));
    }

    /*
     * SAAS
     */
    let saasLeads: any[] = [];

    if (
      requestedCategory === "all" ||
      requestedCategory === "saas"
    ) {
      const { data, error } = await supabase
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
        .gte("created_at", seventyTwoHoursAgo)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "SaaS leads error:",
          error
        );
        throw new Error(
          `SaaS leads: ${error.message}`
        );
      }

      saasLeads = (data || [])
        .filter((lead) =>
          hasContact(
            lead.contact,
            lead.content_email,
            lead.landing_url
          )
        )
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
          contact_email:
            lead.content_email || null,
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
          created_at: lead.created_at,
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
        }));
    }

    const leads = [
      ...demandLeads,
      ...supplyLeads,
      ...saasLeads,
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    return json({
      success: true,
      leads,
      count: leads.length,
      freshness: "72_hours",
      categories: {
        demand: demandLeads.length,
        supply: supplyLeads.length,
        saas: saasLeads.length,
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
