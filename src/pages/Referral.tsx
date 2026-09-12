import { motion } from "framer-motion";
import {
  Gift,
  Star,
  Crown,
  Mail,
  Copy,
  Share2,
  MessageCircle,
  CheckCircle,
} from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://opportunity-hub-umber.vercel.app";

const WHATSAPP_NUMBER = "+923149363009";
const WHATSAPP_DISPLAY = "+92 314 9363009";
const SUPPORT_EMAIL = "logicguild186@gmail.com";

export default function Referral() {
  const [copied, setCopied] = useState(false);

  // Temporary fallback until the referral identity is connected to the
  // authenticated user's real referral record.
  const referralCode = "demo-user";
  const referralLink = `${BASE_URL}/register?ref=${referralCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");

      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Could not copy the referral link.");
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join Opportunity Hub! Use my referral link: ${referralLink}`
    );

    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareEmail = () => {
    const subject = encodeURIComponent("Join Opportunity Hub");
    const body = encodeURIComponent(
      `Join Opportunity Hub using my referral link:\n\n${referralLink}`
    );

    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const shareX = () => {
    const text = encodeURIComponent(
      `Join Opportunity Hub using my referral link: ${referralLink}`
    );

    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      "_blank"
    );
  };

  const supportWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}`,
      "_blank"
    );
  };

  const supportEmail = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Gift className="text-primary" />
          <h1 className="text-3xl font-bold">Referral Program</h1>
        </div>

        <p className="text-muted-foreground">
          Refer new paying customers to Opportunity Hub and unlock rewards
          based on their active paid subscriptions.
        </p>
      </motion.div>

      {/* REFERRAL LINK */}
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
            type="button"
            aria-label="Copy referral link"
            className={`px-4 py-3 rounded-xl text-sm font-semibold ${
              copied
                ? "bg-green-500 text-white"
                : "bg-primary text-white"
            }`}
          >
            {copied ? (
              <CheckCircle size={16} />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={shareWhatsApp}
            type="button"
            className="inline-flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-xl"
          >
            <MessageCircle size={16} />
            WhatsApp
          </button>

          <button
            onClick={shareEmail}
            type="button"
            className="inline-flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-xl"
          >
            <Mail size={16} />
            Email
          </button>

          <button
            onClick={shareX}
            type="button"
            className="inline-flex items-center gap-2 bg-black text-white px-3 py-2 rounded-xl"
          >
            𝕏 Share
          </button>
        </div>
      </div>

      {/* REWARD RULES */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          Referral Rewards
        </h2>

        <p className="text-sm text-muted-foreground mb-5">
          Rewards are based on active paid referrals. A referral only counts
          when the referred customer has an active paid subscription.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">

          {/* BASIC */}
          <div className="border rounded-2xl p-5">
            <Gift className="text-primary mb-2" />

            <h3 className="font-bold text-lg">
              3 Basic Referrals
            </h3>

            <p className="mt-2 text-gray-600">
              Get your <strong>Basic plan free</strong>.
            </p>
          </div>

          {/* PREMIUM */}
          <div className="border rounded-2xl p-5">
            <Star className="text-yellow-500 mb-2" />

            <h3 className="font-bold text-lg">
              Premium Reward
            </h3>

            <p className="mt-2 text-gray-600">
              Get <strong>80% off Premium</strong> with either
              <strong> 1 active Premium referral</strong> or
              <strong> 2 active Basic referrals</strong>.
            </p>
          </div>

          {/* GOLD */}
          <div className="border rounded-2xl p-5">
            <Crown className="text-yellow-600 mb-2" />

            <h3 className="font-bold text-lg">
              1 Gold Referral
            </h3>

            <p className="mt-2 text-gray-600">
              Get <strong>Premium free</strong> or
              <strong> 50% off Gold</strong>.
            </p>
          </div>

          {/* TWO GOLD */}
          <div className="border rounded-2xl p-5">
            <Crown className="text-yellow-600 mb-2" />

            <h3 className="font-bold text-lg">
              2 Gold Referrals
            </h3>

            <p className="mt-2 text-gray-600">
              Get your <strong>Gold plan free</strong>.
            </p>
          </div>

        </div>
      </div>

      {/* IMPORTANT NOTE */}
      <div className="rounded-2xl bg-gray-50 border p-6">
        <h2 className="font-bold text-lg mb-2">
          How referral rewards work
        </h2>

        <p className="text-sm text-gray-600 leading-6">
          Referral rewards are separate from the reseller commission
          program. Your reward is determined by the number and plan level
          of your active paid referrals.
        </p>
      </div>

      {/* SUPPORT */}
      <div className="rounded-2xl bg-black text-white p-6">
        <h2 className="text-2xl font-bold mb-3">
          Need Help With Referrals?
        </h2>

        <p className="text-gray-300 leading-6 mb-5">
          Contact our team if you have questions about your referral link,
          referral rewards, or reward eligibility.
        </p>

        <div className="space-y-3 mb-6">
          <div>
            <p className="text-sm text-gray-400">
              WhatsApp
            </p>

            <p className="font-semibold">
              {WHATSAPP_DISPLAY}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-400">
              Email
            </p>

            <p className="font-semibold break-all">
              {SUPPORT_EMAIL}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={supportWhatsApp}
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black px-5 py-3 font-semibold hover:bg-gray-100 transition"
          >
            <MessageCircle size={19} />
            WhatsApp Support
          </button>

          <button
            onClick={supportEmail}
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white px-5 py-3 font-semibold hover:bg-white hover:text-black transition"
          >
            <Mail size={19} />
            Email Support
          </button>
        </div>
      </div>

    </div>
  );
}
