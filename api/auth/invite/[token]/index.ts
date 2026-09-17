import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase server environment variables are missing."
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function normalizeEmail(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getTrialDays(value: any) {
  const days = Number(value);

  if (!Number.isFinite(days) || days <= 0) {
    return 14;
  }

  return Math.min(Math.floor(days), 14);
}

export default async function handler(
  req: any,
  res: any
) {
  try {
    const supabase = getSupabase();

    const token = String(
      req.query?.token || ""
    ).trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Invite token is required",
      });
    }

    const {
      data: invite,
      error: inviteError,
    } = await supabase
      .from("invites")
      .select(
        "id,email,token,name,phone,plan,trial_days,created_at,used_at,user_id"
      )
      .eq("token", token)
      .maybeSingle();

    if (inviteError) {
      console.error(
        "Invite lookup error:",
        inviteError
      );

      return res.status(500).json({
        success: false,
        error: "Could not verify invite link",
      });
    }

    if (!invite) {
      return res.status(404).json({
        success: false,
        error: "Invalid invite link",
      });
    }

    if (invite.used_at || invite.user_id) {
      return res.status(409).json({
        success: false,
        error: "This invite has already been used.",
      });
    }

    const email = normalizeEmail(invite.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "This invite does not contain a valid email.",
      });
    }

    const plan = String(
      invite.plan || "Basic"
    ).trim();

    const trialDays = getTrialDays(
      invite.trial_days
    );

    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        email,
        name: invite.name || "",
        phone: invite.phone || "",
        plan,
        trial_days: trialDays,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
    }

    const body = req.body || {};

    const name = String(
      body.name || ""
    ).trim();

    const phone = body.phone
      ? String(body.phone).trim()
      : null;

    const password = String(
      body.password || ""
    );

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Name is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
  }
        /*
     * =========================
     * ONE EMAIL = ONE TRIAL
     * =========================
     */
    const {
      data: existingTrial,
      error: trialCheckError,
    } = await supabase
      .from("trial_identities")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (trialCheckError) {
      console.error(
        "Trial identity lookup error:",
        trialCheckError
      );

      return res.status(500).json({
        success: false,
        error: "Could not verify trial eligibility",
      });
    }

    if (existingTrial) {
      console.error(
        "INVITE BLOCKED: existing trial for email:",
        email
      );

      return res.status(409).json({
        success: false,
        error: `A trial already exists for ${email}.`,
      });
    }

    /*
     * =========================
     * CHECK AUTH ACCOUNT
     * =========================
     */
    const {
      data: authList,
      error: authListError,
    } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authListError) {
      console.error(
        "Auth user lookup error:",
        authListError
      );

      return res.status(500).json({
        success: false,
        error: "Could not verify account eligibility",
      });
    }

    const alreadyExists =
      (authList?.users || []).some(
        (user: any) =>
          normalizeEmail(user.email) === email
      );

    if (alreadyExists) {
      console.error(
        "INVITE BLOCKED: existing auth account for email:",
        email
      );

      return res.status(409).json({
        success: false,
        error: `An account already exists for ${email}.`,
      });
    }

    /*
     * =========================
     * CREATE AUTH USER
     * =========================
     */
    const {
      data: authData,
      error: authError,
    } =
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
      console.error(
        "Auth account creation error:",
        authError
      );

      return res.status(400).json({
        success: false,
        error: authError.message,
      });
    }

    const userId =
      authData?.user?.id;

    if (!userId) {
      return res.status(500).json({
        success: false,
        error: "Account could not be created.",
      });
    }

    /*
     * =========================
     * CREATE TRIAL
     * =========================
     */
    const started = new Date();

    const ends = new Date(
      started.getTime() +
        trialDays *
          24 *
          60 *
          60 *
          1000
    );

    const {
      error: trialError,
    } = await supabase
      .from("trial_identities")
      .insert({
        email,
        trial_started_at:
          started.toISOString(),
        trial_ends_at:
          ends.toISOString(),
      });

    if (trialError) {
      console.error(
        "Trial creation error:",
        trialError
      );

      await supabase.auth.admin.deleteUser(
        userId
      );

      return res.status(500).json({
        success: false,
        error: "Could not create trial.",
      });
}
    /*
     * =========================
     * CREATE APPLICATION USER
     *
     * Confirmed public.users columns:
     * id
     * name
     * plan
     * trial_start
     * trial_end
     * subscription_end
     * active
     * =========================
     */
    const {
      error: userError,
    } = await supabase
      .from("users")
      .upsert(
        {
          id: userId,
          name,
          plan,
          trial_start:
            started.toISOString(),
          trial_end:
            ends.toISOString(),
          subscription_end: null,
          active: true,
        },
        {
          onConflict: "id",
        }
      );

    if (userError) {
      console.error(
        "Application user creation error:",
        userError
      );

      await supabase
        .from("trial_identities")
        .delete()
        .eq("email", email);

      await supabase.auth.admin.deleteUser(
        userId
      );

      return res.status(500).json({
        success: false,
        error:
          "Could not create application profile.",
      });
    }

    /*
     * =========================
     * MARK INVITE USED
     * =========================
     */
    const {
      data: updatedInvite,
      error: inviteUpdateError,
    } = await supabase
      .from("invites")
      .update({
        used_at:
          new Date().toISOString(),
        user_id: userId,
      })
      .eq("id", invite.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();

    if (inviteUpdateError) {
      console.error(
        "Invite update error:",
        inviteUpdateError
      );

      /*
       * The account itself is valid.
       * Do not delete it because of an invite
       * bookkeeping problem.
       */
    }

    /*
     * =========================
     * SUCCESS
     * =========================
     */
    return res.status(200).json({
      success: true,
      email,
      plan,
      trial_days: trialDays,
      trial_start:
        started.toISOString(),
      trial_end:
        ends.toISOString(),
      user_id: userId,
      invite_used: Boolean(
        updatedInvite || inviteUpdateError
      ),
    });
  } catch (error: any) {
    console.error(
      "Invite API error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Internal server error",
    });
  }
      }
