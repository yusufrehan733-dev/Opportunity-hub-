import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui";
import { Link } from "wouter";

export default function InactiveSubscription() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-24 h-24 mx-auto bg-rose-100 dark:bg-rose-500/20 text-rose-600 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-rose-500/10">
          <Lock size={40} strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-display font-bold text-foreground mb-4">
          Subscription Inactive
        </h1>
        <p className="text-muted-foreground text-lg mb-2">
          Subscription inactive. Please upgrade to continue.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          Your access to Opportunity Hub has been paused. Contact us to renew your subscription and get back to finding clients.
        </p>

        <a
          href="mailto:logicguild733@gmail.com?subject=Subscription Renewal"
          className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white text-base font-semibold h-14 px-8 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 mb-4"
        >
          <Mail size={20} />
          Contact Us to Renew
        </a>

        <p className="text-sm text-muted-foreground italic">"Earn First, Pay After."</p>

        <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
      </motion.div>
    </div>
  );
}
