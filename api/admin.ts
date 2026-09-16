import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "logicguild733@gmail.com";

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
      "Supabase server environment variables are missing. Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
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

function sendJson(
  res: any,
  status: number,
  data: any
) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  return res.json(data);
}

function getBearerToken(req: any) {
  const header =
    req.headers?.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

async function requireAdmin(
  req: any,
  res: any,
  supabase: any
) {
  const token = getBearerToken(req);

  if (!token) {
    sendJson(res, 401, {
      success: false,
      error: "Authentication required",
    });
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error(
      "Admin authentication error:",
      error
    );

    sendJson(res, 401, {
      success: false,
      error: "Invalid authentication",
    });

    return null;
  }

  if (
    (user.email || "").toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {
    sendJson(res, 403, {
      success: false,
      error: "Admin access denied",
    });

    return null;
  }

  return user;
}

function validPlan(plan: string) {
  return ["Basic", "Premium", "Gold"].includes(
    plan
  );
}

function addDays(
  date: Date,
  days: number
) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

function getStatus(user: any) {
  const now = new Date();

  const trialEnd = user.trial_end
    ? new Date(user.trial_end)
    : null;

  const subscriptionEnd =
    user.subscription_end
      ? new Date(user.subscription_end)
      : null;

  let status =
    user.subscription_status || "trial";

  if (status === "deactivated") {
    return "deactivated";
  }

  if (
    status === "trial" &&
    trialEnd &&
    trialEnd < now
  ) {
    return "expired";
  }

  if (
    status !== "cancelled" &&
    status !== "trial" &&
    subscriptionEnd &&
    subscriptionEnd < now
  ) {
    status = "expired";
  }

  return status;
}

function isUserActive(user: any) {
  const status = getStatus(user);

  return ![
    "expired",
    "cancelled",
    "deactivated",
  ].includes(status);
}

function getOrigin(req: any) {
  const forwardedHost =
    req.headers?.["x-forwarded-host"];

  const host =
    (Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : forwardedHost) ||
    req.headers?.host ||
    "";

  const forwardedProto =
    req.headers?.["x-forwarded-proto"];

  const protocol =
    (Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto) ||
    "https";

  return `${protocol}://${host}`;
}

export default async function handler(
  req: any,
  res: any
) {
  /*
   * Allow Vercel/browser preflight requests.
   */
  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,OPTIONS"
    );

    return res.status(204).end();
  }

  /*
   * Create Supabase client only when the
   * request actually reaches this function.
   * This prevents a module-load crash.
   */
  let supabase: any;

  try {
    supabase = getSupabase();
  } catch (error: any) {
    console.error(
      "Supabase configuration error:",
      error
    );

    return sendJson(res, 500, {
      success: false,
      error:
        error?.message ||
        "Supabase server configuration is missing",
    });
  }

  const admin = await requireAdmin(
    req,
    res,
    supabase
  );

  if (!admin) return;

  const action = String(
    req.query?.action || ""
  );

  try {
    /*
     * =========================
     * OVERVIEW
     * =========================
     */
    if (
      req.method === "GET" &&
      action === "overview"
    ) {
      const usersResult =
        await supabase
          .from("users")
          .select(
            "id,subscription_status,subscription_end,trial_end"
          );

      if (usersResult.error) {
        console.error(
          "Admin overview users error:",
          usersResult.error
        );

        return sendJson(res, 500, {
          success: false,
          error:
            usersResult.error.message,
        });
      }

      const allUsers =
        usersResult.data || [];

      const activeUsers =
        allUsers.filter(
          isUserActive
        ).length;

      /*
       * Secondary counts are deliberately
       * independent. If one optional table
       * has an issue, the Admin dashboard
       * still loads.
       */
      let demandLeads = 0;
      let supplyLeads = 0;
      let referralLinks = 0;
      let subscriptions = 0;

      const demandResult =
        await supabase
          .from("demand_lead")
          .select("id", {
            count: "exact",
            head: true,
          });

      if (!demandResult.error) {
        demandLeads =
          demandResult.count || 0;
      }

      const supplyResult =
        await supabase
          .from("supply_leads")
          .select("id", {
            count: "exact",
            head: true,
          });

      if (!supplyResult.error) {
        supplyLeads =
          supplyResult.count || 0;
      }

      const invitesResult =
        await supabase
          .from("invites")
          .select("id", {
            count: "exact",
            head: true,
          });

      if (!invitesResult.error) {
        referralLinks =
          invitesResult.count || 0;
      }

      const subscriptionsResult =
        await supabase
          .from("user_subscriptions")
          .select("id", {
            count: "exact",
            head: true,
          });

      if (!subscriptionsResult.error) {
        subscriptions =
          subscriptionsResult.count || 0;
      }

      return sendJson(res, 200, {
        success: true,
        overview: {
          users: allUsers.length,
          activeUsers,
          activeLeads:
            demandLeads +
            supplyLeads,
          demandLeads,
          supplyLeads,
          referralLinks,
          subscriptions,
          referrals: 0,
          resellers: 0,
          plans: [],
        },
      });
    }

    /*
     * =========================
     * USERS
     * =========================
     */
    if (
      req.method === "GET" &&
      action === "users"
    ) {
      const { data, error } =
        await supabase
          .from("users")
          .select(
            `
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
            `
          )
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        console.error(
          "Admin users error:",
          error
        );

        return sendJson(res, 500, {
          success: false,
          error: error.message,
        });
      }

      let authUsers: any[] = [];

      try {
        const authResult =
          await supabase.auth.admin.listUsers(
            {
              page: 1,
              perPage: 1000,
            }
          );

        if (!authResult.error) {
          authUsers =
            authResult.data?.users || [];
        }
      } catch (error) {
        console.warn(
          "Auth user lookup failed:",
          error
        );
      }

      const emailMap = new Map(
        authUsers.map((user: any) => [
          user.id,
          user.email || "",
        ])
      );

      const users = (data || []).map(
        (user: any) => {
          const status =
            getStatus(user);

          return {
            ...user,
            email:
              emailMap.get(user.id) ||
              user.email ||
              "",
            plan:
              user.plan || "Basic",
            status,
            is_active:
              isUserActive(user),
          };
        }
      );

      return sendJson(res, 200, {
        success: true,
        users,
      });
    }

    /*
     * =========================
     * LEADS
     * =========================
     */
    if (
      req.method === "GET" &&
      action === "leads"
    ) {
      const demandResult =
        await supabase
          .from("demand_lead")
          .select("*")
          .order("created_at", {
            ascending: false,
          })
          .limit(500);

      const supplyResult =
        await supabase
          .from("supply_leads")
          .select("*")
          .order("created_at", {
            ascending: false,
          })
          .limit(500);

      if (
        demandResult.error ||
        supplyResult.error
      ) {
        const error =
          demandResult.error ||
          supplyResult.error;

        return sendJson(res, 500, {
          success: false,
          error:
            error?.message ||
            "Failed to load leads",
        });
      }

      const demand =
        demandResult.data || [];

      const supply =
        supplyResult.data || [];

      return sendJson(res, 200, {
        success: true,
        leads: [
          ...demand.map(
            (lead: any) => ({
              ...lead,
              type: "Demand",
              title:
                lead.title ||
                lead.description ||
                "Demand opportunity",
              client_name:
                lead.client_name ||
                null,
              skill_needed:
                lead.skill_needed ||
                null,
            })
          ),
          ...supply.map(
            (lead: any) => ({
              ...lead,
              type: "Supply",
              title:
                lead.job_title ||
                lead.position ||
                "Supply opportunity",
              client_name:
                lead.company_name ||
                null,
              skill_needed:
                lead.required_skill ||
                null,
            })
          ),
        ],
        demand,
        supply,
        counts: {
          demand: demand.length,
          supply: supply.length,
        },
      });
    }

    /*
     * =========================
     * REFERRALS
     * =========================
     */
    if (
      req.method === "GET" &&
      action === "referrals"
    ) {
      const { data, error } =
        await supabase
          .from("referrals")
          .select(
            "id,referrer_id,referred_user_id,active"
          )
          .order("id", {
            ascending: false,
          });

      if (error) {
        return sendJson(res, 500, {
          success: false,
          error: error.message,
        });
      }

      return sendJson(res, 200, {
        success: true,
        referrals: data || [],
      });
    }

    /*
     * =========================
     * INVITES
     * =========================
     */
    if (
      req.method === "GET" &&
      (
        action === "invites" ||
        action === "links"
      )
    ) {
      const { data, error } =
        await supabase
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
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        return sendJson(res, 500, {
          success: false,
          error: error.message,
        });
      }

      return sendJson(res, 200, {
        success: true,
        invites: data || [],
        links: data || [],
      });
    }

    /*
     * =========================
     * SUBSCRIPTIONS
     * =========================
     */
    if (
      req.method === "GET" &&
      action === "subscriptions"
    ) {
      const { data, error } =
        await supabase
          .from("user_subscriptions")
          .select(
            "id,user_id,plan_id,created_at,skill_limit"
          )
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        return sendJson(res, 500, {
          success: false,
          error: error.message,
        });
      }

      return sendJson(res, 200, {
        success: true,
        subscriptions:
          data || [],
      });
    }

    /*
     * =========================
     * CREATE INVITE
     * =========================
     */
    if (
      req.method === "POST" &&
      action === "create_invite"
    ) {
      const body = req.body || {};

      const email = String(
        body.email || ""
      )
        .trim()
        .toLowerCase();

      const plan = String(
        body.plan || "Basic"
      );

      if (!email) {
        return sendJson(res, 400, {
          success: false,
          error: "Email is required",
        });
      }

      if (!validPlan(plan)) {
        return sendJson(res, 400, {
          success: false,
          error: "Invalid plan",
        });
      }

      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("invites")
        .select(
          "id,email,token,plan,used_at"
        )
        .eq("email", email)
        .maybeSingle();

      if (existingError) {
        return sendJson(res, 500, {
          success: false,
          error:
            existingError.message,
        });
      }

      if (existing) {
        return sendJson(res, 200, {
          success: true,
          invite: existing,
          user: {
            invite_code:
              existing.token,
          },
          invite_url:
            `${getOrigin(req)}/invite-register/${existing.token}`,
          message:
            "Invite already exists for this email.",
        });
      }

      const token =
        crypto
          .randomBytes(24)
          .toString("hex");

      const {
        data,
        error,
      } = await supabase
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
        return sendJson(res, 500, {
          success: false,
          error: error.message,
        });
      }

      return sendJson(res, 200, {
        success: true,
        invite: data,
        user: {
          invite_code: token,
        },
        invite_url:
          `${getOrigin(req)}/invite-register/${token}`,
      });
    }

    /*
     * =========================
     * USER ACTIONS
     * =========================
     */
    if (
      req.method === "POST" &&
      action === "set_user"
    ) {
      const body = req.body || {};

      const id = body.id;

      if (!id) {
        return sendJson(res, 400, {
          success: false,
          error:
            "User id is required",
        });
      }

      const requestedAction =
        typeof body.action ===
        "string"
          ? body.action
          : "";

      const newPlan =
        typeof body.plan ===
        "string"
          ? body.plan
          : undefined;

      const allowedActions = [
        "trial",
        "renew",
        "upgrade",
        "cancel",
        "deactivate",
        "activate",
      ];

      if (
        !allowedActions.includes(
          requestedAction
        )
      ) {
        return sendJson(res, 400, {
          success: false,
          error:
            "Invalid user action",
        });
      }

      if (
        newPlan &&
        !validPlan(newPlan)
      ) {
        return sendJson(res, 400, {
          success: false,
          error: "Invalid plan",
        });
      }

      const {
        data: currentUser,
        error: currentError,
      } = await supabase
        .from("users")
        .select(
          `
            id,
            plan,
            subscription_status,
            subscription_end,
            trial_start,
            trial_end
          `
        )
        .eq("id", id)
        .single();

      if (currentError) {
        return sendJson(res, 404, {
          success: false,
          error:
            currentError.message,
        });
      }

      const now = new Date();

      const updates: Record<
        string,
        any
      > = {};

      if (
        requestedAction === "trial"
      ) {
        updates.trial_start =
          now.toISOString();

        updates.trial_end =
          addDays(now, 14);

        updates.subscription_status =
          "trial";
      }

      if (
        requestedAction === "renew"
      ) {
        const currentEnd =
          currentUser.subscription_end
            ? new Date(
                currentUser.subscription_end
              )
            : now;

        const start =
          currentEnd > now
            ? currentEnd
            : now;

        updates.subscription_status =
          "active";

        updates.subscription_end =
          addDays(start, 30);
      }

      if (
        requestedAction === "upgrade"
      ) {
        if (!newPlan) {
          return sendJson(res, 400, {
            success: false,
            error:
              "New plan is required",
          });
        }

        updates.plan = newPlan;
        updates.subscription_status =
          "active";

        const currentEnd =
          currentUser.subscription_end
            ? new Date(
                currentUser.subscription_end
              )
            : null;

        if (
          !currentEnd ||
          currentEnd < now
        ) {
          updates.subscription_end =
            addDays(now, 30);
        }
      }

      if (
        requestedAction === "cancel"
      ) {
        updates.subscription_status =
          "cancelled";
      }

      if (
        requestedAction ===
        "deactivate"
      ) {
        updates.subscription_status =
          "deactivated";
      }

      if (
        requestedAction === "activate"
      ) {
        updates.subscription_status =
          "active";

        const currentEnd =
          currentUser.subscription_end
            ? new Date(
                currentUser.subscription_end
              )
            : null;

        if (
          !currentEnd ||
          currentEnd < now
        ) {
          updates.subscription_end =
            addDays(now, 30);
        }
      }

      /*
       * Allow plan to accompany an action.
       */
      if (newPlan) {
        updates.plan = newPlan;
      }

      const {
        data,
        error,
      } = await supabase
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

        return sendJson(res, 500, {
          success: false,
          error: error.message,
        });
      }

      return sendJson(res, 200, {
        success: true,
        user: {
          ...data,
          status:
            getStatus(data),
          is_active:
            isUserActive(data),
        },
      });
    }

    return sendJson(res, 404, {
      success: false,
      error:
        `Unknown admin action: ${action}`,
    });
  } catch (error: any) {
    console.error(
      "Admin API error:",
      error
    );

    return sendJson(res, 500, {
      success: false,
      error:
        error?.message ||
        "Admin request failed",
    });
  }
}
