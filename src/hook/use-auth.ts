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
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) return null;

      return user;
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
      const email = data.email.trim().toLowerCase();

      if (!email || !data.password) {
        throw new Error("Please enter email and password.");
      }

      const { data: result, error } =
        await supabase.auth.signInWithPassword({
          email,
          password: data.password,
        });

      if (error) {
        throw new Error("Invalid email or password.");
      }

      if (!result.user) {
        throw new Error("Login succeeded but no user was returned.");
      }

      return result.user;
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

      const { data: authData, error } =
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

      if (error) throw error;

      if (!authData.user) {
        throw new Error("Account could not be created.");
      }

      return {
        user: authData.user,
        session: authData.session,
        emailConfirmationRequired: !authData.session,
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

export function useResetPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        throw new Error("Please enter your email address.");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;
    },
  });
}

export function useUpdatePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Password could not be updated.");
      }

      return data.user;
    },

    onSuccess: (user) => {
      queryClient.setQueryData(["user"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.setQueryData(["user"], null);
      queryClient.setQueryData(["trial-status"], null);
    },
  });
}
