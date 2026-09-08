import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or anon key");
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const token = authorization.startsWith("Bearer ")
      ? authorization.substring(7)
      : authorization;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication token missing",
      });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired authentication token",
      });
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
        }
