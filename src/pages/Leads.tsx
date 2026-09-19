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

  const cleanPhone = phone.replace(/[^\d+]/g, "");

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

  const [typeFilter, setTypeFilter] =
    useState("All");

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
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      const user = authData.user;

      if (!user) {
        throw new Error(
          "Please log in before viewing your leads."
        );
      }

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from("users")
        .select("country, skill_preference")
        .eq("id", user.id)
        .maybeSingle();

      if (userError) {
        throw new Error(
          `Unable to load your preferences: ${userError.message}`
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
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true,
        });

      if (skillsError) {
        throw new Error(
          `Unable to load your skills: ${skillsError.message}`
        );
      }

      const currentSkills = Array.isArray(skillRows)
        ? skillRows
            .map((row: any) =>
              String(row?.skill || "").trim()
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
        const cleaned =
          oldPreference.trim();

        if (cleaned) {
          try {
            const parsed =
              JSON.parse(cleaned);

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
              normalizeSkill(item) ===
              normalizeSkill(skill)
          ) === index
      );

      setPreferredCountry(savedCountry);
      setPreferredSkills(savedSkills);
            setPreferencesLoading(false);

      const response =
        await fetch("/api/leads");

      const responseText =
        await response.text();

      let apiData: any = null;

      try {
        apiData =
          JSON.parse(responseText);
      } catch {
        throw new Error(
          `API returned invalid response (${response.status})`
        );
      }

      if (!response.ok) {
        throw new Error(
          apiData?.error ||
            `Unable to load leads (${response.status})`
        );
      }

      if (!apiData?.success) {
        throw new Error(
          apiData?.error ||
            "Unable to load leads."
        );
      }

      const rows =
        Array.isArray(apiData.leads)
          ? apiData.leads
          : [];

      const mapped: Lead[] =
        rows.map((row: any) => ({
          id: String(
            row.id ??
              `${row.type || "lead"}-${
                row.created_at ||
                row.title ||
                "unknown"
              }`
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
            row.description || "",

          skill:
            row.skill ||
            row.skill_needed ||
            row.required_skill ||
            "",

          category:
            row.category || "",

          subcategory:
            row.subcategory || "",

          country:
            row.country || "",

          city:
            row.city || "",

          budget:
            row.budget ?? "",

          salary:
            row.salary_range ??
            row.salary ??
            "",

          currency:
            row.currency || "",

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
            row.contact || "",

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
            row.created_at || "",
        }));

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
      setPreferencesLoading(false);
    }
  }

  const filteredLeads =
    useMemo(() => {
      if (!preferredCountry) {
        return [];
      }

      if (
        preferredSkills.length === 0
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

          return preferredSkills.some(
            (preferredSkill) =>
              skillMatches(
                preferredSkill,
                lead.skill || ""
              )
          );
        }
      );
    }, [
      leads,
      preferredCountry,
      preferredSkills,
      typeFilter,
    ]);

  const buttonStyle: React.CSSProperties =
    {
      padding: "9px 13px",
      borderRadius: 7,
      border: "1px solid #444",
      background: "#171717",
      color: "#fff",
      cursor: "pointer",
    };

  const activeButtonStyle:
    React.CSSProperties = {
      ...buttonStyle,
      background: "#fff",
      color: "#000",
      border:
        "1px solid #fff",
    };

  const needsPreferences =
    !preferredCountry ||
    preferredSkills.length === 0;
    const needsPreferences =
    !preferredCountry ||
    preferredSkills.length === 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "#fff",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <h1 style={{ marginTop: 0 }}>
          Leads
        </h1>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <button
            type="button"
            onClick={() => setTypeFilter("All")}
            style={
              typeFilter === "All"
                ? activeButtonStyle
                : buttonStyle
            }
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter("Demand")}
            style={
              typeFilter === "Demand"
                ? activeButtonStyle
                : buttonStyle
            }
          >
            Demand
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter("Supply")}
            style={
              typeFilter === "Supply"
                ? activeButtonStyle
                : buttonStyle
            }
          >
            Supply
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter("SaaS")}
            style={
              typeFilter === "SaaS"
                ? activeButtonStyle
                : buttonStyle
            }
          >
            SaaS
          </button>
        </div>

        <div
          style={{
            background: "#1b1b1b",
            border: "1px solid #333",
            borderRadius: 10,
            padding: 16,
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
            <div style={{ color: "#aaa" }}>
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

              <div style={{ color: "#ddd" }}>
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

        {errorMsg && (
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
              padding: 20,
              color: "#aaa",
            }}
          >
            Loading leads...
          </div>
        ) : needsPreferences ? (
          <div
            style={{
              background: "#1b1b1b",
              border: "1px solid #333",
              borderRadius: 10,
              padding: 20,
              color: "#aaa",
              lineHeight: 1.5,
            }}
          >
            Your saved preferences are required before
            leads can be shown.
          </div>
        ) : filteredLeads.length === 0 ? (
          <div
            style={{
              background: "#1b1b1b",
              border: "1px solid #333",
              borderRadius: 10,
              padding: 20,
              color: "#aaa",
              lineHeight: 1.5,
            }}
          >
            No matching {typeFilter === "All" ? "" : typeFilter + " "}
            leads were found for your selected skills and country.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
                        {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                style={{
                  background: "#1b1b1b",
                  border: "1px solid #333",
                  borderRadius: 10,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 19,
                    }}
                  >
                    {lead.title}
                  </h2>

                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "#333",
                      fontSize: 12,
                    }}
                  >
                    {lead.leadType}
                  </span>
                </div>

                {lead.company && (
                  <div
                    style={{
                      color: "#ddd",
                      marginBottom: 6,
                    }}
                  >
                    <strong>Company:</strong>{" "}
                    {lead.company}
                  </div>
                )}

                {lead.name && (
                  <div
                    style={{
                      color: "#ddd",
                      marginBottom: 6,
                    }}
                  >
                    <strong>Contact:</strong>{" "}
                    {lead.name}
                  </div>
                )}

                {lead.description && (
                  <div
                    style={{
                      color: "#ccc",
                      lineHeight: 1.5,
                      marginBottom: 10,
                    }}
                  >
                    {lead.description}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gap: 5,
                    color: "#bbb",
                    fontSize: 14,
                    marginBottom: 12,
                  }}
                >
                  {lead.skill && (
                    <div>
                      <strong>Skill:</strong>{" "}
                      {lead.skill}
                    </div>
                  )}

                  {lead.category && (
                    <div>
                      <strong>Category:</strong>{" "}
                      {lead.category}
                    </div>
                  )}

                  {lead.subcategory && (
                    <div>
                      <strong>Subcategory:</strong>{" "}
                      {lead.subcategory}
                    </div>
                  )}

                  {lead.country && (
                    <div>
                      <strong>Country:</strong>{" "}
                      {lead.country}
                    </div>
                  )}

                  {lead.city && (
                    <div>
                      <strong>City:</strong>{" "}
                      {lead.city}
                    </div>
                  )}

                  {(lead.budget !== "" &&
                    lead.budget !== undefined) && (
                    <div>
                      <strong>Budget:</strong>{" "}
                      {lead.currency
                        ? `${lead.currency} `
                        : ""}
                      {String(lead.budget)}
                    </div>
                  )}

                  {lead.salary !== "" &&
                    lead.salary !== undefined && (
                      <div>
                        <strong>Salary:</strong>{" "}
                        {lead.currency
                          ? `${lead.currency} `
                          : ""}
                        {String(lead.salary)}
                      </div>
                    )}

                  {lead.createdAt && (
                    <div>
                      <strong>Date:</strong>{" "}
                      {formatDate(lead.createdAt)}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {lead.phone && (
                    <button
                      type="button"
                      onClick={() =>
                        callPhone(lead.phone || "")
                      }
                      style={buttonStyle}
                    >
                      WhatsApp / Call
                    </button>
                  )}

                  {lead.email && (
                    <button
                      type="button"
                      onClick={() =>
                        sendEmail(lead.email || "")
                      }
                      style={buttonStyle}
                    >
                      Email
                    </button>
                  )}

                  {lead.contact && (
                    <button
                      type="button"
                      onClick={() =>
                        openLink(lead.contact || "")
                      }
                      style={buttonStyle}
                    >
                      Contact
                    </button>
                  )}

                  {lead.openUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        openLink(lead.openUrl || "")
                      }
                      style={buttonStyle}
                    >
                      Open Opportunity
                    </button>
                  )}

                  {lead.source && (
                    <button
                      type="button"
                      onClick={() =>
                        openLink(lead.source || "")
                      }
                      style={buttonStyle}
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
  
