import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Lead = {
  id: string;
  leadType: "Demand" | "Supply" | "SaaS";

  title?: string;
  name?: string;
  company?: string;

  description?: string;
  skill?: string;
  category?: string;
  subcategory?: string;

  country?: string;
  city?: string;

  budget?: string;
  currency?: string;
  salary?: string;

  contactName?: string;
  email?: string;
  phone?: string;
  contact?: string;

  source?: string;
  openUrl?: string;

  createdAt?: string;
};

const countries = [
  "USA",
  "Canada",
  "UK",
  "UAE",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Australia",
  "Norway",
  "Finland",
  "Pakistan",
  "India",
  "Bangladesh",
];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [typeFilter, setTypeFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    setErrorMsg("");

    const [demandResult, supplyResult, saasResult] =
      await Promise.all([
        supabase.from("demand_lead").select("*"),
        supabase.from("supply_leads").select("*"),
        supabase.from("saas_leads").select("*"),
      ]);

    const errors = [
      demandResult.error,
      supplyResult.error,
      saasResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error("Lead errors:", errors);
    }

    const demand: Lead[] = (demandResult.data || []).map(
      (row: any) => ({
        id: row.id,
        leadType: "Demand",

        title: row.title || row.skill_needed || "Service Opportunity",
        name: row.client_name,

        description: row.description,
        skill: row.skill_needed,
        category: row.category,
        subcategory: row.subcategory,

        country: row.country,
        city: row.city,

        budget: row.budget,
        currency: row.currency,

        contactName: row.contact_name,
        email: row.contact_email,
        phone: row.contact_phone,

        source: row.source,
        openUrl: row.source,

        createdAt: row.created_at,
      })
    );

    const supply: Lead[] = (supplyResult.data || []).map(
      (row: any) => ({
        id: row.id,
        leadType: "Supply",

        title: row.job_title || row.position || "Job Opportunity",
        name: row.company_name,
        company: row.company_name,

        description: row.description,
        skill: row.required_skill,
        category: row.category,
        subcategory: row.subcategory,

        country: row.country,
        city: row.city,

        salary: row.salary_range,

        email: row.contact_email,
        phone: row.contact_phone,

        openUrl: row.apply_url || row.company_website,
        source: row.company_website,

        createdAt: row.created_at,
      })
    );

    const saas: Lead[] = (saasResult.data || []).map(
      (row: any) => ({
        id: row.id,
        leadType: "SaaS",

        title: row.name || "SaaS Opportunity",
        name: row.name,
        company: row.platform,

        description: row.description,
        category: row.niche,

        contact: row.contact,
        email: row.content_email,

        openUrl: row.landing_url,

        createdAt: row.created_at,
      })
    );

    setLeads([...demand, ...supply, ...saas]);
    setLoading(false);

    if (errors.length === 3) {
      setErrorMsg("Could not load leads. Please check database access.");
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const typeMatches =
        typeFilter === "All" || lead.leadType === typeFilter;

      const countryMatches =
        countryFilter === "All" ||
        (lead.country || "").toLowerCase() ===
          countryFilter.toLowerCase();

      return typeMatches && countryMatches;
    });
  }, [leads, typeFilter, countryFilter]);

  function openLink(url?: string) {
    if (!url) return;

    let finalUrl = url.trim();

    if (
      !finalUrl.startsWith("http://") &&
      !finalUrl.startsWith("https://")
    ) {
      finalUrl = `https://${finalUrl}`;
    }

    window.open(finalUrl, "_blank", "noopener,noreferrer");
  }

  function openWhatsApp(phone?: string) {
    if (!phone) return;

    const cleanPhone = phone.replace(/[^\d+]/g, "");

    window.open(
      `https://wa.me/${cleanPhone.replace("+", "")}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function callPhone(phone?: string) {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  }

  function sendEmail(email?: string) {
    if (!email) return;
    window.location.href = `mailto:${email}`;
  }

  function formatDate(date?: string) {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleDateString();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
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
        <h1
          style={{
            marginTop: 0,
            marginBottom: 6,
            fontSize: "28px",
          }}
        >
          Leads
        </h1>

        <p
          style={{
            color: "#999",
            marginTop: 0,
            marginBottom: 24,
          }}
        >
          Find real opportunities and contact them directly.
        </p>

        {/* CATEGORY FILTER */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {["All", "Demand", "Supply", "SaaS"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              style={{
                padding: "9px 16px",
                borderRadius: 8,
                border: "1px solid #333",
                background:
                  typeFilter === type ? "#00c98b" : "#181818",
                color:
                  typeFilter === type ? "#000" : "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* COUNTRY FILTER */}
        <div style={{ marginBottom: 24 }}>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "320px",
              padding: "11px 12px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#181818",
              color: "#fff",
              fontSize: "15px",
            }}
          >
            <option value="All">All Countries</option>

            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        {/* STATUS */}
        <div
          style={{
            color: "#aaa",
            marginBottom: 16,
          }}
        >
          {loading
            ? "Loading leads..."
            : `${filteredLeads.length} leads found`}
        </div>

        {errorMsg && (
          <div
            style={{
              background: "#251313",
              border: "1px solid #6b2b2b",
              color: "#ff8d8d",
              padding: 14,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* LEADS */}
        {!loading && filteredLeads.length === 0 && (
          <div
            style={{
              background: "#151515",
              border: "1px solid #292929",
              borderRadius: 10,
              padding: 30,
              textAlign: "center",
              color: "#999",
            }}
          >
            No leads found for this filter.
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          {filteredLeads.map((lead) => (
            <div
              key={`${lead.leadType}-${lead.id}`}
              style={{
                background: "#151515",
                border: "1px solid #292929",
                borderRadius: 10,
                padding: 18,
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#00c98b",
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {lead.leadType}
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: 20,
                    }}
                  >
                    {lead.title || "Opportunity"}
                  </h2>
                </div>

                {lead.createdAt && (
                  <div
                    style={{
                      color: "#777",
                      fontSize: 12,
                    }}
                  >
                    {formatDate(lead.createdAt)}
                  </div>
                )}
              </div>

              {/* DETAILS */}
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {lead.country && (
                  <span style={tagStyle}>
                    🌍 {lead.country}
                  </span>
                )}

                {lead.city && (
                  <span style={tagStyle}>
                    📍 {lead.city}
                  </span>
                )}

                {lead.skill && (
                  <span style={tagStyle}>
                    🛠 {lead.skill}
                  </span>
                )}

                {lead.category && (
                  <span style={tagStyle}>
                    {lead.category}
                  </span>
                )}
              </div>

              {lead.name && (
                <div
                  style={{
                    marginTop: 14,
                    color: "#ddd",
                  }}
                >
                  <strong>
                    {lead.leadType === "Supply"
                      ? "Company:"
                      : "Name:"}
                  </strong>{" "}
                  {lead.name}
                </div>
              )}

              {lead.description && (
                <p
                  style={{
                    color: "#bbb",
                    lineHeight: 1.55,
                    marginBottom: 0,
                  }}
                >
                  {lead.description}
                </p>
              )}

              {/* MONEY */}
              {(lead.budget || lead.salary) && (
                <div
                  style={{
                    marginTop: 12,
                    color: "#00c98b",
                    fontWeight: 600,
                  }}
                >
                  {lead.budget &&
                    `Budget: ${
                      lead.currency || ""
                    } ${lead.budget}`}

                  {lead.salary &&
                    `Salary: ${lead.salary}`}
                </div>
              )}

              {/* CONTACT */}
              {(lead.contactName ||
                lead.email ||
                lead.phone ||
                lead.contact) && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: "1px solid #292929",
                  }}
                >
                  {lead.contactName && (
                    <div
                      style={{
                        color: "#ddd",
                        marginBottom: 8,
                      }}
                    >
                      Contact: {lead.contactName}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {lead.phone && (
                      <>
                        <button
                          onClick={() =>
                            callPhone(lead.phone)
                          }
                          style={buttonStyle}
                        >
                          📞 Call
                        </button>

                        <button
                          onClick={() =>
                            openWhatsApp(lead.phone)
                          }
                          style={buttonStyle}
                        >
                          WhatsApp
                        </button>
                      </>
                    )}

                    {lead.email && (
                      <button
                        onClick={() =>
                          sendEmail(lead.email)
                        }
                        style={buttonStyle}
                      >
                        ✉ Email
                      </button>
                    )}

                    {lead.contact &&
                      !lead.email &&
                      !lead.phone && (
                        <button
                          onClick={() =>
                            openLink(lead.contact)
                          }
                          style={buttonStyle}
                        >
                          Contact
                        </button>
                      )}
                  </div>
                </div>
              )}

              {/* SOURCE / APPLY */}
              {lead.openUrl && (
                <button
                  onClick={() =>
                    openLink(lead.openUrl)
                  }
                  style={{
                    ...buttonStyle,
                    marginTop: 14,
                    background: "#00c98b",
                    color: "#000",
                    borderColor: "#00c98b",
                    fontWeight: 700,
                  }}
                >
                  {lead.leadType === "Supply"
                    ? "Apply / Open Opportunity"
                    : lead.leadType === "SaaS"
                    ? "Open Landing Page"
                    : "Open Source"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const tagStyle = {
  background: "#202020",
  border: "1px solid #333",
  color: "#ccc",
  padding: "5px 9px",
  borderRadius: 6,
  fontSize: 12,
};

const buttonStyle = {
  padding: "9px 13px",
  borderRadius: 7,
  border: "1px solid #444",
  background: "#222",
  color: "#fff",
  cursor: "pointer",
};
