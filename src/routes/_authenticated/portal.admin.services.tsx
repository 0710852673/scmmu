import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, SectionTitle } from "@/components/portal/PortalUI";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/services")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => r.role === "administrator")) throw redirect({ to: "/portal" });
  },
  component: AdminServices,
});

const DIVS = ["photography", "editing", "videography", "streaming", "technical", "announcing", "social_media"] as const;
type Svc = { key: string; label: string; division: string; active: boolean; display_order: number };

function AdminServices() {
  const { data, refetch } = useQuery({
    queryKey: ["services-admin"],
    queryFn: async () => ((await supabase.from("services").select("*").order("display_order")).data ?? []) as Svc[],
  });
  const { data: heads } = useQuery({
    queryKey: ["division-heads"],
    queryFn: async () => {
      const { data: r } = await supabase.from("user_roles").select("user_id,division").eq("role", "section_head");
      const ids = (r ?? []).map((x) => x.user_id);
      const { data: p } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] as any[] };
      return (r ?? []).map((x) => ({ division: x.division, name: (p ?? []).find((y: any) => y.id === x.user_id)?.full_name ?? "—" }));
    },
  });
  const [newLabel, setNewLabel] = useState("");
  const [newDiv, setNewDiv] = useState<string>("photography");

  async function update(key: string, patch: Partial<Svc>) {
    const { error } = await supabase.from("services").update(patch as never).eq("key", key);
    if (error) return toast.error("Could not save. Please try again.");
    refetch();
  }
  async function add() {
    const label = newLabel.trim();
    if (!label) return;
    const { error } = await supabase.from("services").insert({ key: label, label, division: newDiv as never, display_order: (data?.length ?? 0) + 1 });
    if (error) return toast.error("That service already exists or could not be added.");
    setNewLabel(""); refetch(); toast.success("Service added");
  }
  async function remove(key: string) {
    if (!confirm(`Remove "${key}"? Existing bookings keep their history.`)) return;
    await supabase.from("services").delete().eq("key", key);
    refetch();
  }

  return (
    <PortalPage eyebrow="SMART ASSIGNMENT" title="Services & routing">
      <p className="mb-4 text-sm text-muted-foreground">
        Each service a client can book is routed to one division. When a booking arrives, only the heads of the matching divisions are assigned, notified and emailed.
      </p>
      <Card>
        <SectionTitle>Services</SectionTitle>
        <div className="space-y-2">
          {(data ?? []).map((s) => {
            const h = (heads ?? []).filter((x) => x.division === s.division).map((x) => x.name);
            return (
              <div key={s.key} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground">Head: {h.length ? h.join(", ") : "No head assigned to this division yet"}</div>
                </div>
                <select className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={s.division}
                  onChange={(e) => update(s.key, { division: e.target.value })}>
                  {DIVS.map((d) => <option key={d} value={d}>{d.replace("_", " ")}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.active} onChange={(e) => update(s.key, { active: e.target.checked })} /> Active
                </label>
                <button onClick={() => remove(s.key)} className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${s.label}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="New service (e.g. Drone)"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <select className="rounded-md border border-border bg-background px-2 py-2 text-sm" value={newDiv} onChange={(e) => setNewDiv(e.target.value)}>
            {DIVS.map((d) => <option key={d} value={d}>{d.replace("_", " ")}</option>)}
          </select>
          <button onClick={add} className="inline-flex items-center justify-center gap-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </Card>
    </PortalPage>
  );
}
