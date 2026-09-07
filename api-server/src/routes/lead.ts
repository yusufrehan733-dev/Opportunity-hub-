import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
"https://qnkxrxxwfikhrlirfleg.supabase.co",
"sb_publishable_exYuiUhOVuWEyPqROu4p5A_gCWtb89S"
);

router.get("/", async (req, res) => {
try {
const userPlan = (req.query.plan as string) || "basic";

const LIMITS = {
  basic: 10,
  premium: 30,
  gold: 100,
};

const limit = LIMITS[userPlan as keyof typeof LIMITS] || 10;

const tenDaysAgo = new Date();
tenDaysAgo.setDate(tenDaysAgo.getDate() - 30);

const { data, error } = await supabase
  .from("demand_leads")
  .select("*")
  .gte("created_at", tenDaysAgo.toISOString())
  .order("created_at", { ascending: false })
  .limit(limit);

if (error) {
  console.error("Supabase error:", error);
  return res.json({
    leads: [],
    remaining: 0,
  });
}

const leads = (data || []).map((lead) => ({
  title: lead.client_name || lead.service_needed || "Opportunity",
  description: lead.description || "No description",
  link: lead.link || "#",
  tags: lead.skill ? [lead.skill] : [],
  isLocked: false,
}));

return res.json({
  leads,
  remaining: 0,
  upgradeMessage: null,
});

} catch (err) {
console.error(err);

return res.json({
  leads: [],
  remaining: 0,
});

}
});

export default router;
