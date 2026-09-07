import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);

    const { data, error } = await supabase
      .from("demand_leads")
      .select("*");

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setLeads(data || []);
    }

    setLoading(false);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>SUPABASE TEST PAGE</h1>

      <p>Loading: {loading ? "YES" : "NO"}</p>
      <p>Total Leads: {leads.length}</p>

      {errorMsg && (
        <div style={{ color: "red" }}>
          Error: {errorMsg}
        </div>
      )}

      <hr />

      {leads.map((lead) => (
        <div
          key={lead.id}
          style={{
            border: "1px solid #ccc",
            marginBottom: "10px",
            padding: "10px",
          }}
        >
          <pre>{JSON.stringify(lead, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
