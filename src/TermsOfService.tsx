import { motion } from "framer-motion";
import { FileText, Shield, AlertTriangle, DollarSign, Lock, Phone } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <FileText size={20} />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Terms of Service</h1>
        </div>
        <p className="text-muted-foreground">Last updated: March 2026</p>
      </motion.div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
        <p className="text-base font-semibold text-foreground">
          By using Opportunity Hub, you agree to these terms. Please read them carefully.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText size={18} className="text-primary" /> Platform Purpose
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Opportunity Hub is a <strong>lead discovery platform</strong> — it helps professionals (freelancers, teachers, coaches, food businesses, and HomeChefs) find potential clients. All payments, negotiations, and contracts are managed entirely outside the platform, between you and the client.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <DollarSign size={18} className="text-primary" /> Payments & External Dealings
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>• Opportunity Hub <strong>does not handle payments</strong> between users and clients. We are not liable for any financial transactions.</p>
            <p>• Deals, contracts, and negotiations must happen externally — via email, phone, or any other channel.</p>
            <p>• Our philosophy: <em className="font-semibold text-foreground">"Earn first, then pay"</em> — commissions and referral rewards grow together with the community.</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Scam Avoidance
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>• <strong>Never share sensitive personal information</strong> (bank details, passwords, ID scans) with unknown clients.</p>
            <p>• All contact information displayed on lead cards is <strong>publicly sourced</strong> — verify leads independently before committing to deals.</p>
            <p>• Use source URLs to confirm the legitimacy of each lead. If something feels suspicious, report it as spam through the platform.</p>
            <p>• Opportunity Hub is not responsible for the accuracy or outcome of leads. We provide a discovery service, not a guarantee.</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Lock size={18} className="text-primary" /> Account Rules
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>• <strong>One email + one phone = one account.</strong> Sharing login links or credentials leads to immediate account suspension.</p>
            <p>• Subscriptions are strictly personal — they cannot be transferred or shared.</p>
            <p>• Accounts inactive or unpaid for 2 consecutive months are removed. Data is not recoverable after removal.</p>
            <p>• Users are responsible for backing up any important information (e.g., client contacts, notes) outside the platform.</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Phone size={18} className="text-primary" /> Device & Access
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>• If you lose access to your registered device or mobile number, contact us at <a href="mailto:logicguild733@gmail.com" className="text-primary hover:underline">logicguild733@gmail.com</a> to request a new login link.</p>
            <p>• <strong>Old data is not recoverable</strong> after device loss — we only issue a fresh access link.</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield size={18} className="text-primary" /> Lead Sources & Privacy
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>• Leads are sourced exclusively from free, public platforms: <strong>Google Business, Facebook Groups, LinkedIn public posts, and X (Twitter) public posts</strong>.</p>
            <p>• We do not source leads from paid platforms or private data.</p>
            <p>• Every lead includes a source URL for independent verification.</p>
            <p>• Leads older than 30 days are automatically hidden to ensure freshness.</p>
            <p>• Duplicate leads (same email + phone + source) are automatically filtered.</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground">Industries Supported</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            {[
              { label: "Freelancers", skills: "Design, Writing, SEO, Coding, Video, Marketing" },
              { label: "Teachers & Coaches", skills: "Quran, Arabic, Academic, Life Coach, Career Coach" },
              { label: "Food Business", skills: "Catering, Events, Cafeteria, Vendors" },
              { label: "HomeChef", skills: "Private Chef, Meal Prep, Event Cooking" },
            ].map(({ label, skills }) => (
              <div key={label} className="bg-secondary/50 rounded-xl p-3">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-xs mt-1">{skills}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h2 className="text-xl font-bold text-foreground">Contact</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            For questions about these terms, contact us at{" "}
            <a href="mailto:logicguild733@gmail.com" className="text-primary hover:underline font-semibold">logicguild733@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
