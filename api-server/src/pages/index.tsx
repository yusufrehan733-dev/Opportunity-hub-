import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import LeadCard from "../components/LeadCard";
import { supabase } from "../lib/supabase";

type Lead = {
  client_name: string;
  description: string;
  service_needed: string;
  contact_email?: string;
  contact_phone?: string;
  skill?: string;
  created_at: string;
};

const IndexPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const { data, error } = await supabase
          .from("demand_leads")
          .select("*")
          .gte("created_at", tenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.error("Supabase error:", error);
          setLeads([]);
        } else {
          setLeads(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch leads", err);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-4">Leads Dashboard</h1>

      {loading ? (
        <p>Loading leads...</p>
      ) : leads.length === 0 ? (
        <p>No leads available</p>
      ) : (
        leads.map((lead, idx) => (
          <LeadCard
            key={idx}
            lead={{
              title: lead.service_needed || lead.client_name,
              description: lead.description || "No description provided",
              link: lead.contact_email
                ? `mailto:${lead.contact_email}`
                : lead.contact_phone
                ? `tel:${lead.contact_phone}`
                : "#",
              tags: lead.skill ? [lead.skill] : [],
              isLocked: false,
            }}
          />
        ))
      )}
    </AppLayout>
  );
};

export default IndexPage;
