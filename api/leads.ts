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

export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const url = new URL(req.url);

    const plan = url.searchParams.get("plan") || "basic";

    const limits: Record<string, number> = {
      basic: 15,
      premium: 30,
      gold: 1000,
    };

    const limit = limits[plan] ?? 15;

    // --------------------------------------------------
    // ONLY SHOW LEADS FROM THE LAST 72 HOURS
    // --------------------------------------------------

    const seventyTwoHoursAgo = new Date(
      Date.now() - 72 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
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
      .gte("created_at", seventyTwoHoursAgo)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (error) {
      console.error("Supabase leads error:", error);

      return new Response(
        JSON.stringify({
          leads: [],
          count: 0,
          error: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const leads = (data || []).map((lead) => ({
      id: lead.id,

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
        lead.contact_email || null,

      contact_phone:
        lead.contact_phone || null,

      contact_name:
        lead.contact_name || null,

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
    }));

    return new Response(
      JSON.stringify({
        success: true,
        leads,
        count: leads.length,
        plan,
        freshness: "72_hours",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Leads API error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        leads: [],
        count: 0,
        error: "Unable to load leads",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
