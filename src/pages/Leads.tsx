import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type LeadType = "Demand" | "Supply" | "SaaS";

type Lead = {
  id: string;

  leadType?: LeadType | string;
  lead_type?: LeadType | string;
  type?: LeadType | string;

  title?: string;
  name?: string;
  client_name?: string;
  company?: string;
  company_name?: string;

  description?: string;
  content?: string;

  skill?: string;
  skill_needed?: string;
  required_skill?: string;
  niche?: string;
  category?: string;
  subcategory?: string;

  country?: string;
  city?: string;

  budget?: string | number;
  salary?: string | number;
  salary_range?: string;
  salary_min?: string | number;
  salary_max?: string | number;
  currency?: string;

  contact?: string;
  contact_url?: string;
  contact_email?: string;
  contact_phone?: string;
  email?: string;
  phone?: string;

  source?: string;
  source_url?: string;
  url?: string;
  platform?: string;

  created_at?: string;
  status?: string;
};

type SkillInfo = {
  id?: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[] | string | null;
};


function clean(value: unknown): string {
  return String(value ?? "").trim();
}


function normalizeText(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeCountry(value: unknown): string {
  const country = normalizeText(value);

  if (!country) {
    return "";
  }

  const aliases: Record<string, string> = {
    usa: "united states",
    "u.s.a": "united states",
    "u.s.": "united states",
    us: "united states",

    uk: "united kingdom",
    "u.k.": "united kingdom",

    uae: "united arab emirates",

    canada: "canada",
    canadian: "canada",

    pakistan: "pakistan",
    pakistani: "pakistan",

    india: "india",
    indian: "india",

    australia: "australia",
    australian: "australia",
  };

  return aliases[country] || country;
}


function getLeadType(lead: Lead): LeadType {
  const value = normalizeText(
    lead.leadType ||
    lead.lead_type ||
    lead.type
  );

  if (value === "supply") {
    return "Supply";
  }

  if (value === "saas") {
    return "SaaS";
  }

  return "Demand";
}


function getLeadTitle(lead: Lead): string {
  return clean(
    lead.title ||
    lead.name ||
    lead.client_name ||
    lead.company_name ||
    "Untitled lead"
  );
}


function getLeadDescription(lead: Lead): string {
  return clean(
    lead.description ||
    lead.content
  );
}


function getLeadSkillText(lead: Lead): string {
  return [
    lead.skill,
    lead.skill_needed,
    lead.required_skill,
    lead.niche,
    lead.category,
    lead.subcategory,
    lead.title,
    lead.description,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}


function getSkillInfoText(skill: SkillInfo): string {
  const tags =
    Array.isArray(skill.tags)
      ? skill.tags
      : clean(skill.tags)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

  return [
    skill.name,
    skill.category,
    skill.subcategory,
    ...tags,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}


function skillMatches(
  preferredSkill: string,
  lead: Lead
): boolean {
  const preferred =
    normalizeText(preferredSkill);

  if (!preferred) {
    return false;
  }

  const leadText =
    getLeadSkillText(lead);

  if (!leadText) {
    return false;
  }

  if (leadText === preferred) {
    return true;
  }

  if (leadText.includes(preferred)) {
    return true;
  }

  const preferredWords =
    preferred
      .split(" ")
      .filter(
        (word) => word.length >= 3
      );

  if (!preferredWords.length) {
    return false;
  }

  return preferredWords.every(
    (word) => leadText.includes(word)
  );
}


function countryMatches(
  selectedCountry: string,
  leadCountry?: string
): boolean {
  const selected =
    normalizeCountry(selectedCountry);

  if (!selected) {
    return true;
  }

  const lead =
    normalizeCountry(leadCountry);

  if (!lead) {
    return false;
  }

  return (
    lead === selected ||
    lead.includes(selected) ||
    selected.includes(lead)
  );
                 }
function getLeadContact(
  lead: Lead
): string {
  return clean(
    lead.contact_url ||
    lead.contact_email ||
    lead.contact_phone ||
    lead.contact ||
    lead.email ||
    lead.phone ||
    lead.source_url ||
    lead.url
  );
}


function getLeadSource(
  lead: Lead
): string {
  return clean(
    lead.source ||
    lead.platform ||
    lead.company ||
    lead.company_name
  );
}


function getLeadLocation(
  lead: Lead
): string {
  return [
    clean(lead.city),
    clean(lead.country),
  ]
    .filter(Boolean)
    .join(", ");
}


function getLeadSalary(
  lead: Lead
): string {
  if (clean(lead.salary_range)) {
    return clean(lead.salary_range);
  }

  if (
    lead.salary_min !== undefined ||
    lead.salary_max !== undefined
  ) {
    const min = clean(lead.salary_min);
    const max = clean(lead.salary_max);
    const currency = clean(lead.currency);

    if (min && max) {
      return `${currency} ${min} - ${max}`.trim();
    }

    if (min) {
      return `${currency} ${min}`.trim();
    }

    if (max) {
      return `${currency} ${max}`.trim();
    }
  }

  if (lead.salary !== undefined) {
    return `${clean(lead.currency)} ${clean(lead.salary)}`.trim();
  }

  if (lead.budget !== undefined) {
    return `${clean(lead.currency)} ${clean(lead.budget)}`.trim();
  }

  return "";
}


function isValidLead(
  lead: Lead
): boolean {
  return !!(
    lead &&
    clean(lead.id)
  );
}


function parseTags(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value
      .map(clean)
      .filter(Boolean);
  }

  return clean(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}


export default function Leads() {
  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [skills, setSkills] =
    useState<SkillInfo[]>([]);

  const [selectedCountry, setSelectedCountry] =
    useState("");

  const [selectedSkills, setSelectedSkills] =
    useState<string[]>([]);

  const [selectedType, setSelectedType] =
    useState<"All" | LeadType>("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [userLoading, setUserLoading] =
    useState(true);


  async function loadUserPreferences() {
    try {
      setUserLoading(true);

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: userData } =
        await supabase
          .from("users")
          .select(
            "country,skill_preference"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (userData) {
        setSelectedCountry(
          clean(userData.country)
        );

        const preference =
          userData.skill_preference;

        if (Array.isArray(preference)) {
          setSelectedSkills(
            preference
              .map(clean)
              .filter(Boolean)
          );
        } else if (preference) {
          setSelectedSkills(
            String(preference)
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to load user preferences:",
        err
      );
    } finally {
      setUserLoading(false);
    }
  }


  async function loadSkills() {
    try {
      const { data, error } =
        await supabase
          .from("skills")
          .select(
            "id,name,category,subcategory,tags"
          )
          .order("name", {
            ascending: true,
          });

      if (error) {
        throw error;
      }

      setSkills(
        (data || [])
          .map((row: any) => ({
            id: clean(row.id),
            name: clean(row.name),
            category:
              clean(row.category) || null,
            subcategory:
              clean(row.subcategory) || null,
            tags:
              row.tags ?? null,
          }))
          .filter(
            (row: SkillInfo) =>
              !!row.name
          )
      );
    } catch (err) {
      console.error(
        "Failed to load skills:",
        err
      );
    }
  }


  async function loadLeads() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch("/api/leads");

      const raw =
        await response.text();

      let payload: any;

      try {
        payload =
          raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(
          "Leads API returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          payload?.message ||
          "Failed to load leads."
        );
      }

      const rows =
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.leads)
            ? payload.leads
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

      setLeads(
        rows.filter(isValidLead)
      );
    } catch (err) {
      console.error(
        "Failed to load leads:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load leads."
      );

      setLeads([]);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadUserPreferences();
    loadSkills();
    loadLeads();
  }, []);
    const availableCountries = useMemo(() => {
    const countries = new Set<string>();

    for (const lead of leads) {
      const country = clean(lead.country);

      if (country) {
        countries.add(country);
      }
    }

    return Array.from(countries).sort(
      (a, b) =>
        a.localeCompare(b)
    );
  }, [leads]);


  const availableSkills = useMemo(() => {
    return skills
      .map((skill) => skill.name)
      .filter(Boolean);
  }, [skills]);


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

      /*
       * -----------------------------------------------------
       * TYPE FILTER
       * -----------------------------------------------------
       */
      if (
        selectedType !== "All" &&
        leadType !== selectedType
      ) {
        return false;
      }


      /*
       * -----------------------------------------------------
       * COUNTRY FILTER
       * -----------------------------------------------------
       *
       * ALL THREE lead types use the selected country.
       */
      if (
        country &&
        !countryMatches(
          country,
          lead.country
        )
      ) {
        return false;
      }


      /*
       * -----------------------------------------------------
       * SAAS
       * -----------------------------------------------------
       *
       * SaaS is COUNTRY ONLY.
       *
       * We deliberately do NOT require the user's selected
       * skill here.
       *
       * The collector already ensures the SaaS professional
       * matches an Opportunity Hub skill.
       */
      if (leadType === "SaaS") {
        return true;
      }


      /*
       * -----------------------------------------------------
       * DEMAND / SUPPLY
       * -----------------------------------------------------
       *
       * These two require:
       *
       * Country + user's selected skill.
       */
      if (!preferredSkills.length) {
        return false;
      }


      return preferredSkills.some(
        (preferredSkill) =>
          skillMatches(
            preferredSkill,
            lead
          )
      );
    });
  }, [
    leads,
    selectedCountry,
    selectedSkills,
    selectedType,
  ]);


  const counts = useMemo(() => {
    const result = {
      All: 0,
      Demand: 0,
      Supply: 0,
      SaaS: 0,
    };

    for (const lead of filteredLeads) {
      const type =
        getLeadType(lead);

      result.All += 1;

      if (type === "Demand") {
        result.Demand += 1;
      }

      if (type === "Supply") {
        result.Supply += 1;
      }

      if (type === "SaaS") {
        result.SaaS += 1;
      }
    }

    return result;
  }, [filteredLeads]);


  const selectedCountryLabel =
    selectedCountry ||
    "All countries";


  function handleCountryChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    setSelectedCountry(
      event.target.value
    );
  }


  function handleTypeChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    setSelectedType(
      event.target.value as
        | "All"
        | LeadType
    );
  }


  function handleSkillToggle(
    skillName: string
  ) {
    setSelectedSkills((current) => {
      const exists =
        current.some(
          (skill) =>
            normalizeText(skill) ===
            normalizeText(skillName)
        );

      if (exists) {
        return current.filter(
          (skill) =>
            normalizeText(skill) !==
            normalizeText(skillName)
        );
      }

      return [
        ...current,
        skillName,
      ];
    });
  }


  function clearFilters() {
    setSelectedCountry("");
    setSelectedSkills([]);
    setSelectedType("All");
    }
    function renderLeadTypeBadge(
    leadType: LeadType
  ) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: "999px",
          border: "1px solid #444",
          background: "#111",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        {leadType}
      </span>
    );
  }


  function renderContact(
    lead: Lead
  ) {
    const contact =
      getLeadContact(lead);

    if (!contact) {
      return (
        <span
          style={{
            color: "#777",
            fontSize: "13px",
          }}
        >
          No contact available
        </span>
      );
    }

    const isUrl =
      contact.startsWith("http://") ||
      contact.startsWith("https://");

    if (isUrl) {
      return (
        <a
          href={contact}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#fff",
            textDecoration: "underline",
            wordBreak: "break-word",
          }}
        >
          Open contact
        </a>
      );
    }

    return (
      <span
        style={{
          color: "#ddd",
          wordBreak: "break-word",
        }}
      >
        {contact}
      </span>
    );
  }


  function renderLeadCard(
    lead: Lead
  ) {
    const leadType =
      getLeadType(lead);

    const title =
      getLeadTitle(lead);

    const description =
      getLeadDescription(lead);

    const skill =
      clean(
        lead.skill ||
        lead.skill_needed ||
        lead.required_skill ||
        lead.niche
      );

    const location =
      getLeadLocation(lead);

    const source =
      getLeadSource(lead);

    const salary =
      getLeadSalary(lead);

    return (
      <article
        key={`${leadType}-${lead.id}`}
        style={{
          background: "#050505",
          border: "1px solid #292929",
          borderRadius: "14px",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "13px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#fff",
                fontSize: "18px",
                lineHeight: 1.35,
                fontWeight: 700,
              }}
            >
              {title}
            </h3>

            {source && (
              <div
                style={{
                  marginTop: "5px",
                  color: "#888",
                  fontSize: "12px",
                }}
              >
                {source}
              </div>
            )}
          </div>

          {renderLeadTypeBadge(
            leadType
          )}
        </div>


        {description && (
          <p
            style={{
              margin: 0,
              color: "#cfcfcf",
              fontSize: "14px",
              lineHeight: 1.55,
            }}
          >
            {description}
          </p>
        )}


        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {skill && (
            <span
              style={{
                padding: "5px 9px",
                borderRadius: "7px",
                background: "#111",
                border: "1px solid #333",
                color: "#ddd",
                fontSize: "12px",
              }}
            >
              {skill}
            </span>
          )}

          {location && (
            <span
              style={{
                padding: "5px 9px",
                borderRadius: "7px",
                background: "#111",
                border: "1px solid #333",
                color: "#ddd",
                fontSize: "12px",
              }}
            >
              {location}
            </span>
          )}

          {salary && (
            <span
              style={{
                padding: "5px 9px",
                borderRadius: "7px",
                background: "#111",
                border: "1px solid #333",
                color: "#ddd",
                fontSize: "12px",
              }}
            >
              {salary}
            </span>
          )}
        </div>


        <div
          style={{
            borderTop: "1px solid #222",
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span
            style={{
              color: "#777",
              fontSize: "12px",
            }}
          >
            Contact
          </span>

          <div
            style={{
              fontSize: "13px",
            }}
          >
            {renderContact(lead)}
          </div>
        </div>


        {lead.created_at && (
          <div
            style={{
              color: "#666",
              fontSize: "11px",
            }}
          >
            Added{" "}
            {new Date(
              lead.created_at
            ).toLocaleDateString()}
          </div>
        )}
      </article>
    );
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
            marginBottom: "24px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            Leads
          </h1>

          <p
            style={{
              marginTop: "7px",
              marginBottom: 0,
              color: "#888",
              fontSize: "14px",
            }}
          >
            Real opportunities and professional prospects matched
            to your preferences.
          </p>
        </div>


        <section
          style={{
            background: "#050505",
            border: "1px solid #292929",
            borderRadius: "14px",
            padding: "18px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "7px",
                  color: "#aaa",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Country
              </label>

              <select
                value={selectedCountry}
                onChange={handleCountryChange}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "10px 11px",
                  outline: "none",
                }}
              >
                <option value="">
                  All countries
                </option>

                {availableCountries.map(
                  (country) => (
                    <option
                      key={country}
                      value={country}
                    >
                      {country}
                    </option>
                  )
                )}
              </select>
            </div>


            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "7px",
                  color: "#aaa",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Lead type
              </label>

              <select
                value={selectedType}
                onChange={handleTypeChange}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "10px 11px",
                  outline: "none",
                }}
              >
                <option value="All">
                  All types
                </option>
                <option value="Demand">
                  Demand
                </option>
                <option value="Supply">
                  Supply
                </option>
                <option value="SaaS">
                  SaaS
                </option>
              </select>
            </div>
          </div>


          <div
            style={{
              marginTop: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <label
                style={{
                  color: "#aaa",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Skills
              </label>

              {selectedSkills.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSkills([])
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#aaa",
                    fontSize: "12px",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Clear skills
                </button>
              )}
            </div>


            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                maxHeight: "180px",
                overflowY: "auto",
                padding: "2px",
              }}
            >
              {availableSkills.map(
                (skillName) => {
                  const active =
                    selectedSkills.some(
                      (skill) =>
                        normalizeText(skill) ===
                        normalizeText(skillName)
                    );

                  return (
                    <button
                      key={skillName}
                      type="button"
                      onClick={() =>
                        handleSkillToggle(
                          skillName
                        )
                      }
                      style={{
                        background: active
                          ? "#fff"
                          : "#111",
                        color: active
                          ? "#000"
                          : "#ccc",
                        border: active
                          ? "1px solid #fff"
                          : "1px solid #333",
                        borderRadius: "8px",
                        padding:
                          "7px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {skillName}
                    </button>
                  );
                }
              )}
            </div>
          </div>


          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid #222",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "#888",
                fontSize: "12px",
              }}
            >
              Showing{" "}
              <strong
                style={{
                  color: "#fff",
                }}
              >
                {filteredLeads.length}
              </strong>{" "}
              leads
              {selectedCountry
                ? ` in ${selectedCountryLabel}`
                : ""}
            </div>

            <button
              type="button"
              onClick={clearFilters}
              style={{
                background: "#fff",
                color: "#000",
                border: "1px solid #fff",
                borderRadius: "8px",
                padding: "9px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear all filters
            </button>
          </div>
        </section>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: "10px",
            marginBottom: "22px",
          }}
        >
          {[
            ["All", counts.All],
            ["Demand", counts.Demand],
            ["Supply", counts.Supply],
            ["SaaS", counts.SaaS],
          ].map(([label, count]) => (
            <div
              key={String(label)}
              style={{
                background: "#050505",
                border: "1px solid #292929",
                borderRadius: "10px",
                padding: "12px",
              }}
            >
              <div
                style={{
                  color: "#777",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                {label}
              </div>

              <div
                style={{
                  color: "#fff",
                  fontSize: "20px",
                  fontWeight: 700,
                }}
              >
                {count}
              </div>
            </div>
          ))}
        </div>
                {loading || userLoading ? (
          <div
            style={{
              background: "#050505",
              border: "1px solid #292929",
              borderRadius: "14px",
              padding: "40px 20px",
              textAlign: "center",
              color: "#aaa",
            }}
          >
            Loading leads...
          </div>
        ) : error ? (
          <div
            style={{
              background: "#050505",
              border: "1px solid #552222",
              borderRadius: "14px",
              padding: "24px",
              color: "#ffb0b0",
            }}
          >
            {error}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div
            style={{
              background: "#050505",
              border: "1px solid #292929",
              borderRadius: "14px",
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              No matching leads
            </div>

            <div
              style={{
                color: "#777",
                fontSize: "13px",
                lineHeight: 1.5,
                maxWidth: "520px",
                margin: "0 auto",
              }}
            >
              Demand and Supply leads require both your selected
              country and skill. SaaS leads use your selected
              country only.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            {filteredLeads.map(
              (lead) =>
                renderLeadCard(lead)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
