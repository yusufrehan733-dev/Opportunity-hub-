import { useQuery } from "@tanstack/react-query";
import { supabase } from "./lib/supabase";

export function useDemandLeads() {
  return useQuery({
    queryKey: ["demand-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return data || [];
    },
  });
}

export function useSupplyLeads() {
  return useQuery({
    queryKey: ["supply-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supply_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return data || [];
    },
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

      if (error) throw new Error(error.message);

      return data || [];
    },
  });
}
