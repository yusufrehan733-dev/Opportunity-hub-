import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useTrialStatus() {
  return useQuery({
    queryKey: ["trial-status"],
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return {
          authenticated: false,
          hasTrial: false,
          active: false,
          daysRemaining: 0,
          trialEndsAt: null,
        };
      }

      const email = user.email?.toLowerCase();

      if (!email) {
        return {
          authenticated: true,
          hasTrial: false,
          active: false,
          daysRemaining: 0,
          trialEndsAt: null,
        };
      }

      const { data, error } = await supabase
        .from("trial_identities")
        .select("trial_started_at, trial_ends_at")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return {
          authenticated: true,
          hasTrial: false,
          active: false,
          daysRemaining: 0,
          trialEndsAt: null,
        };
      }

      const endsAt = new Date(data.trial_ends_at);
      const now = new Date();

      const millisecondsRemaining =
        endsAt.getTime() - now.getTime();

      const daysRemaining = Math.max(
        0,
        Math.ceil(
          millisecondsRemaining / (1000 * 60 * 60 * 24)
        )
      );

      return {
        authenticated: true,
        hasTrial: true,
        active: millisecondsRemaining > 0,
        daysRemaining,
        trialEndsAt: data.trial_ends_at,
      };
    },
    retry: false,
  });
}
