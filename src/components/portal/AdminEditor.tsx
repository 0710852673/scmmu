import { useState, useEffect, type ReactNode } from "react";
import { Trash2, Plus, Save, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card } from "./PortalUI";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "url";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  colSpan?: 1 | 2;
};

export function AdminEditor<T extends { id: string | number }>({
  title,
  rows,
  fields,
  emptyRow,
  onCreate,
  onUpdate,
  onDelete,
  renderRow,
  refresh,
}: {
  title: string;
  rows: T[];
  fields: FieldDef[];
  emptyRow: Partial<T>;
  onCreate: (row: Partial<T>) => Promise<{ error?: string | null } | void>;
  onUpdate: (id: T["id"], patch: Partial<T>) => Promise<{ error?: string | null } | void>;
  onDelete: (id: T["id"]) => Promise<{ error?: string | null } | void>;
  renderRow: (row: T) => ReactNode;
  refresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<T["id"] | null>(null);
  const [form, setForm] = useState<Partial<T>>(emptyRow);
  const [busy, setBusy] = useState(false);

  function startCreate() {
    setForm(emptyRow);
    setEditingId(null);
    setCreating(true);
  }
  function startEdit(r: T) {
    setForm(r);
    setEditingId(r.id);
    setCreating(false);
  }
  function cancel() {
    setCreating(false);
    setEditingId(null);
    setForm(emptyRow);
  }
  async function save() {
    setBusy(true);
    const res = editingId != null
      ? await onUpdate(editingId, form)
      : await onCreate(form);
    setBusy(false);
    const err = (res as { error?: string })?.error;
    if (err) return toast.error(err);
    toast.success(editingId != null ? "Updated" : "Created");
    cancel();
    refresh();
  }
  async function del(id: T["id"]) {
    if (!confirm("Delete this item permanently?")) return;
    const res = await onDelete(id);
    const err = (res as { error?: string })?.error;
    if (err) return toast.error(err);
    toast.success("Deleted");
    refresh();
  }

  const showForm = creating || editingId != null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{rows.length} {title.toLowerCase()}</div>
        {!showForm && (
          <button onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm">
            <Plus className="h-4 w-4" /> New
          </button>
        )}
      </div>

      {showForm && (
        <Card>
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <FieldInput key={f.key} field={f} value={(form as any)[f.key]}
                onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))} />
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <button disabled={busy} onClick={save}
              className="inline-flex items-center gap-2 rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save"}
            </button>
            <button onClick={cancel}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={String(r.id)}
            className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">{renderRow(r)}</div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => startEdit(r)}
                className="rounded-full border border-border p-2 hover:bg-muted" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => del(r.id)}
                className="rounded-full border border-border p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && !showForm && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
            No {title.toLowerCase()} yet. Click New to add one.
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  const cls = "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40";
  const label = (
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
      {field.label}{field.required && " *"}
    </span>
  );
  const span = field.colSpan === 2 ? "sm:col-span-2" : "";
  if (field.type === "textarea") {
    return (
      <label className={`block ${span}`}>{label}
        <textarea rows={4} value={value ?? ""} placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)} className={cls} />
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label className={`block ${span}`}>{label}
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">—</option>
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className={`flex items-center gap-2 ${span}`}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-border" />
        {label}
      </label>
    );
  }
  return (
    <label className={`block ${span}`}>{label}
      <input type={field.type ?? "text"} value={value ?? ""} placeholder={field.placeholder}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        className={cls} />
    </label>
  );
}

export function useTable<T>(key: string[], fetcher: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setLoading(true);
    fetcher().then((r) => { setRows(r); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...key]);
  return { rows, loading, refresh: () => setTick((n) => n + 1) };
}
