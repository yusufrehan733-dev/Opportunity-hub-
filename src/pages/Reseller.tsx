import { motion } from "framer-motion";
import {
  Users,
  Star,
  Mail,
  Crown,
  Globe,
  MessageCircle,
} from "lucide-react";

const WHATSAPP_NUMBER = "+923149363009";
const WHATSAPP_DISPLAY = "+92 314 9363009";
const SUPPORT_EMAIL = "logicguild186@gmail.com";

const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}`;
const emailLink = `mailto:${SUPPORT_EMAIL}`;

const PRICING = [
  {
    name: "Basic",
    pakistan: "PKR 1,000",
    international: "20",
    description: "2 skills",
    icon: Users,
  },
  {
    name: "Premium",
    pakistan: "PKR 2,500",
    international: "35",
    description: "5 skills",
    icon: Star,
  },
  {
    name: "Gold",
    pakistan: "PKR 6,000",
    international: "70",
    description: "Unlimited skills",
    icon: Crown,
    highlight: true,
  },
];

const card =
  "rounded-xl border border-[#272727] bg-[#141414]";

export default function Reseller() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7 text-center"
        >
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#00c98b] text-black">
            <Users size={21} />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Reseller Program
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#999]">
            Introduce Opportunity Hub to teachers, coaches, freelancers and
            professionals — and earn commission from qualifying subscriptions.
          </p>
        </motion.header>

        {/* Commission */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${card} mb-5 p-5 sm:p-6`}
        >
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d2b27] text-sm font-bold text-[#00c98b]">
              %
            </span>

            <h2 className="text-base font-semibold">
              Commission
            </h2>
          </div>

          <p className="text-sm leading-6 text-[#b5b5b5]">
            Earn{" "}
            <strong className="text-white">30%</strong>{" "}
            on every active paid subscription generated through your reseller
            link.
          </p>

          <div className="mt-4 rounded-lg border border-[#292929] bg-[#101010] px-4 py-3">
            <p className="text-sm font-medium text-white">
              10th qualifying subscription →{" "}
              <span className="text-[#00c98b]">100% commission</span>
            </p>

            <p className="mt-1 text-xs leading-5 text-[#777]">
              Subscriptions 1–9 earn 30%. The 10th earns 100%.
            </p>
          </div>
        </motion.section>

        {/* Plans */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <div className="mb-3 flex items-center gap-2.5">
            <Globe size={19} className="text-[#00c98b]" />

            <h2 className="text-base font-semibold">
              Subscription Plans
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {PRICING.map((plan) => {
              const Icon = plan.icon;

              return (
                <div
                  key={plan.name}
                  className={`${card} ${
                    plan.highlight
                      ? "border-[#00c98b]/50"
                      : ""
                  } p-4`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        {plan.name}
                      </h3>

                      <p className="mt-0.5 text-xs text-[#777]">
                        {plan.description}
                      </p>
                    </div>

                    <Icon
                      size={18}
                      className={
                        plan.highlight
                          ? "text-[#00c98b]"
                          : "text-[#777]"
                      }
                    />
                  </div>

                  <div className="mt-4 border-t border-[#262626] pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#666]">
                      Pakistan
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      {plan.pakistan}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-[#262626] pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#666]">
                      International
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      {plan.international}
                    </p>

                    <p className="mt-1 text-[11px] text-[#777]">
                      Local currency / month
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* International */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${card} mb-5 p-5 sm:p-6`}
        >
          <div className="mb-3 flex items-center gap-2.5">
            <Globe size={18} className="text-[#00c98b]" />

            <h2 className="text-base font-semibold">
              International Pricing
            </h2>
          </div>

          <p className="text-sm leading-6 text-[#aaa]">
            International plans are{" "}
            <strong className="text-white">20 / 35 / 70</strong>{" "}
            in the customer's local currency.
          </p>

          <p className="mt-2 text-xs leading-5 text-[#777]">
            The applicable currency depends on the customer's country.
            Payment is completed outside the app using the payment method
            provided by our team.
          </p>
        </motion.section>

        {/* Gold Reward */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${card} mb-5 p-5 sm:p-6`}
        >
          <div className="mb-3 flex items-center gap-2.5">
            <Crown size={18} className="text-[#00c98b]" />

            <h2 className="text-base font-semibold">
              Gold Reseller Reward
            </h2>
          </div>

          <p className="text-sm leading-6 text-[#aaa]">
            Generate{" "}
            <strong className="text-white">
              2 active Gold subscriptions
            </strong>{" "}
            to qualify for the Gold reseller reward.
          </p>
        </motion.section>

        {/* How to Join */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${card} mb-5 p-5 sm:p-6`}
        >
          <h2 className="mb-4 text-base font-semibold">
            How to Join
          </h2>

          <div className="space-y-3">
            {[
              "Request your unique reseller link.",
              "Share the link with potential customers.",
              "Customers subscribe through your link.",
              "Qualifying paid subscriptions count toward commission.",
              "Contact support for commission and payment details.",
            ].map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#202020] text-[11px] text-[#00c98b]">
                  {index + 1}
                </span>

                <p className="pt-0.5 text-sm leading-5 text-[#aaa]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Contact */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#292929] bg-[#0f0f0f] p-5 sm:p-6"
        >
          <h2 className="text-base font-semibold">
            Reseller Support
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#888]">
            Contact our team for registration, your reseller link, payment
            instructions or commission questions.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00c98b] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
            >
              <MessageCircle size={17} />
              WhatsApp
            </a>

            <a
              href={emailLink}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#333] bg-[#181818] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#222]"
            >
              <Mail size={17} />
              Email Support
            </a>
          </div>
        </motion.section>

      </div>
    </div>
  );
        }
