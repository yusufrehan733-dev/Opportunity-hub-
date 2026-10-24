
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type LeadType = "Demand" | "Supply" | "SaaS";
type FilterType = "All" | LeadType;

type Lead = {
  id: string;
  leadType: LeadType;
  [key: string]: any;
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
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
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
  return clean(
    lead.country || lead.country_name || lead.location_country
  );
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
  return clean(lead.source || lead.source_url || lead.url || lead.platform);
}

function getLeadSalary(lead: Lead): string {
  const currency = clean(lead.currency);
  const salaryRange = clean(lead.salary_range);

  if (salaryRange) return `${currency} ${salaryRange}`.trim();

  const min = clean(lead.salary_min);
  const max = clean(lead.salary_max);

  if (min && max) return `${currency} ${min} - ${max}`.trim();
  if (max) return `${currency} ${max}`.trim();

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
    const valueText = clean(value);
    const key = normalizeText(valueText);

    if (valueText && !seen.has(key)) {
      seen.add(key);
      result.push(valueText);
    }
  }

  return result.sort((a, b) => a.localeCompare(b));
}
export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<FilterType>("All");

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

      const { data, error: preferenceError } = await supabase
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
          setSelectedSkills(preference.map(clean).filter(Boolean));
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
      const { data, error: skillsError } = await supabase
        .from("skills")
        .select("id, name, category, subcategory, tags");

      if (skillsError) {
        console.error("Could not load skills:", skillsError.message);
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

    try {
      const response = await fetch("/api/leads");

      if (!response.ok) {
        throw new Error(
          `Failed to load leads (HTTP ${response.status})`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to load leads");
      }

      const allLeads = (
        Array.isArray(result.leads) ? result.leads : []
      )
        .filter((row: any) => row && row.id != null)
        .map((row: any) => {
          const type = normalizeText(
            row.leadType || row.lead_type || row.type
          );

          const leadType: LeadType =
            type === "supply"
              ? "Supply"
              : type === "saas"
                ? "SaaS"
                : "Demand";

          return {
            ...row,
            id: String(row.id),
            leadType,
          };
        }) as Lead[];

      setLeads(allLeads);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";

      setLeads([]);
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

  function skillMatches(preferredSkill: string, lead: Lead): boolean {
    const preferred = normalizeText(preferredSkill);
    if (!preferred) return false;

    const matchingSkill = skills.find(
      (item) => normalizeText(item.name) === preferred
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

  const availableCountries = useMemo(
    () => uniqueStrings(leads.map(getLeadCountry).filter(Boolean)),
    [leads]
  );

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
    const preferredSkills = selectedSkills.filter((skill) =>
      clean(skill)
    );

    return leads.filter((lead) => {
      const leadType = getLeadType(lead);

      if (selectedType !== "All" && leadType !== selectedType) {
        return false;
      }

      if (
        country &&
        !countryMatches(country, getLeadCountry(lead))
      ) {
        return false;
      }

      if (leadType === "SaaS") return true;
      if (preferredSkills.length === 0) return true;

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
        (skill) => normalizeText(skill) === normalizeText(skillName)
      );

      return exists
        ? current.filter(
            (skill) => normalizeText(skill) !== normalizeText(skillName)
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
          flexShrink: 0,
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

    if (/^https?:\/\//i.test(contact)) {
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

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      return (
        <a
          href={`mailto:${contact}`}
          style={{ color: "#ddd", wordBreak: "break-word" }}
        >
          {contact}
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
    const openUrl = clean(
      lead.openUrl || lead.open_url || lead.apply_url || lead.source_url
    );

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
              overflowWrap: "anywhere",
            }}
          >
            {description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
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

          <div style={{ fontSize: "13px" }}>{renderContact(lead)}</div>
        </div>

        {openUrl && /^https?:\/\//i.test(openUrl) && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: "#fff",
              color: "#000",
              padding: "10px 12px",
              borderRadius: "8px",
              textAlign: "center",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Open opportunity
          </a>
        )}

        {clean(lead.created_at) && (
          <div style={{ color: "#666", fontSize: "11px" }}>
            Added {new Date(clean(lead.created_at)).toLocaleDateString()}
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
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
            Real opportunities and professional prospects matched to your
            preferences.
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
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                onChange={(event) => setSelectedCountry(event.target.value)}
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
                {uniqueStrings([...availableCountries, selectedCountry])
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
                  setSelectedType(event.target.value as FilterType)
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

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {availableSkillNames.map((skillName) => {
                const active = selectedSkills.some(
                  (skill) =>
                    normalizeText(skill) === normalizeText(skillName)
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
                      border: active ? "1px solid #fff" : "1px solid #333",
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
        </section>
        
        {/* Lead counts */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["All", "Demand", "Supply", "SaaS"] as FilterType[]).map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedType === type
                    ? "border-white bg-white text-black"
                    : "border-gray-700 bg-black text-white hover:border-gray-400"
                }`}
              >
                <p className="text-sm opacity-75">{type} Leads</p>
                <p className="mt-2 text-2xl font-semibold">
                  {counts[type]}
                </p>
              </button>
            )
          )}
        </section>

        {/* Results heading */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {selectedType === "All"
                ? "All Opportunities"
                : `${selectedType} Leads`}
            </h2>
            <p className="text-sm text-gray-400">
              Showing {filteredLeads.length}{" "}
              {filteredLeads.length === 1 ? "lead" : "leads"}
              {selectedCountry ? ` in ${selectedCountry}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={loadLeads}
            disabled={loading}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh Leads"}
          </button>
        </section>

        {/* Loading, error, empty state, or lead cards */}
        {loading ? (
          <div className="rounded-xl border border-gray-800 p-8 text-center text-gray-300">
            Loading leads...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-900 bg-black p-6 text-center">
            <p className="font-medium text-white">
              Could not load leads
            </p>
            <p className="mt-2 text-sm text-gray-400">{error}</p>
            <button
              type="button"
              onClick={loadLeads}
              className="mt-4 rounded-lg border border-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-900"
            >
              Try Again
            </button>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="rounded-xl border border-gray-800 p-8 text-center">
            <h3 className="text-lg font-medium text-white">
              No matching leads
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Try changing the country, lead type, or selected skills.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-900"
            >
              Clear Filters
            </button
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredLeads.map((lead) => renderLeadCard(lead))}
          </section>
        )}
      </div>
    </div>
  );
}
