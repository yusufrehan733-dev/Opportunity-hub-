import Parser from "rss-parser";
import { supabase } from "../lib/supabase";

const parser = new Parser();

const RSS_FEEDS = [
  "https://remoteok.com/remote-jobs.rss",
  "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
  "https://weworkremotely.com/categories/remote-programming-jobs.rss"
];

const SKILL_RULES: Record<string, string[]> = {
  "Customer Support": ["customer support", "customer service", "support specialist", "help desk"],
  "Programming": ["developer", "software engineer", "programmer", "javascript", "typescript", "react", "node.js", "python"],
  "Virtual Assistant": ["virtual assistant", "administrative assistant", "executive assistant"],
  "Sales": ["sales", "business development", "sales representative", "account executive"],
  "Marketing": ["marketing", "digital marketing", "seo", "social media", "content marketing"],
  "Graphic Design": ["graphic designer", "graphic design", "photoshop", "illustrator", "canva"],
  "Writing": ["writer", "copywriter", "content writer", "content writing"],
  "Data Entry": ["data entry", "data entry clerk"],
  "Teaching": ["teacher", "tutor", "teaching", "instructor"],
  "Accounting": ["accountant", "bookkeeper", "accounting"]
};

const COUNTRY_RULES: Record<string, string[]> = {
  "United Kingdom": ["uk", "united kingdom", "england", "london"],
  "Canada": ["canada", "toronto", "vancouver"],
  "United States": ["usa", "united states", "america", "new york", "california"],
  "Australia": ["australia", "sydney", "melbourne"],
  "United Arab Emirates": ["uae", "dubai", "abu dhabi"],
  "Qatar": ["qatar", "doha"],
  "Germany": ["germany", "berlin"],
  "Netherlands": ["netherlands", "amsterdam"],
  "Pakistan": ["pakistan", "islamabad", "lahore", "karachi", "rawalpindi"]
};

function detectSkill(text: string): string {
  const lower = text.toLowerCase();

  for (const [skill, keywords] of Object.entries(SKILL_RULES)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return skill;
    }
  }

  return "General";
}

function detectCountry(text: string): string {
  const lower = text.toLowerCase();

  for (const [country, keywords] of Object.entries(COUNTRY_RULES)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return country;
    }
  }

  return "Global";
}

function extractEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function isFresh(dateString?: string): boolean {
  if (!dateString) return true;

  const published = new Date(dateString).getTime();

  if (Number.isNaN(published)) return true;

  const ageHours = (Date.now() - published) / (1000 * 60 * 60);

  return ageHours >= 0 && ageHours <= 72;
}

export async function fetchRSSLeads() {
  try {
    let inserted = 0;
    let skippedOld = 0;
    let skippedDuplicate = 0;

    for (const feedUrl of RSS_FEEDS) {
      try {
        console.log(`Reading RSS feed: ${feedUrl}`);

        const feed = await parser.parseURL(feedUrl);

        for (const item of feed.items || []) {
          const title = item.title?.trim() || "Untitled Opportunity";

          const description =
            item.contentSnippet ||
            item.content ||
            item.summary ||
            "";

          const opportunityUrl = item.link?.trim() || feedUrl;

          // Never store old opportunities.
          if (!isFresh(item.isoDate || item.pubDate)) {
            skippedOld++;
            continue;
          }

          const combinedText = `${title} ${description}`;

          const skill = detectSkill(combinedText);
          const country = detectCountry(combinedText);
          const email = extractEmail(combinedText);

          // Check by original opportunity URL first.
          const { data: existingBySource } = await supabase
            .from("demand_leads")
            .select("id")
            .eq("source", opportunityUrl)
            .limit(1);

          if (existingBySource && existingBySource.length > 0) {
            skippedDuplicate++;
            continue;
          }

          // Also prevent duplicate titles.
          const { data: existingByTitle } = await supabase
            .from("demand_leads")
            .select("id")
            .eq("title", title)
            .limit(1);

          if (existingByTitle && existingByTitle.length > 0) {
            skippedDuplicate++;
            continue;
          }

          const usefulDescription =
            `${description}\n\nOriginal opportunity / application link:\n${opportunityUrl}`.trim();

          const { error } = await supabase
            .from("demand_leads")
            .insert({
              type: "Demand",
              source: opportunityUrl,
              client_name: title,
              skill_needed: skill,
              description: usefulDescription,
              contact_email: email,
              contact_phone: null,
              title,
              category: "Remote Jobs",
              subcategory: "RSS",
              country,
              city: null,
              budget: null,
              currency: null,
              contact_name: null,
              created_at: new Date().toISOString()
            });

          if (error) {
            console.error("Supabase insert failed:", error);
          } else {
            inserted++;

            console.log(
              `REAL LEAD ADDED | ${skill} | ${country} | ${title} | ${opportunityUrl}`
            );
          }
        }
      } catch (feedError) {
        console.error("Feed failed:", feedUrl, feedError);
      }
    }

    console.log("===== RSS RESULT =====");
    console.log(`Inserted: ${inserted}`);
    console.log(`Old (>72h): ${skippedOld}`);
    console.log(`Duplicates: ${skippedDuplicate}`);
    console.log("======================");

    return inserted;
  } catch (err) {
    console.error("RSS import failed:", err);
    return 0;
  }
}
