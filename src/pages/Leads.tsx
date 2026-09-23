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
  leadType:
    | "Demand"
    | "Supply"
    | "SaaS";

  title: string;
  name?: string;
  company?: string;

  description?: string;
  skill?: string;
  category?: string;
  subcategory?: string;

  country?: string;
  city?: string;

  budget?: string | number;
  salary?: string | number;
  currency?: string;

  email?: string;
  phone?: string;
  contact?: string;

  source?: string;
  openUrl?: string;
  createdAt?: string;
};

type LeadFilter =
  | "All"
  | "Demand"
  | "Supply"
  | "SaaS";

type SkillInfo = {
  name: string;
  category: string;
  subcategory: string;
};

function normalizeText(
  value: string
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeCountry(
  value: string
) {
  return normalizeText(value);
}

/*
 * Lead matching rule:
 *
 * 1. Exact saved skill -> exact lead skill.
 * 2. A specialized saved skill can match its
 *    broader category.
 *
 * Example:
 * Calculus -> Calculus + Math
 * Tajweed -> Tajweed + Quran
 *
 * 3. A saved skill can also match a lead whose
 *    subcategory represents that saved skill.
 *
 * 4. We do NOT make a broad skill match every
 *    specialization.
 *
 * The category/subcategory information comes
 * from the existing Supabase skills table.
 */

function skillMatches(
  preferredSkill: string,
  leadSkill: string,
  leadCategory: string,
  leadSubcategory: string,
  skillInfo?: SkillInfo
) {
  const preferred =
    normalizeText(preferredSkill);

  const actual =
    normalizeText(leadSkill);

  const category =
    normalizeText(leadCategory);

  const subcategory =
    normalizeText(leadSubcategory);

  if (!preferred) {
    return false;
  }

  // Exact skill match.
  if (
    actual &&
    (
      actual === preferred ||
      actual.includes(preferred) ||
      preferred.includes(actual)
    )
  ) {
    return true;
  }

  if (!skillInfo) {
    return false;
  }

  const parentCategory =
    normalizeText(
      skillInfo.category
    );

  const parentSubcategory =
    normalizeText(
      skillInfo.subcategory
    );

  /*
   * Specialized skill -> broader category.
   */
  if (
    parentCategory &&
    (
      actual === parentCategory ||
      category === parentCategory ||
      subcategory === parentCategory
    )
  ) {
    return true;
  }

  /*
   * Match the saved skill against the lead's
   * subcategory.
   */
  if (
    parentSubcategory &&
    (
      actual === parentSubcategory ||
      category === parentSubcategory ||
      subcategory === parentSubcategory
    )
  ) {
    return true;
  }

  /*
   * If the lead explicitly identifies the saved
   * skill as its subcategory, it is a match.
   */
  if (
    subcategory &&
    (
      subcategory === preferred ||
      subcategory.includes(preferred) ||
      preferred.includes(subcategory)
    )
  ) {
    return true;
  }

  return false;
}

function formatDate(
  value: string
) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString();
}

