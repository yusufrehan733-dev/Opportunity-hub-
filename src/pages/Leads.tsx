import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";

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

function normalizeText(
  value: any
): string {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountry(
  value: any
): string {
  const country =
    normalizeText(value);

  const aliases: Record<
    string,
    string
  > = {
    usa: "united states",
    us: "united states",
    "u s": "united states",
    "u s a": "united states",
    america: "united states",

    uk: "united kingdom",
    britain: "united kingdom",
    england: "united kingdom",

    uae:
      "united arab emirates",
    "u a e":
      "united arab emirates",
  };

  return (
    aliases[country] ||
    country
  );
}

function toArray(
  value: any
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => clean(item))
      .filter(Boolean);
  }

  if (
    typeof value === "string"
  ) {
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
  const value =
    clean(
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
function skillMatches(
  preferredSkill: string,
  leadSkill: string,
  leadCategory: string,
  leadSubcategory: string,
  info?: SkillInfo
): boolean {
  const preferred =
    normalizeText(
      preferredSkill
    );

  if (!preferred) {
    return false;
  }

  const skill =
    normalizeText(
      leadSkill
    );

  const category =
    normalizeText(
      leadCategory
    );

  const subcategory =
    normalizeText(
      leadSubcategory
    );

  /*
   * Direct normalized matching.
   *
   * Examples:
   * Software engineer
   * software-engineer
   * Software Engineer
   */
  if (
    skill === preferred ||
    skill.includes(preferred) ||
    preferred.includes(skill)
  ) {
    return true;
  }

  /*
   * Compare the individual words.
   *
   * This allows:
   *
   * Software engineer
   * ↔ Principal Software Engineer
   * ↔ Software Engineer AI
   */
  const preferredWords =
    preferred
      .split(" ")
      .filter(
        (word) =>
          word.length >= 2
      );

  const leadWords =
    skill
      .split(" ")
      .filter(
        (word) =>
          word.length >= 2
      );

  if (
    preferredWords.length > 0 &&
    preferredWords.every(
      (word) =>
        leadWords.includes(word)
    )
  ) {
    return true;
  }

  /*
   * Skill hierarchy matching.
   *
   * The user's selected skill may belong to
   * a category/subcategory in the global
   * skills table.
   */
  if (info) {
    const infoName =
      normalizeText(
        info.name
      );

    const infoCategory =
      normalizeText(
        info.category
      );

    const infoSubcategory =
      normalizeText(
        info.subcategory
      );

    const infoTags =
      toArray(info.tags)
        .map(normalizeText)
        .filter(Boolean);

    if (
      infoName &&
      (
        skill.includes(infoName) ||
        infoName.includes(skill)
      )
    ) {
      return true;
    }

    if (
      infoCategory &&
      category === infoCategory
    ) {
      return true;
    }

    if (
      infoSubcategory &&
      (
        subcategory ===
          infoSubcategory ||
        skill.includes(
          infoSubcategory
        )
      )
    ) {
      return true;
    }

    if (
      infoTags.some(
        (tag) =>
          skill.includes(tag) ||
          tag.includes(skill)
      )
    ) {
      return true;
    }
  }

  /*
   * Final word-overlap check.
   *
   * This handles useful real-world variants
   * without requiring an exact phrase.
   */
  const meaningfulWords =
    preferredWords.filter(
      (word) =>
        ![
          "and",
          "the",
          "for",
          "with",
          "of",
          "in",
          "to",
        ].includes(word)
    );

  if (
    meaningfulWords.length === 0
  ) {
    return false;
  }

  const overlap =
    meaningfulWords.filter(
      (word) =>
        skill.includes(word) ||
        category.includes(word) ||
        subcategory.includes(word)
    ).length;

  return (
    overlap ===
    meaningfulWords.length
  );
}

function formatDate(
  value: any
): string {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return clean(value);
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

function openLink(
  url: string
): void {
  const value =
    clean(url);

  if (!value) {
    return;
  }

  const finalUrl =
    /^https?:\/\//i.test(
      value
    )
      ? value
      : `https://${value}`;

  window.open(
    finalUrl,
    "_blank",
    "noopener,noreferrer"
  );
}

function callPhone(
  phone: string
): void {
  const value =
    clean(phone);

  if (!value) {
    return;
  }

  window.location.href =
    `tel:${value}`;
}

function sendEmail(
  email: string
): void {
  const value =
    clean(email);

  if (!value) {
    return;
  }

  window.location.href =
    `mailto:${value}`;
}
export default function Leads() {
  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [preferredCountry, setPreferredCountry] =
    useState("");

  const [preferredSkills, setPreferredSkills] =
    useState<string[]>([]);

  const [skillInfos, setSkillInfos] =
    useState<SkillInfo[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("all");

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        setError("");

        const {
          data: {
            user,
          },
          error: authError,
        } = await supabase.auth.getUser();

        if (
          authError ||
          !user
        ) {
          throw new Error(
            "Please log in to view your leads."
          );
        }

        const {
          data: userData,
          error: userError,
        } = await supabase
          .from("users")
          .select(
            "country, skill_preference"
          )
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

        if (userError) {
          throw new Error(
            `Unable to load your preferences: ${userError.message}`
          );
        }

        if (
          cancelled
        ) {
          return;
        }

        setPreferredCountry(
          clean(
            userData?.country
          )
        );

        const {
          data: skillRows,
          error: skillsError,
        } = await supabase
          .from("user_skills")
          .select(
            "skill"
          )
          .eq(
            "user_id",
            user.id
          );

        if (skillsError) {
          throw new Error(
            `Unable to load your skills: ${skillsError.message}`
          );
        }

        const currentSkills =
          Array.isArray(
            skillRows
          )
            ? skillRows
                .map(
                  (row: any) =>
                    String(
                      row?.skill ||
                        ""
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
          const cleanedPreference =
            oldPreference.trim();

          if (
            cleanedPreference
          ) {
            try {
              const parsed =
                JSON.parse(
                  cleanedPreference
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
                  cleanedPreference
                    .split(",")
                    .map(
                      (skill) =>
                        skill.trim()
                    )
                    .filter(Boolean);
              }
            } catch {
              oldSkills =
                cleanedPreference
                  .split(",")
                  .map(
                    (skill) =>
                      skill.trim()
                  )
                  .filter(Boolean);
            }
          }
        }

        const finalSkills =
          currentSkills.length >
          0
            ? currentSkills
            : oldSkills;

        setPreferredSkills(
          finalSkills
        );

        const {
          data: allSkills,
          error: allSkillsError,
        } = await supabase
          .from("skills")
          .select(
            "id, name, category, subcategory, tags"
          )
          .limit(5000);

        if (
          allSkillsError
        ) {
          throw new Error(
            `Unable to load skill hierarchy: ${allSkillsError.message}`
          );
        }

        if (
          cancelled
        ) {
          return;
        }

        setSkillInfos(
          Array.isArray(
            allSkills
          )
            ? allSkills
            : []
        );
      } catch (err: any) {
        if (
          cancelled
        ) {
          return;
        }

        setError(
          err?.message ||
            "Unable to load preferences."
        );
      }
    }

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLeads() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/leads"
          );

        const text =
          await response.text();

        let result: any;

        try {
          result =
            JSON.parse(text);
        } catch {
          throw new Error(
            "Leads API returned an invalid response."
          );
        }

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.error ||
              "Unable to load leads."
          );
        }

        if (
          cancelled
        ) {
          return;
        }

        const apiLeads =
          Array.isArray(
            result?.leads
          )
            ? result.leads
            : [];

        setLeads(
          apiLeads.map(
            (lead: any) => ({
              ...lead,
              leadType:
                getLeadType(
                  lead
                ),
            })
          )
        );
      } catch (err: any) {
        if (
          cancelled
        ) {
          return;
        }

        setError(
          err?.message ||
            "Unable to load leads."
        );

        setLeads([]);
      } finally {
        if (
          !cancelled
        ) {
          setLoading(false);
        }
      }
    }

    loadLeads();

    return () => {
      cancelled = true;
    };
  }, []);
  
    const filteredLeads =
    useMemo(() => {
      const selectedCountry =
        normalizeCountry(
          preferredCountry
        );

      const normalizedType =
        clean(typeFilter)
          .toLowerCase();

      return leads.filter(
        (lead) => {
          const leadType =
            getLeadType(
              lead
            );

          const typeMatch =
            normalizedType ===
              "all" ||
            normalizedType ===
              leadType.toLowerCase();

          if (!typeMatch) {
            return false;
          }

          const leadCountry =
            normalizeCountry(
              lead.country || ""
            );

          if (
            selectedCountry &&
            leadCountry !==
              selectedCountry
          ) {
            return false;
          }

          /*
           * SaaS DISPLAY RULE:
           *
           * SaaS is filtered by country only.
           * The user's selected skill does not
           * restrict SaaS display.
           */
          if (
            leadType ===
            "SaaS"
          ) {
            return true;
          }

          /*
           * Demand and Supply require a
           * matching selected skill.
           */
          if (
            preferredSkills.length ===
            0
          ) {
            return false;
          }

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
                lead.skill ||
                  lead.skill_needed ||
                  "",
                lead.category ||
                  "",
                lead.subcategory ||
                  "",
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

  const counts =
    useMemo(() => {
      return {
        total:
          filteredLeads.length,

        demand:
          filteredLeads.filter(
            (lead) =>
              getLeadType(
                lead
              ) === "Demand"
          ).length,

        supply:
          filteredLeads.filter(
            (lead) =>
              getLeadType(
                lead
              ) === "Supply"
          ).length,

        saas:
          filteredLeads.filter(
            (lead) =>
              getLeadType(
                lead
              ) === "SaaS"
          ).length,
      };
    }, [filteredLeads]);

  const buttonStyle: React.CSSProperties =
    {
      padding:
        "10px 14px",
      borderRadius: 8,
      border:
        "1px solid #555",
      background:
        "#111",
      color:
        "#fff",
      cursor:
        "pointer",
      fontSize:
        14,
    };

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "#000",
        color:
          "#fff",
        padding:
          "24px",
      }}
    >
      <div
        style={{
          maxWidth:
            1200,
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: 16,
            flexWrap:
              "wrap",
            marginBottom:
              24,
          }}
        >
          <div>
            <h1
              style={{
                margin:
                  0,
                fontSize:
                  30,
              }}
            >
              Leads
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "#aaa",
              }}
            >
              Real opportunities matched
              to your country and skills.
            </p>
          </div>

          <div
            style={{
              display:
                "flex",
              gap: 8,
              flexWrap:
                "wrap",
            }}
          >
            {[
              "all",
              "demand",
              "supply",
              "saas",
            ].map(
              (type) => (
                <button
                  key={type}
                  onClick={() =>
                    setTypeFilter(
                      type
                    )
                  }
                  style={{
                    ...buttonStyle,
                    background:
                      typeFilter ===
                      type
                        ? "#fff"
                        : "#111",
                    color:
                      typeFilter ===
                      type
                        ? "#000"
                        : "#fff",
                  }}
                >
                  {type
                    .charAt(0)
                    .toUpperCase() +
                    type.slice(
                      1
                    )}
                </button>
              )
            )}
          </div>
        </div>

        <div
          style={{
            display:
              "flex",
            gap: 10,
            flexWrap:
              "wrap",
            marginBottom:
              24,
          }}
        >
          <span
            style={{
              padding:
                "8px 12px",
              border:
                "1px solid #333",
              borderRadius:
                8,
              color:
                "#ccc",
            }}
          >
            Country:{" "}
            {preferredCountry ||
              "Not selected"}
          </span>

          <span
            style={{
              padding:
                "8px 12px",
              border:
                "1px solid #333",
              borderRadius:
                8,
              color:
                "#ccc",
            }}
          >
            Matching leads:{" "}
            {counts.total}
          </span>
        </div>

        {preferredSkills.length >
          0 && (
          <div
            style={{
              marginBottom:
                24,
              color:
                "#aaa",
              fontSize:
                14,
            }}
          >
            Skills:{" "}
            {preferredSkills.join(
              ", "
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              border:
                "1px solid #555",
              background:
                "#111",
              padding:
                16,
              borderRadius:
                10,
              marginBottom:
                20,
              color:
                "#fff",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding:
                30,
              border:
                "1px solid #333",
              borderRadius:
                12,
              background:
                "#080808",
              color:
                "#aaa",
            }}
          >
            Loading real leads...
          </div>
        ) : filteredLeads.length ===
          0 ? (
          <div
            style={{
              padding:
                30,
              border:
                "1px solid #333",
              borderRadius:
                12,
              background:
                "#080808",
              color:
                "#aaa",
            }}
          >
            No matching leads found
            for your selected preferences.
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18,
            }}
          >
                        {filteredLeads.map(
              (lead) => {
                const leadType =
                  getLeadType(
                    lead
                  );

                return (
                  <div
                    key={
                      lead.id
                    }
                    style={{
                      background:
                        "#080808",
                      border:
                        "1px solid #333",
                      borderRadius:
                        12,
                      padding:
                        20,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: 12,
                        marginBottom:
                          12,
                      }}
                    >
                      <span
                        style={{
                          padding:
                            "5px 9px",
                          border:
                            "1px solid #555",
                          borderRadius:
                            6,
                          fontSize:
                            12,
                          color:
                            "#ccc",
                        }}
                      >
                        {leadType}
                      </span>

                      {lead.country && (
                        <span
                          style={{
                            color:
                              "#aaa",
                            fontSize:
                              13,
                          }}
                        >
                          {lead.country}
                        </span>
                      )}
                    </div>

                    <h2
                      style={{
                        margin:
                          "0 0 8px",
                        fontSize:
                          20,
                      }}
                    >
                      {lead.title ||
                        lead.name ||
                        lead.company ||
                        "Opportunity"}
                    </h2>

                    {(lead.company ||
                      lead.client_name) && (
                      <div
                        style={{
                          color:
                            "#ccc",
                          marginBottom:
                            10,
                        }}
                      >
                        {lead.company ||
                          lead.client_name}
                      </div>
                    )}

                    {lead.skill && (
                      <div
                        style={{
                          color:
                            "#aaa",
                          fontSize:
                            14,
                          marginBottom:
                            10,
                        }}
                      >
                        Skill:{" "}
                        {lead.skill}
                      </div>
                    )}

                    {lead.description && (
                      <div
                        style={{
                          color:
                            "#bbb",
                          lineHeight:
                            1.6,
                          marginBottom:
                            14,
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        {lead.description}
                      </div>
                    )}

                    {lead.city && (
                      <div
                        style={{
                          color:
                            "#999",
                          fontSize:
                            14,
                          marginBottom:
                            8,
                        }}
                      >
                        Location:{" "}
                        {lead.city}
                        {lead.country
                          ? `, ${lead.country}`
                          : ""}
                      </div>
                    )}

                    {(lead.salary ||
                      lead.salary_range ||
                      lead.salary_min ||
                      lead.salary_max ||
                      lead.budget) && (
                      <div
                        style={{
                          color:
                            "#ccc",
                          marginBottom:
                            8,
                        }}
                      >
                        {lead.budget !=
                        null
                          ? `Budget: ${
                              lead.currency
                                ? `${lead.currency} `
                                : ""
                            }${lead.budget}`
                          : lead.salary_range
                          ? `Salary: ${lead.salary_range}`
                          : lead.salary_min !=
                              null ||
                            lead.salary_max !=
                              null
                          ? `Salary: ${
                              lead.salary_min ??
                              ""
                            }${
                              lead.salary_min !=
                                null &&
                              lead.salary_max !=
                                null
                                ? " - "
                                : ""
                            }${
                              lead.salary_max ??
                              ""
                            }`
                          : `Salary: ${
                              lead.salary
                            }`}
                      </div>
                    )}

                    {lead.createdAt && (
                      <div
                        style={{
                          color:
                            "#888",
                          fontSize:
                            13,
                          marginBottom:
                            16,
                        }}
                      >
                        Posted:{" "}
                        {formatDate(
                          lead.createdAt
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 10,
                        flexWrap:
                          "wrap",
                        marginTop:
                          18,
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
                            color:
                              "#000",
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
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
          }
