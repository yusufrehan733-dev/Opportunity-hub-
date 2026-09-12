import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    const { data: invite, error: inviteError } = await supabase
      .from("allowed_users")
      .select("id, email, plan, is_active, invite_code")
      .eq("invite_code", token)
      .maybeSingle();

    if (inviteError) {
      return res.status(500).json({ error: inviteError.message });
    }

    if (!invite || !invite.is_active) {
      return res.status(404).json({ error: "Invalid or inactive invite" });
    }

    const email = String(invite.email).trim().toLowerCase();

    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        email,
        plan: invite.plan || "Basic",
        trial_days: 14,
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const password = String(body.password || "");
      const name = String(body.name || "").trim();
      const phone = body.phone ? String(body.phone).trim() : null;

      if (!name || password.length < 6) {
        return res.status(400).json({
          error: "Name and password of at least 6 characters are required",
        });
      }

      const { data: existingTrial, error: trialCheckError } =
        await supabase
          .from("trial_identities")
          .select("email")
          .eq("email", email)
          .maybeSingle();

      if (trialCheckError) {
        return res.status(500).json({
          error: trialCheckError.message,
        });
      }

      if (existingTrial) {
        return res.status(400).json({
          error: "A trial already exists for this email",
        });
      }

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            phone,
          },
        });

      if (authError) {
        return res.status(400).json({
          error: authError.message,
        });
      }

      const started = new Date();
      const ends = new Date(
        started.getTime() + 14 * 24 * 60 * 60 * 1000
      );

      const { error: trialError } = await supabase
        .from("trial_identities")
        .insert({
          email,
          trial_started_at: started.toISOString(),
          trial_ends_at: ends.toISOString(),
        });

      if (trialError) {
        if (authData?.user?.id) {
          await supabase.auth.admin.deleteUser(authData.user.id);
        }

        return res.status(500).json({
          error: trialError.message,
        });
      }

      return res.status(200).json({
        success: true,
        email,
        plan: invite.plan || "Basic",
        trial_days: 14,
      });
    }

    return res.status(405).json({
      error: "Method not allowed",
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || "Internal Server Error",
    });
  }
}
