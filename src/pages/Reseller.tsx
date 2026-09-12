import { motion } from "framer-motion";
import {
  Users,
  DollarSign,
  Star,
  Mail,
  Crown,
  Globe,
  MessageCircle,
} from "lucide-react";

const PRICING = [
  {
    plan: "Basic",
    pakistan: "PKR 1,000",
    international: "20",
    note: "2 skills",
  },
  {
    plan: "Premium",
    pakistan: "PKR 2,500",
    international: "35",
    note: "5 skills",
  },
  {
    plan: "Gold",
    pakistan: "PKR 6,000",
    international: "70",
    note: "Unlimited skills",
    highlight: true,
  },
];

const WHATSAPP_NUMBER = "+923149363009";
const DISPLAY_WHATSAPP = "+92 314 9363009";
const SUPPORT_EMAIL = "logicguild186@gmail.com";

export default function Reseller() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={20} />
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground">
            Reseller Program
          </h1>
        </div>

        <p className="text-muted-foreground text-lg">
          Earn commissions by bringing new paid subscribers to Opportunity Hub.
        </p>
      </motion.div>

      {/* COMMISSION BENEFITS */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-6 flex flex-col">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <DollarSign size={24} />
          </div>

          <h2 className="text-lg font-bold text-foreground mb-2">
            30% Commission
          </h2>

          <p className="text-muted-foreground text-sm flex-1">
            Earn 30% commission on every active paid subscription you refer.
            Commission remains active while the referred subscription remains
            active.
          </p>
        </div>

        <div className="bg-card border-2 border-amber-300/50 rounded-2xl p-6 flex flex-col relative">
          <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
            BONUS
          </div>

          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 mb-4">
            <Star size={24} />
          </div>

          <h2 className="text-lg font-bold text-foreground mb-2">
            100% Every 10th Sale
          </h2>

          <p className="text-muted-foreground text-sm flex-1">
            Every 10th active paid subscription earns{" "}
            <strong>100% commission</strong>. The bonus repeats on the 20th,
            30th, 40th sale, and so on.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 flex flex-col">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center text-yellow-600 mb-4">
            <Crown size={24} />
          </div>

          <h2 className="text-lg font-bold text-foreground mb-2">
            Gold Bonus
          </h2>

          <p className="text-muted-foreground text-sm flex-1">
            Every 2 active Gold subscriptions can qualify you for the reseller
            Gold reward according to the Opportunity Hub reseller program.
          </p>
        </div>
      </div>

      {/* COMMISSION STRUCTURE */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          Commission Structure
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">
                  Sale
                </th>
                <th className="text-left py-2 text-muted-foreground font-medium">
                  Commission
                </th>
                <th className="text-left py-2 text-muted-foreground font-medium">
                  Notes
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <tr key={n}>
                  <td className="py-2 text-foreground">Sale {n}</td>
                  <td className="py-2 font-semibold text-foreground">
                    30%
                  </td>
                  <td className="py-2 text-muted-foreground">
                    Standard commission
                  </td>
                </tr>
              ))}

              <tr className="bg-amber-50 dark:bg-amber-500/10">
                <td className="py-2 text-amber-700 dark:text-amber-400 font-bold">
                  Sale 10 🎉
                </td>

                <td className="py-2 text-amber-700 dark:text-amber-400 font-bold">
                  100%
                </td>

                <td className="py-2 text-amber-700 dark:text-amber-400">
                  Bonus — repeats every 10th sale
                </td>
              </tr>

              <tr>
                <td
                  className="py-2 text-muted-foreground"
                  colSpan={3}
                >
                  Sales 11–19 → 30% each · Sale 20 → 100% · And so on.
                </td>
              </tr>

              <tr className="bg-yellow-50 dark:bg-yellow-500/10">
                <td className="py-2 text-yellow-700 dark:text-yellow-400 font-bold">
                  2 Gold sales ⭐
                </td>

                <td className="py-2 text-yellow-700 dark:text-yellow-400 font-bold">
                  Gold reward
                </td>

                <td className="py-2 text-yellow-700 dark:text-yellow-400">
                  Qualifies for the reseller Gold reward
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Example: 10 qualifying sales = 9 sales at 30% + the 10th sale at
          100%.
        </p>
      </div>

      {/* PRICING */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={20} className="text-primary" />

          <h2 className="text-xl font-bold text-foreground">
            Subscription Pricing
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">
                  Plan
                </th>

                <th className="text-left py-2 text-muted-foreground font-medium">
                  Pakistan
                </th>

                <th className="text-left py-2 text-muted-foreground font-medium">
                  International
                </th>

                <th className="text-left py-2 text-muted-foreground font-medium">
                  Includes
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {PRICING.map((p) => (
                <tr
                  key={p.plan}
                  className={
                    p.highlight
                      ? "bg-yellow-50 dark:bg-yellow-500/10"
                      : ""
                  }
                >
                  <td
                    className={`py-3 font-bold ${
                      p.highlight
                        ? "text-yellow-700 dark:text-yellow-400"
                        : "text-foreground"
                    }`}
                  >
                    {p.plan} {p.highlight ? "⭐" : ""}
                  </td>

                  <td className="py-3 text-foreground font-semibold">
                    {p.pakistan}
                  </td>

                  <td className="py-3 text-foreground font-semibold">
                    {p.international}
                  </td>

                  <td className="py-3 text-muted-foreground text-xs">
                    {p.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          All new users receive a 14-day trial. Final subscription access and
          payment status are managed by Opportunity Hub.
        </p>
      </div>

      {/* HOW TO JOIN */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          How to Join
        </h2>

        <div className="space-y-3">
          {[
            {
              step: 1,
              title: "Contact Opportunity Hub",
              desc: "Contact us by WhatsApp or email to request reseller access.",
            },
            {
              step: 2,
              title: "Get your reseller link",
              desc: "After approval, you receive your unique reseller tracking link.",
            },
            {
              step: 3,
              title: "Refer subscribers",
              desc: "Share Opportunity Hub with people who need the service.",
            },
            {
              step: 4,
              title: "Earn commission",
              desc: "Qualifying active paid subscriptions are counted toward your commission.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                {step}
              </div>

              <div>
                <p className="font-semibold text-foreground">
                  {title}
                </p>

                <p className="text-muted-foreground text-sm">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CONTACT US */}
      <div className="bg-card border rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Contact Us
          </h2>

          <p className="text-muted-foreground text-sm mt-1">
            You can contact us directly by WhatsApp or email. The contact
            details are also written below in case a button does not open.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground mb-1">
              WhatsApp
            </p>

            <p className="text-foreground font-medium break-all">
              {DISPLAY_WHATSAPP}
            </p>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 bg-green-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={18} />
              Chat on WhatsApp
            </a>
          </div>

          <div className="border rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground mb-1">
              Email
            </p>

            <p className="text-foreground font-medium break-all">
              {SUPPORT_EMAIL}
            </p>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Reseller%20Application`}
              className="inline-flex items-center gap-2 mt-3 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              <Mail size={18} />
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
