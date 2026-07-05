import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";
import { Trash2, Send, AlertCircle } from "lucide-react";
import { notifyBookingStatus, notifyBookingSubmitted } from "@/lib/email.functions";

export const Route = createFileRoute("/_authenticated/portal/admin/bookings")({
  component: AdminBookings,
});

function AdminBookings() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");

  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  function noteError(id: string, msg?: string) {
    setErrors((e) => ({ ...e, [id]: msg ?? "" }));
  }

  async function runEmail(id: string, fn: () => Promise<any>, successMsg: string) {
    setBusy(id);
    noteError(id, "");
    try {
      const res = await fn();
      if (res?.ok === false) throw new Error(res?.error || "Send failed");
      toast.success(successMsg);
    } catch (e: any) {
      noteError(id, e?.message || "Failed to send email");
      toast.error("Email failed — see inline message");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(id: string, status: "confirmed" | "rejected" | "completed" | "contacted", reason?: string) {
    const { error } = await supabase.from("bookings").update({ status, ...(reason ? { rejection_reason: reason } : {}) }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    await runEmail(id, () => notifyBookingStatus({ data: { bookingId: id, status, reason } }), `Marked ${status} · requester notified`);
  }

  function onReject(id: string) {
    setRejectFor(id);
    setReasonText("");
  }
  async function confirmReject() {
    if (!rejectFor) return;
    const reason = reasonText.trim();
    if (!reason) return toast.error("Please give a reason");
    const id = rejectFor;
    setRejectFor(null);
    await setStatus(id, "rejected", reason);
  }

  async function resend(id: string, status: string | null) {
    if (status && ["confirmed", "rejected", "completed", "contacted"].includes(status)) {
      await runEmail(id, () => notifyBookingStatus({ data: { bookingId: id, status } }), "Email resent");
    } else {
      await runEmail(id, () => notifyBookingSubmitted({ data: { bookingId: id } }), "Confirmation resent");
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this booking permanently?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Booking deleted");
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
  }

  return (
    <PortalPage eyebrow="STAFF" title="Coverage bookings">
      {bookings && bookings.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {bookings.map((b) => (
            <Card key={b.id}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">{b.event_type ?? "Event"}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest rounded-full bg-muted px-2.5 py-1">{b.status}</span>
                  <button onClick={() => resend(b.id, b.status)} disabled={busy === b.id} aria-label="Resend email"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 disabled:opacity-40">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => del(b.id)} aria-label="Delete booking"
                    className="text-destructive hover:bg-destructive/10 rounded-md p-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-display font-bold text-lg">{b.event_name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{b.contact_person} · {b.email}</p>
              <p className="text-sm mt-2">{b.event_date} · {b.venue}</p>
              {b.notes && <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{b.notes}</p>}
              {b.rejection_reason && (
                <p className="mt-2 text-xs text-red-600"><strong>Rejection reason:</strong> {b.rejection_reason}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setStatus(b.id, "confirmed")} disabled={busy === b.id}
                  className="rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">Confirm</button>
                <button onClick={() => setStatus(b.id, "contacted")} disabled={busy === b.id}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50">Contacted</button>
                <button onClick={() => setStatus(b.id, "completed")} disabled={busy === b.id}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50">Completed</button>
                <button onClick={() => onReject(b.id)} disabled={busy === b.id}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50">Reject</button>
              </div>
              {errors[b.id] && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                  <div className="flex-1">Failed to send: {errors[b.id]}. <button className="underline font-semibold ml-1" onClick={() => resend(b.id, b.status)}>Retry</button></div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Empty>No booking requests yet.</Empty>
      )}

      {rejectFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setRejectFor(null)}>
          <div className="w-full max-w-md rounded-xl bg-background border border-border p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg">Reason for rejection</h3>
            <p className="text-xs text-muted-foreground mt-1">The requester will receive this reason by email.</p>
            <textarea autoFocus value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={4}
              placeholder="e.g. Coverage team already fully booked that day…"
              className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectFor(null)} className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">Cancel</button>
              <button onClick={confirmReject} className="rounded-full bg-red-600 text-white px-4 py-2 text-xs font-semibold hover:bg-red-700">Reject &amp; send</button>
            </div>
          </div>
        </div>
      )}
    </PortalPage>
  );
}
