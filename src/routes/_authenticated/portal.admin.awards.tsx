import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Award, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  listAwards, saveAward, deleteAward, grantAward, revokeAward, runAutoAwards,
} from "@/lib/performance.functions";
import { PortalPage, Card, SectionTitle, Empty } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/admin/awards")({
  component: AwardsPage,
});

const TIERS = ["standard", "bronze", "silver", "gold", "special"];

function AwardsPage() {
  const qc = useQueryClient();
  const load = useServerFn(listAwards);
  const save = useServerFn(saveAward);
  const remove = useServerFn(deleteAward);
  const grant = useServerFn(grantAward);
  const revoke = useServerFn(revokeAward);
  const auto = useServerFn(runAutoAwards);

  const { data } = useQuery({ queryKey: ["awards"], queryFn: () => load() });
  const [editing, setEditing] = useState<any | null>(null);
  const [granting, setGranting] = useState<any | null>(null);

  const memberMap = useMemo(
    () => new Map((data?.members ?? []).map((m: any) => [m.id, m])),
    [data],
  );
  const refresh = () => qc.invalidateQueries({ queryKey: ["awards"] });

  async function submitDef(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const threshold = String(fd.get("points_threshold") ?? "").trim();
    try {
      await save({
        data: {
          id: editing?.id,
          code: String(fd.get("code")),
          name: String(fd.get("name")),
          description: String(fd.get("description") ?? ""),
          icon: String(fd.get("icon") ?? ""),
          tier: String(fd.get("tier") ?? "standard"),
          criteria: String(fd.get("criteria") ?? ""),
          points_threshold: threshold ? Number(threshold) : null,
        },
      });
      toast.success("Award saved");
      setEditing(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save the award.");
    }
  }

  async function submitGrant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await grant({
        data: {
          achievement_id: granting.id,
          user_id: String(fd.get("user_id")),
          season: String(fd.get("season") ?? ""),
          note: String(fd.get("note") ?? ""),
        },
      });
      toast.success("Award granted");
      setGranting(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not grant the award.");
    }
  }

  return (
    <PortalPage
      eyebrow="RECOGNITION"
      title="Fair Awards"
      action={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              try {
                const r = await auto({ data: undefined } as any);
                toast.success(`${r.granted} award(s) granted automatically.`);
                refresh();
              } catch (e: any) {
                toast.error(e?.message ?? "Auto-award failed.");
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-widest"
          >
            <Sparkles className="h-4 w-4" /> Run auto-awards
          </button>
          <button
            onClick={() => setEditing({})}
            className="inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
          >
            <Plus className="h-4 w-4" /> New award
          </button>
        </div>
      }
    >
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Awards are earned on measurable criteria, not favouritism. Set a points threshold to have an
        award granted automatically to every member who reaches it, or grant manually with a reason.
      </p>

      {(data?.definitions ?? []).length === 0 ? (
        <Empty>No awards defined yet.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.definitions ?? []).map((d: any) => {
            const holders = (data?.granted ?? []).filter((g: any) => g.achievement_id === d.id);
            return (
              <Card key={d.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-brand" />
                    <div>
                      <div className="font-display font-bold">{d.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {d.tier}{d.points_threshold ? ` · ${d.points_threshold} pts` : ""}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setEditing(d)} className="text-xs font-semibold text-brand">
                    Edit
                  </button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{d.description || d.criteria || "—"}</p>

                <div className="mt-4 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Holders ({holders.length})
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {holders.slice(0, 6).map((g: any) => (
                      <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">
                          {(memberMap.get(g.user_id) as any)?.full_name ?? "Member"}
                        </span>
                        <button
                          onClick={async () => {
                            await revoke({ data: { id: g.id } });
                            toast.success("Award revoked");
                            refresh();
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Revoke award"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                    {holders.length === 0 && (
                      <li className="text-xs text-muted-foreground">Nobody yet.</li>
                    )}
                  </ul>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setGranting(d)}
                    className="rounded-full bg-foreground px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-background"
                  >
                    Grant
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${d.name}" and all grants of it?`)) return;
                      await remove({ data: { id: d.id } });
                      toast.success("Award deleted");
                      refresh();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <SectionTitle sub="Define what the award means and how it is earned.">
            {editing.id ? "Edit award" : "New award"}
          </SectionTitle>
          <form onSubmit={submitDef} className="space-y-3">
            <Field name="name" label="Name" defaultValue={editing.name} required />
            <Field name="code" label="Code (unique)" defaultValue={editing.code} required />
            <Field name="description" label="Description" defaultValue={editing.description} />
            <Field name="criteria" label="Criteria" defaultValue={editing.criteria} />
            <Field name="icon" label="Icon (emoji or name)" defaultValue={editing.icon} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Tier</span>
                <select name="tier" defaultValue={editing.tier ?? "standard"}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                  {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <Field
                name="points_threshold"
                label="Auto-award at points"
                type="number"
                defaultValue={editing.points_threshold ?? ""}
              />
            </div>
            <button className="rounded-full brand-gradient px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white">
              Save award
            </button>
          </form>
        </Modal>
      )}

      {granting && (
        <Modal onClose={() => setGranting(null)}>
          <SectionTitle sub={granting.name}>Grant award</SectionTitle>
          <form onSubmit={submitGrant} className="space-y-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Member</span>
              <select name="user_id" required
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                {(data?.members ?? []).map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} {m.admission_number ? `(${m.admission_number})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <Field name="season" label="Season / year" placeholder="2026" />
            <Field name="note" label="Reason" placeholder="Why this member earned it" />
            <button className="rounded-full brand-gradient px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white">
              Grant award
            </button>
          </form>
        </Modal>
      )}
    </PortalPage>
  );
}

function Field(props: {
  name: string; label: string; defaultValue?: any; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{props.label}</span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        defaultValue={props.defaultValue ?? ""}
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}
