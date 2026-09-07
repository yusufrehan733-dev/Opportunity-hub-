import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Opportunities() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching opportunities:", error);
    } else {
      setLeads(data || []);
    }

    setLoading(false);
  };

  const demandLeads = leads.filter(
    (lead) => lead.lead_type === "demand"
  );

  const supplyLeads = leads.filter(
    (lead) => lead.lead_type === "supply"
  );

  const growthLeads = leads.filter(
    (lead) => lead.lead_type === "growth"
  );

  return (
    <div
      style={{
        padding: 20,
        background: "#ffffff",
        minHeight: "100vh",
        color: "#000",
      }}
    >
      <h1 style={{ marginBottom: 10 }}>
        Opportunity Hub 🚀
      </h1>

      <p
        style={{
          marginBottom: 30,
          color: "#555",
          lineHeight: 1.6,
        }}
      >
        Explore opportunities based on your skills and countries.
        If one earning path is slow, try another opportunity path.
      </p>

      {loading ? (
        <p>Loading opportunities...</p>
      ) : (
        <>
          {/* DEMAND OPPORTUNITIES */}

          <h2 style={{ marginBottom: 15 }}>
            Demand Opportunities
          </h2>

          {demandLeads.length === 0 ? (
            <div
              style={{
                padding: 15,
                border: "1px solid #ddd",
                borderRadius: 10,
                marginBottom: 30,
              }}
            >
              <p>
                No fresh demand opportunities right now.
              </p>

              <p style={{ marginTop: 10 }}>
                Try exploring supply opportunities or
                growth opportunities below.
              </p>
            </div>
          ) : (
            demandLeads.map((lead) => (
              <div
                key={lead.id}
                style={{
                  padding: 15,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  marginBottom: 15,
                  background: "#fff",
                }}
              >
                <h3>{lead.title}</h3>

                <p>{lead.description}</p>

                <p>
                  <strong>Country:</strong> {lead.country}
                </p>

                <p>
                  <strong>Skill:</strong> {lead.subskill}
                </p>
              </div>
            ))
          )}

          {/* SUPPLY OPPORTUNITIES */}

          <h2 style={{ marginBottom: 15 }}>
            Supply Opportunities
          </h2>

          {supplyLeads.length === 0 ? (
            <div
              style={{
                padding: 15,
                border: "1px solid #ddd",
                borderRadius: 10,
                marginBottom: 30,
              }}
            >
              <p>
                No supply opportunities available right now.
              </p>
            </div>
          ) : (
            supplyLeads.map((lead) => (
              <div
                key={lead.id}
                style={{
                  padding: 15,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  marginBottom: 15,
                  background: "#fff",
                }}
              >
                <h3>{lead.title}</h3>

                <p>{lead.description}</p>

                <p>
                  <strong>Country:</strong> {lead.country}
                </p>

                <p>
                  <strong>Skill:</strong> {lead.subskill}
                </p>

                {lead.source_url && (
                  <a
                    href={lead.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 10,
                      background: "#000",
                      color: "#fff",
                      padding: "10px 15px",
                      borderRadius: 8,
                      textDecoration: "none",
                    }}
                  >
                    Visit Opportunity
                  </a>
                )}
              </div>
            ))
          )}

          {/* GROWTH OPPORTUNITIES */}

          <h2 style={{ marginBottom: 15 }}>
            Growth Opportunities
          </h2>

          {growthLeads.length === 0 ? (
            <div
              style={{
                padding: 15,
                border: "1px solid #ddd",
                borderRadius: 10,
                marginBottom: 30,
              }}
            >
              <p>
                No growth opportunities available right now.
              </p>
            </div>
          ) : (
            growthLeads.map((lead) => (
              <div
                key={lead.id}
                style={{
                  padding: 15,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  marginBottom: 15,
                  background: "#fff",
                }}
              >
                <h3>{lead.title}</h3>

                <p>{lead.description}</p>

                <p>
                  <strong>Country:</strong> {lead.country}
                </p>

                <p>
                  <strong>Skill:</strong> {lead.subskill}
                </p>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
  }
