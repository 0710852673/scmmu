import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import {
  NOTIFICATION_TRIGGERS, TRIGGER_LABEL, APP_ROLES, RULE_PRIORITIES,
} from "@/lib/permissions";
import { DIVISIONS } from "@/lib/site-content";
import { COVERAGE_SERVICES } from "@/lib/coverage";
import { Bell, Mail, Plus, Trash2, Save, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/notification-rules")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => r.role === "administrator")) throw redirect({ to: "/portal" });
  },
  component: RulesPage,
});

type Rule = {
  id: string;
  name: string;
  trigger_key: string;
  conditions: Record<string, string> | null;
  recipient_roles: string[];
  recipient_divisions: string[];
  deliver_portal: boolean;
  deliver_email: boolean;
  priority: string;
  active: boolean;
};

const blank = (): Partial<Rule> => ({
  name: "", trigger_key: "booking.created", conditions: {},
  recipient_roles: ["administrator"], recipient_divisions: [],
  deliver_portal: true, deliver_email: false, priority: "normal", active: true,
});

function RulesPage() {
  const [draft, setDraft] = useState<Partial<Rule> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["notification-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("notification_rules").select("*").order("created_at");
      return (data ?? []) as unknown as Rule[];
    },
  });

  async function save() {
    if (!draft?.name?.trim()) { setMsg("Give the rule a name."); return; }
    const payload = {
      name: draft.name,
      trigger_key: draft.trigger_key,
      conditions: draft.conditions ?? {},
      recipient_roles: draft.recipient_roles ?? [],
      recipient_divisions: draft.recipient_divisions ?? [],
      deliver_portal: !!draft.deliver_portal,
      deliver_email: !!draft.deliver_email,
      priority: draft.priority ?? "normal",
      active: draft.active ?? true,
    };
    const { error } = draft.id
      ? await supabase.from("notification_rules").update(payload as never).eq("id", draft.id)
      : await supabase.from("notification_rules").insert(payload as never);
    setMsg(error ? error.message : "Rule saved.");
    if (!error) { setDraft(null); q.refetch(); }
  }

  async function toggle(r: Rule) {
    await supabase.from("notification_rules").update({ active: !r.active } as never).eq("id", r.id);
    q.refetch();
  }
  async function remove(id: string) {
    await supabase.from("notification_rules").delete().eq("id", id);
    q.refetch();
  }

  return (
    <PortalPage eyebrow="AUTOMATION" title="Notification rules">
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
        Decide who hears about what — without touching code. Pick a trigger, narrow it with a condition,
        choose the roles or divisions that should be told, and whether it lands in the portal, in Gmail, or both.
        Keep email for action-required alerts; the portal handles everyday information.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setDraft(blank())}
          className="inline-flex min-h-11 items-center gap-2 rounded-full brand-gradient px-5 text-xs font-bold uppercase tracking-widest text-white">
          <Plus className="h-4 w-4" /> New rule
        </button>
        {msg && <span className="text-xs font-semibold text-muted-foreground">{msg}</span>}
      </div>

      {draft && (
        <div className="mb-8 rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Rule name">
              <input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Live streaming request → Streaming head" className={inputCls} />
            </Field>
            <Field label="Trigger">
              <select value={draft.trigger_key} onChange={(e) => setDraft({ ...draft, trigger_key: e.target.value })} className={inputCls}>
                {NOTIFICATION_TRIGGERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Condition — service contains">
              <select value={draft.conditions?.service_contains ?? ""}
                onChange={(e) => setDraft({ ...draft, conditions: { ...(draft.conditions ?? {}), service_contains: e.target.value } })}
                className={inputCls}>
                <option value="">Any service</option>
                {COVERAGE_SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Condition — priority">
              <select value={draft.conditions?.priority_is ?? ""}
                onChange={(e) => setDraft({ ...draft, conditions: { ...(draft.conditions ?? {}), priority_is: e.target.value } })}
                className={inputCls}>
                <option value="">Any priority</option>
                {RULE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Recipients — roles">
              <ChipPicker options={APP_ROLES.map((r) => ({ value: r.value, label: r.label }))}
                selected={draft.recipient_roles ?? []}
                onChange={(v) => setDraft({ ...draft, recipient_roles: v })} />
            </Field>
            <Field label="Limit to divisions (optional)">
              <ChipPicker options={DIVISIONS.map((d) => ({ value: d.value, label: d.label }))}
                selected={draft.recipient_divisions ?? []}
                onChange={(v) => setDraft({ ...draft, recipient_divisions: v })} />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Check label="Portal notification" checked={!!draft.deliver_portal}
              onChange={(v) => setDraft({ ...draft, deliver_portal: v })} />
            <Check label="Gmail email" checked={!!draft.deliver_email}
              onChange={(v) => setDraft({ ...draft, deliver_email: v })} />
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Priority
              <select value={draft.priority ?? "normal"} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                className="h-10 rounded-lg border border-border bg-background px-3 text-xs">
                {RULE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={save}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-xs font-bold uppercase tracking-widest text-background">
              <Save className="h-4 w-4" /> Save rule
            </button>
            <button type="button" onClick={() => setDraft(null)}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-xs font-bold uppercase tracking-widest">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(q.data ?? []).length === 0 && !q.isLoading && (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No rules yet — create the first one above.
          </p>
        )}
        {(q.data ?? []).map((r) => (
          <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-2xl border border-border bg-card p-4 md:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-bold">{r.name}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${r.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                  {r.active ? "Active" : "Paused"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                When <strong>{TRIGGER_LABEL[r.trigger_key] ?? r.trigger_key}</strong>
                {r.conditions?.service_contains ? ` and service is ${r.conditions.service_contains}` : ""}
                {r.conditions?.priority_is ? ` and priority is ${r.conditions.priority_is}` : ""}
                {" → "}
                {(r.recipient_roles ?? []).map((x) => APP_ROLES.find((a) => a.value === x)?.label ?? x).join(", ") || "nobody"}
                {r.recipient_divisions?.length ? ` (${r.recipient_divisions.join(", ")})` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {r.deliver_portal && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Bell className="h-3 w-3" /> Portal</span>}
                {r.deliver_email && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Mail className="h-3 w-3" /> Gmail</span>}
                <span className="rounded-full bg-muted px-2.5 py-1">{r.priority}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setDraft(r)} className={iconBtn}>Edit</button>
              <button type="button" onClick={() => toggle(r)} className={iconBtn}><Power className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => remove(r.id)} className={`${iconBtn} text-red-600`}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </PortalPage>
  );
}

const inputCls = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand";
const iconBtn = "inline-flex min-h-10 items-center justify-center gap-1 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-widest hover:bg-muted";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}

function ChipPicker({ options, selected, onChange }: {
  options: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button key={o.value} type="button"
            onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
            className={`min-h-10 rounded-full border px-3 text-xs font-semibold transition-colors ${
              on ? "border-transparent brand-gradient text-white" : "border-border hover:bg-muted"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
