import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase,
  ArrowRight,
  Shield,
  Clock,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "./lib/supabase";

export default function InviteRegister() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      if (!token) {
        setError("Invalid invite link");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/invite/${encodeURIComponent(token)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const text = await res.text();

        let data: any = {};

        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(
            `Server returned an invalid response (${res.status}).`
          );
        }

        if (!res.ok || data?.success !== true) {
          throw new Error(
            data?.error || "Invalid invite link"
          );
        }

        if (cancelled) return;

        // New API returns invite data inside data.invite.
        // This also supports the older top-level format.
        const invite = data?.invite || data;

        setInviteData(invite);

        if (invite?.name) {
          setName(String(invite.name));
        }

        if (invite?.phone) {
          setPhone(String(invite.phone));
        }
      } catch (err: any) {
        if (cancelled) return;

        setError(
          err?.message || "Could not verify invite link"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInvite();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (submitting || registrationComplete) {
      return;
    }

    if (!token) {
      toast.error("Invalid invite link");
      return;
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPassword = password;

    if (!cleanName) {
      toast.error("Please enter your name");
      return;
    }

    if (cleanPassword.length < 6) {
      toast.error(
        "Password must be at least 6 characters"
      );
      return;
    }

    const email = String(
      inviteData?.email || ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      toast.error(
        "The invite email could not be verified."
      );
      return;
    }

    setSubmitting(true);

    let registrationSucceeded = false;

    let controller: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null =
      null;

    try {
      controller = new AbortController();

      timeoutId = setTimeout(() => {
        controller?.abort();
      }, 20000);

      const res = await fetch(
        `/api/auth/invite/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
            phone: cleanPhone || null,
            password: cleanPassword,
          }),
          signal: controller.signal,
        }
      );

      const text = await res.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `Server returned an invalid response (${res.status}).`
        );
      }

      if (!res.ok || data?.success !== true) {
        throw new Error(
          data?.error ||
            `Registration failed (${res.status}).`
        );
      }

      const createdEmail = String(
        data.email || email
      )
        .trim()
        .toLowerCase();

      if (!createdEmail) {
        throw new Error(
          "Account was created, but the email was missing."
        );
      }

      /*
       * Backend has created:
       * 1. Supabase Auth account
       * 2. trial_identities record
       * 3. public.users record
       * 4. used invite record
       *
       * Now sign the new user into Supabase.
       */

      const {
        data: loginData,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: createdEmail,
        password: cleanPassword,
      });

      if (loginError) {
        console.error(
          "Invite registration login error:",
          loginError
        );

        throw new Error(
          "Account was created, but automatic login failed. Please use Login with your new email and password."
        );
      }

      if (!loginData?.user || !loginData?.session) {
        throw new Error(
          "Account was created, but no login session was returned."
        );
      }

      /*
       * Confirm that Supabase actually sees the session.
       */

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData?.session) {
        throw new Error(
          "Account was created, but the login session could not be confirmed."
        );
      }

      /*
       * Registration is completely successful.
       * Lock the form immediately.
       */

      registrationSucceeded = true;
      setRegistrationComplete(true);

      toast.success(
        "Account created! Welcome to Opportunity Hub."
      );

      setTimeout(() => {
        navigate("/dashboard", {
          replace: true,
        });
      }, 100);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        toast.error(
          "Account creation took too long. Please try again once."
        );
      } else {
        console.error(
          "Invite registration error:",
          err
        );

        toast.error(
          err?.message ||
            "Something went wrong. Please try again."
        );
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!registrationSucceeded) {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Shield
              size={32}
              className="text-destructive"
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground">
            Invalid Invite
          </h2>

          <p className="text-muted-foreground">
            {error}
          </p>

          <p className="text-sm text-muted-foreground">
            This invite link may have already been
            used or expired.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-5 py-2 rounded-lg border border-border hover:bg-muted"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 border-r">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
          >
            <div className="flex items-center gap-2 text-primary font-bold text-2xl mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <Briefcase size={22} />
              </div>

              Opportunity Hub
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              You're Invited!
            </h2>

            <p className="mt-2 text-muted-foreground">
              Complete your registration to start
              discovering leads.
            </p>
          </motion.div>

          <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <Clock size={16} />

              <span className="font-semibold">
                {inviteData?.trial_days || 14} days
                free trial included
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle size={16} />

              <span>
                Plan:{" "}
                <strong className="capitalize">
                  {inviteData?.plan || "Basic"}
                </strong>
              </span>
            </div>
          </div>

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.1,
            }}
            className="mt-8"
          >
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label htmlFor="email">
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={inviteData?.email || ""}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted cursor-not-allowed font-medium"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="name">
                  Full name
                </label>

                <input
                  id="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                  disabled={
                    submitting ||
                    registrationComplete
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone">
                  Phone number
                </label>

                <input
                  id="phone"
                  type="tel"
                  placeholder="+92 300 0000000"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  disabled={
                    submitting ||
                    registrationComplete
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password">
                  Create a password
                </label>

                <input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  minLength={6}
                  disabled={
                    submitting ||
                    registrationComplete
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  registrationComplete
                }
                className="w-full h-12 mt-4 rounded-lg bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {registrationComplete
                  ? "Account Created"
                  : submitting
                    ? "Creating account..."
                    : "Start Free Trial"}

                {!submitting &&
                  !registrationComplete && (
                    <ArrowRight size={18} />
                  )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      <div className="hidden lg:block relative w-1/2 overflow-hidden bg-card">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-x-[-1]"
          src={`${import.meta.env.BASE_URL}auth-bg.png`}
          alt="Abstract background"
        />
      </div>
    </div>
  );
