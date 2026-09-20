import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

type Lead = {
  id: string;
  leadType: "Demand" | "Supply" | "SaaS";

  title: string;
  name?: string;
  company?: string;

  description?: string;

  skill?: string;
  skillNeeded?: string;

  category?: string;
  subcategory?: string;

  country?: string;
  city?: string;

  budget?: string | number | null;
  salary?: string | number | null;
  currency?: string;

  email?: string;
  phone?: string;
  contact?: string;

  source?: string;
  sourceUrl?: string;
  openUrl?: string;

  status?: string;
  createdAt?: string;
};

type LeadFilter = "All" | "Demand" | "Supply" | "SaaS";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeCountry(value: string): string {
  const country = clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ");

  const aliases: Record<string, string> = {
    uk: "united kingdom",
    "u.k.": "united kingdom",
    "u.k": "united kingdom",
    england: "united kingdom",
    scotland: "united kingdom",
    wales: "united kingdom",
    "northern ireland": "united kingdom",

    usa: "united states",
    us: "united states",
    "u.s.a.": "united states",
    "u.s.": "united states",

    uae: "united arab emirates",
    "u.a.e.": "united arab emirates",

    ksa: "saudi arabia",

    pakistan: "pakistan",
    india: "india",
    bangladesh: "bangladesh",
    canada: "canada",
    australia: "australia",
  };

  return aliases[country] || country;
}

function countryMatches(
  preferredCountry: string,
  leadCountry: string
): boolean {
  const preferred = normalizeCountry(preferredCountry);
  const actual = normalizeCountry(leadCountry);

  if (!preferred || !actual) return false;

  return (
    actual === preferred ||
    actual === "global" ||
    actual === "worldwide"
  );
}

