import { motion } from "framer-motion";
import { Mail, MessageSquare } from "lucide-react";

const SUPPORT_EMAIL = "logicguild733@gmail.com";
const WHATSAPP_NUMBER = "923149363009";
const WHATSAPP_DISPLAY = "+92 314 9363009";

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00c98b]/10 text-[#00c98b]">
              <MessageSquare size={20} />
            </div>

            <h1 className="text-2xl font-semibold">
              Contact Us
            </h1>
          </div>

          <p className="text-sm leading-6 text-[#999]">
            We're here to help with support, questions, subscriptions, or
            reseller applications.
          </p>
        </motion.div>

        <div className="space-y-4">

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#272727] bg-[#141414] p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00c98b]/10 text-[#00c98b]">
                <Mail size={20} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold">
                  Email Support
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#888]">
                  For support, reseller applications, billing questions, or
                  technical help.
                </p>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mt-4 inline-flex max-w-full items-center gap-2 break-all rounded-lg bg-[#00c98b] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  <Mail size={17} />
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#272727] bg-[#141414] p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00c98b]/10 text-[#00c98b]">
                <MessageSquare size={20} />
              </div>

              <div>
                <h2 className="text-base font-semibold">
                  WhatsApp Support
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#888]">
                  For quick questions, reseller registration, or payment
                  instructions.
                </p>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#333] bg-[#181818] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#222]"
                >
                  <MessageSquare size={17} />
                  {WHATSAPP_DISPLAY}
                </a>
              </div>
            </div>
          </motion.div>

          <div className="rounded-xl border border-[#272727] bg-[#141414] p-5">
            <h2 className="mb-3 text-base font-semibold">
              Common Inquiries
            </h2>

            <div className="space-y-2">
              <div className="rounded-lg border border-[#252525] bg-[#101010] p-3">
                <p className="text-sm font-medium">
                  Reseller Application
                </p>
                <p className="mt-1 text-xs text-[#777]">
                  Subject: Reseller Application
                </p>
              </div>

              <div className="rounded-lg border border-[#252525] bg-[#101010] p-3">
                <p className="text-sm font-medium">
                  Subscription / Billing
                </p>
                <p className="mt-1 text-xs text-[#777]">
                  Subject: Subscription Inquiry
                </p>
              </div>

              <div className="rounded-lg border border-[#252525] bg-[#101010] p-3">
                <p className="text-sm font-medium">
                  Technical Support
                </p>
                <p className="mt-1 text-xs text-[#777]">
                  Subject: Support Request
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#00c98b]/20 bg-[#00c98b]/5 p-5 text-center">
            <p className="text-sm font-semibold italic text-[#00c98b]">
              "Earn First, Pay After."
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
