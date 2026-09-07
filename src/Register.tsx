import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Briefcase, ArrowRight } from "lucide-react";
import { useRegister } from "@/hooks/use-auth";
import { Input, Button, Label } from "@/components/ui";
import { toast } from "sonner";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const registerMutation = useRegister();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerMutation.mutateAsync(data);
      toast.success("Account created successfully!");
      setLocation("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 border-r">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-primary font-display font-bold text-2xl mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <Briefcase size={22} />
              </div>
              Opportunity Hub
            </div>

            <h2 className="text-3xl font-display font-bold tracking-tight text-foreground">
              Create your account
            </h2>
            <p className="mt-2 text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in instead
              </Link>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-10"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  {...register("name")}
                  className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  {...register("phone")}
                />
                <p className="text-xs text-muted-foreground">One phone number per account.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  {...register("password")}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full text-base h-12 mt-4 gap-2" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Creating account..." : "Get started"}
                {!registerMutation.isPending && <ArrowRight size={18} />}
              </Button>
            </form>

            <p className="mt-4 text-xs text-center text-muted-foreground">
              By registering, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="hidden lg:block relative w-1/2 overflow-hidden bg-card">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-90 scale-x-[-1]"
          src={`${import.meta.env.BASE_URL}auth-bg.png`}
          alt="Abstract mesh gradient"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <div className="absolute top-16 left-16 right-16 z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md border border-white/20">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
              New Leads Added Daily
            </div>
            <h1 className="text-5xl font-display font-bold leading-tight text-white drop-shadow-lg">
              Earn First, <br /> Pay After.
            </h1>
            <p className="text-white/80 text-lg max-w-xs">
              Discover clients in freelancing, teaching, food business, and more.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
