import { db, freelancerDashboardTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { sbQuery } from "../lib/supabase.js";

const DEMAND_SIGNALS = [
  "looking for", "need", "hiring", "recommend", "anyone know",
  "searching for", "wanted", "require", "seeking", "help needed"
];

const SEARCH_QUERIES = [
  '"looking for freelancer" developer designer remote 2026',
  '"need developer" web app software freelance hire',
  '"hire designer" graphic logo branding remote',
  '"looking for tutor" online home teach',
  '"need Quran teacher" online Arabic Islamic',
  '"looking for Arabic tutor" online teach',
  '"English tutor required" online IELTS ESL',
  '"need business coach" startup consultant mentor',
  '"looking for career coach" job guidance mentor',
  '"looking for" freelancer developer designer hire 2026',
  '"need a" web developer frontend backend react node',
  '"hiring" graphic designer UI UX logo branding remote',
  '"need" online tutor teacher education academic',
  '"looking for" Arabic teacher Quran tajweed Islamic',
  '"hiring" English teacher ESL IELTS tutor online',
  '"need" business mentor coach consultant startup',
  '"looking for" career advisor job coach guidance',
  '"hire" freelance developer designer writer remote',
  'site:reddit.com r/forhire "looking for" developer designer 2026',
  'site:reddit.com r/forhire "hiring" tutor teacher coach',
  'site:reddit.com r/hiring "need" developer designer freelance',
  '"looking for" content writer copywriter SEO freelance',
  '"need" social media manager virtual assistant remote',
  '"hiring" mobile app developer iOS Android flutter',
  '"looking for" video editor YouTube content creator',
  '"need" WordPress Shopify ecommerce developer website',
  '"hiring" data analyst Python machine learning remote',
  '"looking for" bookkeeper accountant finance freelance',
  '"need" logo branding designer small business startup',
  '"hiring" translator interpreter Arabic English Urdu',
  'site:linkedin.com "hiring" OR "looking for" freelancer developer',
  'site:linkedin.com "need" tutor teacher coach mentor',
  'site:reddit.com r/freelance "need clients" OR "looking for work" 2026',
  '"need" personal trainer fitness coach online',
  '"looking for" catering home chef meal prep food service',
  '"hire" photographer videographer events wedding',
  '"need" virtual assistant admin support remote',
  '"looking for" SEO expert digital marketing agency',
];

interface CollectedLead {
  client_name: string;
  service_needed: string;
  description: string;
  industry: string;
  country: string;
  city: string;
  budget: string;
  contact_email: string;
  contact_phone: string;
  source_url: string;
  lead_text: string;
  source: string;
  lead_score: number;
  lead_quality: string;
}

function scoreLead(lead: Partial<CollectedLead>): { score: number; quality: string } {
  let score = 30;
  const text = `${lead.description || ""} ${lead.lead_text || ""} ${lead.service_needed || ""}`.toLowerCase();

  const hotSignals = ["hiring", "urgently", "asap", "immediately", "start today", "budget ready", "paying"];
  const goodSignals = ["looking for", "need", "searching", "require", "seeking", "wanted"];
  const mediumSignals = ["recommend", "anyone know", "advice", "suggestion", "help"];

  for (const s of hotSignals) if (text.includes(s)) score += 15;
  for (const s of goodSignals) if (text.includes(s)) score += 8;
  for (const s of mediumSignals) if (text.includes(s)) score += 4;

  if (lead.contact_email) score += 10;
  if (lead.contact_phone) score += 5;
  if (lead.budget && lead.budget !== "Not specified") score += 10;
  if (lead.source_url) score += 5;

  score = Math.min(100, Math.max(10, score));

  let quality: string;
  if (score >= 80) quality = "HOT";
  else if (score >= 50) quality = "GOOD";
  else quality = "MEDIUM";

  return { score, quality };
}

function parseSearchResultToLead(title: string, url: string, snippet: string, query: string): CollectedLead | null {
  if (!title || title.length < 5) return null;

  let service = "";
  const queryLower = query.toLowerCase();
  if (queryLower.includes("web developer") || queryLower.includes("react") || queryLower.includes("wordpress")) service = "Web Development";
  else if (queryLower.includes("graphic designer")) service = "Graphic Design";
  else if (queryLower.includes("social media")) service = "Social Media Management";
  else if (queryLower.includes("tutor") || queryLower.includes("teacher") || queryLower.includes("coach")) service = "Teaching & Coaching";
  else if (queryLower.includes("food") || queryLower.includes("homechef")) service = "Food Business";
  else if (queryLower.includes("content writer") || queryLower.includes("copywriter")) service = "Content Writing";
  else if (queryLower.includes("seo") || queryLower.includes("marketing")) service = "Digital Marketing";
  else if (queryLower.includes("mobile app")) service = "Mobile App Development";
  else if (queryLower.includes("virtual assistant")) service = "Virtual Assistant";
  else if (queryLower.includes("video editor")) service = "Video Editing";
  else if (queryLower.includes("ui ux")) service = "UI/UX Design";
  else if (queryLower.includes("data analyst")) service = "Data Analysis";
  else if (queryLower.includes("python")) service = "Python Development";
  else if (queryLower.includes("photography")) service = "Photography";
  else if (queryLower.includes("business plan")) service = "Business Consulting";
  else if (queryLower.includes("catering") || queryLower.includes("meal")) service = "Catering & Meal Prep";
  else if (queryLower.includes("trainer") || queryLower.includes("fitness")) service = "Fitness & Personal Training";
  else if (queryLower.includes("bookkeeper") || queryLower.includes("accountant")) service = "Bookkeeping & Accounting";
  else if (queryLower.includes("translator") || queryLower.includes("language")) service = "Translation Services";
  else if (queryLower.includes("logo") || queryLower.includes("branding")) service = "Logo & Branding Design";
  else if (queryLower.includes("content creator") || queryLower.includes("influencer")) service = "Content Creation";
  else if (queryLower.includes("looking for clients") || queryLower.includes("need clients") || queryLower.includes("need more clients") || queryLower.includes("find clients") || queryLower.includes("finding clients") || queryLower.includes("no clients") || queryLower.includes("need work") || queryLower.includes("looking for work") || queryLower.includes("open to work") || queryLower.includes("available for hire") || queryLower.includes("lead generation") || queryLower.includes("get clients")) service = "SaaS Prospect";
  else if (queryLower.includes("looking for students") || queryLower.includes("need students")) service = "SaaS Prospect - Teacher";
  else if (queryLower.includes("need customers") || queryLower.includes("looking for orders")) service = "SaaS Prospect - Food Business";
  else service = "Freelance Services";

  let industry = "Freelance";
  if (service.includes("Teaching") || service.includes("Coach") || service.includes("Training")) industry = "Teaching & Coaching";
  else if (service.includes("Food") || service.includes("Catering") || service.includes("Meal")) industry = "Food Business";
  else if (service.includes("Bookkeeping") || service.includes("Accounting")) industry = "Finance & Accounting";
  else if (service.includes("Translation")) industry = "Language Services";
  else if (service.includes("SaaS Prospect")) industry = "SaaS Prospect";

  const safeUrl = url && /^https?:\/\//i.test(url) ? url : "";
  const fullText = `${title} ${snippet}`.toLowerCase();
  let country = "Remote";
  let city = "";
  const countryPatterns: [RegExp, string][] = [
    [/\b(lahore|karachi|islamabad|rawalpindi|faisalabad|peshawar|multan|pakistan)\b/i, "Pakistan"],
    [/\b(dubai|abu dhabi|sharjah|ajman|uae|united arab emirates)\b/i, "UAE"],
    [/\b(riyadh|jeddah|dammam|saudi|ksa)\b/i, "Saudi Arabia"],
    [/\b(doha|qatar)\b/i, "Qatar"],
    [/\b(london|manchester|birmingham|leeds|uk|united kingdom|britain)\b/i, "UK"],
    [/\b(new york|los angeles|san francisco|chicago|texas|california|florida|usa|united states)\b/i, "USA"],
    [/\b(toronto|vancouver|montreal|calgary|canada)\b/i, "Canada"],
    [/\b(sydney|melbourne|brisbane|perth|australia)\b/i, "Australia"],
    [/\b(lagos|abuja|nigeria)\b/i, "Nigeria"],
    [/\b(johannesburg|cape town|south africa)\b/i, "South Africa"],
    [/\b(mumbai|delhi|bangalore|india)\b/i, "India"],
  ];
  for (const [re, c] of countryPatterns) {
    const match = fullText.match(re);
    if (match) {
      country = c;
      const cityNames = ["lahore","karachi","islamabad","rawalpindi","faisalabad","peshawar","multan","dubai","abu dhabi","sharjah","riyadh","jeddah","dammam","doha","london","manchester","birmingham","new york","los angeles","san francisco","chicago","toronto","vancouver","montreal","sydney","melbourne","brisbane","lagos","abuja","johannesburg","cape town","mumbai","delhi","bangalore"];
      const matchLower = match[0].toLowerCase();
      if (cityNames.includes(matchLower)) city = match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
      break;
    }
  }

  const budgetMatch = fullText.match(/\$[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?(?:\s*\/?\s*(?:hr|hour|mo|month|year|project))?/i);
  const budget = budgetMatch ? budgetMatch[0] : "Not specified";

  const partial = {
    client_name: title.slice(0, 200).replace(/[|\\-].*$/, "").trim() || "Unknown Client",
    service_needed: service,
    description: snippet.slice(0, 500) || title,
    industry,
    country,
    city,
    budget,
    contact_email: "",
    contact_phone: "",
    source_url: safeUrl,
    lead_text: snippet.slice(0, 1000),
    source: safeUrl ? new URL(safeUrl).hostname.replace("www.", "") : "unknown",
  };

  const { score, quality } = scoreLead(partial);
  const lead: CollectedLead = { ...partial, lead_score: score, lead_quality: quality };

  return lead;
}

async function isDuplicate(lead: CollectedLead): Promise<boolean> {
  const conditions: any[] = [];
  if (lead.source_url) conditions.push(eq(freelancerDashboardTable.source_url, lead.source_url));
  if (lead.contact_email) {
    const normalizedEmail = lead.contact_email.trim().toLowerCase();
    conditions.push(eq(freelancerDashboardTable.contact_email, normalizedEmail));
  }
  if (lead.contact_phone) {
    const normalizedPhone = lead.contact_phone.replace(/[^\d+]/g, "");
    conditions.push(eq(freelancerDashboardTable.contact_phone, normalizedPhone));
  }

  if (conditions.length === 0) {
    conditions.push(eq(freelancerDashboardTable.client_name, lead.client_name));
  }

  try {
    const existing = await db.select({ id: freelancerDashboardTable.id })
      .from(freelancerDashboardTable)
      .where(or(...conditions))
      .limit(1);
    return existing.length > 0;
  } catch {
    return false;
  }
}

async function insertLead(lead: CollectedLead): Promise<boolean> {
  try {
    const dup = await isDuplicate(lead);
    if (dup) {
      console.log(`[Collector] Skipping duplicate: ${lead.client_name}`);
      return false;
    }

    await db.insert(freelancerDashboardTable).values({
      client_name: lead.client_name,
      service_needed: lead.service_needed,
      lead_quality: lead.lead_quality,
      lead_score: lead.lead_score,
      description: lead.description,
      budget: lead.budget,
      country: lead.country,
      city: lead.city,
      industry: lead.industry,
      contact_email: lead.contact_email || undefined,
      contact_phone: lead.contact_phone || undefined,
      source_url: lead.source_url || undefined,
      lead_text: lead.lead_text || undefined,
      source: lead.source || undefined,
      verified_status: "unverified",
      fetched_at: new Date(),
    });

    console.log(`[Collector] Inserted lead: ${lead.client_name} [${lead.lead_quality}:${lead.lead_score}]`);
    return true;
  } catch (err) {
    console.error(`[Collector] Insert error for ${lead.client_name}:`, err);
    return false;
  }
}

const REDDIT_FEEDS = [
  { url: "https://www.reddit.com/r/forhire/new.json?limit=25", requireHiring: true },
  { url: "https://www.reddit.com/r/freelance/new.json?limit=20", requireHiring: false },
  { url: "https://www.reddit.com/r/hiring/new.json?limit=20", requireHiring: false },
  { url: "https://www.reddit.com/r/WorkOnline/new.json?limit=15", requireHiring: false },
  { url: "https://www.reddit.com/r/freelanceuk/new.json?limit=15", requireHiring: false },
];

const HIGH_INTENT_KEYWORDS = [
  "looking for","hire","hiring","need a","need developer","need designer",
  "need tutor","need teacher","need coach","need freelancer","need quran",
  "need arabic","looking for tutor","looking for teacher","looking for coach",
  "looking for freelancer","english tutor required","business coach","career coach"
];

const EXCLUDE_KEYWORDS = [
  "tutorial","how to","guide","blog","news","article","course","learn how","tips for"
];

function isHighIntent(title: string, text: string): boolean {
  const combined = `${title} ${text}`.toLowerCase();
  if (EXCLUDE_KEYWORDS.some(kw => combined.includes(kw))) return false;
  return HIGH_INTENT_KEYWORDS.some(kw => combined.includes(kw));
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function fetchRedditLeads(): Promise<CollectedLead[]> {
  const leads: CollectedLead[] = [];
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  for (const feed of REDDIT_FEEDS) {
    try {
      const response = await fetchWithTimeout(feed.url, {
        headers: { "User-Agent": "OpportunityHub/1.0" },
      }, 6000);

      if (!response || !response.ok) {
        console.log(`[Collector] Reddit feed unavailable: ${feed.url}`);
        continue;
      }

      const data = await response.json() as any;
      const posts = data?.data?.children || [];

      for (const post of posts) {
        const p = post.data;
        if (!p || !p.title) continue;

        const postTime = (p.created_utc || 0) * 1000;
        if (postTime < sevenDaysAgo) continue;

        const text = `${p.title} ${p.selftext || ""}`;
        if (feed.requireHiring) {
          const isHiring = p.title.toLowerCase().includes("[hiring]") ||
            p.link_flair_text?.toLowerCase().includes("hiring") ||
            isHighIntent(p.title, p.selftext || "");
          if (!isHiring) continue;
        } else {
          if (!isHighIntent(p.title, p.selftext || "")) continue;
        }

        const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
        const phoneMatch = text.match(/\+?\d[\d\s\-().]{8,}\d/);

        const parsed = parseSearchResultToLead(
          p.title.replace(/\[(Hiring|For Hire)\]\s*/gi, "").trim(),
          `https://www.reddit.com${p.permalink}`,
          (p.selftext || "").slice(0, 500),
          text
        );
        if (!parsed) continue;

        if (emailMatch) parsed.contact_email = emailMatch[0];
        if (phoneMatch) parsed.contact_phone = phoneMatch[0].trim();
        parsed.source = "reddit.com";

        const { score, quality } = scoreLead(parsed);
        parsed.lead_score = score;
        parsed.lead_quality = quality;

        leads.push(parsed);
      }
      console.log(`[Collector] Reddit ${feed.url.split("/")[4]}: got ${leads.length} leads so far`);
    } catch (err) {
      console.error(`[Collector] Reddit fetch error for ${feed.url}:`, err);
    }
  }
  return leads;
}

export async function runCollector(): Promise<{ inserted: number; skipped: number; errors: number }> {
  console.log("[Collector] Starting lead collection run...");
  let inserted = 0, skipped = 0, errors = 0;

  const redditLeads = await fetchRedditLeads();
  console.log(`[Collector] Got ${redditLeads.length} leads from Reddit feeds`);

  for (const lead of redditLeads) {
    try {
      const success = await insertLead(lead);
      if (success) inserted++;
      else skipped++;
    } catch {
      errors++;
    }
  }

  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
    const queries = shuffled.slice(0, 12);

    for (const query of queries) {
      try {
        console.log(`[Collector] Searching: ${query}`);
        const response = await fetchWithTimeout("https://google.serper.dev/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-KEY": serperKey },
          body: JSON.stringify({ q: query, num: 10 }),
        }, 7000);

        if (!response || !response.ok) {
          console.log(`[Collector] Search API error for: ${query}`);
          skipped++;
          continue;
        }

        const data = await response.json() as { organic?: Array<{ title?: string; link?: string; snippet?: string }> };
        const results = data.organic || [];

        for (const result of results.slice(0, 5)) {
          const lead = parseSearchResultToLead(result.title || "", result.link || "", result.snippet || "", query);
          if (!lead) { skipped++; continue; }
          const success = await insertLead(lead);
          if (success) inserted++;
          else skipped++;
        }
      } catch (err) {
        console.error(`[Collector] Error processing query "${query}":`, err);
        errors++;
      }
      await new Promise(r => setTimeout(r, 800));
    }
  } else {
    console.log("[Collector] No SERPER_API_KEY set, using free Reddit sources only");
  }

  console.log(`[Collector] Run complete: ${inserted} inserted, ${skipped} skipped, ${errors} errors`);
  return { inserted, skipped, errors };
}

