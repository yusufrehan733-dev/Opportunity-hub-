import express, { Response } from "express";
import {
  AuthenticatedRequest,
  requireAuth,
} from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = express.Router();

/**
 * All admin routes require:
 * 1. A valid Supabase access token
 * 2. The configured admin email
 */
router.use(
  requireAuth,
  requireAdmin
);

/**
 * Admin health / authorization check
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

export default router;
