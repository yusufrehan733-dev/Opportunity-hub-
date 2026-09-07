import "dotenv/config";

export const env = {
  SUPABASE_URL:
    process.env.VITE_SUPABASE_URL ||
    "https://qnkxrxxwfikhrlirfleg.supabase.co",

  SUPABASE_ANON_KEY:
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFua3hyeHh3ZmlraHJsaXJmbGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MTc4NDcsImV4cCI6MjA4NzQ5Mzg0N30.FX-ZcM-w6ci01NpYP9aAwgTzIx-I7Ir00YUm_fcmd7I",

  CRON_INTERVAL_MINUTES: Number(
    process.env.CRON_INTERVAL_MINUTES || 10
  ),
};

if (!env.SUPABASE_URL) {
  throw new Error("Missing Supabase URL");
}

if (!env.SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase anon key");
}
