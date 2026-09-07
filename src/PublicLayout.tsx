import { ReactNode } from "react";
import { Link } from "wouter";
import { Briefcase } from "lucide-react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-display font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <Briefcase size={18} />
            </div>
            Opportunity Hub
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/register" className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">Get started</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      <footer className="border-t bg-card/30 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground font-medium italic">"Earn First, Pay After."</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/subscription-policy" className="hover:text-foreground transition-colors">Subscription Policy</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
