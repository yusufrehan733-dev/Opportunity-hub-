import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export async function sbQuery(tableName, builder) {
  if (!supabase) {
    console.error(
      `[Supabase] Client not initialized — table: ${tableName}`
    );
    return [];
  }

  const { data, error } = await builder(supabase.from(tableName));

  if (error) {
    console.error(
      `[Supabase] Error in ${tableName}:`,
      error.message
    );
    return [];
  }

  return data || [];
}
