import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

type RegisterData = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

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

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
    }) => {
      const { data: res, error } =
        await supabase.auth.signInWithPassword({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        });

      if (error) {
        throw error;
      }

      if (!res.user) {
        throw new Error("Login succeeded but no user was returned.");
      }

      return res.user;
    },

    onSuccess: (user) => {
      queryClient.setQueryData(["user"], user);

      queryClient.invalidateQueries({
        queryKey: ["trial-status"],
      });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const email = data.email.trim().toLowerCase();

      // STEP 1:
      // Create the Supabase Auth account first.
      // We intentionally do NOT query trial_identities before signup,
      // because the visitor is not authenticated yet.
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

      // If Supabase requires email confirmation, there may be no session yet.
      // The Auth account was still successfully created.
      if (!authData.session) {
        return {
          user: authData.user,
          trialCreated: false,
          emailConfirmationRequired: true,
        };
      }

      // STEP 2:
      // The user is authenticated, so create the 14-day trial identity.
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
        // If the Auth account was created but the trial record failed,
        // surface the real database error instead of pretending signup failed.
        throw new Error(
          `Account created, but trial setup failed: ${trialInsertError.message}`
        );
      }

      return {
        user: authData.user,
        trialCreated: true,
        emailConfirmationRequired: false,
      };
    },

    onSuccess: (result) => {
      queryClient.setQueryData(["user"], result.user);

      queryClient.invalidateQueries({
        queryKey: ["trial-status"],
      });
    },
  });
}

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
