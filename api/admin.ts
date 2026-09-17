import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "logicguild733@gmail.com";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

function sendJson(
  res: any,
  status: number,
  data: any
) {
  res.status(status);
  res.setHeader(
    "Content-Type",
    "application/json"
  );
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
  return ["Basic", "Premium", "Gold"].includes(
    plan
  );
}

function addDays(
  date: Date,
  days: number
) {
  const result = new Date(date);
  result.setDate(
    result.getDate() + days
  );
  return result.toISOString();
}

/*
 * IMPORTANT:
 * We deliberately do NOT select users.active here.
 * Status is calculated from trial_end/subscription_end.
 */
function getStatus(user: any) {
  const now = new Date();

  const trialEnd = user.trial_end
    ? new Date(user.trial_end)
    : null;

  const subscriptionEnd =
    user.subscription_end
      ? new Date(user.subscription_end)
      : null;

  if (
    subscriptionEnd &&
    subscriptionEnd > now
  ) {
    return "active";
  }

  if (
    trialEnd &&
    trialEnd > now
  ) {
    return "trial";
  }

  if (
    trialEnd &&
    trialEnd <= now
  ) {
    return "expired";
  }

  return "inactive";
}

function isUserActive(user: any) {
  const status = getStatus(user);

  return (
    status === "trial" ||
    status === "active"
  );
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

async function getUsers(
  supabase: any
) {
  /*
   * These are the actual users columns we established.
   * Do NOT add active here.
   */
  const {
    data,
    error,
  } = await supabase
    .from("users")
    .select(
      "id,name,plan,trial_start,trial_end,subscription_end"
    )
    .order("trial_start", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  const authUsers: Record<
    string,
    string
  > = {};

  try {
    let page = 1;

    while (true) {
      const result =
        await supabase.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (result.error) {
        break;
      }

      const authList =
        result.data?.users || [];

      for (const authUser of authList) {
        if (authUser.id) {
          authUsers[authUser.id] =
            authUser.email || "";
        }
      }

      if (authList.length < 1000) {
        break;
      }

      page++;
    }
  } catch {
    // Auth email lookup is optional.
  }

  return (data || []).map(
    (user: any) => {
      const status =
        getStatus(user);

      return {
        id: user.id,
        email:
          authUsers[user.id] ||
          "No email linked",
        name: user.name || null,
        plan: user.plan || "Basic",
        status,
        is_active:
          isUserActive(user),
        subscription_end:
          user.subscription_end ||
          null,
        trial_start:
          user.trial_start || null,
        trial_end:
          user.trial_end || null,
      };
    }
  );
}

export default async function handler(
  req: any,
  res: any
) {
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

  const supabase = getSupabase();

  const admin =
    await requireAdmin(
      req,
      res,
      supabase
    );

  if (!admin) {
    return;
  }

  const action =
    String(
      req.query?.action || ""
    ).trim();

  try {
    /*
     * OVERVIEW
     */
    if (action === "overview") {
      const users =
        await getUsers(
          supabase
        );

      const activeUsers =
        users.filter(
          (user: any) =>
            user.is_active
        ).length;

      const {
        count: demandCount,
        error: demandError,
      } = await supabase
        .from("demand_lead")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (demandError) {
        throw demandError;
      }

      const {
        count: supplyCount,
        error: supplyError,
      } = await supabase
        .from("supply_leads")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (supplyError) {
        throw supplyError;
      }

      let referralCount = 0;

      const referralResult =
        await supabase
          .from("referrals")
          .select("*", {
            count: "exact",
            head: true,
          });

      if (!referralResult.error) {
        referralCount =
          referralResult.count || 0;
      }

      let inviteCount = 0;

      const inviteResult =
        await supabase
          .from("invites")
          .select("*", {
            count: "exact",
            head: true,
          });

      if (!inviteResult.error) {
        inviteCount =
          inviteResult.count || 0;
      }

      return sendJson(
        res,
        200,
        {
          success: true,
          overview: {
            users: users.length,
            activeUsers,
            activeLeads:
              (demandCount || 0) +
              (supplyCount || 0),
            resellers: 0,
            demandLeads:
              demandCount || 0,
            supplyLeads:
              supplyCount || 0,
            referrals:
              referralCount,
            referralLinks:
              inviteCount,
            subscriptions:
              users.filter(
                (user: any) =>
                  user.status ===
                  "active"
              ).length,
          },
        }
      );
    }

    /*
     * USERS
     */
    if (action === "users") {
      const users =
        await getUsers(
          supabase
        );

      return sendJson(
        res,
        200,
        {
          success: true,
          users,
        }
      );
    }

    /*
     * LEADS
     */
    if (action === "leads") {
      const [
        demandResult,
        supplyResult,
      ] = await Promise.all([
        supabase
          .from("demand_lead")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(500),

        supabase
          .from("supply_leads")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(500),
      ]);

      if (demandResult.error) {
        throw demandResult.error;
      }

      if (supplyResult.error) {
        throw supplyResult.error;
      }

      const demand =
        (demandResult.data || [])
          .map(
            (lead: any) => ({
              ...lead,
              type: "demand",
            })
          );

      const supply =
        (supplyResult.data || [])
          .map(
            (lead: any) => ({
              ...lead,
              type: "supply",
            })
          );

      const leads = [
        ...demand,
        ...supply,
      ];

      return sendJson(
        res,
        200,
        {
          success: true,
          leads,
          demand,
          supply,
          count: leads.length,
        }
      );
    }

    /*
     * REFERRALS
     */
    if (action === "referrals") {
      const {
        data,
        error,
      } = await supabase
        .from("referrals")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      return sendJson(
        res,
        200,
        {
          success: true,
          referrals:
            data || [],
        }
      );
    }

    /*
     * INVITES / REFERRAL LINKS
     */
    if (
      action === "invites" ||
      action === "links"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("invites")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      return sendJson(
        res,
        200,
        {
          success: true,
          invites:
            data || [],
        }
      );
    }

    /*
     * CREATE INVITE
     */
    if (
      action === "create_invite"
    ) {
      const body =
        req.body || {};

      const email =
        String(
          body.email || ""
        )
          .trim()
          .toLowerCase();

      const plan =
        String(
          body.plan || "Basic"
        );

      if (!email) {
        return sendJson(
          res,
          400,
          {
            success: false,
            error:
              "Email is required.",
          }
        );
      }

      if (!validPlan(plan)) {
        return sendJson(
          res,
          400,
          {
            success: false,
            error:
              "Invalid plan.",
          }
        );
      }

      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("invites")
        .select("*")
        .eq("email", email)
        .is("used_at", null)
        .limit(1)
        .maybeSingle();

      if (
        existingError &&
        !existingError.message
          .toLowerCase()
          .includes("no rows")
      ) {
        throw existingError;
      }

      if (existing) {
        const inviteUrl =
          `${getOrigin(req)}/invite-register/` +
          encodeURIComponent(
            existing.token
          );

        return sendJson(
          res,
          200,
          {
            success: true,
            invite: existing,
            invite_url:
              inviteUrl,
          }
        );
      }

      const token =
        crypto.randomBytes(24)
          .toString("hex");

      const {
        data: invite,
        error,
      } = await supabase
        .from("invites")
        .insert({
          email,
          token,
          plan,
          trial_days: 14,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const inviteUrl =
        `${getOrigin(req)}/invite-register/` +
        encodeURIComponent(
          token
        );

      return sendJson(
        res,
        200,
        {
          success: true,
          invite,
          invite_url:
            inviteUrl,
        }
      );
    }

    /*
     * USER PLAN / ACCESS CONTROL
     */
    if (
      action === "set_user"
    ) {
      const body =
        req.body || {};

      const id =
        String(
          body.id || ""
        ).trim();

      const userAction =
        String(
          body.action || ""
        ).trim();

      const plan =
        body.plan
          ? String(body.plan)
          : null;

      if (!id) {
        return sendJson(
          res,
          400,
          {
            success: false,
            error:
              "User ID is required.",
          }
        );
      }

      const {
        data: user,
        error: userError,
      } = await supabase
        .from("users")
        .select(
          "id,name,plan,trial_start,trial_end,subscription_end"
        )
        .eq("id", id)
        .single();

      if (userError) {
        throw userError;
      }

      const now =
        new Date();

      let updates: Record<
        string,
        any
      > = {};

      if (
        userAction === "trial"
      ) {
        updates = {
          trial_start:
            now.toISOString(),
          trial_end:
            addDays(now, 14),
          subscription_end:
            null,
        };
      } else if (
        userAction === "renew"
      ) {
        const start =
          user.subscription_end &&
          new Date(
            user.subscription_end
          ) > now
            ? new Date(
                user.subscription_end
              )
            : now;

        updates = {
          subscription_end:
            addDays(start, 30),
        };
      } else if (
        userAction === "upgrade"
      ) {
        if (
          !plan ||
          !validPlan(plan)
        ) {
          return sendJson(
            res,
            400,
            {
              success: false,
              error:
                "Valid plan is required.",
            }
          );
        }

        updates = {
          plan,
          subscription_end:
            addDays(now, 30),
        };
      } else if (
        userAction === "cancel"
      ) {
        updates = {
          subscription_end:
            null,
        };
      } else if (
        userAction === "deactivate"
      ) {
        /*
         * We don't touch users.active because
         * the database/API currently reports that
         * column as unavailable.
         *
         * Expiring access is represented by dates.
         */
        updates = {
          trial_end:
            now.toISOString(),
          subscription_end:
            null,
        };
      } else if (
        userAction === "activate"
      ) {
        updates = {
          subscription_end:
            addDays(now, 30),
        };
      } else {
        return sendJson(
          res,
          400,
          {
            success: false,
            error:
              "Unknown user action.",
          }
        );
      }

      const {
        data: updatedUser,
        error: updateError,
      } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id)
        .select(
          "id,name,plan,trial_start,trial_end,subscription_end"
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      return sendJson(
        res,
        200,
        {
          success: true,
          user: {
            ...updatedUser,
            status:
              getStatus(
                updatedUser
              ),
            is_active:
              isUserActive(
                updatedUser
              ),
          },
        }
      );
    }

    /*
     * Unknown action
     */
    return sendJson(
      res,
      400,
      {
        success: false,
        error:
          "Unknown admin action.",
      }
    );
  } catch (error: any) {
    console.error(
      "Admin API error:",
      error
    );

    return sendJson(
      res,
      500,
      {
        success: false,
        error:
          error?.message ||
          "Admin API failed.",
      }
    );
  }
}