function normalizeSkill(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/[,_/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function skillMatches(
  preferredSkill: string,
  leadSkill: string
): boolean {
  const preferred = normalizeSkill(preferredSkill);
  const actual = normalizeSkill(leadSkill);

  if (!preferred || !actual) return false;

  if (preferred === actual) return true;

  const preferredWords = preferred.split(" ");
  const actualWords = actual.split(" ");

  return (
    actual.includes(preferred) ||
    preferred.includes(actual) ||
    preferredWords.every((word) =>
      actualWords.includes(word)
    )
  );
}

function formatDate(value: string): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function openLink(url: string): void {
  if (!url) return;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

function callPhone(phone: string): void {
  if (!phone) return;

  const cleaned = phone.replace(/[^\d+]/g, "");

  if (!cleaned) return;

  window.open(
    `https://wa.me/${cleaned.replace(/^\+/, "")}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function sendEmail(email: string): void {
  if (!email) return;

  window.location.href = `mailto:${email}`;
}

export default function Leads() {
  const navigate = useNavigate();

  const [leads, setLeads] = useState<Lead[]>([]);

  const [preferredCountry, setPreferredCountry] =
    useState("");

  const [preferredSkills, setPreferredSkills] =
    useState<string[]>([]);

  const [typeFilter, setTypeFilter] =
    useState<LeadFilter>("All");

  const [loading, setLoading] = useState(true);

  const [preferencesLoading, setPreferencesLoading] =
    useState(true);

  const [errorMsg, setErrorMsg] = useState("");

  const [preferencesError, setPreferencesError] =
    useState("");

  useEffect(() => {
    loadLeads();
  }, []);
    async function loadLeads() {
    setLoading(true);
    setPreferencesLoading(true);
    setErrorMsg("");
    setPreferencesError("");

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user = authData.user;

      if (!user) {
        setPreferencesError(
          "Please sign in to view your leads."
        );
        setLeads([]);
        return;
      }

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from("users")
        .select(
          "country, skill_preference"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (userError) {
        throw new Error(
          `Preferences: ${userError.message}`
        );
      }

      const savedCountry = clean(
        userData?.country
      );

      const {
        data: userSkillsData,
        error: userSkillsError,
      } = await supabase
        .from("user_skills")
        .select("skill")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true,
        });

      if (userSkillsError) {
        throw new Error(
          `Skills: ${userSkillsError.message}`
        );
      }

      const currentSkills = (
        userSkillsData || []
      )
        .map((row: any) =>
          clean(row.skill)
        )
        .filter(Boolean);

      let oldSkills: string[] = [];

      const legacyValue =
        userData?.skill_preference;

      if (Array.isArray(legacyValue)) {
        oldSkills = legacyValue
          .map((item: unknown) =>
            clean(item)
          )
          .filter(Boolean);
      } else if (
        typeof legacyValue === "string" &&
        legacyValue.trim()
      ) {
        try {
          const parsed =
            JSON.parse(legacyValue);

          if (Array.isArray(parsed)) {
            oldSkills = parsed
              .map((item: unknown) =>
                clean(item)
              )
              .filter(Boolean);
          } else {
            oldSkills = legacyValue
              .split(",")
              .map((item) =>
                item.trim()
              )
              .filter(Boolean);
          }
        } catch {
          oldSkills = legacyValue
            .split(",")
            .map((item) =>
              item.trim()
            )
            .filter(Boolean);
        }
      }

      const mergedSkills = [
        ...currentSkills,
        ...oldSkills,
      ].filter(
        (skill, index, array) =>
          array.findIndex(
            (item) =>
              normalizeSkill(item) ===
              normalizeSkill(skill)
          ) === index
      );

      setPreferredCountry(
        savedCountry
      );

      setPreferredSkills(
        mergedSkills
      );

      console.log(
        "LEAD PREFERENCES:",
        {
          userId: user.id,
          country: savedCountry,
          currentSkills,
          oldSkills,
          mergedSkills,
        }
      );

      const response = await fetch(
        "/api/leads"
      );

      if (!response.ok) {
        throw new Error(
          `Leads API error: ${response.status}`
        );
      }

      const result =
        await response.json();

      const rows = Array.isArray(result)
        ? result
        : Array.isArray(result?.leads)
        ? result.leads
        : Array.isArray(result?.data)
        ? result.data
        : [];

      console.log(
        "LEADS API RESULT:",
        {
          count: rows.length,
          counts: result?.counts,
          firstLead: rows[0],
        }
      );

      const mapped: Lead[] =
        rows
          .map((row: any) => {
            const rawType =
              clean(
                row.type
              ) ||
              clean(
                row.lead_type
              ) ||
              clean(
                row.leadType
              );

            const normalizedType =
              rawType.toLowerCase();

            const leadType: Lead["leadType"] =
              normalizedType ===
              "supply"
                ? "Supply"
                : normalizedType ===
                  "saas"
                ? "SaaS"
                : "Demand";

            return {
              id: clean(row.id),

              leadType,

              title:
                clean(row.title) ||
                clean(row.name) ||
                clean(
                  row.job_title
                ) ||
                "Opportunity",

              name:
                clean(
                  row.name
                ) ||
                clean(
                  row.contact_name
                ) ||
                clean(
                  row.client_name
                ),

              company:
                clean(
                  row.company
                ) ||
                clean(
                  row.company_name
                ),

              description:
                clean(
                  row.description
                ) ||
                clean(
                  row.content
                ),

              skill:
                clean(
                  row.skill
                ) ||
                clean(
                  row.skill_needed
                ) ||
                clean(
                  row.required_skill
                ),

              skillNeeded:
                clean(
                  row.skill_needed
                ) ||
                clean(
                  row.required_skill
                ) ||
                clean(
                  row.skill
                ),

              category:
                clean(
                  row.category
                ),

              subcategory:
                clean(
                  row.subcategory
                ),

              country:
                clean(
                  row.country
                ),

              city:
                clean(
                  row.city
                ),

              budget:
                row.budget ??
                null,

              salary:
                row.salary ??
                row.salary_range ??
                row.salary_min ??
                null,

              currency:
                clean(
                  row.currency
                ),

              email:
                clean(
                  row.contact_email
                ) ||
                clean(
                  row.email
                ),

              phone:
                clean(
                  row.contact_phone
                ) ||
                clean(
                  row.phone
                ),

              contact:
                clean(
                  row.contact
                ) ||
                clean(
                  row.contact_email
                ) ||
                clean(
                  row.contact_phone
                ),

              source:
                clean(
                  row.source
                ),

              sourceUrl:
                clean(
                  row.source_url
                ),

              openUrl:
                clean(
                  row.openUrl
                ) ||
                clean(
                  row.contact_url
                ) ||
                clean(
                  row.apply_url
                ) ||
                clean(
                  row.landing_url
                ) ||
                clean(
                  row.company_website
                ) ||
                clean(
                  row.source_url
                ),

              status:
                clean(
                  row.status
                ),

              createdAt:
                clean(
                  row.created_at
                ) ||
                clean(
                  row.createdAt
                ),
            };
          })
          .filter(
            (lead) => Boolean(lead.id)
          );

      setLeads(mapped);

      console.log(
        "MAPPED LEADS:",
        mapped
      );
    } catch (error: any) {
      console.error(
        "Leads page error:",
        error
      );

      const message =
        error?.message ||
        "Unable to load leads.";

      setErrorMsg(message);
      setLeads([]);

      if (
        message
          .toLowerCase()
          .includes("preference") ||
        message
          .toLowerCase()
          .includes("country") ||
        message
          .toLowerCase()
          .includes("skill")
      ) {
        setPreferencesError(
          message
        );
      }
    } finally {
      setLoading(false);
      setPreferencesLoading(false);
    }
}
    const filteredLeads = useMemo(() => {
    if (!preferredCountry) {
      return [];
    }

    if (preferredSkills.length === 0) {
      return [];
    }

    return leads.filter((lead) => {
      const typeMatch =
        typeFilter === "All" ||
        lead.leadType === typeFilter;

      if (!typeMatch) {
        return false;
      }

      const countryMatch =
        countryMatches(
          preferredCountry,
          lead.country || ""
        );

      if (!countryMatch) {
        return false;
      }

      const leadSkill =
        lead.skill ||
        lead.skillNeeded ||
        "";

      const skillMatch =
        preferredSkills.some(
          (preferredSkill) =>
            skillMatches(
              preferredSkill,
              leadSkill
            )
        );

      return skillMatch;
    });
  }, [
    leads,
    preferredCountry,
    preferredSkills,
    typeFilter,
  ]);

  const counts = useMemo(() => {
    const result = {
      All: 0,
      Demand: 0,
      Supply: 0,
      SaaS: 0,
    };

    filteredLeads.forEach((lead) => {
      result.All += 1;

      if (lead.leadType === "Demand") {
        result.Demand += 1;
      }

      if (lead.leadType === "Supply") {
        result.Supply += 1;
      }

      if (lead.leadType === "SaaS") {
        result.SaaS += 1;
      }
    });

    return result;
  }, [filteredLeads]);

  const needsPreferences =
    !preferredCountry ||
    preferredSkills.length === 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <button
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Leads
          </h1>

          <p className="mt-1 text-sm text-zinc-400">
            Opportunities matched to your
            country and selected skills.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              "All",
              "Demand",
              "Supply",
              "SaaS",
            ] as LeadFilter[]
          ).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() =>
                setTypeFilter(filter)
              }
              className={`rounded-lg border px-4 py-2 text-sm ${
                typeFilter === filter
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {filter}
              {!loading &&
                ` (${counts[filter]})`}
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">
            Your Lead Preferences
          </h2>

          {preferencesLoading ? (
            <p className="text-sm text-zinc-400">
              Loading preferences...
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-zinc-500">
                  Country:
                </span>{" "}
                <span className="text-white">
                  {preferredCountry ||
                    "Not selected"}
                </span>
              </div>

              <div>
                <span className="text-zinc-500">
                  Skills:
                </span>{" "}
                <span className="text-white">
                  {preferredSkills.length
                    ? preferredSkills.join(
                        ", "
                      )
                    : "None selected"}
                </span>
              </div>
            </div>
          )}
        </div>

        {preferencesError && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {preferencesError}
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
            Loading leads...
          </div>
        ) : needsPreferences ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <h2 className="text-lg font-semibold">
              Select your preferences
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Add your country and at least
              one skill in My Skills to see
              matching leads.
            </p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <h2 className="text-lg font-semibold">
              No matching leads
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              There are currently no{" "}
              {typeFilter === "All"
                ? ""
                : typeFilter.toLowerCase() + " "}
              leads matching your selected
              country and skills.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <div
                key={`${lead.leadType}-${lead.id}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {lead.title}
                    </h2>

                    <div className="mt-1 text-xs text-zinc-500">
                      {lead.leadType}
                    </div>
                  </div>

                  {lead.createdAt && (
                    <div className="text-xs text-zinc-500">
                      {formatDate(
                        lead.createdAt
                      )}
                    </div>
                  )}
                </div>

                {lead.company && (
                  <p className="mb-2 text-sm text-zinc-300">
                    {lead.company}
                  </p>
                )}

                {lead.name &&
                  lead.name !==
                    lead.company && (
                    <p className="mb-2 text-sm text-zinc-400">
                      {lead.name}
                    </p>
                  )}

                {lead.description && (
                  <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                    {lead.description}
                  </p>
                )}
                              <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
                  {lead.skill && (
                    <div>
                      <span className="text-zinc-500">
                        Skill:
                      </span>{" "}
                      <span className="text-white">
                        {lead.skill}
                      </span>
                    </div>
                  )}

                  {lead.country && (
                    <div>
                      <span className="text-zinc-500">
                        Country:
                      </span>{" "}
                      <span className="text-white">
                        {lead.country}
                      </span>
                    </div>
                  )}

                  {lead.city && (
                    <div>
                      <span className="text-zinc-500">
                        City:
                      </span>{" "}
                      <span className="text-white">
                        {lead.city}
                      </span>
                    </div>
                  )}

                  {lead.budget != null &&
                    String(
                      lead.budget
                    ).trim() && (
                      <div>
                        <span className="text-zinc-500">
                          Budget:
                        </span>{" "}
                        <span className="text-white">
                          {lead.currency
                            ? `${lead.currency} `
                            : ""}
                          {String(
                            lead.budget
                          )}
                        </span>
                      </div>
                    )}

                  {lead.salary != null &&
                    String(
                      lead.salary
                    ).trim() && (
                      <div>
                        <span className="text-zinc-500">
                          Salary:
                        </span>{" "}
                        <span className="text-white">
                          {lead.currency
                            ? `${lead.currency} `
                            : ""}
                          {String(
                            lead.salary
                          )}
                        </span>
                      </div>
                    )}

                  {lead.source && (
                    <div>
                      <span className="text-zinc-500">
                        Source:
                      </span>{" "}
                      <span className="text-white">
                        {lead.source}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {lead.phone && (
                    <button
                      type="button"
                      onClick={() =>
                        callPhone(
                          lead.phone || ""
                        )
                      }
                      className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-zinc-200"
                    >
                      WhatsApp / Call
                    </button>
                  )}

                  {lead.email && (
                    <button
                      type="button"
                      onClick={() =>
                        sendEmail(
                          lead.email || ""
                        )
                      }
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
                    >
                      Email
                    </button>
                  )}

                  {lead.contact &&
                    !lead.email &&
                    !lead.phone && (
                      <button
                        type="button"
                        onClick={() =>
                          openLink(
                            lead.contact || ""
                          )
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
                      >
                        Contact
                      </button>
                    )}

                  {lead.openUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        openLink(
                          lead.openUrl || ""
                        )
                      }
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
                    >
                      Open Opportunity
                    </button>
                  )}

                  {lead.sourceUrl &&
                    lead.sourceUrl !==
                      lead.openUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          openLink(
                            lead.sourceUrl ||
                              ""
                          )
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
                      >
                        Source
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  }
              
