import { fetchGoogleLeads } from "../api-server/src/services/googleLeads.js";
import { fetchRSSLeads } from "../api-server/src/services/rssLeads.js";

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

  const results = {
    google: 0,
    rss: 0,
  };

  try {
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

    return new Response(
      JSON.stringify({
        success: true,
        count: total,
        sources: results,
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
    console.error("Fetch leads API error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        count: 0,
        error: "Failed to fetch leads",
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
