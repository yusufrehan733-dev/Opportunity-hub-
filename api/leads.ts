import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use GET."
    });
  }

  try {
    const supabase = getSupabaseClient();

    const [demandRes, supplyRes, saasRes] = await Promise.all([
      supabase
        .from("demand_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("supply_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("saas_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
    ]);

    const demand = (demandRes.data || []).map((row: any) => ({
      ...row,
      type: "Demand"
    }));

    const supply = (supplyRes.data || []).map((row: any) => ({
      ...row,
      type: "Supply"
    }));

    const saas = (saasRes.data || []).map((row: any) => ({
      ...row,
      type: "SaaS"
    }));

    const leads = [...demand, ...supply, ...saas];

    return res.status(200).json({
      success: true,
      leads,
      counts: {
        total: leads.length,
        demand: demand.length,
        supply: supply.length,
        saas: saas.length
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to load leads."
    });
  }
}
