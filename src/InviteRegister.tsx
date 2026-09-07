import { useState, useEffect } from "react";
// ✅ FIXED: Changed from 'wouter' to 'react-router-dom'
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, ArrowRight, Shield, Clock, CheckCircle } from "lucide-react";
import { Input, Button, Label } from "@/components/ui";
import { toast } from "sonner";

export default function InviteRegister() {
  const navigate = useNavigate(); // ✅ FIXED: useLocation -> useNavigate
  const { token } = useParams(); // ✅ FIXED: useRoute -> useParams

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid invite link");
          return;
        }
        setInviteData(data);
        if (data.name) setName(data.name);
        if (data.phone) setPhone(data.phone);
      })
      .catch(() => setError("Could not verify invite link"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/invite/${token}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, name: name.trim(), phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }
      if (data.token) {
        localStorage.setItem("opportunity_token", data.token);
      }
      toast.success("Account created! Welcome to Opportunity Hub");
      navigate("/dashboard"); // ✅ FIXED: setLocation -> navigate
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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
            <Shield size={32} className="text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Invalid Invite</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">This invite link may have already been used or expired.</p>
          <Button onClick={() => navigate("/login")} variant="outline" className="mt-4">Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 border-r">
        <div className="mx-auto w-full max-sm lg:w-96">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 text-primary font-display font-bold text-2xl mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <Briefcase size={22} />
              </div>
              Opportunity Hub
            </div>

            <h2 className="text-3xl font-display font-bold tracking-tight text-foreground">
              You're Invited!
            </h2>
            <p className="mt-2 text-muted-foreground">
              Complete your registration to start discovering leads.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <Clock size={16} />
                <span className="font-semibold">{inviteData?.trial_days || 14} days free trial included</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle size={16} />
                <span>Plan: <strong className="capitalize">{inviteData?.plan || "basic"}</strong></span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData?.email || ""}
                  disabled
                  className="bg-muted cursor-not-allowed font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" placeholder="+92 300 0000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create a password</Label>
                <Input id="password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              <Button type="submit" className="w-full text-base h-12 mt-4 gap-2" disabled={submitting}>
                {submitting ? "Creating account..." : "Start Free Trial"}
                {!submitting && <ArrowRight size={18} />}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
      <div className="hidden lg:block relative w-1/2 overflow-hidden bg-card">
        <img className="absolute inset-0 h-full w-full object-cover opacity-90 scale-x-[-1]" src={`${import.meta.env.BASE_URL}auth-bg.png`} alt="Abstract background" />
      </div>
    </div>
  );
}