function openLink(
  url: string
) {
  if (!url) return;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

function callPhone(
  phone: string
) {
  if (!phone) return;

  const cleaned =
    phone.replace(
      /[^\d+]/g,
      ""
    );

  if (!cleaned) return;

  window.open(
    `https://wa.me/${cleaned.replace(
      /^\+/,
      ""
    )}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function sendEmail(
  email: string
) {
  if (!email) return;

  window.location.href =
    `mailto:${email}`;
}

const buttonStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#1a1a1a",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

export default function Leads() {
  const navigate =
    useNavigate();

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [
    preferredCountry,
    setPreferredCountry,
  ] = useState("");

  const [
    preferredSkills,
    setPreferredSkills,
  ] = useState<string[]>(
    []
  );

  const [
    typeFilter,
    setTypeFilter,
  ] = useState<LeadFilter>(
    "All"
  );

  const [loading, setLoading] =
    useState(true);

  const [
    preferencesLoading,
    setPreferencesLoading,
  ] = useState(true);

  const [errorMsg, setErrorMsg] =
    useState("");

  const [
    preferencesError,
    setPreferencesError,
  ] = useState("");

  const [
    skillInfos,
    setSkillInfos,
  ] = useState<
    SkillInfo[]
  >([]);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      setLoading(true);
      setPreferencesLoading(
        true
      );
      setErrorMsg("");
      setPreferencesError("");

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw new Error(
          authError.message
        );
      }

      const user =
        authData.user;

      if (!user) {
        throw new Error(
          "Please log in before viewing your leads."
        );
      }

      const {
        data: userData,
        error: userError,
      } =
        await supabase
          .from("users")
          .select(
            "country, skill_preference"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (userError) {
        throw new Error(
          `Unable to load your preferences: ${userError.message}`
        );
      }

      const savedCountry =
        String(
          userData?.country || ""
        ).trim();

      const {
        data: skillRows,
        error: skillsError,
      } =
        await supabase
          .from("user_skills")
          .select("skill")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: true,
          });

      if (skillsError) {
        throw new Error(
          `Unable to load your skills: ${skillsError.message}`
        );
      }

      const currentSkills =
        Array.isArray(skillRows)
          ? skillRows
              .map((row: any) =>
                String(
                  row?.skill || ""
                ).trim()
              )
              .filter(Boolean)
          : [];

      let oldSkills: string[] =
        [];

      const oldPreference =
        userData?.skill_preference;
            if (
        Array.isArray(
          oldPreference
        )
      ) {
        oldSkills =
          oldPreference
            .map(
              (skill: any) =>
                String(
                  skill || ""
                ).trim()
            )
            .filter(Boolean);
      } else if (
        typeof oldPreference ===
        "string"
      ) {
        const cleaned =
          oldPreference.trim();

        if (cleaned) {
          try {
            const parsed =
              JSON.parse(
                cleaned
              );

            if (
              Array.isArray(
                parsed
              )
            ) {
              oldSkills =
                parsed
                  .map(
                    (skill: any) =>
                      String(
                        skill || ""
                      ).trim()
                  )
                  .filter(Boolean);
            } else {
              oldSkills =
                cleaned
                  .split(",")
                  .map(
                    (skill) =>
                      skill.trim()
                  )
                  .filter(Boolean);
            }
          } catch {
            oldSkills =
              cleaned
                .split(",")
                .map(
                  (skill) =>
                    skill.trim()
                )
                .filter(Boolean);
          }
        }
      }

      const mergedSkills = [
        ...currentSkills,
        ...oldSkills,
      ].filter(
        (
          skill,
          index,
          array
        ) =>
          array.findIndex(
            (item) =>
              item
                .toLowerCase() ===
              skill
                .toLowerCase()
          ) === index
      );

      setPreferredCountry(
        savedCountry
      );

      setPreferredSkills(
        mergedSkills
      );

      /*
       * Load the existing global skill
       * hierarchy. We use this to understand
       * what broader category a saved skill
       * belongs to.
       */
      const {
        data: allSkills,
        error:
          allSkillsError,
      } =
        await supabase
          .from("skills")
          .select(
            "name, category, subcategory"
          );

      if (
        allSkillsError
      ) {
        throw new Error(
          `Unable to load skill categories: ${allSkillsError.message}`
        );
      }

      const loadedSkillInfos =
        Array.isArray(allSkills)
          ? allSkills.map(
              (row: any) => ({
                name: String(
                  row?.name || ""
                ).trim(),
                category: String(
                  row?.category || ""
                ).trim(),
                subcategory:
                  String(
                    row?.subcategory ||
                      ""
                  ).trim(),
              })
            )
          : [];

      setSkillInfos(
        loadedSkillInfos
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

      setPreferencesLoading(
        false
      );

      const response =
        await fetch(
          "/api/leads"
        );

      if (!response.ok) {
        throw new Error(
          `Unable to load leads (${response.status}).`
        );
      }

      const result =
        await response.json();

      const rows =
        Array.isArray(result)
          ? result
          : Array.isArray(
              result?.leads
            )
          ? result.leads
          : Array.isArray(
              result?.data
            )
          ? result.data
          : [];
            const mapped: Lead[] =
        rows.map(
          (row: any) => ({
            id: String(
              row.id || ""
            ),

            leadType:
              row.lead_type ===
                "Demand" ||
              row.type === "Demand"
                ? "Demand"
                : row.lead_type ===
                    "Supply" ||
                  row.type ===
                    "Supply"
                ? "Supply"
                : "SaaS",

            title:
              String(
                row.title ||
                  row.job_title ||
                  row.name ||
                  "Opportunity"
              ),

            name:
              row.name ||
              row.client_name ||
              row.contact_name ||
              "",

            company:
              row.company ||
              row.company_name ||
              "",

            description:
              row.description ||
              "",

            skill:
              row.skill ||
              row.skill_needed ||
              row.required_skill ||
              "",

            category:
              row.category ||
              "",

            subcategory:
              row.subcategory ||
              "",

            country:
              row.country ||
              "Global",

            city:
              row.city ||
              "",

            budget:
              row.budget ??
              "",

            salary:
              row.salary ??
              row.salary_range ??
              row.salary_min ??
              "",

            currency:
              row.currency ||
              "",

            email:
              row.email ||
              row.contact_email ||
              "",

            phone:
              row.phone ||
              row.contact_phone ||
              "",

            contact:
              row.contact ||
              row.contact_url ||
              "",

            source:
              row.source_url ||
              row.source ||
              "",

            openUrl:
              row.openUrl ||
              row.open_url ||
              row.contact_url ||
              row.apply_url ||
              row.landing_url ||
              row.source_url ||
              "",

            createdAt:
              row.createdAt ||
              row.created_at ||
              "",
          })
        );

      setLeads(mapped);
    } catch (error: any) {
      const message =
        error?.message ||
        "Unable to load leads.";

      setErrorMsg(
        message
      );

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

      setLeads([]);
    } finally {
      setLoading(false);
      setPreferencesLoading(
        false
      );
    }
            }
  
        const filteredLeads =
    useMemo(() => {
      if (!preferredCountry) {
        return [];
      }

      if (
        preferredSkills.length ===
        0
      ) {
        return [];
      }

      const selectedCountry =
        normalizeCountry(
          preferredCountry
        );

      return leads.filter(
        (lead) => {
          const typeMatch =
            typeFilter === "All" ||
            lead.leadType ===
              typeFilter;

          if (!typeMatch) {
            return false;
          }

          const leadCountry =
            normalizeCountry(
              lead.country || ""
            );

          if (
            leadCountry !==
            selectedCountry
          ) {
            return false;
          }

          /*
           * SaaS DISPLAY RULE:
           *
           * SaaS leads use the user's country
           * as the display filter.
           *
           * We intentionally do NOT require
           * SaaS niche/skill wording to match
           * the saved skill exactly.
           *
           * Example:
           * Professional Coach
           * can still see a SaaS prospect
           * described as coach, mentor, guide,
           * career mentor, etc.
           *
           * IMPORTANT:
           * This changes DISPLAY matching only.
           * It does not change /api/leads,
           * Supabase fetching, or Gold rules.
           */
          if (
            lead.leadType ===
            "SaaS"
          ) {
            return true;
          }

          /*
           * Demand and Supply keep their
           * existing skill matching rules.
           */
          return preferredSkills.some(
            (preferredSkill) => {
              const info =
                skillInfos.find(
                  (item) =>
                    normalizeText(
                      item.name
                    ) ===
                    normalizeText(
                      preferredSkill
                    )
                );

              return skillMatches(
                preferredSkill,
                lead.skill || "",
                lead.category || "",
                lead.subcategory || "",
                info
              );
            }
          );
        }
      );
    }, [
      leads,
      preferredCountry,
      preferredSkills,
      typeFilter,
      skillInfos,
    ]);

  const needsPreferences =
    !preferredCountry ||
    preferredSkills.length ===
      0;
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
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <button
          onClick={() =>
            navigate("/dashboard")
          }
          style={{
            ...buttonStyle,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
              }}
            >
              Leads
            </h1>

            <p
              style={{
                color: "#aaa",
                marginTop: 8,
              }}
            >
              Real opportunities matched
              to your preferences.
            </p>
          </div>

          <button
            onClick={loadLeads}
            style={buttonStyle}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
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
              onClick={() =>
                setTypeFilter(filter)
              }
              style={{
                ...buttonStyle,
                background:
                  typeFilter === filter
                    ? "#fff"
                    : "#1a1a1a",
                color:
                  typeFilter === filter
                    ? "#000"
                    : "#fff",
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        <div
          style={{
            border:
              "1px solid #333",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            background: "#0b0b0b",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Your lead preferences
          </div>

          {preferencesLoading ? (
            <div
              style={{
                color: "#aaa",
              }}
            >
              Loading preferences...
            </div>
          ) : (
            <>
              <div
                style={{
                  color: "#ccc",
                  marginBottom: 6,
                }}
              >
                Country:{" "}
                <strong
                  style={{
                    color: "#fff",
                  }}
                >
                  {preferredCountry ||
                    "Not selected"}
                </strong>
              </div>

              <div
                style={{
                  color: "#ccc",
                }}
              >
                Skills:{" "}
                <strong
                  style={{
                    color: "#fff",
                  }}
                >
                  {preferredSkills.length
                    ? preferredSkills.join(
                        ", "
                      )
                    : "Not selected"}
                </strong>
              </div>
            </>
          )}

          {preferencesError && (
            <div
              style={{
                color: "#ff8a8a",
                marginTop: 10,
              }}
            >
              {preferencesError}
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            style={{
              border:
                "1px solid #662222",
              background: "#180909",
              color: "#ffaaaa",
              borderRadius: 10,
              padding: 14,
              marginBottom: 20,
            }}
          >
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: "#aaa",
            }}
          >
            Loading leads...
          </div>
        ) : needsPreferences ? (
          <div
            style={{
              border:
                "1px solid #333",
              borderRadius: 12,
              padding: 30,
              textAlign: "center",
              color: "#aaa",
              background: "#0b0b0b",
            }}
          >
            Please select your country
            and at least one skill to view
            leads.
          </div>
        ) : filteredLeads.length ===
          0 ? (
          <div
            style={{
              border:
                "1px solid #333",
              borderRadius: 12,
              padding: 30,
              textAlign: "center",
              color: "#aaa",
              background: "#0b0b0b",
            }}
          >
            No matching leads found for
            your selected preferences.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {filteredLeads.map(
              (lead) => (
                <div
                  key={lead.id}
                  style={{
                    border:
                      "1px solid #333",
                    borderRadius: 12,
                    padding: 20,
                    background:
                      "#0b0b0b",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#aaa",
                          marginBottom: 6,
                        }}
                      >
                        {lead.leadType}
                      </div>

                      <h2
                        style={{
                          margin: 0,
                          fontSize: 21,
                        }}
                      >
                        {lead.title}
                      </h2>
                    </div>

                    {lead.country && (
                      <div
                        style={{
                          border:
                            "1px solid #444",
                          borderRadius: 20,
                          padding:
                            "5px 10px",
                          color: "#ccc",
                          fontSize: 12,
                        }}
                      >
                        {lead.country}
                      </div>
                    )}
                  </div>

                  {lead.company && (
                    <div
                      style={{
                        marginTop: 10,
                        color: "#ddd",
                      }}
                    >
                      {lead.company}
                    </div>
                  )}

                  {lead.name && (
                    <div
                      style={{
                        marginTop: 5,
                        color: "#aaa",
                      }}
                    >
                      Contact: {lead.name}
                    </div>
                  )}

                  {lead.description && (
                    <p
                      style={{
                        color: "#ccc",
                        lineHeight: 1.6,
                        marginTop: 14,
                      }}
                    >
                      {lead.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      flexWrap: "wrap",
                      marginTop: 12,
                      color: "#aaa",
                      fontSize: 14,
                    }}
                  >
                    {lead.skill && (
                      <span>
                        Skill: {lead.skill}
                      </span>
                    )}

                    {lead.city && (
                      <span>
                        City: {lead.city}
                      </span>
                    )}

                    {lead.budget !==
                        undefined &&
                      lead.budget !==
                        "" && (
                        <span>
                          Budget:{" "}
                          {lead.currency
                            ? `${lead.currency} `
                            : ""}
                          {lead.budget}
                        </span>
                      )}

                    {lead.salary !==
                        undefined &&
                      lead.salary !==
                        "" && (
                        <span>
                          Salary:{" "}
                          {lead.currency
                            ? `${lead.currency} `
                            : ""}
                          {lead.salary}
                        </span>
                      )}

                    {lead.createdAt && (
                      <span>
                        Posted:{" "}
                        {formatDate(
                          lead.createdAt
                        )}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 18,
                    }}
                  >
                    {lead.phone && (
                      <button
                        onClick={() =>
                          callPhone(
                            lead.phone!
                          )
                        }
                        style={
                          buttonStyle
                        }
                      >
                        WhatsApp / Call
                      </button>
                    )}

                    {lead.email && (
                      <button
                        onClick={() =>
                          sendEmail(
                            lead.email!
                          )
                        }
                        style={
                          buttonStyle
                        }
                      >
                        Email
                      </button>
                    )}

                    {lead.contact && (
                      <button
                        onClick={() =>
                          openLink(
                            lead.contact!
                          )
                        }
                        style={
                          buttonStyle
                        }
                      >
                        Contact
                      </button>
                    )}

                    {lead.openUrl && (
                      <button
                        onClick={() =>
                          openLink(
                            lead.openUrl!
                          )
                        }
                        style={{
                          ...buttonStyle,
                          background:
                            "#fff",
                          color: "#000",
                        }}
                      >
                        Open Opportunity
                      </button>
                    )}

                    {lead.source &&
                      lead.source !==
                        lead.openUrl && (
                        <button
                          onClick={() =>
                            openLink(
                              lead.source!
                            )
                          }
                          style={
                            buttonStyle
                          }
                        >
                          Source
                        </button>
                      )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
 }
