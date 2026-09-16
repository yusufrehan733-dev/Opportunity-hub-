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
    throw new Error("Supabase server environment variables are missing.");
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

function sendJson(res: any, status: number, data: any) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  return res.json(data);
}

function getBearerToken(req: any) {
  const header = req.headers?.authorization || "";

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
    sendJson(res, 401, {
      success: false,
      error: "Invalid authentication",
    });
    return null;
  }

  if (
    String(user.email || "").toLowerCase() !==
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
  return ["Basic", "Premium", "Gold"].includes(plan);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

function getStatus(user: any) {
  const now = new Date();

  if (user.active === false) {
    return "inactive";
  }

  const trialEnd = user.trial_end
    ? new Date(user.trial_end)
    : null;

  const subscriptionEnd = user.subscription_end
    ? new Date(user.subscription_end)
    : null;

  if (trialEnd && trialEnd > now) {
    return "trial";
  }

  if (subscriptionEnd && subscriptionEnd > now) {
    return "active";
  }

  if (
    trialEnd &&
    trialEnd <= now &&
    (!subscriptionEnd || subscriptionEnd <= now)
  ) {
    return "expired";
  }

  return "inactive";
}

function isUserActive(user: any) {
  const status = getStatus(user);
  return status === "trial" || status === "active";
}

function getOrigin(req: any) {
  const forwardedHost = req.headers?.["x-forwarded-host"];

  const host =
    (Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : forwardedHost) ||
    req.headers?.host ||
    "";

  const forwardedProto = req.headers?.["x-forwarded-proto"];

  const protocol =
    (Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto) ||
    "https";

  return `${protocol}://${host}`;
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
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

  let supabase: any;

  try {
    supabase = getSupabase();
  } catch (error: any) {
    return sendJson(res, 500, {
      success: false,
      error:
        error?.message ||
        "Supabase configuration error",
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
    /* =========================
       OVERVIEW
    ========================= */

    if (
      req.method === "GET" &&
      action === "overview"
    ) {
      const {
        data: users,
        error: usersError,
      } = await supabase
        .from("users")
        .select(
          "id,name,plan,trial_start,trial_end,subscription_end,active"
        );

      if (usersError) {
        return sendJson(res, 500, {
          success: false,
          error: usersError.message,
        });
      }

      const allUsers = users || [];

      const activeUsers =
        allUsers.filter(isUserActive).length;

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
        demandLeads = demandResult.count || 0;
      }

      const supplyResult =
        await supabase
          .from("supply_leads")
          .select("id", {
            count: "exact",
            head: true,
          });

      if (!supplyResult.error) {
        supplyLeads = supplyResult.count || 0;
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

      /*
       * user_subscriptions is optional.
       * If it does not exist, overview still works.
       */
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
            demandLeads + supplyLeads,
          demandLeads,
          supplyLeads,
          referralLinks,
          subscriptions,
          referrals: 0,
          resellers: 0,
        },
      });
    }

    /* =========================
       USERS
    ========================= */

    if (
      req.method === "GET" &&
      action === "users"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("users")
        .select(
          "id,name,plan,trial_start,trial_end,subscription_end,active"
        );

      if (error) {
        return sendJson(res, 500, {
          success: false,
          error: error.message,
        });
      }

      let authUsers: any[] = [];

      try {
        const authResult =
          await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });

        if (!authResult.error) {
          authUsers =
            authResult.data?.users || [];
        }
      } catch {
        authUsers = [];
      }

      const emailMap = new Map(
        authUsers.map((user: any) => [
          user.id,
          user.email || "",
        ])
      );

      const users = (data || []).map(
        (user: any) => ({
          id: user.id,
          name:
            user.name || "Unnamed user",
          email:
            emailMap.get(user.id) ||
            "No email linked",
          plan:
            user.plan || "Basic",
          trial_start:
            user.trial_start || null,
          trial_end:
            user.trial_end || null,
          subscription_end:
            user.subscription_end || null,
          active:
            user.active === true,
          status:
            getStatus(user),
          is_active:
            isUserActive(user),
        })
      );

      return sendJson(res, 200, {
        success: true,
        users,
      });
    }

    /* =========================
       LEADS
    ========================= */

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
                lead.client_name || null,
              skill_needed:
                lead.skill_needed || null,
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
                lead.company_name || null,
              skill_needed:
                lead.required_skill || null,
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

    /* =========================
       REFERRALS
    ========================= */

    if (
      req.method === "GET" &&
      action === "referrals"
    ) {
      const {
        data,
        error,
      } = await supabase
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

    /* =========================
       INVITES / LINKS
    ========================= */

    if (
      req.method === "GET" &&
      (action === "invites" ||
        action === "links")
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("invites")
        .select(
          "id,email,token,name,phone,plan,trial_days,created_at,used_at,user_id"
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

    /* =========================
       SUBSCRIPTIONS
    ========================= */

    if (
      req.method === "GET" &&
      action === "subscriptions"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("users")
        .select(
          "id,name,plan,trial_start,trial_end,subscription_end,active"
        )
        .order("subscription_end", {
          ascending: false,
          nullsFirst: false,
        });

      if (error) {
        return sendJson(res, 500, {
          success: false,
          error: error.message,
        });
      }

      let authUsers: any[] = [];

      try {
        const authResult =
          await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });

        if (!authResult.error) {
          authUsers =
            authResult.data?.users || [];
        }
      } catch {
        authUsers = [];
      }

      const emailMap = new Map(
        authUsers.map((user: any) => [
          user.id,
          user.email || "",
        ])
      );

      const subscriptions =
        (data || []).map(
          (user: any) => ({
            id: user.id,
            user_id: user.id,
            name:
              user.name || "Unnamed user",
            email:
              emailMap.get(user.id) ||
              "No email linked",
            plan:
              user.plan || "Basic",
            status:
              getStatus(user),
            active:
              user.active === true,
            trial_start:
              user.trial_start || null,
            trial_end:
              user.trial_end || null,
            subscription_end:
              user.subscription_end || null,
          })
        );

      return sendJson(res, 200, {
        success: true,
        subscriptions,
      });
    }

    /* =========================
       CREATE CUSTOMER INVITE
    ========================= */

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

      /*
       * If an unused invite already exists,
       * return that valid invite instead
       * of creating duplicates.
       */
      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("invites")
        .select(
          "id,email,token,plan,used_at"
        )
        .eq("email", email)
        .is("used_at", null)
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
          invite_url:
            `${getOrigin(req)}/invite-register/${existing.token}`,
          message:
            "Valid invite already exists for this email.",
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
        invite_url:
          `${getOrigin(req)}/invite-register/${token}`,
      });
    }

    /* =========================
       USER / SUBSCRIPTION ACTIONS
    ========================= */

    if (
      req.method === "POST" &&
      action === "set_user"
    ) {
      const body = req.body || {};

      const id = body.id;

      if (!id) {
        return sendJson(res, 400, {
          success: false,
          error: "User id is required",
        });
      }

      const requestedAction =
        String(body.action || "");

      const newPlan =
        body.plan
          ? String(body.plan)
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
          error: "Invalid user action",
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
          "id,name,plan,trial_start,trial_end,subscription_end,active"
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

      const updates: Record<string, any> = {};

      if (requestedAction === "trial") {
        updates.trial_start =
          now.toISOString();

        updates.trial_end =
          addDays(now, 14);

        updates.subscription_end =
          null;

        updates.active = true;
      }

      if (requestedAction === "renew") {
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

        updates.subscription_end =
          addDays(start, 30);

        updates.active = true;
      }

      if (requestedAction === "upgrade") {
        if (!newPlan) {
          return sendJson(res, 400, {
            success: false,
            error:
              "New plan is required",
          });
        }

        updates.plan = newPlan;
        updates.active = true;

        const currentEnd =
          currentUser.subscription_end
            ? new Date(
                currentUser.subscription_end
              )
            : null;

        if (
          !currentEnd ||
          currentEnd <= now
        ) {
          updates.subscription_end =
            addDays(now, 30);
        }
      }

      if (requestedAction === "cancel") {
        updates.active = false;
      }

      if (requestedAction === "deactivate") {
        updates.active = false;
      }

      if (requestedAction === "activate") {
        updates.active = true;

        const currentEnd =
          currentUser.subscription_end
            ? new Date(
                currentUser.subscription_end
              )
            : null;

        if (
          !currentEnd ||
          currentEnd <= now
        ) {
          updates.subscription_end =
            addDays(now, 30);
        }
      }

      /*
       * If a plan was supplied,
       * apply it with the action.
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
        .select(
          "id,name,plan,trial_start,trial_end,subscription_end,active"
        )
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
      error: "Unknown admin action",
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
        "Internal server error",
    });
  }
                 }
