import express, { Response } from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  AuthenticatedRequest,
  requireAuth,
} from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = express.Router();

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing Supabase URL");
}

if (!serviceRoleKey) {
  console.warn(
    "SUPABASE_SERVICE_ROLE_KEY is not configured. Admin database operations may fail."
  );
}

const adminSupabase = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

router.use(requireAuth, requireAdmin);

function requireDatabase(res: Response) {
  if (!adminSupabase) {
    res.status(500).json({
      success: false,
      error: "Admin database service is not configured",
    });
    return false;
  }

  return true;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

/*
 * Convert the users table row into the shape used by the Admin UI.
 */
function formatUser(user: any, authEmail?: string | null) {
  const now = new Date();

  const trialEnd = user.trial_end
    ? new Date(user.trial_end)
    : null;

  const subscriptionEnd = user.subscription_end
    ? new Date(user.subscription_end)
    : null;

  let status = user.subscription_status || "trial";

  if (
    status !== "cancelled" &&
    subscriptionEnd &&
    subscriptionEnd < now &&
    (!trialEnd || trialEnd < now)
  ) {
    status = "expired";
  }

  if (
    status === "trial" &&
    trialEnd &&
    trialEnd < now
  ) {
    status = "expired";
  }

  return {
    ...user,
    email: authEmail || user.email || "",
    invite_code: user.invite_code || null,
    plan: user.plan || "Basic",
    is_active:
      status !== "expired" &&
      status !== "cancelled",
    status,
  };
}

/*
 * GET /api/admin
 *
 * Also supports the frontend's:
 * /api/admin?action=overview
 */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response) => {
    const action =
      typeof req.query.action === "string"
        ? req.query.action
        : "";

    try {
      if (!action) {
        return res.json({
          success: true,
          admin: true,
          user: {
            id: req.user.id,
            email: req.user.email,
          },
          message: "Admin API is working",
        });
      }

      if (action === "overview") {
        return overviewHandler(req, res);
      }

      if (action === "users") {
        return usersHandler(req, res);
      }

      if (action === "leads") {
        return leadsHandler(req, res);
      }

      if (action === "referrals") {
        return referralsHandler(req, res);
      }

      if (action === "invites") {
        return invitesHandler(req, res);
      }

      if (action === "subscriptions") {
        return subscriptionsHandler(req, res);
      }

      return res.status(400).json({
        success: false,
        error: `Unknown admin action: ${action}`,
      });
    } catch (error) {
      console.error("Admin action error:", error);

      return res.status(500).json({
        success: false,
        error: "Admin request failed",
      });
    }
  }
);

/*
 * OVERVIEW
 */
async function overviewHandler(
  _req: AuthenticatedRequest,
  res: Response
) {
  if (!requireDatabase(res)) return;

  try {
    const [
      usersResult,
      demandResult,
      supplyResult,
      referralsResult,
      invitesResult,
      subscriptionsResult,
      plansResult,
    ] = await Promise.all([
      adminSupabase!
        .from("users")
        .select("id", {
          count: "exact",
          head: true,
        }),

      /*
       * IMPORTANT:
       * Actual table is demand_lead, not demand_leads.
       */
      adminSupabase!
        .from("demand_lead")
        .select("id", {
          count: "exact",
          head: true,
        }),

      adminSupabase!
        .from("supply_leads")
        .select("id", {
          count: "exact",
          head: true,
        }),

      adminSupabase!
        .from("referrals")
        .select("id", {
          count: "exact",
          head: true,
        }),

      adminSupabase!
        .from("invites")
        .select("id", {
          count: "exact",
          head: true,
        }),

      adminSupabase!
        .from("user_subscriptions")
        .select("id", {
          count: "exact",
          head: true,
        }),

      adminSupabase!
        .from("plans")
        .select("*"),
    ]);

    const errors = [
      usersResult.error,
      demandResult.error,
      supplyResult.error,
      referralsResult.error,
      invitesResult.error,
      subscriptionsResult.error,
      plansResult.error,
    ].filter(Boolean);

    if (errors.length) {
      console.error("Admin overview errors:", errors);

      return res.status(500).json({
        success: false,
        error:
          "Admin database tables are not configured correctly.",
      });
    }

    return res.json({
      success: true,
      overview: {
        users: usersResult.count || 0,
        activeUsers: usersResult.count || 0,
        activeLeads:
          (demandResult.count || 0) +
          (supplyResult.count || 0),
        demandLeads: demandResult.count || 0,
        supplyLeads: supplyResult.count || 0,
        referrals: referralsResult.count || 0,
        referralLinks: invitesResult.count || 0,
        subscriptions:
          subscriptionsResult.count || 0,
        resellers: 0,
        plans: plansResult.data || [],
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to load admin overview",
    });
  }
}

router.get(
  "/overview",
  overviewHandler
);

/*
 * USERS
 */
async function usersHandler(
  _req: AuthenticatedRequest,
  res: Response
) {
  if (!requireDatabase(res)) return;

  try {
    const { data, error } =
      await adminSupabase!
        .from("users")
        .select(`
          id,
          name,
          plan,
          subscription_status,
          subscription_end,
          subscription_app,
          trial_start,
          trial_end,
          invite_code,
          created_at
        `)
        .order("id", {
          ascending: false,
        });

    if (error) {
      console.error("Admin users error:", error);

      return res.status(500).json({
        success: false,
        error: "Failed to load users",
      });
    }

    /*
     * Get auth emails so Admin can display the actual login email
     * even if the public users table does not store it.
     */
    let authUsers: any[] = [];

    try {
      const authResult =
        await adminSupabase!.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (!authResult.error) {
        authUsers = authResult.data.users || [];
      }
    } catch (authError) {
      console.warn(
        "Could not load Auth users:",
        authError
      );
    }

    const emailMap = new Map(
      authUsers.map((user) => [
        user.id,
        user.email || "",
      ])
    );

    const users = (data || []).map((user) =>
      formatUser(
        user,
        emailMap.get(user.id) || null
      )
    );

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Admin users exception:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to load users",
    });
  }
}

