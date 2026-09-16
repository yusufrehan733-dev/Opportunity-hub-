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
import { useAuthUser } from "../hook/use-auth";

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://opportunity-hub-umber.vercel.app";

const WHATSAPP_NUMBER = "+923149363009";
const WHATSAPP_DISPLAY = "+92 314 9363009";
const SUPPORT_EMAIL = "logicguild733@gmail.com";

export default function Referral() {
  const [copied, setCopied] = useState(false);
  const { data: user } = useAuthUser();

  const referralCode = user?.id ?? "";
  const referralLink = referralCode
    ? `${BASE_URL}/register?ref=${referralCode}`
    : "";

  const copyLink = async () => {
    if (!referralLink) {
      toast.error("Please log in to get your referral link.");
      return;
    }

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
    if (!referralLink) return;

    const text = encodeURIComponent(
      `Join Opportunity Hub! Use my referral link: ${referralLink}`
    );

    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareEmail = () => {
    if (!referralLink) return;

    const subject = encodeURIComponent("Join Opportunity Hub");
    const body = encodeURIComponent(
      `Join Opportunity Hub using my referral link:\n\n${referralLink}`
    );

    window.open(
      `mailto:?subject=${subject}&body=${body}`,
      "_blank"
    );
  };

  const shareX = () => {
    if (!referralLink) return;

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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00c98b]/10 text-[#00c98b]">
              <Gift size={20} />
            </div>

            <h1 className="text-2xl font-semibold">
              Referral Program
            </h1>
          </div>

          <p className="text-sm leading-6 text-[#999]">
            Refer new paying customers to Opportunity Hub and unlock rewards
            based on their active paid subscriptions.
          </p>
        </motion.div>

        {/* REFERRAL LINK */}
        <div className="mb-5 rounded-xl border border-[#272727] bg-[#141414] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Share2 className="text-[#00c98b]" size={18} />
            Your Referral Link
          </h2>

          <div className="flex gap-2">
            <div className="min-w-0 flex-1 rounded-lg border border-[#292929] bg-[#101010] px-3 py-3 text-xs text-[#aaa]">
              {referralLink || "Loading your referral link..."}
            </div>

            <button
              onClick={copyLink}
              type="button"
              aria-label="Copy referral link"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-[#00c98b] text-black"
              }`}
            >
              {copied ? (
                <CheckCircle size={17} />
              ) : (
                <Copy size={17} />
              )}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={shareWhatsApp}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[#00c98b] px-3 py-2 text-xs font-semibold text-black"
            >
              <MessageCircle size={15} />
              WhatsApp
            </button>

            <button
              onClick={shareEmail}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs font-semibold"
            >
              <Mail size={15} />
              Email
            </button>

            <button
              onClick={shareX}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs font-semibold"
            >
              𝕏 Share
            </button>
          </div>
        </div>

        {/* REWARD RULES */}
        <div className="mb-5">
          <h2 className="mb-2 text-base font-semibold">
            Referral Rewards
          </h2>

          <p className="mb-4 text-xs leading-5 text-[#888]">
            Rewards are based on active paid referrals. A referral counts
            only when the referred customer has an active paid subscription.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">

            <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
              <Gift className="mb-2 text-[#00c98b]" size={19} />
              <h3 className="text-sm font-semibold">
                3 Basic Referrals
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#888]">
                Get your <strong className="text-white">Basic plan free</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
              <Star className="mb-2 text-[#00c98b]" size={19} />
              <h3 className="text-sm font-semibold">
                Premium Reward
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#888]">
                Get <strong className="text-white">80% off Premium</strong>
                with 1 active Premium referral or 2 active Basic referrals.
              </p>
            </div>

            <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
              <Crown className="mb-2 text-[#00c98b]" size={19} />
              <h3 className="text-sm font-semibold">
                1 Gold Referral
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#888]">
                Get <strong className="text-white">Premium free</strong> or
                <strong className="text-white"> 50% off Gold</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
              <Crown className="mb-2 text-[#00c98b]" size={19} />
              <h3 className="text-sm font-semibold">
                2 Gold Referrals
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#888]">
                Get your <strong className="text-white">Gold plan free</strong>.
              </p>
            </div>

          </div>
        </div>

        {/* NOTE */}
        <div className="mb-5 rounded-xl border border-[#272727] bg-[#141414] p-5">
          <h2 className="mb-2 text-sm font-semibold">
            How referral rewards work
          </h2>

          <p className="text-xs leading-5 text-[#888]">
            Referral rewards are separate from the reseller commission
            program. Rewards are determined by the number and plan level of
            your active paid referrals.
          </p>
        </div>

        {/* SUPPORT */}
        <div className="rounded-xl border border-[#292929] bg-[#101010] p-5">
          <h2 className="text-base font-semibold">
            Need Help With Referrals?
          </h2>

          <p className="mt-2 text-xs leading-5 text-[#888]">
            Contact our team about your referral link, rewards, or eligibility.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-[#252525] bg-[#151515] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#666]">
                WhatsApp
              </p>
              <p className="mt-1 text-sm font-medium">
                {WHATSAPP_DISPLAY}
              </p>
            </div>

            <div className="rounded-lg border border-[#252525] bg-[#151515] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#666]">
                Email
              </p>
              <p className="mt-1 break-all text-sm font-medium">
                {SUPPORT_EMAIL}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={supportWhatsApp}
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00c98b] px-4 py-2.5 text-sm font-semibold text-black"
            >
              <MessageCircle size={17} />
              WhatsApp Support
            </button>

            <button
              onClick={supportEmail}
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#333] bg-[#181818] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Mail size={17} />
              Email Support
            </button>
          </div>
        </div>

      </div>
    </div>
  );
        }
