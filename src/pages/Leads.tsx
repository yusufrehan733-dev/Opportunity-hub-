import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type LeadType = "Demand" | "Supply" | "SaaS";
type FilterType = "All" | LeadType;

type Lead = {
  id: string;
  leadType: LeadType;
  [key: string]: unknown;
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

  const aliases: Record<string, string> = {
    usa: "united states",
    us: "united states",
    "u.s.": "united states",
    "u.s.a.": "united states",
    uk: "united kingdom",
    "u.k.": "united kingdom",
    uae: "united arab emirates",
    pakistani: "pakistan",
    canadian: "canada",
    indian: "india",
    australian: "australia",
  };

  return aliases[country] || country;
}

function getLeadType(lead: Lead): LeadType {
  const value = normalizeText(
    lead.leadType || lead.lead_type || lead.type
  );

  if (value === "supply") return "Supply";
  if (value === "saas") return "SaaS";

  return "Demand";
}

function getLeadTitle(lead: Lead): string {
  return clean(
    lead.title ||
    lead.name ||
    lead.client_name ||
    lead.company_name ||
    lead.company ||
    "Untitled lead"
  );
}

function getLeadDescription(lead: Lead): string {
  return clean(lead.description || lead.content || lead.summary);
}

function getLeadSkill(lead: Lead): string {
  return clean(
    lead.skill ||
    lead.skill_needed ||
    lead.required_skill ||
    lead.niche ||
    lead.subcategory ||
    lead.category
  );
}

function getLeadCountry(lead: Lead): string {
  return clean(lead.country || lead.country_name || lead.location_country);
}

function getLeadLocation(lead: Lead): string {
  return [
    clean(lead.city || lead.location_city),
    getLeadCountry(lead),
  ]
    .filter(Boolean)
    .join(", ");
}

function getLeadContact(lead: Lead): string {
  return clean(
    lead.contact_url ||
    lead.contact ||
    lead.contact_email ||
    lead.contact_phone ||
    lead.email ||
    lead.phone ||
    lead.whatsapp ||
    lead.telegram ||
    lead.profile_url ||
    lead.contact_page
  );
}

function getLeadSource(lead: Lead): string {
  return clean(
    lead.source ||
    lead.source_url ||
    lead.url ||
    lead.platform
  );
}

function getLeadSalary(lead: Lead): string {
  const currency = clean(lead.currency);
  const salaryRange = clean(lead.salary_range);

  if (salaryRange) {
    return `${currency} ${salaryRange}`.trim();
  }

  const min = clean(lead.salary_min);
  const max = clean(lead.salary_max);

  if (min && max) {
    return `${currency} ${min} - ${max}`.trim();
  }

  if (max) {
    return `${currency} ${max}`.trim();
  }

  if (lead.salary !== undefined && lead.salary !== null) {
    return `${currency} ${clean(lead.salary)}`.trim();
  }

  if (lead.budget !== undefined && lead.budget !== null) {
    return `${currency} ${clean(lead.budget)}`.trim();
  }

  return "";
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }

  return clean(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function countryMatches(
  selectedCountry: string,
  leadCountry: string
): boolean {
  if (!selectedCountry) return true;

  return (
    normalizeCountry(selectedCountry) ===
    normalizeCountry(leadCountry)
  );
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = clean(value);
    const key = normalizeText(text);

    if (text && !seen.has(key)) {
      seen.add(key);
      result.push(text);
    }
  }

  return result.sort((a, b) => a.localeCompare(b));
    }
