import express from "express";
import { fetchGoogleLeads } from "../services/googleLeads.js";
import { fetchRSSLeads } from "../services/rssLeads.js";

const router = express.Router();

/**
 * Fetch fresh leads using the existing lead engine.
 *
 * Google/Serper and RSS services already contain the project's
 * lead-quality, freshness, filtering, and Supabase insertion logic.
 */
router.get("/fetch-leads", async (_req, res) => {
  try {
    const results: {
      google: number;
      rss: number;
    } = {
      google: 0,
      rss: 0,
    };

    try {
      results.google = await fetchGoogleLeads();
    } catch (error) {
      console.error("Google lead importer error:", error);
    }

    try {
      const rssResult = await fetchRSSLeads();

      if (typeof rssResult === "number") {
        results.rss = rssResult;
      } else if (rssResult && typeof rssResult === "object") {
        results.rss =
          Number(
            (rssResult as any).inserted ??
              (rssResult as any).count ??
              (rssResult as any).total ??
              0
          ) || 0;
      }
    } catch (error) {
      console.error("RSS lead importer error:", error);
    }

    const total = results.google + results.rss;

    return res.json({
      success: true,
      count: total,
      sources: results,
      freshness: "72_hours",
    });
  } catch (error) {
    console.error("Fetch leads route error:", error);

    return res.status(500).json({
      success: false,
      count: 0,
      error: "Failed to fetch leads",
    });
  }
});

export default router;
