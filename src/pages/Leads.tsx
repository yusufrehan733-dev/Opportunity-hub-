import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

type LeadType =
  | "Demand"
  | "Supply"
  | "SaaS";

type Lead = {
  id: string;
  type?: LeadType;
  leadType?: LeadType;
  lead_type?: LeadType;

  title?: string;
  name?: string;
  client_name?: string;
  company?: string;

  description?: string;

  skill?: string;
  skill_needed?: string;
  category?: string;
  subcategory?: string;

  country?: string;
  city?: string;

  budget?: string | number;
  currency?: string;

  salary?: string | number;
  salary_range?: string | number;
  salary_min?: string | number;
  salary_max?: string | number;

  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;

  email?: string;
  phone?: string;
  contact?: string;
  contact_url?: string;

  company_website?: string;
  apply_url?: string;
  landing_url?: string;
  source_url?: string;

  openUrl?: string;
  source?: string;

  platform?: string;
  niche?: string;

  status?: string;

  created_at?: string;
  createdAt?: string;
};

type SkillInfo = {
  id?: string;
  name: string;
  category?: string;
  subcategory?: string;
  tags?: string[] | string | null;
};

function clean(value: any): string {
  return String(value ?? "").trim();
}

function normalizeText(value: any): string {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountry(value: any): string {
  const country = normalizeText(value);

  const aliases: Record<string, string> = {
    usa: "united states",
    us: "united states",
    "u s": "united states",
    "u s a": "united states",
    america: "united states",

    uk: "united kingdom",
    britain: "united kingdom",
    england: "united kingdom",

    uae: "united arab emirates",
    "u a e": "united arab emirates",
  };

  return aliases[country] || country;
}

function toArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => clean(item))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getLeadType(
  lead: Lead
): LeadType {
  const value = clean(
    lead.leadType ||
      lead.lead_type ||
      lead.type
  ).toLowerCase();

  if (value === "supply") {
    return "Supply";
  }

  if (value === "saas") {
    return "SaaS";
  }

  return "Demand";
  }
function getLeadSkillText(
  lead: Lead
): string {
  return [
    lead.skill,
    lead.skill_needed,
    lead.category,
    lead.subcategory,
    lead.title,
    lead.description,
    lead.niche,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function getSkillInfoText(
  skill: SkillInfo
): string {
  return [
    skill.name,
    skill.category,
    skill.subcategory,
    ...toArray(skill.tags),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function skillMatches(
  preferredSkill: string,
  leadSkill?: string,
  leadCategory?: string,
  leadSubcategory?: string,
  leadDescription?: string
): boolean {
  const preferred = normalizeText(
    preferredSkill
  );

  if (!preferred) {
    return false;
  }

  const leadParts = [
    leadSkill,
    leadCategory,
    leadSubcategory,
    leadDescription,
  ]
    .map(normalizeText)
    .filter(Boolean);

  if (!leadParts.length) {
    return false;
  }

  const leadText = leadParts.join(" ");

  if (leadParts.some((part) => part === preferred)) {
    return true;
  }

  if (leadParts.some((part) =>
    part.includes(preferred)
  )) {
    return true;
  }

  if (leadText.includes(preferred)) {
    return true;
  }

  const preferredWords = preferred
    .split(" ")
    .filter((word) => word.length >= 3);

  if (!preferredWords.length) {
    return false;
  }

  const matchedWords =
    preferredWords.filter((word) =>
      leadText.includes(word)
    );

  return (
    matchedWords.length ===
    preferredWords.length
  );
}

function hierarchySkillMatches(
  preferredSkill: string,
  lead: Lead,
  allSkills: SkillInfo[]
): boolean {
  const preferred = normalizeText(
    preferredSkill
  );

  if (!preferred) {
    return false;
  }

  const directMatch = skillMatches(
    preferredSkill,
    lead.skill || lead.skill_needed,
    lead.category,
    lead.subcategory,
    lead.description
  );

  if (directMatch) {
    return true;
  }

  const matchingSkill = allSkills.find(
    (skill) =>
      normalizeText(skill.name) === preferred
  );

  if (!matchingSkill) {
    return false;
  }

  return skillMatches(
    matchingSkill.name,
    lead.skill || lead.skill_needed,
    lead.category,
    lead.subcategory,
    lead.description
  ) ||
    skillMatches(
      matchingSkill.category || "",
      lead.skill,
      lead.category,
      lead.subcategory,
      lead.description
    ) ||
    skillMatches(
      matchingSkill.subcategory || "",
      lead.skill,
      lead.category,
      lead.subcategory,
      lead.description
    );
}

function getLeadCountry(
  lead: Lead
): string {
  return normalizeCountry(
    lead.country
  );
}

function getLeadOpenUrl(
  lead: Lead
): string {
  return (
    clean(lead.openUrl) ||
    clean(lead.contact_url) ||
    clean(lead.apply_url) ||
    clean(lead.company_website) ||
    clean(lead.landing_url) ||
    clean(lead.source_url)
  );
}

function getLeadTitle(
  lead: Lead
): string {
  return (
    clean(lead.title) ||
    clean(lead.name) ||
    clean(lead.client_name) ||
    clean(lead.company) ||
    "Opportunity"
  );
}

function getLeadContact(
  lead: Lead
): string {
  return (
    clean(lead.contact_email) ||
    clean(lead.contact_phone) ||
    clean(lead.contact_url) ||
    clean(lead.apply_url) ||
    clean(lead.company_website) ||
    clean(lead.landing_url) ||
    clean(lead.source_url)
  );
}

function parseSkillPreference(
  value: any
): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (
          typeof item === "string"
        ) {
          return item;
        }

        if (
          item &&
          typeof item === "object"
        ) {
          return (
            item.name ||
            item.skill ||
            item.title ||
            ""
          );
        }

        return "";
      })
      .map(clean)
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parseSkillPreference(
          parsed
        );
      }
    } catch {
      // Treat it as a normal comma-separated value.
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
  }
