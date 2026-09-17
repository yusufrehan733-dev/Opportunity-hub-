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

function getBody(req: any) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
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
     * ==========================================
     * LOAD INVITE
     * ==========================================
     */

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

    /*
     * An actually consumed invite stays consumed.
     */
    if (invite.used_at || invite.user_id) {
      return res.status(409).json({
        success: false,
        error:
          "This invite has already been used.",
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

    const body = getBody(req);

    /*
     * ==========================================
     * GET = SHOW INVITE
     * ==========================================
     */

    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        invite: {
          email,
          name:
            String(invite.name || "").trim(),
          phone:
            String(invite.phone || "").trim(),
          plan:
            String(invite.plan || "Basic").trim(),
          trial_days:
            getTrialDays(invite.trial_days),
        },
      });
    }

    /*
     * ==========================================
     * POST = REGISTER
     * ==========================================
     */

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
    }

    const name =
      String(
        body.name ??
        invite.name ??
        ""
      ).trim();

    const phone =
      String(
        body.phone ??
        invite.phone ??
        ""
      ).trim();

    const password =
      String(body.password || "");

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error:
          "Password must be at least 6 characters.",
      });
    }

    const plan =
      String(
        invite.plan || "Basic"
      ).trim();

    const trialDays = getTrialDays(
      invite.trial_days
    );

    /*
     * ==========================================
     * FIND EXISTING AUTH ACCOUNT
     * ==========================================
     *
     * Old unused invites may point to an email
     * that already has an Auth account from
     * previous testing.
     *
     * We reuse that Auth identity instead of
     * rejecting the old invite.
     */

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

    const started = new Date();

    const ends = new Date(
      started.getTime() +
        trialDays *
          24 *
          60 *
          60 *
          1000
    );

    let userId = "";
    let createdAuthUser = false;
    let createdTrialIdentity = false;
    let createdApplicationUser = false;

    /*
     * ==========================================
     * AUTH ACCOUNT
     * ==========================================
     */

    if (existingAuthUser) {
      userId = existingAuthUser.id;

      const {
        error: updateAuthError,
      } =
        await supabase.auth.admin.updateUserById(
          userId,
          {
            password,
            user_metadata: {
              ...(existingAuthUser.user_metadata ||
                {}),
              full_name:
                name ||
                existingAuthUser.user_metadata
                  ?.full_name ||
                email.split("@")[0],
              phone:
                phone ||
                existingAuthUser.user_metadata
                  ?.phone ||
                null,
            },
          }
        );

      if (updateAuthError) {
        console.error(
          "Existing Auth update error:",
          updateAuthError
        );

        return res.status(500).json({
          success: false,
          error:
            updateAuthError.message ||
            "Could not activate existing account.",
        });
      }
    } else {
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name:
              name ||
              email.split("@")[0],
            phone: phone || null,
          },
        });

      if (
        authError ||
        !authData?.user
      ) {
        console.error(
          "Auth account creation error:",
          authError
        );

        return res.status(500).json({
          success: false,
          error:
            authError?.message ||
            "Could not create account.",
        });
      }

      userId = authData.user.id;
      createdAuthUser = true;
    }

    /*
     * ==========================================
     * TRIAL IDENTITY
     * ==========================================
     */

    const {
      data: existingTrial,
      error: trialLookupError,
    } = await supabase
      .from("trial_identities")
      .select(
        "email,trial_started_at,trial_ends_at"
      )
      .eq("email", email)
      .maybeSingle();

    if (trialLookupError) {
      console.error(
        "Trial lookup error:",
        trialLookupError
      );

      if (createdAuthUser) {
        await supabase.auth.admin.deleteUser(
          userId
        );
      }

      return res.status(500).json({
        success: false,
        error:
          "Could not verify trial eligibility.",
      });
    }

    /*
     * If this is an old test identity with the
     * same email, reuse/update its trial record
     * instead of creating a duplicate.
     */
    if (existingTrial) {
      const { error: trialUpdateError } =
        await supabase
          .from("trial_identities")
          .update({
            trial_started_at:
              started.toISOString(),
            trial_ends_at:
              ends.toISOString(),
          })
          .eq("email", email);

      if (trialUpdateError) {
        console.error(
          "Trial update error:",
          trialUpdateError
        );

        if (createdAuthUser) {
          await supabase.auth.admin.deleteUser(
            userId
          );
        }

        return res.status(500).json({
          success: false,
          error:
            "Could not activate trial.",
        });
      }
    } else {
      const {
        error: trialInsertError,
      } = await supabase
        .from("trial_identities")
        .insert({
          email,
          trial_started_at:
            started.toISOString(),
          trial_ends_at:
            ends.toISOString(),
        });

      if (trialInsertError) {
        console.error(
          "Trial creation error:",
          trialInsertError
        );

        if (createdAuthUser) {
          await supabase.auth.admin.deleteUser(
            userId
          );
        }

        return res.status(500).json({
          success: false,
          error:
            "Could not create trial.",
        });
      }

      createdTrialIdentity = true;
    }

    /*
     * ==========================================
     * APPLICATION USER
     * ==========================================
     */

    const {
      data: existingApplicationUser,
      error: applicationLookupError,
    } = await supabase
      .from("users")
      .select(
        "id,name,plan,trial_start,trial_end,subscription_end"
      )
      .eq("id", userId)
      .maybeSingle();

    if (applicationLookupError) {
      console.error(
        "Application user lookup error:",
        applicationLookupError
      );

      if (createdAuthUser) {
        await supabase.auth.admin.deleteUser(
          userId
        );
      }

      return res.status(500).json({
        success: false,
        error:
          "Could not verify application account.",
      });
    }

    if (existingApplicationUser) {
      const {
        error: applicationUpdateError,
      } = await supabase
        .from("users")
        .update({
          name:
            name ||
            existingApplicationUser.name ||
            email.split("@")[0],
          plan,
          trial_start:
            started.toISOString(),
          trial_end:
            ends.toISOString(),
          subscription_end: null,
        })
        .eq("id", userId);

      if (applicationUpdateError) {
        console.error(
          "Application user update error:",
          applicationUpdateError
        );

        return res.status(500).json({
          success: false,
          error:
            applicationUpdateError.message ||
            "Could not activate application account.",
        });
      }
    } else {
      const {
        error: applicationUserError,
      } = await supabase
        .from("users")
        .insert({
          id: userId,
          name:
            name ||
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

        if (createdAuthUser) {
          await supabase.auth.admin.deleteUser(
            userId
          );
        }

        return res.status(500).json({
          success: false,
          error:
            applicationUserError.message ||
            "Could not create application user.",
        });
      }

      createdApplicationUser = true;
    }

    /*
     * ==========================================
     * FINALIZE INVITE
     * ==========================================
     *
     * The conditional update prevents two
     * simultaneous submissions from consuming
     * the same invite.
     */

    const {
      data: updatedInvite,
      error: updateInviteError,
    } = await supabase
      .from("invites")
      .update({
        used_at:
          new Date().toISOString(),
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

      return res.status(500).json({
        success: false,
        error:
          "Could not finalize invite registration.",
      });
    }

    if (!updatedInvite) {
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
        reusedAuth:
          Boolean(existingAuthUser),
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
