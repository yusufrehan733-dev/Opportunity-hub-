export const PLAN_LIMITS = {
  basic: 15,
  premium: 30,
  gold: 100,
};

export function getPlanLimit(plan: string) {
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || 5;
}
