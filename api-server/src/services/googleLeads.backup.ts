import axios from "axios";
import { supabase } from "../lib/supabase";

const SERPER_API_KEY = process.env.SERPER_API_KEY;

const MAX_AGE_HOURS = 72;

const SKILLS = [
  "Math",
  "Science",
  "Chemistry",
  "Biology",
  "Economics",
  "Law",
  "Psychology",
  "Sociology",
  "Anthropology",
  "World History",
  "English",
  "Arabic",
  "Urdu",
  "Punjabi",
  "French",
  "Pashto",
  "Translation Services",
  "Tajweed",
  "Tafseer",
  "Hadith",
  "Hifz",
  "Fiqh",
  "Qirat",
  "Career Coach",
  "Business Coach",
  "Self Help Coach",
  "Life Coach",
  "WordPress",
  "Website Development",
  "Frontend Development",
  "Backend Development",
  "Full Stack Development",
  "Mobile App Development",
  "Software Development",
  "UI/UX Design",
  "SEO",
  "Digital Marketing",
  "Social Media Marketing",
  "Content Writing",
  "Copywriting",
  "Virtual Assistant",
  "Data Entry",
  "Lead Generation",
  "Graphic Design",
  "Logo Design",
  "Brand Identity Design",
  "Video Editing",
  "Motion Graphics",
  "Animation",
  "YouTube Editing",
  "Short Form Content",
  "Podcast Editing",
  "Bookkeeping",
  "Accounting",
  "Recruitment",
  "Customer Support",
  "Sales",
  "Project Management",
];

const COUNTRIES = [
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Norway",
  "Finland",
  "UAE",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Pakistan",
  "India",
  "Bangladesh",
  "Sri Lanka",
  "Nepal",
];

type SerperResult = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
};

function findSkill(text: string): string | null {
  const lower = text.toLowerCase();

  for (const skill of SKILLS) {
    if (lower.includes(skill.toLowerCase())) {
      return skill;
    }
  }

  return null;
}

function findCountry(text: string): string {
  const lower = text.toLowerCase();

  for (const country of COUNTRIES) {
    if (lower.includes(country.toLowerCase())) {
      return country;
    }
  }

  return "Global";
}

function getResultDate(result: SerperResult): Date | null {
    if (!result.date) {
        return null;
    }

    const raw = result.date.trim().toLowerCase();

    const relative = raw.match(
        /^(\d+)\s+(minute|minutes|hour|hours|day|days)\s+ago$/
    );

    if (relative) {
        const amount = Number(relative[1]);
        const unit = relative[2];

        let milliseconds = 0;

        if (unit.startsWith("minute")) {
            milliseconds = amount * 60 * 1000;
        } else if (unit.startsWith("hour")) {
            milliseconds = amount * 60 * 60 * 1000;
        } else if (unit.startsWith("day")) {
            milliseconds = amount * 24 * 60 * 60 * 1000;
        }

        return new Date(Date.now() - milliseconds);
    }

    const date = new Date(result.date);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function isWithin72Hours(date: Date): boolean {
  const ageMilliseconds = Date.now() - date.getTime();
  const ageHours = ageMilliseconds / (1000 * 60 * 60);

  return ageHours >= 0 && ageHours <= MAX_AGE_HOURS;
}

export async function fetchGoogleLeads(): Promise<number> {
  if (!SERPER_API_KEY) {
    console.error("SERPER_API_KEY is missing.");
    return 0;
  }

  try {
    const queries = [
      '"looking for" tutor online',
      '"need" teacher online',
      '"hiring" remote freelancer',
      '"looking for" freelance designer',
      '"looking for" web developer',
      '"need" content writer remote',
      '"hiring" virtual assistant remote',
      '"looking for" video editor',
    ];

    let inserted = 0;

    for (const query of queries) {
      try {
        const response = await axios.post(
          "https://google.serper.dev/search",
          {
            q: query,
            num: 10,
            tbs: "qdr:3",
          },
          {
            headers: {
              "X-API-KEY": SERPER_API_KEY,
              "Content-Type": "application/json",
            },
          }
        );

        const results: SerperResult[] =
          response.data?.organic || [];

          console.log(
              `GOOGLE DEBUG: query="${query}" results=${results.length}`
          );

          for (const debugResult of results.slice(0, 3)) {
              console.log(
                  "GOOGLE DEBUG RESULT:",
                  JSON.stringify({
                      title: debugResult.title,
                      date: debugResult.date,
                      link: debugResult.link
                  })
              );
          }

        for (const result of results) {
          const title = result.title?.trim();

          const link = result.link?.trim();

          const snippet = result.snippet?.trim() || "";

          if (!title || !link) {
            continue;
          }

          /*
           * IMPORTANT:
           * We require an actual date.
           * If Google/Serper doesn't provide one,
           * we reject the result rather than pretending
           * that it is fresh.
           */
          const publishedDate = getResultDate(result);

          if (!publishedDate) {
            continue;
          }

          if (!isWithin72Hours(publishedDate)) {
            continue;
          }

          const combinedText =
            `${title} ${snippet}`.trim();

          const skill = findSkill(combinedText);

          if (!skill) {
            continue;
          }

          const country = findCountry(combinedText);

          // Prevent duplicates by source URL.
          const { data: existing } = await supabase
            .from("demand_leads")
            .select("id")
            .eq("source", link)
            .limit(1);

          if (existing && existing.length > 0) {
            continue;
          }

          const { error } = await supabase
            .from("demand_leads")
            .insert({
              type: "Demand",
              source: link,
              client_name: title,
              skill_needed: skill,
              description: snippet,
              content_email: null,
              content_phone: null,
              created_at: publishedDate.toISOString(),
              status: "active",
              title: title,
              category: "Real Opportunity",
              subcategory: "Google",
              country: country,
              city: null,
              budget: null,
              currency: null,
              content_name: null,
            });

          if (error) {
            console.error(
              "Google lead insert error:",
              error
            );
            continue;
          }

          inserted++;

          console.log(
            `REAL LEAD ADDED: ${title} | ${skill} | ${country}`
          );
        }
      } catch (queryError) {
        console.error(
          `Google query failed: ${query}`,
          queryError
        );
      }
    }

    console.log(
      `Google importer finished. Real leads inserted: ${inserted}`
    );

    return inserted;
  } catch (error) {
    console.error(
      "Google leads importer failed:",
      error
    );

    return 0;
  }
}
