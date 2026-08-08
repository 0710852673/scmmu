import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty } from "@/components/portal/PortalUI";
import { Bell, Check, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/notifications")({
  component: Notifications,
});

const PRIORITY_CLASS: Record<string, string> = {
  high: "bg-red-500/15 text-red-700 dark:text-red-300",
  normal: "bg-muted text-foreground",
  low: "bg-muted text-muted-foreground",
};

function Notifications() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: async () => {
      const { data: rows } = await supabase.from("notifications").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      return rows ?? [];
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    qc.invalidateQueries({ queryKey: ["notifications-unread", user.id] });
  }

  async function markAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
    refresh();
  }
  async function markOne(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    refresh();
  }
  async function remove(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    refresh();
  }

  const unread = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <PortalPage
      eyebrow="INBOX"
      title="Notifications"
      action={unread > 0 ? (
        <button onClick={markAll} className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-muted">
          Mark all read ({unread})
        </button>
      ) : null}
    >
      {isLoading ? (
        <Empty>Loading…</Empty>
      ) : (data ?? []).length === 0 ? (
        <Empty>Nothing here yet. Assignments, approvals and announcements will appear in this inbox.</Empty>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((n) => (
            <div key={n.id} className={`rounded-xl border p-4 ${n.read_at ? "border-border bg-card" : "border-brand/40 bg-brand/5"}`}>
              <div className="flex items-start gap-3">
                <Bell className={`h-4 w-4 mt-1 shrink-0 ${n.read_at ? "text-muted-foreground" : "text-brand"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${PRIORITY_CLASS[n.priority] ?? "bg-muted"}`}>{n.kind}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 font-semibold">{n.title}</div>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                  {n.link && (
                    <a href={n.link} className="mt-2 inline-block text-xs font-bold uppercase tracking-widest text-brand hover:underline">
                      Open
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {!n.read_at && (
                    <button onClick={() => markOne(n.id)} aria-label="Mark read" className="rounded-md p-1.5 hover:bg-muted"><Check className="h-3.5 w-3.5" /></button>
                  )}
                  <button onClick={() => remove(n.id)} aria-label="Delete" className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
