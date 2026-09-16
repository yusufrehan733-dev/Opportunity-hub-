import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Lead = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  company?: string | null;
  name?: string | null;
  country?: string | null;
  skill?: string | null;
  category?: string | null;
  source?: string | null;
  url?: string | null;
  contact_url?: string | null;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  created_at?: string | null;
  posted_at?: string | null;
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("demand_leads")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("LEADS DATA:", data);
    console.log("LEADS ERROR:", error);

    if (error) {
      setErrorMsg(error.message);
      setLeads([]);
    } else {
      setLeads((data || []) as Lead[]);
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "24px",
        color: "#111",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            background: "#111",
            color: "#fff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h1 style={{ margin: 0 }}>Leads</h1>

          <p style={{ margin: "8px 0 0", color: "#ccc" }}>
            Fresh opportunities matching your skills
          </p>

          <div
            style={{
              marginTop: "14px",
              display: "inline-block",
              background: "#222",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
          >
            {loading ? "Loading..." : `${leads.length} leads found`}
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #d00",
              color: "#b00000",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <strong>Could not load leads</strong>
            <div style={{ marginTop: "5px" }}>{errorMsg}</div>
          </div>
        )}

        {!loading && !errorMsg && leads.length === 0 && (
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "10px",
              textAlign: "center",
            }}
          >
            <h3>No leads found</h3>
            <p style={{ color: "#666" }}>
              No demand leads are currently available.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gap: "16px" }}>
          {leads.map((lead) => (
            <div
              key={lead.id}
              style={{
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "20px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {lead.title || "Opportunity"}
              </h2>

              {lead.company && (
                <p>
                  <strong>Company:</strong> {lead.company}
                </p>
              )}

              {lead.name && (
                <p>
                  <strong>Contact:</strong> {lead.name}
                </p>
              )}

              {lead.country && (
                <p>
                  <strong>Country:</strong> {lead.country}
                </p>
              )}

              {lead.skill && (
                <p>
                  <strong>Skill:</strong> {lead.skill}
                </p>
              )}

              {lead.category && (
                <p>
                  <strong>Category:</strong> {lead.category}
                </p>
              )}

              {lead.description && (
                <div
                  style={{
                    background: "#f7f7f7",
                    padding: "12px",
                    borderRadius: "6px",
                    margin: "12px 0",
                    lineHeight: 1.5,
                  }}
                >
                  {lead.description}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "15px",
                }}
              >
                {lead.url && (
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#111",
                      color: "#fff",
                      padding: "9px 14px",
                      borderRadius: "6px",
                      textDecoration: "none",
                    }}
                  >
                    View Opportunity
                  </a>
                )}

                {lead.contact_url && (
                  <a
                    href={lead.contact_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#333",
                      color: "#fff",
                      padding: "9px 14px",
                      borderRadius: "6px",
                      textDecoration: "none",
                    }}
                  >
                    Contact
                  </a>
                )}

                {lead.whatsapp && (
                  <a
                    href={lead.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#222",
                      color: "#fff",
                      padding: "9px 14px",
                      borderRadius: "6px",
                      textDecoration: "none",
                    }}
                  >
                    WhatsApp
                  </a>
                )}

                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    style={{
                      background: "#222",
                      color: "#fff",
                      padding: "9px 14px",
                      borderRadius: "6px",
                      textDecoration: "none",
                    }}
                  >
                    Call
                  </a>
                )}

                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    style={{
                      background: "#222",
                      color: "#fff",
                      padding: "9px 14px",
                      borderRadius: "6px",
                      textDecoration: "none",
                    }}
                  >
                    Email
                  </a>
                )}
              </div>

              {lead.source && (
                <p
                  style={{
                    marginTop: "15px",
                    marginBottom: 0,
                    fontSize: "13px",
                    color: "#777",
                  }}
                >
                  Source: {lead.source}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
