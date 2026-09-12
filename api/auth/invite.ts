import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const parts = String(req.url || "").split("/").filter(Boolean);
  const token = parts[parts.indexOf("invite") + 1];

  if (!token) {
    return res.status(400).json({ error: "Invite token required" });
  }

  const { data: invite, error } = await supabase
    .from("allowed_users")
    .select("id,email,plan,is_active,invite_code")
    .eq("invite_code", token)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!invite || !invite.is_active) {
    return res.status(404).json({ error: "Invalid or inactive invite" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      email: invite.email,
      plan: invite.plan || "Basic",
      trial_days: 14
    });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;

    if (!name || password.length < 6) {
      return res.status(400).json({
        error: "Name and password of at least 6 characters are required"
      });
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          phone
        }
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const started = new Date();
    const ends = new Date(started.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { error: trialError } = await supabase
      .from("trial_identities")
      .upsert({
        email: invite.email.toLowerCase(),
        trial_started_at: started.toISOString(),
        trial_ends_at: ends.toISOString()
      }, { onConflict: "email" });

    if (trialError) {
      return res.status(500).json({ error: trialError.message });
    }

    await supabase
      .from("allowed_users")
      .update({ is_active: true })
      .eq("id", invite.id);

    return res.status(200).json({
      success: true,
      user: authData.user
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
