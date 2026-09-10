import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

async function fetchLeads(type?: string) {
  const response = await fetch("/api/leads");

  if (!response.ok) {
    throw new Error("Failed to load leads");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to load leads");
  }

  const leads = result.leads || [];

  if (!type) {
    return leads;
  }

  return leads.filter(
    (lead: any) =>
      String(lead.type || "").toLowerCase() === type.toLowerCase()
  );
}

export function useDemandLeads() {
  return useQuery({
    queryKey: ["demand-leads"],
    queryFn: () => fetchLeads("Demand"),
  });
}

export function useSupplyLeads() {
  return useQuery({
    queryKey: ["supply-leads"],
    queryFn: () => fetchLeads("Supply"),
  });
}

export function useSaasLeads() {
  return useQuery({
    queryKey: ["saas-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
  });
}
