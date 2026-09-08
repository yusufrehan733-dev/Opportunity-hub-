import express, { Response } from "express";
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
    "SUPABASE_SERVICE_ROLE_KEY is not configured. Admin database operations may be blocked by RLS."
  );
}

const adminSupabase = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

/*
 * Every admin endpoint requires:
 * 1. Valid Supabase authentication
 * 2. Server-side admin authorization
 */
router.use(
  requireAuth,
  requireAdmin
);

/**
 * GET /api/admin
 *
 * Basic admin authorization check.
 */
router.get(
  "/",
  (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      admin: true,
      user: {
        id: req.user.id,
        email: req.user.email,
      },
      message: "Admin API is working",
    });
  }
);

/**
 * GET /api/admin/overview
 *
 * Returns the core numbers needed by the Admin dashboard.
 */
router.get(
  "/overview",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      if (!adminSupabase) {
        return res.status(500).json({
          success: false,
          error: "Admin database service is not configured",
        });
      }

      const [
        usersResult,
        demandResult,
        supplyResult,
        referralsResult,
        invitesResult,
        subscriptionsResult,
        plansResult,
      ] = await Promise.all([
        adminSupabase
          .from("users")
          .select("id", { count: "exact", head: true }),

        adminSupabase
          .from("demand_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),

        adminSupabase
          .from("supply_leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),

        adminSupabase
          .from("referrals")
          .select("id", { count: "exact", head: true }),

        adminSupabase
          .from("invites")
          .select("id", { count: "exact", head: true }),

        adminSupabase
          .from("user_subscriptions")
          .select("id", { count: "exact", head: true }),

        adminSupabase
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

      if (errors.length > 0) {
        console.error("Admin overview database errors:", errors);

        return res.status(500).json({
          success: false,
          error: "Failed to load admin overview",
        });
      }

      res.json({
        success: true,
        overview: {
          users: usersResult.count || 0,

          activeLeads:
            (demandResult.count || 0) +
            (supplyResult.count || 0),

          demandLeads: demandResult.count || 0,
          supplyLeads: supplyResult.count || 0,

          referrals: referralsResult.count || 0,
          referralLinks: invitesResult.count || 0,

          subscriptions:
            subscriptionsResult.count || 0,

          plans: plansResult.data || [],
        },
      });
    } catch (error) {
      console.error("Admin overview error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to load admin overview",
      });
    }
  }
);

/**
 * GET /api/admin/users
 *
 * Returns users together with profile and subscription information.
 */
router.get(
  "/users",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      if (!adminSupabase) {
        return res.status(500).json({
          success: false,
          error: "Admin database service is not configured",
        });
      }

      const { data: users, error } =
        await adminSupabase
          .from("users")
          .select(`
            id,
            name,
            plan,
            subscription_status,
            subscription_end,
            subscription_app,
            trial_start,
            trial_end
          `)
          .order("id", {
            ascending: false,
          });

      if (error) {
        console.error(
          "Admin users error:",
          error
        );

        return res.status(500).json({
          success: false,
          error: "Failed to load users",
        });
      }

      res.json({
        success: true,
        users: users || [],
      });
    } catch (error) {
      console.error(
        "Admin users exception:",
        error
      );

      res.status(500).json({
        success: false,
        error: "Failed to load users",
      });
    }
  }
);

/**
 * GET /api/admin/leads
 *
 * Returns Demand and Supply leads separately.
 */
router.get(
  "/leads",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      if (!adminSupabase) {
        return res.status(500).json({
          success: false,
          error: "Admin database service is not configured",
        });
      }

      const [
        demandResult,
        supplyResult,
      ] = await Promise.all([
        adminSupabase
          .from("demand_leads")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        adminSupabase
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

      res.json({
        success: true,
        demand: demandResult.data || [],
        supply: supplyResult.data || [],
        counts: {
          demand:
            demandResult.data?.length || 0,
          supply:
            supplyResult.data?.length || 0,
        },
      });
    } catch (error) {
      console.error(
        "Admin leads exception:",
        error
      );

      res.status(500).json({
        success: false,
        error: "Failed to load leads",
      });
    }
  }
);

/**
 * GET /api/admin/referrals
 */
router.get(
  "/referrals",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      if (!adminSupabase) {
        return res.status(500).json({
          success: false,
          error: "Admin database service is not configured",
        });
      }

      const { data, error } =
        await adminSupabase
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

      res.json({
        success: true,
        referrals: data || [],
      });
    } catch (error) {
      console.error(
        "Admin referrals exception:",
        error
      );

      res.status(500).json({
        success: false,
        error: "Failed to load referrals",
      });
    }
  }
);

/**
 * GET /api/admin/invites
 *
 * Current referral-link/invite records.
 */
router.get(
  "/invites",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      if (!adminSupabase) {
        return res.status(500).json({
          success: false,
          error: "Admin database service is not configured",
        });
      }

      const { data, error } =
        await adminSupabase
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
          error: "Failed to load referral links",
        });
      }

      res.json({
        success: true,
        invites: data || [],
      });
    } catch (error) {
      console.error(
        "Admin invites exception:",
        error
      );

      res.status(500).json({
        success: false,
        error: "Failed to load referral links",
      });
    }
  }
);

/**
 * GET /api/admin/subscriptions
 */
router.get(
  "/subscriptions",
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      if (!adminSupabase) {
        return res.status(500).json({
          success: false,
          error: "Admin database service is not configured",
        });
      }

      const { data, error } =
        await adminSupabase
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
          error: "Failed to load subscriptions",
        });
      }

      res.json({
        success: true,
        subscriptions: data || [],
      });
    } catch (error) {
      console.error(
        "Admin subscriptions exception:",
        error
      );

      res.status(500).json({
        success: false,
        error: "Failed to load subscriptions",
      });
    }
  }
);

export default router;
