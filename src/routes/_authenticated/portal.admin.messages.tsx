import { getPortalAccess } from "@/lib/access";
import { createFileRoute , redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";
import { Mail, Check, Trash2, Send, AlertCircle } from "lucide-react";
import { notifyContactMessage } from "@/lib/email.functions";

export const Route = createFileRoute("/_authenticated/portal/admin/messages")({
  beforeLoad: async ({ context }) => {
    const access = await getPortalAccess(context.user.id);
    if (!access.roles.some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r)))
      throw redirect({ to: "/portal" });
  },
  component: AdminMessages,
});

function AdminMessages() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: messages } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function markHandled(id: string) {
    const { error } = await supabase.from("contact_messages").update({ handled: true }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
  }

  async function resend(id: string) {
    setBusy(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const res = await notifyContactMessage({ data: { messageId: id } });
      if (res?.ok === false) throw new Error("Send failed");
      toast.success("Confirmation resent");
    } catch (e: any) {
      setErrors((s) => ({ ...s, [id]: e?.message || "Failed to send" }));
      toast.error("Email failed");
    } finally { setBusy(null); }
  }

  async function del(id: string) {
    if (!confirm("Delete this message permanently?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Message deleted");
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
  }

  return (
    <PortalPage eyebrow="STAFF" title="Contact messages">
      {messages && messages.length > 0 ? (
        <div className="space-y-3 max-w-3xl">
          {messages.map((m) => (
            <Card key={m.id} className={m.handled ? "opacity-70" : ""}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand" />
                  <span className="font-display font-bold">{m.subject || "Message"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => resend(m.id)} disabled={busy === m.id} aria-label="Resend confirmation"
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50">
                    <Send className="h-3 w-3" /> Resend
                  </button>
                  {!m.handled && (
                    <button onClick={() => markHandled(m.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted">
                      <Check className="h-3 w-3" /> Handled
                    </button>
                  )}
                  <button onClick={() => del(m.id)} aria-label="Delete"
                    className="text-destructive hover:bg-destructive/10 rounded-md p-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{m.name} · {m.email} {m.whatsapp ? `· ${m.whatsapp}` : ""}</p>
              <p className="text-sm mt-3 whitespace-pre-wrap">{m.message}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">{new Date(m.created_at).toLocaleString()}</p>
              {errors[m.id] && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
                  <div className="flex-1">Failed to send: {errors[m.id]}. <button className="underline font-semibold ml-1" onClick={() => resend(m.id)}>Retry</button></div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Empty>No contact messages yet.</Empty>
      )}
    </PortalPage>
  );
}
