import axios from "axios";
import { supabase } from "../lib/supabase";

const SERPER_API_KEY = process.env.SERPER_API_KEY || "";
const MAX_AGE_HOURS = 72;

type SerperResult = {
    title?: string;
    link?: string;
    snippet?: string;
    date?: string;
};

const BLOCKED_DOMAINS = [
    "upwork.com",
    "fiverr.com",
    "freelancer.com",
    "toptal.com",
    "peopleperhour.com",
    "guru.com",
];

const GENERIC_TERMS = [
    "hire freelancers",
    "find freelancers",
    "freelance jobs",
    "best freelance",
    "freelancers for hire",
    "job board",
    "job listings",
    "remote jobs",
    "tutoring jobs",
    "online tutoring jobs",
];

const SKILLS: Record<string, string[]> = {
    "Quran Teacher": [
        "quran teacher",
        "quran tutor",
        "online quran",
        "tajweed teacher",
        "tajweed tutor",
    ],
    "English Teacher": [
        "english teacher",
        "english tutor",
        "esl teacher",
        "esl tutor",
    ],
    "Math Tutor": [
        "math tutor",
        "mathematics tutor",
        "math teacher",
    ],
    "Online Tutor": [
        "online tutor",
        "private tutor",
        "home tutor",
    ],
    "Career Coach": [
        "career coach",
        "career coaching",
        "career counselor",
        "career consultant",
    ],
    "Business Coach": [
        "business coach",
        "business coaching",
        "business consultant",
        "business mentor",
    ],
    "Life Coach": [
        "life coach",
        "life coaching",
    ],
    "Web Developer": [
        "web developer",
        "website developer",
        "web development",
    ],
    "Graphic Designer": [
        "graphic designer",
        "graphic design",
    ],
    "Content Writer": [
        "content writer",
        "content writing",
        "copywriter",
        "copywriting",
    ],
    "Video Editor": [
        "video editor",
        "video editing",
    ],
    "Virtual Assistant": [
        "virtual assistant",
        "virtual assistant needed",
    ],
};

const COUNTRIES = [
    "United States",
    "USA",
    "Canada",
    "United Kingdom",
    "UK",
    "Australia",
    "Germany",
    "France",
    "Netherlands",
    "Norway",
    "Sweden",
    "Finland",
    "Denmark",
    "United Arab Emirates",
    "UAE",
    "Saudi Arabia",
    "Qatar",
    "Pakistan",
];

