import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = "logicguild733@gmail.com";

function getBearerToken(req: any) {
  const header = req.headers?.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7);
}

async function requireAdmin(req: any, res: any) {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({
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
    res.status(401).json({
      success: false,
      error: "Invalid authentication",
    });
    return null;
  }

  if (
    (user.email || "").toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {
    res.status(403).json({
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

  return status;
}

function getOrigin(req: any) {
  const forwardedHost =
    req.headers?.["x-forwarded-host"] ||
    req.headers?.host;

  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost;

  const forwardedProto =
    req.headers?.["x-forwarded-proto"];

  const protocol =
    (Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto) || "https";

  return `${protocol}://${host}`;
}

export default async function handler(
  req: any,
  res: any
) {
  const admin = await requireAdmin(req, res);

  if (!admin) return;

  const action = String(
    req.query?.action || ""
  );

  try {
    /*
     * OVERVIEW
     */
    if (
      req.method === "GET" &&
      action === "overview"
    ) {
      const [
        usersResult,
        demandResult,
        supplyResult,
        invitesResult,
        subscriptionsResult,
      ] = await Promise.all([
        supabase
          .from("users")
          .select("id", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("demand_lead")
          .select("id", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("supply_leads")
          .select("id", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("invites")
          .select("id", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("user_subscriptions")
          .select("id", {
            count: "exact",
            head: true,
          }),
      ]);

      const firstError =
        usersResult.error ||
        demandResult.error ||
        supplyResult.error ||
        invitesResult.error ||
        subscriptionsResult.error;

      if (firstError) {
        console.error(
          "Admin overview error:",
          firstError
        );

        return res.status(500).json({
          success: false,
          error: firstError.message,
        });
      }

      return res.status(200).json({
        success: true,
        overview: {
          users: usersResult.count || 0,
          activeUsers: usersResult.count || 0,
          activeLeads:
            (demandResult.count || 0) +
            (supplyResult.count || 0),
          demandLeads:
            demandResult.count || 0,
          supplyLeads:
            supplyResult.count || 0,
          referralLinks:
            invitesResult.count || 0,
          subscriptions:
            subscriptionsResult.count || 0,
          referrals: 0,
          resellers: 0,
          plans: [],
        },
      });
    }

    /*
     * USERS
     *
     * Subscription/trial information comes from
     * the users table.
     */
    if (
      req.method === "GET" &&
      action === "users"
    ) {
      const { data, error } =
        await supabase
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
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        console.error(
          "Admin users error:",
          error
        );

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      /*
       * Get actual Supabase Auth emails.
       */
      let authUsers: any[] = [];

      try {
        const authResult =
          await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });

        if (!authResult.error) {
          authUsers =
            authResult.data.users || [];
        }
      } catch (authError) {
        console.warn(
          "Auth user lookup failed:",
          authError
        );
      }

      const emailMap = new Map(
        authUsers.map((u) => [
          u.id,
          u.email || "",
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
              status !== "expired" &&
              status !== "cancelled",
          };
        }
      );

      return res.status(200).json({
        success: true,
        users,
      });
    }

    /*
     * LEADS
     */
    if (
      req.method === "GET" &&
      action === "leads"
    ) {
      const [
        demandResult,
        supplyResult,
      ] = await Promise.all([
        supabase
          .from("demand_lead")
          .select("*")
          .order("created_at", {
            ascending: false,
          })
          .limit(500),

        supabase
          .from("supply_leads")
          .select("*")
          .order("created_at", {
            ascending: false,
          })
          .limit(500),
      ]);

      if (
        demandResult.error ||
        supplyResult.error
      ) {
        const error =
          demandResult.error ||
          supplyResult.error;

        console.error(
          "Admin leads error:",
          error
        );

        return res.status(500).json({
          success: false,
          error: error?.message ||
            "Failed to load leads",
        });
      }

      const demand =
        demandResult.data || [];

      const supply =
        supplyResult.data || [];

      return res.status(200).json({
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
    }

    /*
     * REFERRALS
     */
    if (
      req.method === "GET" &&
      action === "referrals"
    ) {
      const { data, error } =
        await supabase
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
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        referrals: data || [],
      });
    }

    /*
     * INVITES
     *
     * Supports both:
     * action=invites
     * action=links
     */
    if (
      req.method === "GET" &&
      (action === "invites" ||
        action === "links")
    ) {
      const { data, error } =
        await supabase
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
          error: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        invites: data || [],
        links: data || [],
      });
    }

    /*
     * SUBSCRIPTIONS
     */
    if (
      req.method === "GET" &&
      action === "subscriptions"
    ) {
      const { data, error } =
        await supabase
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
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        subscriptions: data || [],
      });
    }

    /*
     * CREATE INVITE
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
        return res.status(400).json({
          success: false,
          error: "Email is required",
        });
      }

      if (!validPlan(plan)) {
        return res.status(400).json({
          success: false,
          error: "Invalid plan",
        });
      }

      /*
       * One email = one invite.
       */
      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("invites")
        .select(
          "id, email, token, plan, used_at"
        )
        .eq("email", email)
        .maybeSingle();

      if (existingError) {
        console.error(
          "Existing invite lookup:",
          existingError
        );

        return res.status(500).json({
          success: false,
          error: existingError.message,
        });
      }

      if (existing) {
        return res.status(200).json({
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
        crypto.randomBytes(24).toString("hex");

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
        console.error(
          "Create invite error:",
          error
        );

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(200).json({
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
     * SET USER
     *
     * Supports:
     * trial
     * renew
     * upgrade
     * cancel
     * direct plan changes
     */
    if (
      req.method === "POST" &&
      action === "set_user"
    ) {
      const body = req.body || {};

      const id = body.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "User id is required",
        });
      }

      const newPlan =
        typeof body.plan === "string"
          ? body.plan
          : undefined;

      const requestedAction =
        typeof body.action === "string"
          ? body.action
          : "";

      if (
        newPlan &&
        !validPlan(newPlan)
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid plan",
        });
      }

      const {
        data: currentUser,
        error: currentError,
      } = await supabase
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

      if (currentError) {
        return res.status(404).json({
          success: false,
          error: currentError.message,
        });
      }

      const now = new Date();

      const updates: Record<
        string,
        any
      > = {};

      if (newPlan) {
        updates.plan = newPlan;
      }

      /*
       * TRIAL
       */
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

      /*
       * RENEW
       */
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

      /*
       * UPGRADE
       */
      if (
        requestedAction === "upgrade"
      ) {
        if (!newPlan) {
          return res.status(400).json({
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

      /*
       * CANCEL
       */
      if (
        requestedAction === "cancel"
      ) {
        updates.subscription_status =
          "cancelled";
      }

      /*
       * Existing Admin UI may send is_active.
       */
      if (
        typeof body.is_active ===
        "boolean"
      ) {
        if (body.is_active) {
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
        } else {
          updates.subscription_status =
            "cancelled";
        }
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

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          ...data,
          status: getStatus(data),
          is_active:
            getStatus(data) !==
              "expired" &&
            getStatus(data) !==
              "cancelled",
        },
      });
    }

    /*
     * Unknown action
     */
    return res.status(404).json({
      success: false,
      error:
        `Unknown admin action: ${action}`,
    });
  } catch (error: any) {
    console.error(
      "Admin API error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Admin request failed",
    });
  }
}
