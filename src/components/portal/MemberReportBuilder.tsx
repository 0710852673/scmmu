import { useMemo, useState } from "react";
import { exportRosterPdf, type RosterGroup } from "@/lib/pdf";
import { DIVISIONS, DIVISION_LABEL, ACCOUNT_ROLES, ROLE_ORDER, prettyLabel } from "@/lib/site-content";
import { X, FileDown, Loader2 } from "lucide-react";

export type ReportMember = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  admission_number?: string | null;
  grade?: string | null;
  class?: string | null;
  primary_division?: string | null;
  whatsapp?: string | null;
  join_date?: string | null;
  bio?: string | null;
  past_works?: string | null;
  role: string;
  featured?: { role_title?: string | null; board_category?: string | null; section?: string | null } | null;
};

type ColumnKey =
  | "mu" | "name" | "role" | "role_title" | "division" | "section"
  | "grade" | "class" | "email" | "whatsapp" | "joined";

const COLUMNS: Array<{ key: ColumnKey; label: string; get: (m: ReportMember) => string }> = [
  { key: "mu", label: "MU #", get: (m) => m.admission_number ?? "" },
  { key: "name", label: "Name", get: (m) => m.full_name ?? "" },
  { key: "role", label: "Role", get: (m) => prettyLabel(m.role) },
  { key: "role_title", label: "Position", get: (m) => m.featured?.role_title ?? "" },
  { key: "division", label: "Section", get: (m) => DIVISION_LABEL[m.primary_division ?? ""] ?? "" },
  { key: "section", label: "Public section", get: (m) => m.featured?.section ?? "" },
  { key: "grade", label: "Grade", get: (m) => m.grade ?? "" },
  { key: "class", label: "Class", get: (m) => m.class ?? "" },
  { key: "email", label: "Gmail", get: (m) => m.email ?? "" },
  { key: "whatsapp", label: "WhatsApp", get: (m) => m.whatsapp ?? "" },
  { key: "joined", label: "Joined", get: (m) => m.join_date ?? "" },
];

type Preset = {
  id: string;
  label: string;
  hint: string;
  title: string;
  columns: ColumnKey[];
  group: "none" | "division" | "role";
  photos: boolean;
  landscape?: boolean;
};

const PRESETS: Preset[] = [
  {
    id: "full", label: "Full unit directory", hint: "Everyone, grouped by role, with photos",
    title: "Full Member Directory", columns: ["mu", "name", "role", "division", "grade", "joined"],
    group: "role", photos: true,
  },
  {
    id: "sectionwise", label: "Section-wise list", hint: "Grouped by media section",
    title: "Section-wise Member List", columns: ["mu", "name", "role_title", "grade", "class", "whatsapp"],
    group: "division", photos: true,
  },
  {
    id: "contact", label: "Contact sheet", hint: "Gmail + WhatsApp for every member",
    title: "Member Contact Sheet", columns: ["mu", "name", "role", "division", "email", "whatsapp"],
    group: "role", photos: false, landscape: true,
  },
  {
    id: "board", label: "Leadership sheet", hint: "TIC, executive board and section heads",
    title: "Leadership & Board", columns: ["mu", "name", "role", "role_title", "division", "email"],
    group: "role", photos: true,
  },
  {
    id: "namelist", label: "Simple name list", hint: "MU number and name only",
    title: "Member Name List", columns: ["mu", "name", "division"],
    group: "none", photos: false,
  },
];

