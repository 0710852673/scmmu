import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/site/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Member Sign In — SCCMU" },
      { name: "description", content: "SCCMU member portal sign-in." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/portal" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = /invalid|credential|password/i.test(error.message)
        ? "Email or password is incorrect. Please try again."
        : error.message;
      return toast.error(msg);
    }
    toast.success("Signed in");
    navigate({ to: "/portal" });
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="relative hidden md:flex flex-col justify-between p-12 overflow-hidden brand-gradient text-white">
        <motion.div className="absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <Link to="/" className="relative flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="font-display text-xl font-extrabold tracking-tight">SCCMU</span>
        </Link>
        <div className="relative">
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-display text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Member portal.
          </motion.h1>
          <p className="mt-5 max-w-md text-white/85">
            Sign in to track contributions, attendance and rankings. Accounts are issued by administrators.
          </p>
        </div>
        <div className="relative text-[10px] uppercase tracking-[0.22em] text-white/70">Sivali Central College Media Unit</div>
      </div>

      <div className="flex flex-col justify-center px-6 py-20 md:px-16">
        <div className="md:hidden mb-10"><LogoMark size={36} /></div>
        <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Sign in</h2>
        <p className="text-muted-foreground text-sm mb-10">No public registration. Ask an administrator for an account.</p>

        <form onSubmit={signIn} className="space-y-5 max-w-sm">
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
          </label>
          <button disabled={loading}
            className="w-full rounded-full brand-gradient px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <Link to="/" className="mt-10 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
