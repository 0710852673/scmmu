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

const HIDDEN = new Set(["updated_at", "created_at", "id"]);
function ChangeDiff({ oldV, newV }: { oldV: any; newV: any }) {
  const keys = Array.from(new Set([...Object.keys(oldV ?? {}), ...Object.keys(newV ?? {})])).filter((k) => !HIDDEN.has(k));
  const changed = keys.filter((k) => JSON.stringify(oldV?.[k]) !== JSON.stringify(newV?.[k]));
  if (!changed.length) return null;
  const fmt = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return (
    <div className="mt-2 overflow-x-auto rounded-md border border-border text-xs">
      <table className="w-full">
        <thead className="bg-muted/50 text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr><th className="px-2 py-1 text-left">Field</th><th className="px-2 py-1 text-left">Old value</th><th className="px-2 py-1 text-left">New value</th></tr>
        </thead>
        <tbody>
          {changed.slice(0, 12).map((k) => (
            <tr key={k} className="border-t border-border">
              <td className="px-2 py-1 font-semibold">{k.replace(/_/g, " ")}</td>
              <td className="px-2 py-1 text-muted-foreground break-all">{fmt(oldV?.[k]).slice(0, 160)}</td>
              <td className="px-2 py-1 break-all">{fmt(newV?.[k]).slice(0, 160)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
