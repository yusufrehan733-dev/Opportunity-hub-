import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Lead = {
  id: string;
  leadType: "Demand" | "Supply" | "SaaS";

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

  contactName?: string;
  email?: string;
  phone?: string;
  contact?: string;

  source?: string;
  openUrl?: string;
  createdAt?: string;
};

function normalizeCountry(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeSkill(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function skillMatches(
  preferredSkill: string,
  leadSkill: string
) {
  const preferred = normalizeSkill(preferredSkill);
  const lead = normalizeSkill(leadSkill);

  if (!preferred || !lead) {
    return false;
  }

  return (
    preferred === lead ||
    preferred.includes(lead) ||
    lead.includes(preferred)
  );
}

function openLink(url: string) {
  if (!url) return;

  let finalUrl = url.trim();

  if (
    !finalUrl.startsWith("http://") &&
    !finalUrl.startsWith("https://")
  ) {
    finalUrl = `https://${finalUrl}`;
  }

  window.open(
    finalUrl,
    "_blank",
    "noopener,noreferrer"
  );
}

function sendEmail(email: string) {
  if (!email) return;

  window.location.href = `mailto:${email}`;
}

function callPhone(phone: string) {
  if (!phone) return;

  const cleanPhone = phone
    .replace(/[^\d+]/g, "");

  if (cleanPhone) {
    window.location.href = `https://wa.me/${cleanPhone.replace(
      /^\+/,
      ""
    )}`;
  }
}

function formatDate(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferencesLoading, setPreferencesLoading] =
    useState(true);

  const [errorMsg, setErrorMsg] = useState("");
  const [preferencesError, setPreferencesError] =
    useState("");

  const [preferredCountry, setPreferredCountry] =
    useState("");

  const [preferredSkills, setPreferredSkills] =
    useState<string[]>([]);

  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      setLoading(true);
      setPreferencesLoading(true);
      setErrorMsg("");
      setPreferencesError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        throw new Error(
          "Please log in before viewing your leads."
        );
      }
            const {
        data: userData,
        error: countryError,
      } = await supabase
        .from("users")
        .select("country, skill_preference")
        .eq("id", user.id)
        .maybeSingle();

      if (countryError) {
        throw new Error(
          `Unable to load your country preference: ${countryError.message}`
        );
      }

      const savedCountry =
        String(userData?.country || "").trim();

      const {
        data: skillRows,
        error: skillsError,
      } = await supabase
        .from("user_skills")
        .select("skill")
        .eq("user_id", user.id);

      if (skillsError) {
        throw new Error(
          `Unable to load your skill preferences: ${skillsError.message}`
        );
      }

      const currentSkills = Array.isArray(skillRows)
        ? skillRows
            .map((row: any) =>
              String(row.skill || "").trim()
            )
            .filter(Boolean)
        : [];

      let oldSkills: string[] = [];

      const oldPreference =
        userData?.skill_preference;

      if (Array.isArray(oldPreference)) {
        oldSkills = oldPreference
          .map((skill: any) =>
            String(skill || "").trim()
          )
          .filter(Boolean);
      } else if (
        typeof oldPreference === "string"
      ) {
        const cleaned = oldPreference.trim();

        if (cleaned) {
          try {
            const parsed = JSON.parse(cleaned);

            if (Array.isArray(parsed)) {
              oldSkills = parsed
                .map((skill: any) =>
                  String(skill || "").trim()
                )
                .filter(Boolean);
            } else {
              oldSkills = cleaned
                .split(",")
                .map((skill) => skill.trim())
                .filter(Boolean);
            }
          } catch {
            oldSkills = cleaned
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean);
          }
        }
      }

      const savedSkills = [
        ...currentSkills,
        ...oldSkills,
      ].filter(
        (skill, index, array) =>
          array.findIndex(
            (item) =>
              item.toLowerCase() ===
              skill.toLowerCase()
          ) === index
      );

      setPreferredCountry(savedCountry);
      setPreferredSkills(savedSkills);

      setPreferencesLoading(false);

      const response = await fetch("/api/leads");

      const text = await response.text();

      let data: any = null;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `API returned invalid response (${response.status})`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Unable to load leads (${response.status})`
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error || "Unable to load leads"
        );
      }

      const rows = Array.isArray(data.leads)
        ? data.leads
        : [];

      const mapped: Lead[] = rows.map((row: any) => ({
        id: String(
          row.id ??
            `${row.type || "lead"}-${row.created_at || row.title || Math.random()}`
        ),

        leadType:
          row.type === "Supply"
            ? "Supply"
            : row.type === "SaaS"
            ? "SaaS"
            : "Demand",

        title:
          row.title ||
          row.name ||
          row.company_name ||
          "Opportunity",

        name:
          row.contact_name ||
          row.contactName ||
          row.name ||
          "",

        company:
          row.company_name ||
          row.company ||
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
          "",

        city:
          row.city ||
          "",

        budget:
          row.budget ?? "",

        salary:
          row.salary_range ??
          row.salary ??
          "",

        currency:
          row.currency ||
          "",

        contactName:
          row.contact_name ||
          row.contactName ||
          "",

        email:
          row.contact_email ||
          row.email ||
          "",

        phone:
          row.contact_phone ||
          row.phone ||
          "",

        contact:
          row.contact ||
          "",

        source:
          row.source ||
          row.company_website ||
          "",

        openUrl:
          row.apply_url ||
          row.landing_url ||
          row.company_website ||
          "",

        createdAt:
          row.created_at ||
          "",
      }));

      setLeads(mapped);
            setLeads(mapped);
    } catch (error: any) {
      console.error(
        "Leads page error:",
        error
      );

      const message =
        error?.message ||
        "Unable to load leads.";

      setErrorMsg(message);

      if (
        message.includes("preference") ||
        message.includes("country") ||
        message.includes("skill")
      ) {
        setPreferencesError(message);
      }

      setLeads([]);
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

    const selectedCountry =
      normalizeCountry(preferredCountry);

    return leads.filter((lead) => {
      const typeMatch =
        typeFilter === "All" ||
        lead.leadType === typeFilter;

      if (!typeMatch) {
        return false;
      }

      const leadCountry =
        normalizeCountry(lead.country);

      if (leadCountry !== selectedCountry) {
        return false;
      }

      return preferredSkills.some(
        (preferredSkill) =>
          skillMatches(
            preferredSkill,
            lead.skill
          )
      );
    });
  }, [
    leads,
    preferredCountry,
    preferredSkills,
    typeFilter,
  ]);

  const buttonStyle: React.CSSProperties = {
    padding: "9px 13px",
    borderRadius: 7,
    border: "1px solid #444",
    background: "#171717",
    color: "#fff",
    cursor: "pointer",
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "#fff",
    color: "#000",
    border: "1px solid #fff",
  };

  const needsPreferences =
    !preferredCountry ||
    preferredSkills.length === 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "#fff",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: 20,
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: 8,
            }}
          >
            Leads
          </h1>

          <p
            style={{
              margin: 0,
              color: "#aaa",
            }}
          >
            Real opportunities matched to your
            saved skills and country.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {[
            "All",
            "Demand",
            "Supply",
            "SaaS",
          ].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                setTypeFilter(type)
              }
              style={
                typeFilter === type
                  ? activeButtonStyle
                  : buttonStyle
              }
            >
              {type}
            </button>
          ))}
        </div>

        <div
          style={{
            background: "#181818",
            border: "1px solid #292929",
            borderRadius: 10,
            padding: 15,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Your Lead Preferences
          </div>

          {preferencesLoading ? (
            <div
              style={{
                color: "#aaa",
              }}
            >
              Loading your preferences...
            </div>
          ) : needsPreferences ? (
            <div
              style={{
                color: "#ffcc66",
                lineHeight: 1.5,
              }}
            >
              Please select at least one skill and
              your country in My Skills, then save
              your preferences before viewing leads.
            </div>
          ) : (
            <>
              <div
                style={{
                  color: "#ddd",
                  marginBottom: 5,
                }}
              >
                <strong>Country:</strong>{" "}
                {preferredCountry}
              </div>

              <div
                style={{
                  color: "#ddd",
                }}
              >
                <strong>Skills:</strong>{" "}
                {preferredSkills.join(", ")}
              </div>
            </>
          )}
        </div>

        {preferencesError && (
          <div
            style={{
              background: "#2a1515",
              border: "1px solid #633",
              color: "#ffb3b3",
              padding: 14,
              borderRadius: 8,
              marginBottom: 18,
            }}
          >
            {preferencesError}
          </div>
        )}

        {errorMsg && !preferencesError && (
          <div
            style={{
              background: "#2a1515",
              border: "1px solid #633",
              color: "#ffb3b3",
              padding: 14,
              borderRadius: 8,
              marginBottom: 18,
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
              background: "#181818",
              border: "1px solid #292929",
              borderRadius: 10,
              padding: 30,
              textAlign: "center",
              color: "#aaa",
            }}
          >
            Your leads will appear here after you
            select your skills and country in My
            Skills.
          </div>
        ) : (
          <>
            <div
              style={{
                color: "#aaa",
                marginBottom: 14,
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
              matching{" "}
              {typeFilter === "All"
                ? "opportunities"
                : `${typeFilter} leads`}
              .
            </div>
                        {filteredLeads.length === 0 ? (
              <div
                style={{
                  background: "#181818",
                  border: "1px solid #292929",
                  borderRadius: 10,
                  padding: 30,
                  textAlign: "center",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  No matching leads yet
                </h3>

                <p
                  style={{
                    color: "#aaa",
                    marginBottom: 0,
                    lineHeight: 1.5,
                  }}
                >
                  There are currently no{" "}
                  {typeFilter === "All"
                    ? ""
                    : typeFilter.toLowerCase()}{" "}
                  leads matching your selected
                  skills and country.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      background: "#181818",
                      border: "1px solid #292929",
                      borderRadius: 10,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        padding: "5px 8px",
                        borderRadius: 5,
                        background: "#292929",
                        color: "#fff",
                        fontSize: 12,
                        marginBottom: 10,
                      }}
                    >
                      {lead.leadType}
                    </div>

                    <h2
                      style={{
                        fontSize: 20,
                        marginTop: 0,
                        marginBottom: 8,
                      }}
                    >
                      {lead.title}
                    </h2>

                    {lead.company && (
                      <div
                        style={{
                          color: "#ccc",
                          marginBottom: 6,
                        }}
                      >
                        Company: {lead.company}
                      </div>
                    )}

                    {lead.name &&
                      lead.name !== lead.title && (
                        <div
                          style={{
                            color: "#ccc",
                            marginBottom: 6,
                          }}
                        >
                          Name: {lead.name}
                        </div>
                      )}

                    {lead.skill && (
                      <div
                        style={{
                          color: "#ddd",
                          marginBottom: 6,
                        }}
                      >
                        Skill: {lead.skill}
                      </div>
                    )}

                    {(lead.category ||
                      lead.subcategory) && (
                      <div
                        style={{
                          color: "#aaa",
                          marginBottom: 6,
                        }}
                      >
                        {lead.category}
                        {lead.subcategory
                          ? ` · ${lead.subcategory}`
                          : ""}
                      </div>
                    )}

                    {(lead.country ||
                      lead.city) && (
                      <div
                        style={{
                          color: "#aaa",
                          marginBottom: 10,
                        }}
                      >
                        {lead.city
                          ? `${lead.city}, `
                          : ""}
                        {lead.country}
                      </div>
                               {filteredLeads.length === 0 ? (
              <div
                style={{
                  background: "#181818",
                  border: "1px solid #292929",
                  borderRadius: 10,
                  padding: 30,
                  textAlign: "center",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  No matching leads yet
                </h3>

                <p
                  style={{
                    color: "#aaa",
                    marginBottom: 0,
                    lineHeight: 1.5,
                  }}
                >
                  There are currently no{" "}
                  {typeFilter === "All"
                    ? ""
                    : typeFilter.toLowerCase()}{" "}
                  leads matching your selected
                  skills and country.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      background: "#181818",
                      border: "1px solid #292929",
                      borderRadius: 10,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        padding: "5px 8px",
                        borderRadius: 5,
                        background: "#292929",
                        color: "#fff",
                        fontSize: 12,
                        marginBottom: 10,
                      }}
                    >
                      {lead.leadType}
                    </div>

                    <h2
                      style={{
                        fontSize: 20,
                        marginTop: 0,
                        marginBottom: 8,
                      }}
                    >
                      {lead.title}
                    </h2>

                    {lead.company && (
                      <div
                        style={{
                          color: "#ccc",
                          marginBottom: 6,
                        }}
                      >
                        Company: {lead.company}
                      </div>
                    )}

                    {lead.name &&
                      lead.name !== lead.title && (
                        <div
                          style={{
                            color: "#ccc",
                            marginBottom: 6,
                          }}
                        >
                          Name: {lead.name}
                        </div>
                      )}

                    {lead.skill && (
                      <div
                        style={{
                          color: "#ddd",
                          marginBottom: 6,
                        }}
                      >
                        Skill: {lead.skill}
                      </div>
                    )}

                    {(lead.category ||
                      lead.subcategory) && (
                      <div
                        style={{
                          color: "#aaa",
                          marginBottom: 6,
                        }}
                      >
                        {lead.category}
                        {lead.subcategory
                          ? ` · ${lead.subcategory}`
                          : ""}
                      </div>
                    )}

                    {(lead.country ||
                      lead.city) && (
                      <div
                        style={{
                          color: "#aaa",
                          marginBottom: 10,
                        }}
                      >
                        {lead.city
                          ? `${lead.city}, `
                          : ""}
                        {lead.country}
                      </div>
                   
