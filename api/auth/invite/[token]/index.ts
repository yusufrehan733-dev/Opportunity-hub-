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

    /*
     * IMPORTANT:
     * Admin creates invites in the "invites" table.
     * This endpoint therefore also uses "invites".
     */
    const {
      data: invite,
      error: inviteError,
    } = await supabase
      .from("invites")
      .select(
        `
          id,
          email,
          token,
          name,
          phone,
          plan,
          trial_days,
          created_at,
          used_at,
          user_id
        `
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
        error: inviteError.message,
      });
    }

    if (!invite) {
      return res.status(404).json({
        success: false,
        error: "Invalid invite link",
      });
    }

    /*
     * A used invite cannot be used again.
     */
    if (invite.used_at || invite.user_id) {
      return res.status(400).json({
        success: false,
        error:
          "This invite has already been used.",
      });
    }

    const email = String(
      invite.email || ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        error:
          "This invite does not contain a valid email.",
      });
    }

    /*
     * =========================
     * GET INVITE
     * =========================
     */
    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        email,
        name: invite.name || "",
        phone: invite.phone || "",
        plan: invite.plan || "Basic",
        trial_days:
          invite.trial_days || 14,
      });
    }

    /*
     * =========================
     * CREATE ACCOUNT
     * =========================
     */
    if (req.method === "POST") {
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
          error:
            "Password must be at least 6 characters",
        });
      }

      /*
       * One email = one trial identity.
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
        return res.status(500).json({
          success: false,
          error:
            trialCheckError.message,
        });
      }

      if (existingTrial) {
        return res.status(400).json({
          success: false,
          error:
            "A trial already exists for this email.",
        });
      }

      /*
       * Make sure the email is not already
       * registered in Supabase Auth.
       */
      const {
        data: authList,
        error: authListError,
      } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (!authListError) {
        const alreadyExists =
          (authList?.users || []).some(
            (user: any) =>
              String(user.email || "")
                .trim()
                .toLowerCase() === email
          );

        if (alreadyExists) {
          return res.status(400).json({
            success: false,
            error:
              "An account already exists for this email.",
          });
        }
      }

      /*
       * Create Supabase Auth account.
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
        return res.status(400).json({
          success: false,
          error: authError.message,
        });
      }

      if (!authData?.user?.id) {
        return res.status(500).json({
          success: false,
          error:
            "Account could not be created.",
        });
      }

      const userId =
        authData.user.id;

      /*
       * Start the 14-day trial.
       */
      const started = new Date();

      const trialDays =
        Number(invite.trial_days) > 0
          ? Number(invite.trial_days)
          : 14;

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
        /*
         * Roll back Auth account if the
         * trial record cannot be created.
         */
        await supabase.auth.admin.deleteUser(
          userId
        );

        return res.status(500).json({
          success: false,
          error:
            trialError.message,
        });
      }

      /*
       * Create/update the application user
       * record.
       *
       * We only use columns already known
       * to exist in the users table.
       */
      const {
        error: userError,
      } = await supabase
        .from("users")
        .upsert(
          {
            id: userId,
            name,
            plan:
              invite.plan || "Basic",
            subscription_status:
              "trial",
            trial_start:
              started.toISOString(),
            trial_end:
              ends.toISOString(),
          },
          {
            onConflict: "id",
          }
        );

      if (userError) {
        /*
         * Roll back the trial and Auth account
         * if the users record cannot be created.
         */
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
            userError.message,
        });
      }

      /*
       * Mark the invite as used.
       */
      const {
        error: inviteUpdateError,
      } = await supabase
        .from("invites")
        .update({
          used_at:
            new Date().toISOString(),
          user_id: userId,
        })
        .eq("id", invite.id)
        .is("used_at", null);

      if (inviteUpdateError) {
        console.error(
          "Invite update error:",
          inviteUpdateError
        );

        /*
         * Account is already valid, so do not
         * delete the new account here.
         */
      }

      return res.status(200).json({
        success: true,
        email,
        plan:
          invite.plan || "Basic",
        trial_days: trialDays,
        trial_start:
          started.toISOString(),
        trial_end:
          ends.toISOString(),
        user_id: userId,
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
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
