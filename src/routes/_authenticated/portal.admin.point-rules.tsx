import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, SectionTitle, Empty } from "@/components/portal/PortalUI";
import { prettyLabel } from "@/lib/site-content";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/point-rules")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => r.role === "administrator")) throw redirect({ to: "/portal" });
  },
  component: AdminPointRules,
});

type Rule = { kind: string; label: string; points: number };

function AdminPointRules() {
  const { data, refetch } = useQuery({
    queryKey: ["point-rules"],
    queryFn: async () => ((await supabase.from("point_rules").select("kind,label,points").order("kind")).data ?? []) as Rule[],
  });

  const [rules, setRules] = useState<Rule[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setRules(data); }, [data]);

  async function save() {
    setSaving(true);
    const results = await Promise.all(
      rules.map((r) => supabase.from("point_rules").update({ points: r.points, label: r.label }).eq("kind", r.kind)),
    );
    setSaving(false);
    const err = results.find((r) => r.error)?.error;
    if (err) return toast.error(err.message);
    toast.success("Point rules updated. New approvals use these values.");
    refetch();
  }

  return (
    <PortalPage
      eyebrow="ADMINISTRATOR"
      title="POINT RULES"
      action={
        <button onClick={save} disabled={saving || rules.length === 0}
          className="inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      <Card className="max-w-3xl">
        <SectionTitle sub="Points awarded automatically the moment a request is approved. Changes apply to future approvals only.">
          Scoring
        </SectionTitle>
        {rules.length === 0 ? (
          <Empty>No point rules configured.</Empty>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((r, i) => (
              <div key={r.kind} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.label || prettyLabel(r.kind)}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{r.kind}</div>
                </div>
                <input
                  value={r.label}
                  onChange={(e) => setRules((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  className="w-52 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Label shown to members"
                />
                <input
                  type="number" min={0} value={r.points}
                  onChange={(e) => setRules((p) => p.map((x, j) => (j === i ? { ...x, points: Number(e.target.value) } : x)))}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-right font-bold"
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </PortalPage>
  );
}
