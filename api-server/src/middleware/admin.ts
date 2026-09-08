import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "logicguild733@gmail.com";

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const email = req.user?.email?.toLowerCase().trim();

  if (!email) {
    return res.status(403).json({
      success: false,
      error: "Admin access denied",
    });
  }

  if (email !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      success: false,
      error: "Admin access denied",
    });
  }

  next();
}
