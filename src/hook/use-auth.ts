import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type RegisterData = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

/**
 * GET USER
 */
export function useAuthUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) return null;

      return data.user;
    },
  });
}

/**
 * LOGIN
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
    }) => {
      const { data: res, error } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (error) throw error;

      return res.user;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user"],
      });

      queryClient.invalidateQueries({
        queryKey: ["trial-status"],
      });
    },
  });
}

/**
 * REGISTER
 *
 * One email = one trial identity.
 * Existing trial identities can never receive another trial.
 */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const email = data.email.trim().toLowerCase();

      // Check whether this email has already used/received a trial.
      const { data: existingTrial, error: trialCheckError } =
        await supabase
          .from("trial_identities")
          .select("email, trial_ends_at")
          .eq("email", email)
          .maybeSingle();

      if (trialCheckError) {
        throw new Error(trialCheckError.message);
      }

      if (existingTrial) {
        throw new Error(
          "This email has already used its free trial. Please sign in or subscribe to continue."
        );
      }

      // Create the Supabase Auth account.
      const { data: authData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password: data.password,
          options: {
            data: {
              full_name: data.name.trim(),
              phone: data.phone?.trim() || null,
            },
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error("Account could not be created.");
      }

      // Create exactly one 14-day trial identity.
      const trialStartedAt = new Date();
      const trialEndsAt = new Date(
        trialStartedAt.getTime() +
          14 * 24 * 60 * 60 * 1000
      );

      const { error: trialInsertError } =
        await supabase
          .from("trial_identities")
          .insert({
            email,
            trial_started_at: trialStartedAt.toISOString(),
            trial_ends_at: trialEndsAt.toISOString(),
          });

      if (trialInsertError) {
        throw new Error(trialInsertError.message);
      }

      return authData.user;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user"],
      });

      queryClient.invalidateQueries({
        queryKey: ["trial-status"],
      });
    },
  });
}

/**
 * LOGOUT
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      queryClient.setQueryData(["user"], null);
      queryClient.setQueryData(["trial-status"], null);
    },
  });
    }
