import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Mail, UserPlus } from "lucide-react";
import { PortalPage, Card, SectionTitle, Empty } from "@/components/portal/PortalUI";
import { onboardCreateMember, onboardList, onboardSendWelcome } from "@/lib/onboarding.functions";
import { DIVISIONS, DIVISION_LABEL } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/portal/admin/onboarding")({
  component: OnboardingPage,
});

const STATUS: Record<string, string> = {
  awaiting_authorization: "Awaiting your authorization",
  sending: "Sending…",
  accepted: "Accepted by Gmail",
  failed: "Failed",
};

const input = "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";

function OnboardingPage() {
  const qc = useQueryClient();
  const create = useServerFn(onboardCreateMember);
  const list = useServerFn(onboardList);
  const send = useServerFn(onboardSendWelcome);
  const { data: rows = [], isLoading, error: listError } = useQuery({ queryKey: ["onboarding"], queryFn: () => list() });
  const [form, setForm] = useState({ full_name: "", email: "", grade: "", class: "", whatsapp: "", primary_division: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { full_name: string; email: string; mu: string | null; temp_password: string }>(null);
  const [confirmFor, setConfirmFor] = useState<any>(null);
  const [typed, setTyped] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await create({ data: form });
      setResult(r);
      setForm({ full_name: "", email: "", grade: "", class: "", whatsapp: "", primary_division: "" });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      toast.success("Account created. No email was sent.");
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong.");
    } finally { setBusy(false); }
  }

  async function doSend() {
    setSending(true);
    try {
      await send({ data: { user_id: confirmFor.user_id, confirm_email: typed } });
      toast.success("Welcome email accepted by Gmail.");
      setConfirmFor(null); setTyped("");
    } catch (err: any) { toast.error(err?.message ?? "Email failed."); }
    finally { setSending(false); qc.invalidateQueries({ queryKey: ["onboarding"] }); }
  }

  return (
    <PortalPage eyebrow="ADMIN" title="MEMBER ONBOARDING">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle sub="Creates the account with a temporary password and MU number. No email is sent.">Add one member</SectionTitle>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs font-semibold">Full name *<input required className={input} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
            <label className="sm:col-span-2 text-xs font-semibold">Email *<input required type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="text-xs font-semibold">Grade<input className={input} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></label>
            <label className="text-xs font-semibold">Class<input className={input} value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} /></label>
            <label className="text-xs font-semibold">WhatsApp<input className={input} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
            <label className="text-xs font-semibold">Section
              <select className={input} value={form.primary_division} onChange={(e) => setForm({ ...form, primary_division: e.target.value })}>
                <option value="">—</option>
                {DIVISIONS.map((d: string) => <option key={d} value={d}>{(DIVISION_LABEL as any)[d] ?? d}</option>)}
              </select>
            </label>
            <button disabled={busy} className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full brand-gradient px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        </Card>

        {result && (
          <Card>
            <SectionTitle sub="Shown once. It is not stored. Sending the welcome email later issues a new temporary password.">Account created</SectionTitle>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Name</dt><dd className="font-semibold">{result.full_name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">MU number</dt><dd className="font-semibold">{result.mu ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd className="break-all">{result.email}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Temporary password</dt>
                <dd className="flex items-center gap-2 font-mono font-bold">{result.temp_password}
                  <button type="button" aria-label="Copy password" onClick={() => { navigator.clipboard.writeText(result.temp_password); toast.success("Copied"); }}><Copy className="h-4 w-4" /></button>
                </dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">The member must change this password on first sign-in.</p>
            <button onClick={() => setResult(null)} className="mt-4 text-sm font-semibold text-muted-foreground hover:text-foreground">Hide</button>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <SectionTitle sub="Emails are only sent when you press Send and confirm for that one member.">Welcome emails</SectionTitle>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
          : listError ? <p className="text-sm text-destructive">Something went wrong loading this list.</p>
          : rows.length === 0 ? <Empty>No onboarded members yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Member</th><th>MU</th><th>Account</th><th>Email status</th><th></th></tr></thead>
              <tbody>
                {rows.map((r: any) => {
                  const eligible = r.account_exists && r.must_change && r.email_status !== "sending";
                  return (
                    <tr key={r.user_id} className="border-t border-border">
                      <td className="py-2"><div className="font-semibold">{r.profile?.full_name}</div><div className="text-xs text-muted-foreground break-all">{r.profile?.email}</div></td>
                      <td>{r.profile?.admission_number ?? "—"}</td>
                      <td className="text-xs">{!r.account_exists ? "Missing" : r.must_change ? "Must change password" : "Active (password set)"}</td>
                      <td className="text-xs">{STATUS[r.email_status] ?? r.email_status}{r.email_error && <div className="text-destructive">{r.email_error}</div>}</td>
                      <td className="text-right">
                        <button disabled={!eligible} onClick={() => { setConfirmFor(r); setTyped(""); }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                          <Mail className="h-3.5 w-3.5" /> {r.email_status === "failed" ? "Retry" : r.email_status === "accepted" ? "Resend" : "Send"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {confirmFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-display text-xl font-bold">Send 1 welcome email?</h2>
            <p className="mt-2 text-sm text-muted-foreground">To <b className="text-foreground break-all">{confirmFor.profile?.email}</b> ({confirmFor.profile?.full_name}). A new temporary password will be issued and included in the email.</p>
            <label className="mt-4 block text-xs font-semibold">Type the recipient's email to confirm
              <input className={input} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus /></label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmFor(null)} className="rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
              <button disabled={sending || typed.trim().toLowerCase() !== (confirmFor.profile?.email ?? "").toLowerCase()} onClick={doSend}
                className="rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{sending ? "Sending…" : "Send email"}</button>
            </div>
          </div>
        </div>
      )}
    </PortalPage>
  );
}
