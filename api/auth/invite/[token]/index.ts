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

async function findAuthUserByEmail(
  supabase: any,
  email: string
) {
  let page = 1;

  while (true) {
    const {
      data,
      error,
    } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];

    const match = users.find(
      (user: any) =>
        normalizeEmail(user.email) === email
    );

    if (match) {
      return match;
    }

    if (users.length < 1000) {
      return null;
    }

    page++;
  }
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
        error:
          "This invite does not contain a valid email.",
      });
    }

    const plan = String(
      invite.plan || "Basic"
    ).trim();

    const trialDays = getTrialDays(
      invite.trial_days
    );

    let existingAuthUser = null;

    try {
      existingAuthUser =
        await findAuthUserByEmail(
          supabase,
          email
        );
    } catch (error) {
      console.error(
        "Auth user lookup error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Could not verify account eligibility",
      });
    }

    if (existingAuthUser) {
      console.error(
        "INVITE BLOCKED: existing auth account for email:",
        email
      );

      return res.status(409).json({
        success: false,
        error:
          `An account already exists for ${email}.`,
      });
    }

    const started = new Date();

    const ends = new Date(
      started.getTime() +
        trialDays *
          24 *
          60 *
          60 *
          1000
    );
        /*
     * ==========================================
     * CREATE TRIAL IDENTITY
     * ==========================================
     */

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

      return res.status(500).json({
        success: false,
        error:
          "Could not create trial.",
      });
    }

    /*
     * ==========================================
     * CREATE AUTH ACCOUNT
     * ==========================================
     */

    const temporaryPassword =
      `${cryptoRandomPasswordPart()}!`;

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name:
          String(invite.name || "").trim(),
        phone:
          String(invite.phone || "").trim() ||
          null,
      },
    });

    if (authError || !authData?.user) {
      console.error(
        "Auth account creation error:",
        authError
      );

      await supabase
        .from("trial_identities")
        .delete()
        .eq("email", email);

      return res.status(500).json({
        success: false,
        error:
          authError?.message ||
          "Could not create account.",
      });
    }

    const userId = authData.user.id;

    /*
     * ==========================================
     * CREATE APPLICATION USER
     * IMPORTANT:
     * public.users DOES NOT HAVE active COLUMN
     * ==========================================
     */

    const {
      error: applicationUserError,
    } = await supabase
      .from("users")
      .insert({
        id: userId,
        name:
          String(invite.name || "").trim() ||
          email.split("@")[0],
        plan,
        trial_start:
          started.toISOString(),
        trial_end:
          ends.toISOString(),
        subscription_end: null,
      });

    if (applicationUserError) {
      console.error(
        "Application user creation error:",
        applicationUserError
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
          applicationUserError.message ||
          "Could not create application user.",
      });
    }

    /*
     * ==========================================
     * MARK INVITE AS USED
     * ==========================================
     */

    const {
      data: updatedInvite,
      error: updateInviteError,
    } = await supabase
      .from("invites")
      .update({
        used_at: new Date().toISOString(),
        user_id: userId,
      })
      .eq("id", invite.id)
      .is("used_at", null)
      .is("user_id", null)
      .select("*")
      .maybeSingle();

    if (updateInviteError) {
      console.error(
        "Invite finalization error:",
        updateInviteError
      );

      await supabase
        .from("users")
        .delete()
        .eq("id", userId);

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
          "Could not finalize invite registration.",
      });
    }
        if (!updatedInvite) {
      console.error(
        "Invite was not marked as used:",
        invite.id
      );

      await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      await supabase
        .from("trial_identities")
        .delete()
        .eq("email", email);

      await supabase.auth.admin.deleteUser(
        userId
      );

      return res.status(409).json({
        success: false,
        error:
          "This invite was already used. Please request a new invite.",
      });
    }

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    console.log(
      "INVITE REGISTRATION SUCCESS:",
      {
        email,
        userId,
        plan,
      }
    );

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
      invite_used: true,
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

function cryptoRandomPasswordPart() {
  return (
    Math.random()
      .toString(36)
      .slice(2, 12) +
    Math.random()
      .toString(36)
      .slice(2, 12)
  );
}
