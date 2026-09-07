import { supabase } from "./supabase";

export async function matchLeadsForUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // USER SKILLS
  const { data: userSkills } = await supabase
    .from("user_skills")
    .select("skill")
    .eq("user_id", user.id);

  if (!userSkills?.length) return;

  const skills = userSkills.map((s) =>
    String(s.skill).toLowerCase()
  );

  // DEMAND LEADS
  const { data: demandLeads } = await supabase
    .from("demand_leads")
    .select("*");

  for (const lead of demandLeads || []) {
    const leadSkill = String(
      lead.skill_needed || ""
    ).toLowerCase();

    const matched = skills.some((skill) =>
      leadSkill.includes(skill)
    );

    if (!matched) continue;

    const { data: existing } = await supabase
      .from("lead_matches")
      .select("id")
      .eq("user_id", user.id)
      .eq("lead_id", lead.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("lead_matches").insert({
        user_id: user.id,
        lead_id: lead.id,
        status: "matched",
        delivered_at: new Date().toISOString(),
      });
    }
  }
}
