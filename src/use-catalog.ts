import { useQuery } from "@tanstack/react-query";

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("opportunity_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function useSkillsCatalog() {
  return useQuery<any[]>({
    queryKey: ["/api/catalog/skills"],
    queryFn: async () => {
      const res = await fetch("/api/catalog/skills", { headers: { ...getAuthHeaders() } });
      if (!res.ok) {
        console.error("[useSkillsCatalog] Failed to fetch skills catalog:", res.status, res.statusText);
        throw new Error("Failed to fetch skills catalog");
      }
      const data = await res.json();
      console.log("[useSkillsCatalog] Loaded", data.length, "skills from catalog");
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlansCatalog() {
  return useQuery<any[]>({
    queryKey: ["/api/catalog/plans"],
    queryFn: async () => {
      const res = await fetch("/api/catalog/plans", { headers: { ...getAuthHeaders() } });
      if (!res.ok) {
        console.error("[usePlansCatalog] Failed to fetch plans:", res.status, res.statusText);
        throw new Error("Failed to fetch plans catalog");
      }
      const data = await res.json();
      console.log("[usePlansCatalog] Loaded", data.length, "plans");
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminSubscriptions() {
  return useQuery<any[]>({
    queryKey: ["/api/admin/sb/subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sb/subscriptions", { headers: { ...getAuthHeaders() } });
      if (!res.ok) {
        console.error("[useAdminSubscriptions] error:", res.status, res.statusText);
        throw new Error("Failed to fetch subscriptions");
      }
      return res.json();
    },
  });
}

export function useAdminSbResellers() {
  return useQuery<any[]>({
    queryKey: ["/api/admin/sb/resellers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sb/resellers", { headers: { ...getAuthHeaders() } });
      if (!res.ok) {
        console.error("[useAdminSbResellers] error:", res.status, res.statusText);
        throw new Error("Failed to fetch resellers");
      }
      return res.json();
    },
  });
}

export function useAdminReferrals() {
  return useQuery<any[]>({
    queryKey: ["/api/admin/sb/referrals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sb/referrals", { headers: { ...getAuthHeaders() } });
      if (!res.ok) {
        console.error("[useAdminReferrals] error:", res.status, res.statusText);
        throw new Error("Failed to fetch referrals");
      }
      return res.json();
    },
  });
}

export function useAdminSbPlans() {
  return useQuery<any[]>({
    queryKey: ["/api/admin/sb/plans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sb/plans", { headers: { ...getAuthHeaders() } });
      if (!res.ok) {
        console.error("[useAdminSbPlans] error:", res.status, res.statusText);
        throw new Error("Failed to fetch plans");
      }
      return res.json();
    },
  });
}
