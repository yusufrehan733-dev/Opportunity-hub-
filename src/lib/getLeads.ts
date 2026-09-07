import { supabase } from "./supabase";

export const getLeads = async (
  skill: string,
  country: string,
  type?: string
) => {
  let query = supabase
    .from("leads")
    .select("*")
    .eq("skill", skill)
    .eq("country", country);

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching leads:", error);
    return [];
  }

  return data;
};