export function MemberReportBuilder({
  members, onClose, searchTerm,
}: { members: ReportMember[]; onClose: () => void; searchTerm?: string }) {
  const [presetId, setPresetId] = useState("full");
  const preset = PRESETS.find((p) => p.id === presetId)!;

  const [title, setTitle] = useState(preset.title);
  const [cols, setCols] = useState<ColumnKey[]>(preset.columns);
  const [group, setGroup] = useState<Preset["group"]>(preset.group);
  const [photos, setPhotos] = useState(preset.photos);
  const [landscape, setLandscape] = useState(!!preset.landscape);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [divFilter, setDivFilter] = useState<string>("all");
  const [notes, setNotes] = useState("");
  const [confidential, setConfidential] = useState(true);
  const [busy, setBusy] = useState(false);

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setTitle(p.title);
    setCols(p.columns);
    setGroup(p.group);
    setPhotos(p.photos);
    setLandscape(!!p.landscape);
    setRoleFilter(p.id === "board" ? "staff" : "all");
  }

  const rows = useMemo(() => {
    return members
      .filter((m) => {
        if (roleFilter === "staff") return ["tic", "administrator", "executive_board", "section_head"].includes(m.role);
        if (roleFilter !== "all" && m.role !== roleFilter) return false;
        if (divFilter !== "all" && m.primary_division !== divFilter) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const ra = ROLE_ORDER[a.role] ?? 9, rb = ROLE_ORDER[b.role] ?? 9;
        if (ra !== rb) return ra - rb;
        return (a.admission_number ?? "zzz").localeCompare(b.admission_number ?? "zzz");
      });
  }, [members, roleFilter, divFilter]);

  async function generate() {
    setBusy(true);
    try {
      const active = COLUMNS.filter((c) => cols.includes(c.key));
      const toRow = (m: ReportMember) => ({
        photo_url: m.photo_url,
        cells: active.map((c) => c.get(m) || "—"),
      });

      let groups: RosterGroup[];
      if (group === "division") {
        groups = [
          ...DIVISIONS.map((d) => ({
            heading: d.label,
            rows: rows.filter((m) => m.primary_division === d.value).map(toRow),
          })),
          { heading: "No section assigned", rows: rows.filter((m) => !m.primary_division).map(toRow) },
        ];
      } else if (group === "role") {
        groups = ACCOUNT_ROLES.slice()
          .sort((a, b) => (ROLE_ORDER[a.value] ?? 9) - (ROLE_ORDER[b.value] ?? 9))
          .map((r) => ({ heading: r.label, rows: rows.filter((m) => m.role === r.value).map(toRow) }));
      } else {
        groups = [{ heading: "Members", rows: rows.map(toRow) }];
      }

      const scope = [
        roleFilter === "all" ? "All roles" : roleFilter === "staff" ? "Leadership only" : prettyLabel(roleFilter),
        divFilter === "all" ? "all sections" : DIVISION_LABEL[divFilter],
      ].join(" · ");

      await exportRosterPdf({
        filename: `SCCMU-${title.replace(/[^\w]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`,
        title,
        subtitle: scope,
        kicker: "Member report",
        columns: active.map((c) => c.label),
        groups,
        withPhotos: photos,
        landscape,
        confidential,
        notes: notes || undefined,
        chips: [
          { label: "Members in report", value: rows.length },
          { label: "Leadership", value: rows.filter((m) => m.role !== "member").length },
          { label: "Sections covered", value: new Set(rows.map((m) => m.primary_division).filter(Boolean)).size },
          { label: "Generated", value: new Date().toLocaleDateString("en-GB") },
        ],
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 backdrop-blur-sm p-0 sm:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand">Custom report</div>
            <h2 className="text-lg font-bold">Build a member PDF</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <Label>Start from a preset</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${presetId === p.id ? "border-brand bg-brand/5" : "border-border hover:bg-muted/50"}`}>
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Report title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Group by">
              <select value={group} onChange={(e) => setGroup(e.target.value as any)} className={inputCls}>
                <option value="none">No grouping</option>
                <option value="division">Media section</option>
                <option value="role">Role</option>
              </select>
            </Field>
            <Field label="Role filter">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputCls}>
                <option value="all">All roles</option>
                <option value="staff">Leadership only (TIC, board, heads)</option>
                {ACCOUNT_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Section filter">
              <select value={divFilter} onChange={(e) => setDivFilter(e.target.value)} className={inputCls}>
                <option value="all">All sections</option>
                {DIVISIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </Field>
          </div>

          <div>
            <Label>Columns</Label>
            <div className="flex flex-wrap gap-2">
              {COLUMNS.map((c) => {
                const on = cols.includes(c.key);
                return (
                  <button key={c.key}
                    onClick={() => setCols((prev) => on ? prev.filter((k) => k !== c.key) : [...prev, c.key])}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-brand bg-brand text-white" : "border-border hover:bg-muted"}`}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Toggle checked={photos} onChange={setPhotos} label="Include member photos" />
            <Toggle checked={landscape} onChange={setLandscape} label="Landscape page" />
            <Toggle checked={confidential} onChange={setConfidential} label="Mark confidential" />
          </div>

          <Field label="Notes printed on the report (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="e.g. Prepared for the annual school report, 2026." className={inputCls} />
          </Field>

          {searchTerm && (
            <p className="text-xs text-muted-foreground">
              Tip: this builder uses the filters above, not the search box.
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-card px-6 py-4">
          <div className="text-xs text-muted-foreground">{rows.length} members · {cols.length} columns</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
            <button onClick={generate} disabled={busy || !cols.length || !rows.length}
              className="inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {busy ? "Building…" : "Generate PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40";

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}