router.get(
  "/users",
  usersHandler
);

/*
 * CREATE INVITE
 *
 * One email = one invite.
 * The token becomes the user's unique registration link.
 */
async function createInviteHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!requireDatabase(res)) return;

  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const plan =
      typeof req.body?.plan === "string"
        ? req.body.plan
        : "Basic";

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const allowedPlans = [
      "Basic",
      "Premium",
      "Gold",
    ];

    if (!allowedPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        error: "Invalid plan",
      });
    }

    const { data: existingInvite } =
      await adminSupabase!
        .from("invites")
        .select("id, token, email, plan")
        .eq("email", email)
        .maybeSingle();

    if (existingInvite) {
      return res.json({
        success: true,
        user: {
          invite_code: existingInvite.token,
        },
        invite: existingInvite,
        message: "Invite already exists for this email.",
      });
    }

    const token = crypto.randomBytes(24).toString("hex");

    const { data, error } =
      await adminSupabase!
        .from("invites")
        .insert({
          email,
          token,
          plan,
          trial_days: 14,
        })
        .select()
        .single();

    if (error) {
      console.error(
        "Create invite error:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "Could not create invite",
      });
    }

    return res.json({
      success: true,
      invite: data,
      user: {
        invite_code: token,
      },
    });
  } catch (error) {
    console.error(
      "Create invite exception:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Could not create invite",
    });
  }
}

/*
 * SET USER
 *
 * Supports:
 * - plan change
 * - renew
 * - cancel
 * - upgrade
 * - trial
 */
async function setUserHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!requireDatabase(res)) return;

  try {
    const id = req.body?.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    const plan =
      typeof req.body?.plan === "string"
        ? req.body.plan
        : undefined;

    const action =
      typeof req.body?.action === "string"
        ? req.body.action
        : "";

    const now = new Date();

    const { data: currentUser, error: userError } =
      await adminSupabase!
        .from("users")
        .select(`
          id,
          plan,
          subscription_status,
          subscription_end,
          trial_start,
          trial_end
        `)
        .eq("id", id)
        .single();

    if (userError || !currentUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const updates: Record<string, any> = {};

    if (plan) {
      const allowedPlans = [
        "Basic",
        "Premium",
        "Gold",
      ];

      if (!allowedPlans.includes(plan)) {
        return res.status(400).json({
          success: false,
          error: "Invalid plan",
        });
      }

      updates.plan = plan;
    }

    /*
     * Cancel
     */
    if (action === "cancel") {
      updates.subscription_status =
        "cancelled";
    }

    /*
     * Renew
     *
     * 30-day subscription.
     * If an existing subscription is still active,
     * add 30 days from its current end.
     */
    if (action === "renew") {
      const existingEnd =
        currentUser.subscription_end
          ? new Date(
              currentUser.subscription_end
            )
          : now;

      const startFrom =
        existingEnd > now
          ? existingEnd
          : now;

      updates.subscription_status = "active";
      updates.subscription_end =
        addDays(startFrom, 30);
    }

    /*
     * Upgrade
     *
     * Upgrade is a plan change while keeping access active.
     */
    if (action === "upgrade") {
      if (!plan) {
        return res.status(400).json({
          success: false,
          error: "New plan is required for upgrade",
        });
      }

      updates.plan = plan;
      updates.subscription_status =
        "active";

      if (
        !currentUser.subscription_end ||
        new Date(
          currentUser.subscription_end
        ) < now
      ) {
        updates.subscription_end =
          addDays(now, 30);
      }
    }

    /*
     * Start / reset trial.
     */
    if (action === "trial") {
      updates.trial_start =
        now.toISOString();

      updates.trial_end =
        addDays(now, 14);

      updates.subscription_status =
        "trial";

      if (!plan) {
        updates.plan =
          currentUser.plan || "Basic";
      }
    }

    /*
     * Direct active toggle from the existing Admin UI.
     */
    if (
      typeof req.body?.is_active ===
      "boolean"
    ) {
      if (req.body.is_active) {
        updates.subscription_status =
          "active";

        if (
          !currentUser.subscription_end ||
          new Date(
            currentUser.subscription_end
          ) < now
        ) {
          updates.subscription_end =
            addDays(now, 30);
        }
      } else {
        updates.subscription_status =
          "cancelled";
      }
    }

    const { data, error } =
      await adminSupabase!
        .from("users")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
      console.error(
        "Set user error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Could not update user subscription",
      });
    }

    return res.json({
      success: true,
      user: data,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error(
      "Set user exception:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Could not update user subscription",
    });
  }
}

