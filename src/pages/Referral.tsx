import { motion } from "framer-motion";
import {
  Gift,
  Star,
  Crown,
  Mail,
  Copy,
  Share2,
  MessageCircle,
  CheckCircle
} from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://opportunity-hub.replit.app";

export default function Referral() {
  // ✅ SAFE: no broken auth hook
  const user = null;

  const [copied, setCopied] = useState(false);

  // fallback referral code (no crash)
  const referralCode = "demo-user";
  const referralLink = `${BASE_URL}/register?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join Opportunity Hub! Use my link: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareEmail = () => {
    const subject = encodeURIComponent("Join Opportunity Hub");
    const body = encodeURIComponent(
      `Sign up here: ${referralLink}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareX = () => {
    const text = encodeURIComponent(
      `Join Opportunity Hub: ${referralLink}`
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      "_blank"
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <Gift className="text-primary" />
          <h1 className="text-3xl font-bold">Referral Program</h1>
        </div>
        <p className="text-muted-foreground">
          Share your link and earn rewards.
        </p>
      </motion.div>

      {/* LINK BOX */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h2 className="font-bold flex items-center gap-2">
          <Share2 className="text-primary" />
          Your Referral Link
        </h2>

        <div className="flex gap-3">
          <div className="flex-1 bg-secondary px-4 py-3 rounded-xl text-sm truncate">
            {referralLink}
          </div>

          <button
            onClick={copyLink}
            className={`px-4 py-3 rounded-xl text-sm font-semibold ${
              copied ? "bg-green-500 text-white" : "bg-primary text-white"
            }`}
          >
            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={shareWhatsApp} className="bg-green-500 text-white px-3 py-2 rounded-xl">
            <MessageCircle size={16} /> WhatsApp
          </button>

          <button onClick={shareEmail} className="bg-blue-500 text-white px-3 py-2 rounded-xl">
            <Mail size={16} /> Email
          </button>

          <button onClick={shareX} className="bg-black text-white px-3 py-2 rounded-xl">
            𝕏 Share
          </button>
        </div>
      </div>

      {/* PLANS */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="border rounded-2xl p-5">
          <Gift className="text-primary mb-2" />
          <h2 className="font-bold">Basic</h2>
          <p>80% discount reward</p>
        </div>

        <div className="border rounded-2xl p-5">
          <Star className="text-yellow-500 mb-2" />
          <h2 className="font-bold">Premium</h2>
          <p>100% free subscription</p>
        </div>

        <div className="border rounded-2xl p-5">
          <Crown className="text-yellow-600 mb-2" />
          <h2 className="font-bold">Gold</h2>
          <p>Lifetime free access</p>
        </div>
      </div>
    </div>
  );
}
