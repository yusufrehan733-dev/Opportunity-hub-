import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "opportunity_hub_secret_key";

export interface JwtPayload {
  id: number;
  email: string;
  role?: string;
}

// ================= SIGN TOKEN =================
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// ================= VERIFY TOKEN =================
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// ================= AUTH MIDDLEWARE =================
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const cookieToken = (req as any).cookies?.token;

  const token =
    authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : cookieToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = verifyToken(token);

    // attach user to request
    (req as any).user = user;

    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