function generateFallbackLead(query: string): CollectedLead | null {
  const service = query.replace(/hiring|looking for|need|freelance|remote|2026|work/gi, "").trim();
  if (!service) return null;

  const lead: CollectedLead = {
    client_name: `${service} Opportunity`,
    service_needed: service.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    description: `Active demand detected: "${query}". Multiple opportunities available in this category.`,
    industry: "Freelance",
    country: "",
    city: "",
    budget: "Not specified",
    contact_email: "",
    contact_phone: "",
    source_url: "",
    lead_text: query,
    source: "market-signal",
    lead_score: 40,
    lead_quality: "MEDIUM",
  };

  return lead;
}

export function computeLeadScore(lead: any): { score: number; quality: string } {
  return scoreLead(lead);
}

let collectorInterval: NodeJS.Timeout | null = null;

export function startCollectorSchedule() {
  const THREE_HOURS = 3 * 60 * 60 * 1000;

  console.log("[Collector] Starting scheduled collection every 3 hours");

  setTimeout(() => {
    runCollector().catch(err => console.error("[Collector] Scheduled run failed:", err));
  }, 10000);

  collectorInterval = setInterval(() => {
    runCollector().catch(err => console.error("[Collector] Scheduled run failed:", err));
  }, THREE_HOURS);
}

export function stopCollectorSchedule() {
  if (collectorInterval) {
    clearInterval(collectorInterval);
    collectorInterval = null;
    console.log("[Collector] Stopped scheduled collection");
  }
}
