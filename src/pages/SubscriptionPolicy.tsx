import { motion } from "framer-motion";
import { CreditCard, Bell, Shield, Users, Gift, AlertTriangle } from "lucide-react";

export default function SubscriptionPolicy() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <CreditCard size={20} />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Subscription Policy</h1>
        </div>
        <p className="text-muted-foreground">Last updated: March 2026</p>
      </motion.div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
        <p className="text-2xl font-display font-bold text-primary italic">"Earn First, Pay After."</p>
        <p className="text-muted-foreground mt-2">Our commitment to every member of Opportunity Hub.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CreditCard size={18} className="text-primary" /> Plans & Pricing
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground font-medium">Plan</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Pakistan (PKR)</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">International</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Includes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-3 font-semibold text-foreground">Basic</td>
                  <td className="py-3 text-foreground">1,500</td>
                  <td className="py-3 text-foreground">15 <span className="text-xs text-muted-foreground">(SAR/AED/USD/GBP/CAD/AUD)</span></td>
                  <td className="py-3 text-muted-foreground text-xs">2 skills · 15 leads/day</td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-foreground">Premium</td>
                  <td className="py-3 text-foreground">2,500</td>
                  <td className="py-3 text-foreground">35</td>
                  <td className="py-3 text-muted-foreground text-xs">5 skills · 50 leads/day</td>
                </tr>
                <tr className="bg-yellow-50 dark:bg-yellow-500/10">
                  <td className="py-3 font-bold text-yellow-700 dark:text-yellow-400">Gold ⭐</td>
                  <td className="py-3 font-semibold text-yellow-700 dark:text-yellow-400">6,000</td>
                  <td className="py-3 font-semibold text-yellow-700 dark:text-yellow-400">70</td>
                  <td className="py-3 text-muted-foreground text-xs">Unlimited skills & leads</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Students receive 50% off the Basic plan for the first 2 months. All new accounts get a 14-day free trial.</p>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell size={18} className="text-primary" /> Renewal Reminders
          </h2>
          <div className="space-y-2">
            <div className="flex gap-3 items-start p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
              <Bell size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>7 days before expiry:</strong> You'll see a warning banner in the app to remind you to renew your subscription.
              </p>
            </div>
            <div className="flex gap-3 items-start p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/20">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-800 dark:text-rose-300">
                <strong>24 hours before expiry:</strong> A final urgent warning is shown. Contact us immediately to avoid service interruption.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">To renew, email us at <a href="mailto:logicguild733@gmail.com?subject=Subscription Renewal" className="text-primary hover:underline">logicguild733@gmail.com</a> with the subject "Subscription Renewal".</p>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Gift size={18} className="text-primary" /> Referral Rewards
          </h2>
          <div className="space-y-3">
            <div className="p-4 bg-secondary/60 rounded-xl flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">B</div>
              <div>
                <p className="font-semibold text-foreground">Basic Plan Referrers</p>
                <p className="text-sm text-muted-foreground">Refer 5 active paid subscribers → receive <strong>80% off</strong> your subscription while all 5 remain active.</p>
              </div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex gap-4 items-start border border-amber-200 dark:border-amber-500/20">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 text-xs font-bold">P</div>
              <div>
                <p className="font-semibold text-foreground">Premium Plan Referrers</p>
                <p className="text-sm text-muted-foreground">Refer 5 active paid subscribers → receive a <strong>100% free subscription</strong> while all 5 remain active.</p>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl flex gap-4 items-start border border-yellow-200 dark:border-yellow-500/20">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 flex items-center justify-center shrink-0 text-xs font-bold">G</div>
              <div>
                <p className="font-semibold text-foreground">Gold Plan Referrers</p>
                <p className="text-sm text-muted-foreground">Refer just <strong>1 Gold subscriber</strong> → receive a <strong>lifetime free subscription</strong> for yourself.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users size={18} className="text-primary" /> Reseller Commissions
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Sales 1–4: <strong className="text-foreground">30% commission</strong> per subscription</p>
            <p>• Every 5th sale: <strong className="text-foreground">100% commission</strong> (repeats: 5th, 10th, 15th…)</p>
            <p>• Example: 10 total sales = 8 at 30% + 2 at 100%</p>
            <p>• Sell 2 Gold subscriptions → receive a <strong className="text-foreground">free Gold subscription</strong> for yourself</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground">Cancellation & Account Rules</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Users may cancel at any time before the next billing cycle.</p>
            <p>• Subscriptions unpaid for <strong>2 consecutive months</strong> are treated as cancelled and the account is removed.</p>
            <p>• Each email + phone combination = one subscription. Sharing login links leads to account suspension.</p>
            <p>• Lost phone or device: contact us to request a new link. Old data is not recoverable.</p>
            <p>• Accounts removed due to inactivity or non-payment cannot be restored. Save your data externally.</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield size={18} className="text-primary" /> Platform Rules & Safety
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Opportunity Hub <strong>only provides lead information</strong> — all payments and deals are managed externally between you and the client.</p>
            <p>• Never share sensitive personal or banking information through the platform.</p>
            <p>• Only publicly available contact info (email, phone) is shared on lead cards.</p>
            <p>• Report spam or suspicious leads using the Admin verification system.</p>
            <p>• Leads are sourced from free public sources: Google Business, Facebook Groups, LinkedIn, and X (Twitter) public posts.</p>
            <p>• Leads older than 30 days are automatically hidden. All leads include a source URL for verification.</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground">Contact</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            For subscription questions, renewals, or reseller applications, contact us at{" "}
            <a href="mailto:logicguild733@gmail.com" className="text-primary hover:underline font-semibold">logicguild733@gmail.com</a>.
            Include your registered email in the subject line.
          </p>
        </div>
      </div>
    </div>
  );
}
