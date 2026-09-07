import { motion } from "framer-motion";
import { Users, DollarSign, Star, Mail, Crown, Globe } from "lucide-react";

const PRICING = [
  { plan: "Basic", pakistan: "PKR 1,500", international: "15", note: "2 skills · 15 leads/day" },
  { plan: "Premium", pakistan: "PKR 2,500", international: "35", note: "5 skills · 50 leads/day" },
  { plan: "Gold", pakistan: "PKR 6,000", international: "70", note: "Unlimited skills & leads", highlight: true },
];

export default function Reseller() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reseller Program</h1>
        </div>
        <p className="text-muted-foreground text-lg">Earn commissions by referring new subscribers to Opportunity Hub.</p>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-6 flex flex-col">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <DollarSign size={24} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">30% Commission</h2>
          <p className="text-muted-foreground text-sm flex-1">
            Earn 30% on every subscription sale you refer. Commission stays active while referred subscriptions remain active.
          </p>
        </div>

        <div className="bg-card border-2 border-amber-300/50 rounded-2xl p-6 flex flex-col relative">
          <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">BONUS</div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 mb-4">
            <Star size={24} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">100% Every 5th Sale</h2>
          <p className="text-muted-foreground text-sm flex-1">
            Every 5th subscription you sell earns <strong>100% commission</strong>. Repeats automatically — 10 sales = 8×30% + 2×100%.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 flex flex-col">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center text-yellow-600 mb-4">
            <Crown size={24} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Gold Bonus</h2>
          <p className="text-muted-foreground text-sm flex-1">
            Sell <strong>2 Gold subscriptions</strong> and receive <strong>1 free Gold subscription</strong> for yourself — valid while both remain active.
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Commission Structure</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">Sale #</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Commission</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4].map(n => (
                <tr key={n}>
                  <td className="py-2 text-foreground">Sale {n}</td>
                  <td className="py-2 font-semibold text-foreground">30%</td>
                  <td className="py-2 text-muted-foreground">Standard commission</td>
                </tr>
              ))}
              <tr className="bg-amber-50 dark:bg-amber-500/10">
                <td className="py-2 text-amber-700 dark:text-amber-400 font-bold">Sale 5 🎉</td>
                <td className="py-2 text-amber-700 dark:text-amber-400 font-bold">100%</td>
                <td className="py-2 text-amber-700 dark:text-amber-400">Bonus — repeats every 5th sale</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground" colSpan={3}>Sales 6, 7, 8, 9 → 30% each · Sale 10 → 100% · And so on…</td>
              </tr>
              <tr className="bg-yellow-50 dark:bg-yellow-500/10">
                <td className="py-2 text-yellow-700 dark:text-yellow-400 font-bold">2 Gold sales ⭐</td>
                <td className="py-2 text-yellow-700 dark:text-yellow-400 font-bold">Free Gold</td>
                <td className="py-2 text-yellow-700 dark:text-yellow-400">Free Gold subscription for you</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Example: 10 total sales = 8 at 30% + 2 at 100%.</p>
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={20} className="text-primary" />
          <h2 className="text-xl font-bold text-foreground">Subscription Pricing</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">Plan</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Pakistan</th>
                <th className="text-left py-2 text-muted-foreground font-medium">International</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Includes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PRICING.map(p => (
                <tr key={p.plan} className={p.highlight ? "bg-yellow-50 dark:bg-yellow-500/10" : ""}>
                  <td className={`py-3 font-bold ${p.highlight ? "text-yellow-700 dark:text-yellow-400" : "text-foreground"}`}>
                    {p.plan} {p.highlight ? "⭐" : ""}
                  </td>
                  <td className="py-3 text-foreground font-semibold">{p.pakistan}</td>
                  <td className="py-3 text-foreground font-semibold">{p.international} <span className="text-xs text-muted-foreground">(SAR/AED/USD/GBP/CAD/AUD)</span></td>
                  <td className="py-3 text-muted-foreground text-xs">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Students get 50% off Basic plan for the first 2 months. 14-day free trial for all new users.</p>
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-foreground">How to Join</h2>
        <div className="space-y-3">
          {[
            { step: 1, title: "Apply by email", desc: 'Send an email with the subject "Reseller Application" to get approved.' },
            { step: 2, title: "Get your reseller link", desc: "We'll activate your account and provide a tracking referral link." },
            { step: 3, title: "Refer subscribers", desc: "Share Opportunity Hub and earn commissions on every sale." },
            { step: 4, title: "Track earnings in admin", desc: "Commission counts and bonuses update automatically in your dashboard." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">{step}</div>
              <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-muted-foreground text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
        <h2 className="text-xl font-bold text-foreground mb-3">Ready to Apply?</h2>
        <p className="text-muted-foreground mb-6">Send an email with subject "Reseller Application" to get started.</p>
        <a
          href="mailto:logicguild733@gmail.com?subject=Reseller Application"
          className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Mail size={18} />
          Apply Now — logicguild733@gmail.com
        </a>
      </div>
    </div>
  );
}
