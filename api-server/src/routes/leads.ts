import express from "express";
import { supabase } from "../lib/supabase.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("demand_leads")
      .select("*")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase leads error:", error);

      return res.status(500).json({
        success: false,
        leads: [],
        error: "Failed to load leads",
      });
    }

    const leads = (data || []).map((lead: any) => ({
      id: lead.id,
      title:
        lead.client_name ||
        lead.service_needed ||
        lead.title ||
        "Opportunity",
      description: lead.description || "No description available",
      link: lead.link || lead.url || "#",
      skill: lead.skill || null,
      country: lead.country || null,
      city: lead.city || null,
      type: "demand",
      created_at: lead.created_at,
      isLocked: false,
    }));

    return res.json({
      success: true,
      leads,
      count: leads.length,
      freshness: "72_hours",
    });
  } catch (error) {
    console.error("Leads route error:", error);

    return res.status(500).json({
      success: false,
      leads: [],
      error: "Internal server error",
    });
  }
});

export default router;
