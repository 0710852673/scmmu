import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";
import { Button } from "@/components/ui/button";
import { listTrash, restoreTrashItem, purgeTrashItem } from "@/lib/audit.functions";
import { getPortalAccess } from "@/lib/access";
import { RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/portal/admin/trash")({
  beforeLoad: async ({ context }) => {
    const access = await getPortalAccess(context.user.id);
    if (!access.roles.some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r)))
      throw redirect({ to: "/portal" });
  },
  component: TrashPage,
});

function TrashPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data ?? []).some((r) => r.role === "administrator");
    },
  });

  const { data, isLoading } = useQuery({ queryKey: ["trash"], queryFn: () => listTrash() });

  async function act(kind: "restore" | "purge", row: { table: any; id: string; title: string }) {
    if (kind === "purge" && !confirm(`Permanently delete “${row.title}”? This cannot be undone.`)) return;
    setBusy(row.id);
    try {
      const payload = { data: { table: row.table, id: row.id, title: row.title } };
      if (kind === "restore") await restoreTrashItem(payload);
      else await purgeTrashItem(payload);
      toast.success(kind === "restore" ? "Item restored" : "Item permanently deleted");
      qc.invalidateQueries({ queryKey: ["trash"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalPage eyebrow="RECOVERY" title="Bin">
      {isLoading ? (
        <Empty>Loading bin…</Empty>
      ) : (data ?? []).length === 0 ? (
        <Empty>The bin is empty.</Empty>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((row) => (
            <Card key={`${row.table}-${row.id}`} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{row.title}</div>
                <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {row.label} · deleted {new Date(row.deleted_at).toLocaleString()}
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => act("restore", row)}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
              {isAdmin && (
                <Button size="sm" variant="destructive" disabled={busy === row.id} onClick={() => act("purge", row)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete forever
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
