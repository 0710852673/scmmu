import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";
import { Mail, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/messages")({
  component: AdminMessages,
});

function AdminMessages() {
  const qc = useQueryClient();
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

  return (
    <PortalPage eyebrow="Administrator" title="Contact messages">
      {messages && messages.length > 0 ? (
        <div className="space-y-3 max-w-3xl">
          {messages.map((m) => (
            <Card key={m.id} className={m.handled ? "opacity-60" : ""}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand" />
                  <span className="font-display font-bold">{m.subject || "Message"}</span>
                </div>
                {!m.handled && (
                  <button onClick={() => markHandled(m.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted">
                    <Check className="h-3 w-3" /> Mark handled
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{m.name} · {m.email} {m.whatsapp ? `· ${m.whatsapp}` : ""}</p>
              <p className="text-sm mt-3 whitespace-pre-wrap">{m.message}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">{new Date(m.created_at).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>No contact messages yet.</Empty>
      )}
    </PortalPage>
  );
}
