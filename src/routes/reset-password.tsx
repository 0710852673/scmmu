import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { LogoMark } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — SCCMU" },
      { name: "description", content: "Set a new password for the SCCMU member portal." },
      { property: "og:title", content: "Reset Password — SCCMU" },
      { property: "og:description", content: "Set a new password for the SCCMU member portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const isRecovery = hash.get("type") === "recovery";
    supabase.auth.getSession().then(({ data }) => {
      if (isRecovery || data.session) setReady(true);
      else setError("This reset link is invalid or has expired. Request a new link from the sign-in page.");
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      const message = friendlyAuthError(updateError);
      setError(message);
      toast.error(message);
      return;
    }
    setDone(true);
    toast.success("Password updated successfully.");
    window.setTimeout(() => navigate({ to: "/portal", replace: true }), 900);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm md:p-8">
        <Link to="/" aria-label="SCCMU home"><LogoMark size={36} /></Link>
        <h1 className="mt-8 font-display text-3xl font-extrabold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a secure password for your member portal account.</p>
        {done ? (
          <div className="mt-8 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>Your password is updated. Opening the portal…</span>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <label className="block text-sm font-semibold">New password
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready || busy} className="mt-1.5 h-11 w-full rounded-md border border-border bg-background px-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">Confirm password
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!ready || busy} className="mt-1.5 h-11 w-full rounded-md border border-border bg-background px-3 font-normal" />
            </label>
            <Button type="submit" disabled={!ready || busy} className="h-11 w-full">
              <KeyRound /> {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
        <Link to="/auth" className="mt-6 inline-block text-sm font-semibold text-muted-foreground hover:text-foreground">Back to sign in</Link>
      </section>
    </main>
  );
}