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

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials"))
    return "Email or password is incorrect. Please check and try again.";
  if (m.includes("email not confirmed")) return "This account hasn't been confirmed yet. Contact an administrator.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Can't reach the server. Check your internet connection and try again.";
  return message || "Sign in failed. Please try again.";
}

function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!alive) return;
        if (data.user) navigate({ to: "/portal" });
        else setChecking(false);
      })
      .catch(() => alive && setChecking(false));
    return () => { alive = false; };
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter both your email and password.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (err || !data.session) {
      const msg = friendlyAuthError(err?.message ?? "Sign in failed.");
      setError(msg);
      toast.error(msg);
      return;
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

        <form onSubmit={signIn} noValidate className="space-y-5 max-w-sm">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive"
            >
              {error}
            </div>
          )}
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Email</span>
            <input type="email" required autoComplete="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              aria-invalid={!!error}
              className={`w-full rounded-lg border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-destructive/60" : "border-border"}`} />
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Password</span>
            <input type="password" required autoComplete="current-password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              aria-invalid={!!error}
              className={`w-full rounded-lg border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-destructive/60" : "border-border"}`} />
          </label>
          <button disabled={loading || checking}
            className="w-full rounded-full brand-gradient px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50">
            {loading ? "Signing in…" : checking ? "Checking session…" : "Sign in"}
          </button>
        </form>

        <Link to="/" className="mt-10 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
