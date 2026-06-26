import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/portal" });
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex bg-foreground text-background p-12 flex-col justify-between">
        <Link to="/" className="text-2xl font-bold tracking-tighter">
          SCC<span className="text-accent">MU</span>
        </Link>
        <div>
          <h1 className="font-serif text-6xl leading-tight">
            Member <span className="italic text-accent">portal.</span>
          </h1>
          <p className="mt-6 text-background/60 max-w-md">
            Track your attendance, contributions, skill levels and standings. Accounts are created by administrators.
          </p>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-background/40">sccmu.lk</div>
      </div>

      <div className="flex flex-col justify-center px-6 py-20 md:px-16">
        <h2 className="font-serif text-4xl mb-2">Sign in</h2>
        <p className="text-foreground/60 text-sm mb-10">No public registration. Contact an administrator if you need an account.</p>

        <form onSubmit={signIn} className="space-y-5 max-w-sm">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-foreground/20 bg-background p-3 text-sm focus:outline-none focus:border-foreground"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-foreground/20 bg-background p-3 text-sm focus:outline-none focus:border-foreground"
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-foreground text-background py-4 text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <Link to="/" className="mt-10 text-xs uppercase tracking-widest text-foreground/40 hover:text-foreground">
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
