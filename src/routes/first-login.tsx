import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { completeFirstLogin } from "@/lib/onboarding.functions";
import { LogoMark } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/first-login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set Your Password — SCCMU" },
      { name: "description", content: "Choose your own password to start using the SCCMU member portal." },
      { property: "og:title", content: "Set Your Password — SCCMU" },
      { property: "og:description", content: "Choose your own password to start using the SCCMU member portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FirstLogin,
});

function FirstLogin() {
  const navigate = useNavigate();
  const finish = useServerFn(completeFirstLogin);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return navigate({ to: "/auth", replace: true });
      if (!data.user.app_metadata?.must_change_password) return navigate({ to: "/portal", replace: true });
      setName((data.user.user_metadata?.full_name as string) ?? "");
    });
  }, [navigate]);

  const checks = [
    { ok: pw.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Za-z]/.test(pw) && /[0-9]/.test(pw), label: "Letters and numbers" },
    { ok: pw.length > 0 && pw === confirm, label: "Both passwords match" },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!checks.every((c) => c.ok)) return setError("Please meet all the password requirements.");
    setBusy(true);
    try {
      await finish({ data: { password: pw } });
      await supabase.auth.refreshSession();
      const { data } = await supabase.auth.getUser();
      if (data.user?.app_metadata?.must_change_password) throw new Error("Password could not be confirmed. Please try again.");
      setDone(true);
      setTimeout(() => navigate({ to: "/portal", replace: true }), 1000);
    } catch (err: any) {
      setError(err?.message?.startsWith("Use at least") || err?.message?.startsWith("Password") ? err.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm md:p-8">
        <LogoMark size={36} />
        <h1 className="mt-8 font-display text-3xl font-extrabold">Welcome{name ? `, ${name.split(" ")[0]}` : ""}!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Before you use the portal, please replace your temporary password with your own.</p>
        {done ? (
          <div className="mt-8 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> Your password is set. Opening your dashboard…
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <label className="block text-sm font-semibold">New password
              <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} disabled={busy} className="mt-1.5 h-11 w-full rounded-md border border-border bg-background px-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">Confirm new password
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} className="mt-1.5 h-11 w-full rounded-md border border-border bg-background px-3 font-normal" />
            </label>
            <ul className="space-y-1 text-xs">
              {checks.map((c) => <li key={c.label} className={c.ok ? "text-primary" : "text-muted-foreground"}>{c.ok ? "✓" : "○"} {c.label}</li>)}
            </ul>
            <Button type="submit" disabled={busy} className="h-11 w-full"><KeyRound /> {busy ? "Saving…" : "Set my password"}</Button>
            <button type="button" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }} className="w-full text-sm text-muted-foreground hover:text-foreground">Sign out</button>
          </form>
        )}
      </section>
    </main>
  );
}
