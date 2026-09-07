import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function MatchedLeads() {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("lead_matches")
      .select("*")
      .eq("user_id", user.id);

    setMatches(data || []);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>My Matched Leads</h1>

      <p>Total Matches: {matches.length}</p>

      {matches.map((match) => (
        <div
          key={match.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 10,
          }}
        >
          Lead ID: {match.lead_id}
        </div>
      ))}
    </div>
  );
}
