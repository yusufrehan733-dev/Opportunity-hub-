import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Shield size={20} />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Privacy Policy</h1>
        </div>
        <p className="text-muted-foreground">Last updated: March 2026</p>
      </motion.div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground">What We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">Opportunity Hub collects only basic information to operate the platform:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Email address</li>
            <li>Phone number (optional)</li>
            <li>Selected skills</li>
            <li>Login data</li>
          </ul>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground">Lead Data</h2>
          <p className="text-muted-foreground leading-relaxed">
            All leads displayed on the platform come from publicly available information on the internet. We do not collect or store private communications.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground">Payment Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            Opportunity Hub never asks for credit card numbers or banking passwords. All payment arrangements are made outside the platform.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground">Account Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            Each account is limited to one email address and one phone number. Account sharing is not allowed and may result in suspension. Users should avoid sharing sensitive personal information with unknown clients.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related questions, contact us at{" "}
            <a href="mailto:logicguild733@gmail.com" className="text-primary hover:underline">logicguild733@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
