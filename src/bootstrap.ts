import bcrypt from "bcryptjs";
import { db, freelancersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const ADMIN_EMAIL = "logicguild733@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "12345678";
const ADMIN_NAME = "Admin";

function generateReferralCode(id: number): string {
  return `OH-${id}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function ensureAdminAccount(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: freelancersTable.id, role: freelancersTable.role })
      .from(freelancersTable)
      .where(eq(freelancersTable.email, ADMIN_EMAIL))
      .limit(1);

    if (existing) {
      if (existing.role !== "admin") {
        await db
          .update(freelancersTable)
          .set({ role: "admin" })
          .where(eq(freelancersTable.id, existing.id));
        console.log("[Bootstrap] Admin role updated for:", ADMIN_EMAIL);
      } else {
        console.log("[Bootstrap] Admin account OK:", ADMIN_EMAIL);
      }
      return;
    }

    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const [user] = await db
      .insert(freelancersTable)
      .values({
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        password_hash,
        role: "admin",
        subscription_status: "active",
        subscription_plan: "gold",
      })
      .returning();

    const referral_code = generateReferralCode(user.id);
    await db
      .update(freelancersTable)
      .set({ referral_code })
      .where(eq(freelancersTable.id, user.id));

    console.log("[Bootstrap] Admin account created:", ADMIN_EMAIL);
  } catch (err) {
    console.error("[Bootstrap] ensureAdminAccount error:", err);
  }
}
