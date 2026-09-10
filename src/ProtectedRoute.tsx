import { Navigate, Outlet } from "react-router-dom";
import { useAuthUser } from "./hook/use-auth";
import { useTrialStatus } from "./hooks/use-trial-status";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

function useSubscriptionAccess(userId?: string) {
  return useQuery({
    queryKey: ["subscription-access", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id")
        .eq("user_id", userId!)
        .limit(1);

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).length > 0;
    },
    retry: false,
  });
}

export default function ProtectedRoute() {
  const { data: user, isLoading: userLoading } = useAuthUser();
  const { data: trial, isLoading: trialLoading } = useTrialStatus();
  const { data: hasSubscription, isLoading: subscriptionLoading } =
    useSubscriptionAccess(user?.id);

  if (userLoading || trialLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!trial?.active && !hasSubscription) {
    return <Navigate to="/login?expired=true" replace />;
  }

  return <Outlet />;
}
