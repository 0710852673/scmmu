import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";
import { listActivity } from "@/lib/audit.functions";
import { getPortalAccess } from "@/lib/access";
import { Input } from "@/components/ui/input";
import { History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/activity")({
  beforeLoad: async ({ context }) => {
    const access = await getPortalAccess(context.user.id);
    if (!access.roles.some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r)))
      throw redirect({ to: "/portal" });
  },
  component: ActivityPage,
});

const ENTITIES = ["all", "contributions", "gallery_items", "projects", "announcements"];
const ACTIONS = ["all", "approve", "reject", "restore", "purge"];

function ActivityPage() {
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["activity", entity, action, search],
    queryFn: () => listActivity({ data: { entity, action, search } }),
  });

  return (
    <PortalPage eyebrow="AUDIT" title="Activity Log">
      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={entity} onChange={(e) => setEntity(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            {ENTITIES.map((e) => <option key={e} value={e}>{e === "all" ? "All areas" : e.replace(/_/g, " ")}</option>)}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            {ACTIONS.map((a) => <option key={a} value={a}>{a === "all" ? "All actions" : a}</option>)}
          </select>
          <Input placeholder="Search summary…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      {isLoading ? (
        <Empty>Loading activity…</Empty>
      ) : (data ?? []).length === 0 ? (
        <Empty>No activity recorded yet.</Empty>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((row) => (
            <Card key={row.id} className="flex items-start gap-3 py-3">
              <History className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{row.summary}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span>{row.actor_name ?? "System"}</span>
                  <span>{row.action}</span>
                  <span>{row.entity.replace(/_/g, " ")}</span>
                  <span>{new Date(row.created_at).toLocaleString()}</span>
                </div>
                {row.meta?.evidence_url && (
                  <a href={row.meta.evidence_url as string} target="_blank" rel="noreferrer"
                     className="mt-1 inline-block text-xs font-semibold text-brand underline">Evidence link</a>
                )}
                {row.meta?.notified_at && (
                  <div className="text-[11px] text-muted-foreground">
                    Member notified {new Date(row.meta.notified_at as string).toLocaleString()}
                  </div>
                )}
                {(row.old_value || row.new_value) && <ChangeDiff oldV={row.old_value} newV={row.new_value} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
