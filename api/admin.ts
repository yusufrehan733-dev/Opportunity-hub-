import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = "logicguild733@gmail.com";

function getBearerToken(req: any) {
  const header = req.headers?.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
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

  if ((user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
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

export default async function handler(req: any, res: any) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const action = String(req.query?.action || "");

  try {
    if (req.method === "GET" && action === "overview") {
      const [{ count: users }, { count: activeUsers }, { count: activeLeads }] =
        await Promise.all([
          supabase
            .from("allowed_users")
            .select("id", { count: "exact", head: true }),

          supabase
            .from("allowed_users")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),

          supabase
            .from("demand_leads")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
        ]);

      return res.status(200).json({
        success: true,
        overview: {
          users: users || 0,
          activeUsers: activeUsers || 0,
          activeLeads: activeLeads || 0,
          resellers: 0,
        },
      });
    }

    if (req.method === "GET" && action === "users") {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("id, email, invite_code, plan, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        users: data || [],
      });
    }

    if (req.method === "GET" && action === "leads") {
      const { data, error } = await supabase
        .from("demand_leads")
        .select(
          "id, type, source, client_name, skill_needed, description, contact_email, contact_phone, contact_name, title, country, city, budget, currency, created_at, status, category, subcategory"
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        leads: data || [],
      });
    }

    if (req.method === "GET" && action === "links") {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("id, email, invite_code, plan, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        users: data || [],
      });
    }

    if (req.method === "POST" && action === "create_invite") {
      const body = req.body || {};
      const email = String(body.email || "").trim().toLowerCase();
      const plan = String(body.plan || "Basic");

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

      const { data: existing, error: existingError } = await supabase
        .from("allowed_users")
        .select("id, email, invite_code, plan, is_active")
        .eq("email", email)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        if (existing.is_active) {
          return res.status(409).json({
            success: false,
            error: "An active invite already exists for this email",
          });
        }

        const inviteCode = `OH-${crypto.randomUUID()
          .replace(/-/g, "")
          .slice(0, 12)
          .toUpperCase()}`;

        const { data: updated, error: updateError } = await supabase
          .from("allowed_users")
          .update({
            invite_code: inviteCode,
            plan,
            is_active: true,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return res.status(200).json({
          success: true,
          user: updated,
          invite_url: `${getOrigin(req)}/invite-register/${inviteCode}`,
        });
      }

      const inviteCode = `OH-${crypto.randomUUID()
        .replace(/-/g, "")
        .slice(0, 12)
        .toUpperCase()}`;

      const { data, error } = await supabase
        .from("allowed_users")
        .insert({
          email,
          invite_code: inviteCode,
          plan,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        user: data,
        invite_url: `${getOrigin(req)}/invite-register/${inviteCode}`,
      });
    }

    if (req.method === "POST" && action === "set_user") {
      const body = req.body || {};
      const id = body.id;
      const plan = String(body.plan || "Basic");
      const isActive = Boolean(body.is_active);

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "User id is required",
        });
      }

      if (!validPlan(plan)) {
        return res.status(400).json({
          success: false,
          error: "Invalid plan",
        });
      }

      const { data, error } = await supabase
        .from("allowed_users")
        .update({
          plan,
          is_active: isActive,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        user: data,
      });
    }

    return res.status(404).json({
      success: false,
      error: "Unknown admin action",
    });
  } catch (error: any) {
    console.error("Admin API error:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Admin request failed",
    });
  }
}

function getOrigin(req: any) {
  const forwardedHost =
    req.headers?.["x-forwarded-host"] || req.headers?.host;

  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost;

  const forwardedProto = req.headers?.["x-forwarded-proto"];

  const protocol =
    (Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto) || "https";

  return `${protocol}://${host}`;
}