export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allSkills, setAllSkills] = useState<SkillInfo[]>([]);

  const [selectedCountry, setSelectedCountry] =
    useState("");

  const [selectedSkills, setSelectedSkills] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [userLoaded, setUserLoaded] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUserPreferences() {
      try {
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          if (mounted) {
            setUserLoaded(true);
          }

          return;
        }

        const { data: userRow, error: userError } =
          await supabase
            .from("users")
            .select(
              "country, skill_preference"
            )
            .eq("id", user.id)
            .maybeSingle();

        if (userError) {
          throw userError;
        }

        const country =
          clean(userRow?.country);

        const oldSkills =
          parseSkillPreference(
            userRow?.skill_preference
          );

        const {
          data: userSkillRows,
          error: skillsError,
        } = await supabase
          .from("user_skills")
          .select("skill")
          .eq("user_id", user.id);

        if (skillsError) {
          throw skillsError;
        }

        const newSkills =
          (userSkillRows || [])
            .map((row: any) =>
              clean(row?.skill)
            )
            .filter(Boolean);

        const combinedSkills = Array.from(
          new Set([
            ...oldSkills,
            ...newSkills,
          ])
        );

        if (mounted) {
          setSelectedCountry(country);
          setSelectedSkills(
            combinedSkills
          );
          setUserLoaded(true);
        }
      } catch (err: any) {
        console.error(
          "Failed to load user preferences:",
          err
        );

        if (mounted) {
          setUserLoaded(true);
          setError(
            err?.message ||
              "Unable to load your preferences."
          );
        }
      }
    }

    loadUserPreferences();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSkills() {
      try {
        const {
          data,
          error: skillsError,
        } = await supabase
          .from("skills")
          .select(
            "id, name, category, subcategory, tags"
          )
          .order("name", {
            ascending: true,
          });

        if (skillsError) {
          throw skillsError;
        }

        if (mounted) {
          setAllSkills(
            (data || []) as SkillInfo[]
          );
        }
      } catch (err) {
        console.error(
          "Failed to load skills:",
          err
        );
      }
    }

    loadSkills();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadLeads() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch("/api/leads");

        const responseText =
          await response.text();

        let result: any = null;

        try {
          result =
            responseText
              ? JSON.parse(responseText)
              : null;
        } catch {
          throw new Error(
            "The leads API returned an invalid response."
          );
        }

        if (!response.ok) {
          throw new Error(
            result?.error ||
              result?.message ||
              `Leads request failed (${response.status}).`
          );
        }

        if (
          !result ||
          result.success === false
        ) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Unable to load leads."
          );
        }

        if (mounted) {
          setLeads(
            Array.isArray(result.leads)
              ? result.leads
              : []
          );
        }
      } catch (err: any) {
        console.error(
          "Failed to load leads:",
          err
        );

        if (mounted) {
          setError(
            err?.message ||
              "Unable to load leads."
          );
          setLeads([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (userLoaded) {
      loadLeads();
    }

    return () => {
      mounted = false;
    };
  }, [userLoaded]);
    const filteredLeads = useMemo(() => {
    const country =
      normalizeCountry(selectedCountry);

    const preferredSkills =
      selectedSkills
        .map(clean)
        .filter(Boolean);

    return leads.filter((lead) => {
      const leadType =
        getLeadType(lead);

      const leadCountry =
        getLeadCountry(lead);

      /*
       * Country is required for every lead type.
       */
      if (
        country &&
        leadCountry !== country
      ) {
        return false;
      }

      /*
       * SaaS is country-first.
       *
       * Once the user's country matches,
       * any qualifying SaaS professional
       * from that country can appear.
       *
       * We intentionally do NOT require
       * the user's selected skill here.
       */
      if (leadType === "SaaS") {
        return true;
      }

      /*
       * Demand and Supply remain
       * country + skill matched.
       */
      if (!preferredSkills.length) {
        return false;
      }

      return preferredSkills.some(
        (preferredSkill) =>
          hierarchySkillMatches(
            preferredSkill,
            lead,
            allSkills
          )
      );
    });
  }, [
    leads,
    selectedCountry,
    selectedSkills,
    allSkills,
  ]);

  const counts = useMemo(() => {
    return {
      Demand: filteredLeads.filter(
        (lead) =>
          getLeadType(lead) === "Demand"
      ).length,

      Supply: filteredLeads.filter(
        (lead) =>
          getLeadType(lead) === "Supply"
      ).length,

      SaaS: filteredLeads.filter(
        (lead) =>
          getLeadType(lead) === "SaaS"
      ).length,
    };
  }, [filteredLeads]);

  function formatSalary(
    lead: Lead
  ): string {
    if (clean(lead.salary_range)) {
      return clean(
        lead.salary_range
      );
    }

    const min =
      clean(lead.salary_min);

    const max =
      clean(lead.salary_max);

    if (min || max) {
      const currency =
        clean(lead.currency);

      const amount =
        min && max
          ? `${min} - ${max}`
          : min || max;

      return currency
        ? `${currency} ${amount}`
        : amount;
    }

    if (clean(lead.salary)) {
      return clean(lead.salary);
    }

    if (clean(lead.budget)) {
      const currency =
        clean(lead.currency);

      return currency
        ? `${currency} ${clean(
            lead.budget
          )}`
        : clean(lead.budget);
    }

    return "";
  }

  function formatDate(
    value?: string
  ): string {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  }

  function getDisplaySkill(
    lead: Lead
  ): string {
    return (
      clean(lead.skill) ||
      clean(lead.skill_needed) ||
      clean(lead.subcategory) ||
      clean(lead.category) ||
      clean(lead.niche)
    );
  }

  function getDisplayCompany(
    lead: Lead
  ): string {
    return (
      clean(lead.company) ||
      clean(lead.client_name) ||
      clean(lead.name)
    );
  }

  function getDisplayLocation(
    lead: Lead
  ): string {
    const parts = [
      clean(lead.city),
      clean(lead.country),
    ].filter(Boolean);

    return parts.join(", ");
  }

  function getTypeLabel(
    lead: Lead
  ): string {
    return getLeadType(lead);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 700,
              }}
            >
              Leads
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#aaa",
              }}
            >
              Real opportunities matched to
              your country and skills.
            </p>
          </div>

          <div
            style={{
              color: "#aaa",
              fontSize: "14px",
            }}
          >
            Country:{" "}
            <strong
              style={{
                color: "#fff",
              }}
            >
              {selectedCountry ||
                "Not selected"}
            </strong>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {(
            [
              ["Demand", counts.Demand],
              ["Supply", counts.Supply],
              ["SaaS", counts.SaaS],
            ] as const
          ).map(([label, count]) => (
            <div
              key={label}
              style={{
                background: "#080808",
                border: "1px solid #333",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  color: "#999",
                  fontSize: "13px",
                }}
              >
                {label}
              </div>

              <div
                style={{
                  marginTop: "6px",
                  fontSize: "24px",
                  fontWeight: 700,
                }}
              >
                {count}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              background: "#120000",
              border:
                "1px solid #5a2222",
              color: "#ffb3b3",
              borderRadius: "10px",
              padding: "14px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              background: "#080808",
              border: "1px solid #333",
              borderRadius: "10px",
              padding: "30px",
              textAlign: "center",
              color: "#aaa",
            }}
          >
            Loading real leads...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div
            style={{
              background: "#080808",
              border: "1px solid #333",
              borderRadius: "10px",
              padding: "30px",
              textAlign: "center",
              color: "#aaa",
            }}
          >
            No matching leads found.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
                        {filteredLeads.map((lead) => {
              const leadType =
                getTypeLabel(lead);

              const title =
                getLeadTitle(lead);

              const company =
                getDisplayCompany(lead);

              const location =
                getDisplayLocation(lead);

              const skill =
                getDisplaySkill(lead);

              const salary =
                formatSalary(lead);

              const contact =
                getLeadContact(lead);

              const openUrl =
                getLeadOpenUrl(lead);

              const date =
                formatDate(
                  lead.created_at ||
                    lead.createdAt
                );

              return (
                <div
                  key={lead.id}
                  style={{
                    background: "#080808",
                    border:
                      "1px solid #333",
                    borderRadius: "12px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        border:
                          "1px solid #555",
                        borderRadius: "999px",
                        padding:
                          "4px 9px",
                        fontSize: "12px",
                        color: "#ddd",
                      }}
                    >
                      {leadType}
                    </span>

                    {date && (
                      <span
                        style={{
                          color: "#777",
                          fontSize: "12px",
                        }}
                      >
                        {date}
                      </span>
                    )}
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: "19px",
                      lineHeight: 1.3,
                    }}
                  >
                    {title}
                  </h2>

                  {company && (
                    <div
                      style={{
                        color: "#ccc",
                        fontSize: "14px",
                      }}
                    >
                      {company}
                    </div>
                  )}

                  {skill && (
                    <div
                      style={{
                        color: "#aaa",
                        fontSize: "14px",
                      }}
                    >
                      <strong
                        style={{
                          color: "#ddd",
                        }}
                      >
                        Skill:
                      </strong>{" "}
                      {skill}
                    </div>
                  )}

                  {location && (
                    <div
                      style={{
                        color: "#aaa",
                        fontSize: "14px",
                      }}
                    >
                      <strong
                        style={{
                          color: "#ddd",
                        }}
                      >
                        Location:
                      </strong>{" "}
                      {location}
                    </div>
                  )}

                  {salary && (
                    <div
                      style={{
                        color: "#aaa",
                        fontSize: "14px",
                      }}
                    >
                      <strong
                        style={{
                          color: "#ddd",
                        }}
                      >
                        Budget / Salary:
                      </strong>{" "}
                      {salary}
                    </div>
                  )}

                  {lead.description && (
                    <p
                      style={{
                        margin: 0,
                        color: "#aaa",
                        fontSize: "14px",
                        lineHeight: 1.5,
                      }}
                    >
                      {lead.description}
                    </p>
                  )}

                  {contact && (
                    <div
                      style={{
                        color: "#999",
                        fontSize: "13px",
                        wordBreak:
                          "break-word",
                      }}
                    >
                      Contact: {contact}
                    </div>
                  )}

                  {openUrl && (
                    <a
                      href={openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: "4px",
                        background: "#fff",
                        color: "#000",
                        textDecoration:
                          "none",
                        textAlign: "center",
                        borderRadius: "8px",
                        padding:
                          "10px 14px",
                        fontWeight: 600,
                        fontSize: "14px",
                      }}
                    >
                      View Opportunity
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