export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedType, setSelectedType] =
    useState<FilterType>("All");

  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUserPreferences() {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setError("Please sign in to view your leads.");
        return;
      }

      const { data, error: preferenceError } =
        await supabase
          .from("users")
          .select("country, skill_preference")
          .eq("id", user.id)
          .maybeSingle();

      if (preferenceError) {
        console.error(
          "Could not load user preferences:",
          preferenceError.message
        );
        return;
      }

      if (data) {
        setSelectedCountry(clean(data.country));

        const preference = data.skill_preference;

        if (Array.isArray(preference)) {
          setSelectedSkills(
            preference.map(clean).filter(Boolean)
          );
        } else if (typeof preference === "string") {
          setSelectedSkills(
            preference.split(",").map(clean).filter(Boolean)
          );
        }
      }
    } catch (err) {
      console.error("User preference loading failed:", err);
    } finally {
      setUserLoading(false);
    }
  }

  async function loadAvailableSkills() {
    try {
      const { data, error: skillsError } =
        await supabase
          .from("skills")
          .select("id, name, category, subcategory, tags");

      if (skillsError) {
        console.error(
          "Could not load skills:",
          skillsError.message
        );
        return;
      }

      setSkills((data || []) as SkillInfo[]);
    } catch (err) {
      console.error("Skills loading failed:", err);
    }
  }

  async function loadLeads() {
    setLoading(true);
    setError("");

    const tables: {
      name: string;
      type: LeadType;
    }[] = [
      { name: "demand_leads", type: "Demand" },
      { name: "supply_leads", type: "Supply" },
      { name: "saas_leads", type: "SaaS" },
    ];

    try {
      const results = await Promise.all(
        tables.map(async (table) => {
          try {
            const { data, error: queryError } =
              await supabase
                .from(table.name)
                .select("*");

            if (queryError) {
              console.error(
                `Failed to load ${table.name}:`,
                queryError.message
              );

              return {
                type: table.type,
                rows: [] as Lead[],
                error: `${table.name}: ${queryError.message}`,
              };
            }

            const rows = (data || [])
              .filter((row) => row && row.id != null)
              .map((row) => ({
                ...row,
                id: String(row.id),
                leadType: table.type,
              })) as Lead[];

            return {
              type: table.type,
              rows,
              error: "",
            };
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : "Unknown database error";

            return {
              type: table.type,
              rows: [] as Lead[],
              error: `${table.name}: ${message}`,
            };
          }
        })
      );

      const allLeads = results.flatMap(
        (result) => result.rows
      );

      setLeads(allLeads);

      const failures = results
        .filter((result) => result.error)
        .map((result) => result.error);

      if (allLeads.length === 0 && failures.length > 0) {
        setError(
          "Supabase could not load leads. " +
          failures.join(" | ")
        );
      } else if (failures.length > 0) {
        console.warn(
          "Some lead tables could not be loaded:",
          failures.join(" | ")
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unknown error";

      setError(`Failed to load leads: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUserPreferences();
    void loadAvailableSkills();
    void loadLeads();
  }, []);
    function skillMatches(
    preferredSkill: string,
    lead: Lead
  ): boolean {
    const preferred = normalizeText(preferredSkill);

    if (!preferred) return false;

    const matchingSkill = skills.find(
      (item) =>
        normalizeText(item.name) === preferred
    );

    const leadValues = [
      getLeadSkill(lead),
      clean(lead.category),
      clean(lead.subcategory),
      clean(lead.title),
      clean(lead.name),
      clean(lead.description),
      clean(lead.content),
      ...parseTags(lead.tags),
    ]
      .map(normalizeText)
      .filter(Boolean);

    const preferredValues = [
      preferredSkill,
      matchingSkill?.name || "",
      matchingSkill?.category || "",
      matchingSkill?.subcategory || "",
      ...parseTags(matchingSkill?.tags),
    ]
      .map(normalizeText)
      .filter(Boolean);

    return preferredValues.some((preferredValue) =>
      leadValues.some(
        (leadValue) =>
          leadValue === preferredValue ||
          leadValue.includes(preferredValue) ||
          preferredValue.includes(leadValue)
      )
    );
  }

  const availableCountries = useMemo(() => {
    return uniqueStrings(
      leads
        .map(getLeadCountry)
        .filter(Boolean)
    );
  }, [leads]);

  const availableSkillNames = useMemo(() => {
    const names = [
      ...skills.map((skill) => skill.name),
      ...leads.flatMap((lead) => [
        getLeadSkill(lead),
        clean(lead.category),
        clean(lead.subcategory),
      ]),
    ];

    return uniqueStrings(names.filter(Boolean));
  }, [skills, leads]);

  const filteredLeads = useMemo(() => {
    const country = normalizeCountry(selectedCountry);
    const preferredSkills = selectedSkills.filter(
      (skill) => clean(skill)
    );

    return leads.filter((lead) => {
      const leadType = getLeadType(lead);

      if (
        selectedType !== "All" &&
        leadType !== selectedType
      ) {
        return false;
      }

      if (
        country &&
        !countryMatches(country, getLeadCountry(lead))
      ) {
        return false;
      }

      // SaaS prospects are matched by country only.
      if (leadType === "SaaS") {
        return true;
      }

      // Demand and Supply require a selected skill match.
      if (preferredSkills.length === 0) {
        return false;
      }

      return preferredSkills.some((preferredSkill) =>
        skillMatches(preferredSkill, lead)
      );
    });
  }, [
    leads,
    selectedCountry,
    selectedSkills,
    selectedType,
    skills,
  ]);

  const counts = useMemo(() => {
    const result: Record<FilterType, number> = {
      All: 0,
      Demand: 0,
      Supply: 0,
      SaaS: 0,
    };

    for (const lead of filteredLeads) {
      result.All += 1;
      result[getLeadType(lead)] += 1;
    }

    return result;
  }, [filteredLeads]);

  function handleSkillToggle(skillName: string) {
    setSelectedSkills((current) => {
      const exists = current.some(
        (skill) =>
          normalizeText(skill) === normalizeText(skillName)
      );

      return exists
        ? current.filter(
            (skill) =>
              normalizeText(skill) !== normalizeText(skillName)
          )
        : [...current, skillName];
    });
  }

  function clearFilters() {
    setSelectedCountry("");
    setSelectedSkills([]);
    setSelectedType("All");
  }

  function renderLeadTypeBadge(leadType: LeadType) {
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

  function renderContact(lead: Lead) {
    const contact = getLeadContact(lead);

    if (!contact) {
      return (
        <span style={{ color: "#777", fontSize: "13px" }}>
          No contact available
        </span>
      );
    }

    const isUrl = /^https?:\/\//i.test(contact);

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
      <span style={{ color: "#ddd", wordBreak: "break-word" }}>
        {contact}
      </span>
    );
  }
    function renderLeadCard(lead: Lead) {
    const leadType = getLeadType(lead);
    const title = getLeadTitle(lead);
    const description = getLeadDescription(lead);
    const skill = getLeadSkill(lead);
    const location = getLeadLocation(lead);
    const source = getLeadSource(lead);
    const salary = getLeadSalary(lead);

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
          minWidth: 0,
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                color: "#fff",
                fontSize: "18px",
                lineHeight: 1.35,
                fontWeight: 700,
                overflowWrap: "anywhere",
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
                  overflowWrap: "anywhere",
                }}
              >
                {source}
              </div>
            )}
          </div>

          {renderLeadTypeBadge(leadType)}
        </div>

        {description && (
          <p
            style={{
              margin: 0,
              color: "#cfcfcf",
              fontSize: "14px",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
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
          {[skill, location, salary]
            .filter(Boolean)
            .map((value, index) => (
              <span
                key={`${index}-${value}`}
                style={{
                  padding: "5px 9px",
                  borderRadius: "7px",
                  background: "#111",
                  border: "1px solid #333",
                  color: "#ddd",
                  fontSize: "12px",
                }}
              >
                {value}
              </span>
            ))}
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
          <span style={{ color: "#777", fontSize: "12px" }}>
            Contact
          </span>

          <div style={{ fontSize: "13px" }}>
            {renderContact(lead)}
          </div>
        </div>

        {clean(lead.created_at) && (
          <div style={{ color: "#666", fontSize: "11px" }}>
            Added{" "}
            {new Date(
              clean(lead.created_at)
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
        <header style={{ marginBottom: "24px" }}>
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
        </header>

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
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                color: "#bbb",
                fontSize: "13px",
              }}
            >
              Country

              <select
                value={selectedCountry}
                onChange={(event) =>
                  setSelectedCountry(event.target.value)
                }
                style={{
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "10px",
                  width: "100%",
                }}
              >
                <option value="">All countries</option>
                {uniqueStrings([
                  ...availableCountries,
                  selectedCountry,
                ])
                  .filter(Boolean)
                  .map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
              </select>
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                color: "#bbb",
                fontSize: "13px",
              }}
            >
              Lead type

              <select
                value={selectedType}
                onChange={(event) =>
                  setSelectedType(
                    event.target.value as FilterType
                  )
                }
                style={{
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "10px",
                  width: "100%",
                }}
              >
                <option value="All">All lead types</option>
                <option value="Demand">Demand</option>
                <option value="Supply">Supply</option>
                <option value="SaaS">SaaS</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: "18px" }}>
            <div
              style={{
                color: "#bbb",
                fontSize: "13px",
                marginBottom: "10px",
              }}
            >
              Skills
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {availableSkillNames.map((skillName) => {
                const active = selectedSkills.some(
                  (skill) =>
                    normalizeText(skill) ===
                    normalizeText(skillName)
                );

                return (
                  <button
                    key={skillName}
                    type="button"
                    onClick={() => handleSkillToggle(skillName)}
                    aria-pressed={active}
                    style={{
                      background: active ? "#fff" : "#111",
                      color: active ? "#000" : "#ccc",
                      border: active
                        ? "1px solid #fff"
                        : "1px solid #333",
                      borderRadius: "8px",
                      padding: "7px 10px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {skillName}
                  </button>
                );
              })}
            </div>

            {selectedSkills.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSkills([])}
                style={{
                  background: "transparent",
                  color: "#aaa",
                  border: "none",
                  padding: "10px 0 0",
                  textDecoration: "underline",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Clear skills
              </button>
            )}
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
            <div style={{ color: "#888", fontSize: "12px" }}>
              Showing{" "}
              <strong style={{ color: "#fff" }}>
                {filteredLeads.length}
              </strong>{" "}
              leads
              {selectedCountry
                ? ` in ${selectedCountry}`
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
          {(
            [
              ["All", counts.All],
              ["Demand", counts.Demand],
              ["Supply", counts.Supply],
              ["SaaS", counts.SaaS],
            ] as [FilterType, number][]
          ).map(([label, count]) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedType(label)}
              aria-pressed={selectedType === label}
              style={{
                textAlign: "left",
                background:
                  selectedType === label ? "#171717" : "#050505",
                border:
                  selectedType === label
                    ? "1px solid #777"
                    : "1px solid #292929",
                borderRadius: "10px",
                padding: "12px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  color: "#888",
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
            </button>
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
              overflowWrap: "anywhere",
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
              Demand and Supply require a matching selected skill
              and country. SaaS uses country only. Try clearing
              filters to check whether other leads are available.
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
            {filteredLeads.map(renderLeadCard)}
          </div>
        )}
      </div>
    </div>
  );
  }