function findSkill(text: string): string | null {
    const lower = text.toLowerCase();

    for (const [skill, keywords] of Object.entries(SKILLS)) {
        if (keywords.some((keyword) => lower.includes(keyword))) {
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

function isBlocked(url: string): boolean {
    const lower = url.toLowerCase();

    return BLOCKED_DOMAINS.some((domain) =>
        lower.includes(domain)
    );
}

function looksGeneric(text: string): boolean {
    const lower = text.toLowerCase();

    return GENERIC_TERMS.some((term) =>
        lower.includes(term)
    );
}

function looksLikeDirectRequest(text: string): boolean {
    const lower = text.toLowerCase();

    const signals = [
        "looking for",
        "need a",
        "need an",
        "need someone",
        "seeking",
        "wanted",
        "want a",
        "help me find",
        "can anyone recommend",
        "does anyone know",
        "i need",
        "we need",
        "my daughter needs",
        "my son needs",
        "our company needs",
        "client needs",
        "hiring",
    ];

    return signals.some((signal) =>
        lower.includes(signal)
    );
}

function extractEmail(text: string): string | null {
    const match = text.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

    return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
    const match = text.match(
        /(?:\+?\d[\d\s().-]{7,}\d)/
    );

    return match ? match[0].trim() : null;
}

function parseDate(value?: string): Date | null {
    if (!value) return null;

    const raw = value.trim().toLowerCase();

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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function isFresh(date: Date): boolean {
    const ageHours =
        (Date.now() - date.getTime()) /
        (1000 * 60 * 60);

    return ageHours >= 0 && ageHours <= MAX_AGE_HOURS;
}

function calculateGoldScore(
    title: string,
    snippet: string,
    hasContact: boolean,
    date: Date
): number {
    const text =
        `${title} ${snippet}`.toLowerCase();

    let score = 0;

    if (looksLikeDirectRequest(text)) score += 35;
    if (hasContact) score += 30;
    if (findSkill(text)) score += 20;
    if (text.includes("urgent")) score += 5;
    if (text.includes("asap")) score += 5;
    if (text.includes("today")) score += 5;

    const ageHours =
        (Date.now() - date.getTime()) /
        (1000 * 60 * 60);

    if (ageHours <= 24) score += 10;
    else if (ageHours <= 48) score += 5;

    return Math.min(score, 100);
}

export async function fetchGoogleLeads(): Promise<number> {
    if (!SERPER_API_KEY) {
        console.error(
            "SERPER_API_KEY is missing."
        );
        return 0;
    }

    const queries = [
        '"looking for" "Quran teacher"',
        '"looking for" "online tutor"',
        '"need" "online tutor"',
        '"looking for" "English tutor"',
        '"looking for" "math tutor"',
        '"looking for" "career coach"',
        '"looking for" "business coach"',
        '"looking for" "life coach"',
        '"looking for" "web developer"',
        '"looking for" "graphic designer"',
        '"looking for" "content writer"',
        '"looking for" "video editor"',
        '"looking for" "virtual assistant"',
        '"need" "web developer"',
        '"need" "graphic designer"',
        '"need" "content writer"',
        '"need" "video editor"',
        '"need" "virtual assistant"',
    ];

    let inserted = 0;

    for (const query of queries) {
        try {
            const response = await axios.post(
                "https://google.serper.dev/search",
                {
                    q: query,
                    num: 10,
                    tbs: "qdr:d3",
                },
                {
                    headers: {
                        "X-API-KEY": SERPER_API_KEY,
                        "Content-Type":
                            "application/json",
                    },
                }
            );

            const results: SerperResult[] =
                response.data?.organic || [];

            console.log(
                `GOOGLE: ${query} -> ${results.length} results`
            );

            for (const result of results) {
                const title =
                    result.title?.trim();

                const link =
                    result.link?.trim();

                const snippet =
                    result.snippet?.trim() || "";

                if (!title || !link) {
                    continue;
                }

                if (isBlocked(link)) {
                    console.log(
                        `REJECTED MARKETPLACE: ${link}`
                    );
                    continue;
                }

                const combinedText =
                    `${title} ${snippet}`;

                if (looksGeneric(combinedText)) {
                    console.log(
                        `REJECTED GENERIC: ${title}`
                    );
                    continue;
                }

                if (
                    !looksLikeDirectRequest(
                        combinedText
                    )
                ) {
                    console.log(
                        `REJECTED NOT DIRECT: ${title}`
                    );
                    continue;
                }

                const skill =
                    findSkill(combinedText);

                if (!skill) {
                    continue;
                }

                const publishedDate =
                    parseDate(result.date);

                if (!publishedDate) {
                    console.log(
                        `REJECTED NO DATE: ${title}`
                    );
                    continue;
                }

                if (!isFresh(publishedDate)) {
                    console.log(
                        `REJECTED OLD: ${result.date} | ${title}`
                    );
                    continue;
                }

                const email =
                    extractEmail(combinedText);

                const phone =
                    extractPhone(combinedText);

                const hasContact =
                    Boolean(email || phone);

                const goldScore =
                    calculateGoldScore(
                        title,
                        snippet,
                        hasContact,
                        publishedDate
                    );

                if (goldScore < 50) {
                    console.log(
                        `REJECTED LOW SCORE ${goldScore}: ${title}`
                    );
                    continue;
                }

                const { data: existing } =
                    await supabase
                        .from("demand_leads")
                        .select("id")
                        .eq("source", link)
                        .limit(1);

                if (
                    existing &&
                    existing.length > 0
                ) {
                    continue;
                }

                const country =
                    findCountry(combinedText);

                const description =
                    `${snippet}\n\nGOLD SCORE: ${goldScore}`;

                const { error } =
                    await supabase
                        .from("demand_leads")
                        .insert({
                            type: "Demand",
                            source: link,
                            client_name: title,
                            skill_needed: skill,
                            description,
                            content_email: email,
                            content_phone: phone,
                            created_at:
                                publishedDate.toISOString(),
                            status: "active",
                            title,
                            category:
                                "Real Opportunity",
                            subcategory: "Google",
                            country,
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
                    `🔥 GOLD LEAD ADDED [${goldScore}] | ${skill} | ${country} | ${title}`
                );
            }
        } catch (error) {
            console.error(
                `Google query failed: ${query}`,
                error
            );
        }
    }

    console.log(
        `Google importer finished. GOLD leads inserted: ${inserted}`
    );

    return inserted;
}
