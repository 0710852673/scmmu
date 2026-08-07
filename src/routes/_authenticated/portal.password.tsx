import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, SectionTitle } from "@/components/portal/PortalUI";
import { KeyRound, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/password")({
  component: PasswordPage,
});

function PasswordPage() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setPw(""); setConfirm(""); setDone(true);
    toast.success("Password updated.");
  }

  return (
    <PortalPage eyebrow="ACCOUNT" title="PASSWORD">
      <Card className="max-w-lg">
        <SectionTitle sub="Change the password you use to sign in to this portal.">Set a new password</SectionTitle>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">New password</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Confirm new password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
          </label>
          {error && <div className="text-sm text-destructive">{error}</div>}
          {done && (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Password updated successfully.
            </div>
          )}
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-2 rounded-full brand-gradient px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <KeyRound className="h-4 w-4" /> {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </Card>
    </PortalPage>
  );
}