/*
 * POST /api/admin?action=create_invite
 * POST /api/admin?action=set_user
 */
router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response) => {
    const action =
      typeof req.query.action === "string"
        ? req.query.action
        : "";

    if (action === "create_invite") {
      return createInviteHandler(req, res);
    }

    if (action === "set_user") {
      return setUserHandler(req, res);
    }

    return res.status(400).json({
      success: false,
      error: "Unknown admin action",
    });
  }
);

/*
 * LEADS
 */
async function leadsHandler(
  _req: AuthenticatedRequest,
  res: Response
) {
  if (!requireDatabase(res)) return;

  try {
    const [
      demandResult,
      supplyResult,
    ] = await Promise.all([
      adminSupabase!
        .from("demand_lead")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),

      adminSupabase!
        .from("supply_leads")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (
      demandResult.error ||
      supplyResult.error
    ) {
      console.error(
        "Admin leads error:",
        demandResult.error,
        supplyResult.error
      );

      return res.status(500).json({
        success: false,
        error: "Failed to load leads",
      });
    }

    const demand =
      demandResult.data || [];

    const supply =
      supplyResult.data || [];

    return res.json({
      success: true,
      leads: [
        ...demand.map((lead: any) => ({
          ...lead,
          type: "Demand",
          title:
            lead.title ||
            lead.description ||
            "Demand opportunity",
          client_name:
            lead.client_name || null,
          skill_needed:
            lead.skill_needed || null,
        })),

        ...supply.map((lead: any) => ({
          ...lead,
          type: "Supply",
          title:
            lead.job_title ||
            lead.position ||
            "Supply opportunity",
          client_name:
            lead.company_name || null,
          skill_needed:
            lead.required_skill || null,
        })),
      ],

      demand,
      supply,

      counts: {
        demand: demand.length,
        supply: supply.length,
      },
    });
  } catch (error) {
    console.error(
      "Admin leads exception:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to load leads",
    });
  }
}

router.get(
  "/leads",
  leadsHandler
);

/*
 * REFERRALS
 */
async function referralsHandler(
  _req: AuthenticatedRequest,
  res: Response
) {
  if (!requireDatabase(res)) return;

  try {
    const { data, error } =
      await adminSupabase!
        .from("referrals")
        .select(`
          id,
          referrer_id,
          referred_user_id,
          active
        `)
        .order("id", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Admin referrals error:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "Failed to load referrals",
      });
    }

    return res.json({
      success: true,
      referrals: data || [],
    });
  } catch (error) {
    console.error(
      "Admin referrals exception:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to load referrals",
    });
  }
}

router.get(
  "/referrals",
  referralsHandler
);

/*
 * INVITES / REFERRAL LINKS
 */
async function invitesHandler(
  _req: AuthenticatedRequest,
  res: Response
) {
  if (!requireDatabase(res)) return;

  try {
    const { data, error } =
      await adminSupabase!
        .from("invites")
        .select(`
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
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Admin invites error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to load referral links",
      });
    }

    return res.json({
      success: true,
      invites: data || [],
    });
  } catch (error) {
    console.error(
      "Admin invites exception:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Failed to load referral links",
    });
  }
}

router.get(
  "/invites",
  invitesHandler
);

/*
 * SUBSCRIPTIONS
 */
async function subscriptionsHandler(
  _req: AuthenticatedRequest,
  res: Response
) {
  if (!requireDatabase(res)) return;

  try {
    const { data, error } =
      await adminSupabase!
        .from("user_subscriptions")
        .select(`
          id,
          user_id,
          plan_id,
          created_at,
          skill_limit
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Admin subscriptions error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to load subscriptions",
      });
    }

    return res.json({
      success: true,
      subscriptions: data || [],
    });
  } catch (error) {
    console.error(
      "Admin subscriptions exception:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Failed to load subscriptions",
    });
  }
}

router.get(
  "/subscriptions",
  subscriptionsHandler
);

export default router;
