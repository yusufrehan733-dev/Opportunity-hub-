import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SERPER_API_KEY = process.env.SERPER_API_KEY!;

router.get("/fetch-leads", async (req, res) => {
  try {
    const queries = [
      "looking for online Quran teacher",
      "need math tutor online",
      "hiring freelance writer remote",
      "looking for graphic designer remote",
      "need web developer urgent",
    ];

    let allLeads: any[] = [];

    for (const query of queries) {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query }),
      });

      const data: any = await response.json();

      const leads = (data.organic || []).map((item: any) => ({
        type: "demand",
        title: item.title,
        description: item.snippet,
        platform: "google",
        country: "global",
        skill: "general",
        url: item.link,
      }));

      allLeads.push(...leads);
    }

    const { error } = await supabase.from("leads").insert(allLeads);

    if (error) throw error;

    res.json({ success: true, count: allLeads.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
});

export default router;
