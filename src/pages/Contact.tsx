import { motion } from "framer-motion";
import { Mail, MessageSquare } from "lucide-react";
no
export default function Contact() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <MessageSquare size={20} />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Contact Us</h1>
        </div>
        <p className="text-muted-foreground text-lg">We're here to help. Reach out for support, questions, or reseller applications.</p>
      </motion.div>

      <div className="space-y-4">
        <div className="bg-card border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Email Support</h2>
              <p className="text-muted-foreground mb-4">For support, reseller applications, or any questions:</p>
              <a
                href="mailto:logicguild733@gmail.com"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
              >
                <Mail size={18} />
                logicguild733@gmail.com
              </a>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-3">Common Inquiries</h2>
          <div className="space-y-3">
            <div className="p-3 bg-secondary/50 rounded-xl">
              <p className="font-semibold text-foreground text-sm">Reseller Application</p>
              <p className="text-muted-foreground text-sm">Subject: <span className="font-mono">Reseller Application</span></p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-xl">
              <p className="font-semibold text-foreground text-sm">Subscription / Billing</p>
              <p className="text-muted-foreground text-sm">Subject: <span className="font-mono">Subscription Inquiry</span></p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-xl">
              <p className="font-semibold text-foreground text-sm">Technical Support</p>
              <p className="text-muted-foreground text-sm">Subject: <span className="font-mono">Support Request</span></p>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
          <p className="text-lg font-display font-semibold text-primary italic">"Earn First, Pay After."</p>
        </div>
      </div>
    </div>
  );
}
