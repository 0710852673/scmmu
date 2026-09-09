import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileText, Plus, Search, Trash2, ArrowUp, ArrowDown, Download, Eye, Pencil,
  Archive, RefreshCw, CheckCircle2, X, Loader2, Upload,
} from "lucide-react";
import { PortalPage, Card, SectionTitle, Empty } from "@/components/portal/PortalUI";
import { getPortalAccess } from "@/lib/access";
import {
  listReleaseLetters, saveReleaseLetter, deleteReleaseLetter, archiveReleaseLetter,
  generateReleaseLetterDocx, listLetterMemberOptions, listLetterTemplates,
  uploadLetterTemplate, setActiveTemplate,
  type LetterRecord, type LetterMemberOption,
} from "@/lib/letters.functions";
import { DEFAULT_LETTER_BODY, validateLetter, type LetterStudent } from "@/lib/letter-doc";
import { releaseLetterPdfObjectUrl, downloadReleaseLetterPdf } from "@/lib/release-letter-pdf";

const ALLOWED = ["administrator", "tic", "section_head", "executive_board"];

export const Route = createFileRoute("/_authenticated/portal/admin/release-letters")({
  beforeLoad: async ({ context }) => {
    const access = await getPortalAccess(context.user.id);
    if (!access.roles.some((r) => ALLOWED.includes(r))) throw redirect({ to: "/portal" });
    return { access };
  },
  head: () => ({ meta: [{ title: "Release Letters · SCCMU Portal" }] }),
  component: ReleaseLettersPage,
});

const today = () => new Date().toISOString().slice(0, 10);

type Draft = {
  id: string | null;
  ref_no: string | null;
  letter_date: string;
  event_name: string;
  body: string;
  students: LetterStudent[];
};

const emptyDraft = (): Draft => ({
  id: null, ref_no: null, letter_date: today(), event_name: "", body: DEFAULT_LETTER_BODY, students: [],
});

function ReleaseLettersPage() {
  const { access } = Route.useRouteContext();
  const isAdmin = access.roles.includes("administrator");
  const qc = useQueryClient();

  const fetchLetters = useServerFn(listReleaseLetters);
  const fetchMembers = useServerFn(listLetterMemberOptions);
  const save = useServerFn(saveReleaseLetter);
  const remove = useServerFn(deleteReleaseLetter);
  const archive = useServerFn(archiveReleaseLetter);
  const generate = useServerFn(generateReleaseLetterDocx);

  const letters = useQuery({ queryKey: ["release-letters"], queryFn: () => fetchLetters({} as never) });
  const members = useQuery({ queryKey: ["letter-members"], queryFn: () => fetchMembers({} as never) });

  const [mode, setMode] = useState<"history" | "builder">("history");
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [generated, setGenerated] = useState<{ ref_no: string; event: string } | null>(null);

  const startNew = () => { setDraft(emptyDraft()); setStep(1); setGenerated(null); setMode("builder"); };
  const editLetter = (l: LetterRecord) => {
    setDraft({
      id: l.id, ref_no: l.ref_no, letter_date: l.letter_date, event_name: l.event_name,
      body: l.body ?? "",
      students: l.students.map((s) => ({ full_name: s.full_name, class_name: s.class_name, member_user_id: s.member_user_id })),
    });
    setStep(1); setGenerated(null); setMode("builder");
  };

  const saveMut = useMutation({
    mutationFn: async () => save({ data: { id: draft.id, letter_date: draft.letter_date, event_name: draft.event_name, body: draft.body, students: draft.students } }),
    onSuccess: (row: any) => {
      setDraft((d) => ({ ...d, id: row?.id ?? d.id, ref_no: row?.ref_no ?? d.ref_no }));
      qc.invalidateQueries({ queryKey: ["release-letters"] });
    },
  });

  const generateMut = useMutation({
    mutationFn: async () => {
      const row: any = await save({ data: { id: draft.id, letter_date: draft.letter_date, event_name: draft.event_name, body: draft.body, students: draft.students } });
      const id = row?.id ?? draft.id;
      const docx = await generate({ data: { id } });
      return { id, ref_no: row?.ref_no ?? draft.ref_no ?? "", docx };
    },
    onSuccess: async (res: any) => {
      setDraft((d) => ({ ...d, id: res.id, ref_no: res.ref_no }));
      setGenerated({ ref_no: res.ref_no, event: draft.event_name });
      qc.invalidateQueries({ queryKey: ["release-letters"] });
      toast.success("Release letter generated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not generate the letter"),
  });

  async function downloadDocxFor(id: string, refNo: string, eventName: string) {
    try {
      const res: any = await generate({ data: { id } });
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
      const a = document.createElement("a");
      a.href = url; a.download = res.filename ?? `${refNo} - ${eventName}.docx`; a.click();
      URL.revokeObjectURL(url);
      qc.invalidateQueries({ queryKey: ["release-letters"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not build the Word document");
    }
  }

  const errors = validateLetter({ letter_date: draft.letter_date, event_name: draft.event_name, students: draft.students });

  return (
    <PortalPage
      title="Release Letters"
      eyebrow="Official correspondence"
      action={
        mode === "history" ? (
          <button onClick={startNew} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-background">
            <Plus className="h-3.5 w-3.5" /> New letter
          </button>
        ) : (
          <button onClick={() => setMode("history")} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]">
            <X className="h-3.5 w-3.5" /> Close builder
          </button>
        )
      }
    >
      {mode === "builder" ? (
        <div className="space-y-6">
          <Steps step={step} />

          {step === 1 && (
            <Card>
              <SectionTitle sub="These appear on the official letterhead.">Letter details</SectionTitle>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Date">
                  <input type="date" value={draft.letter_date} onChange={(e) => setDraft({ ...draft, letter_date: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Event name">
                  <input value={draft.event_name} placeholder="SCCMU Media Coverage - NONIMI 2026"
                    onChange={(e) => setDraft({ ...draft, event_name: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Body / additional details (optional)">
                  <textarea rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={() => setStep(2)} disabled={!draft.event_name.trim() || !draft.letter_date}
                  className="rounded-full bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-background disabled:opacity-40">
                  Next: select students
                </button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <StudentStep
              members={members.data ?? []}
              students={draft.students}
              setStudents={(students) => setDraft({ ...draft, students })}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <PreviewStep
              draft={draft} errors={errors}
              onBack={() => setStep(2)}
              onEditField={(patch) => setDraft({ ...draft, ...patch })}
              onGenerate={() => generateMut.mutate()}
              generating={generateMut.isPending}
              generated={generated}
              onDownloadDocx={() => draft.id && downloadDocxFor(draft.id, draft.ref_no ?? "letter", draft.event_name)}
              onAnother={startNew}
              saving={saveMut.isPending}
              onSaveDraft={() => saveMut.mutate(undefined, { onSuccess: () => toast.success("Draft saved") })}
            />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <SectionTitle sub="Every generated letter is kept with its students and reference number.">Letter history</SectionTitle>
            {letters.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : !(letters.data ?? []).length ? (
              <Empty>No release letters yet. Create your first one.</Empty>
            ) : (
              <div className="space-y-3">
                {(letters.data as LetterRecord[]).map((l) => (
                  <div key={l.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold tracking-[0.14em]">{l.ref_no}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                            l.status === "generated" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : l.status === "archived" ? "bg-muted text-muted-foreground" : "bg-amber/20 text-amber-700 dark:text-amber-300"}`}>{l.status}</span>
                        </div>
                        <div className="mt-2 font-semibold break-words">{l.event_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(`${l.letter_date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                          {" · "}{l.students.length} student{l.students.length === 1 ? "" : "s"}
                          {l.created_by_name ? ` · by ${l.created_by_name}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <IconBtn onClick={() => editLetter(l)} icon={Pencil} label="Edit" />
                        <IconBtn onClick={async () => {
                          const url = await releaseLetterPdfObjectUrl({ letter_date: l.letter_date, event_name: l.event_name, body: l.body ?? "", students: l.students });
                          window.open(url, "_blank");
                        }} icon={Eye} label="View PDF" />
                        <IconBtn onClick={() => downloadReleaseLetterPdf(
                          { letter_date: l.letter_date, event_name: l.event_name, body: l.body ?? "", students: l.students },
                          `${l.ref_no} - ${l.event_name}.pdf`)} icon={Download} label="PDF" />
                        <IconBtn onClick={() => downloadDocxFor(l.id, l.ref_no, l.event_name)} icon={RefreshCw} label="Word" />
                        <IconBtn onClick={async () => { await archive({ data: { id: l.id, archived: l.status !== "archived" } }); qc.invalidateQueries({ queryKey: ["release-letters"] }); }}
                          icon={Archive} label={l.status === "archived" ? "Unarchive" : "Archive"} />
                        <IconBtn danger onClick={async () => {
                          if (!confirm(`Delete ${l.ref_no}?`)) return;
                          await remove({ data: { id: l.id } });
                          qc.invalidateQueries({ queryKey: ["release-letters"] });
                          toast.success("Letter deleted");
                        }} icon={Trash2} label="Delete" />
                      </div>
                    </div>
                    {l.students.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {l.students.map((s, i) => (
                          <span key={i} className="rounded-md bg-muted px-2 py-1 text-[11px]">{s.full_name} — {s.class_name}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {isAdmin ? <TemplateCard /> : null}
        </div>
      )}
    </PortalPage>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function IconBtn({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
        danger ? "border-red-500/40 text-red-600 hover:bg-red-500 hover:text-white" : "border-border hover:bg-muted"}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["Letter details", "Select students", "Preview & generate"];
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((l, i) => (
        <div key={l} className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${
          step === i + 1 ? "border-foreground bg-foreground text-background" : step > i + 1 ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : "border-border text-muted-foreground"}`}>
          <span>{i + 1}</span> {l}
        </div>
      ))}
    </div>
  );
}

function StudentStep({ members, students, setStudents, onBack, onNext }: {
  members: LetterMemberOption[];
  students: LetterStudent[];
  setStudents: (s: LetterStudent[]) => void;
  onBack: () => void; onNext: () => void;
}) {
  const [q, setQ] = useState("");
  const selectedIds = new Set(students.map((s) => s.member_user_id).filter(Boolean) as string[]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return members.filter((m) => !t || m.full_name.toLowerCase().includes(t) || (m.class_name ?? "").toLowerCase().includes(t)).slice(0, 40);
  }, [members, q]);

  const add = (m: LetterMemberOption) => {
    if (selectedIds.has(m.id)) { toast.error(`${m.full_name} is already on the list`); return; }
    setStudents([...students, { full_name: m.full_name, class_name: m.class_name, member_user_id: m.id }]);
  };
  const move = (i: number, dir: -1 | 1) => {
    const next = [...students];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    setStudents(next);
  };
  const patch = (i: number, p: Partial<LetterStudent>) =>
    setStudents(students.map((s, idx) => (idx === i ? { ...s, ...p } : s)));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <SectionTitle sub="Names and classes come straight from the member records.">Add students</SectionTitle>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or class"
            className={`${inputCls} pl-9`} />
        </div>
        <div className="mt-3 max-h-[380px] space-y-1.5 overflow-y-auto">
          {!filtered.length ? <div className="p-4 text-sm text-muted-foreground">No members match that search.</div> : null}
          {filtered.map((m) => (
            <button key={m.id} onClick={() => add(m)} disabled={selectedIds.has(m.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-40">
              <span className="min-w-0">
                <span className="block truncate font-medium">{m.full_name}</span>
                <span className="text-xs text-muted-foreground">{m.class_name || "No class on record"}</span>
              </span>
              {selectedIds.has(m.id) ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
            </button>
          ))}
        </div>
        <button onClick={() => setStudents([...students, { full_name: "", class_name: "", member_user_id: null }])}
          className="mt-3 w-full rounded-lg border border-dashed border-border py-2.5 text-xs font-semibold hover:bg-muted">
          + Add someone manually
        </button>
      </Card>

      <Card>
        <SectionTitle sub="Edit or reorder before previewing.">On this letter ({students.length})</SectionTitle>
        {!students.length ? <Empty>No students added yet.</Empty> : (
          <div className="space-y-2">
            {students.map((s, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <input value={s.full_name} onChange={(e) => patch(i, { full_name: e.target.value })} placeholder="Full name"
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
                  <input value={s.class_name} onChange={(e) => patch(i, { class_name: e.target.value })} placeholder="Class"
                    className="w-24 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm" />
                </div>
                <div className="mt-2 flex justify-end gap-1.5">
                  <IconBtn icon={ArrowUp} label="Up" onClick={() => move(i, -1)} />
                  <IconBtn icon={ArrowDown} label="Down" onClick={() => move(i, 1)} />
                  <IconBtn danger icon={Trash2} label="Remove" onClick={() => setStudents(students.filter((_, idx) => idx !== i))} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-between gap-3">
          <button onClick={onBack} className="rounded-full border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em]">Back</button>
          <button onClick={onNext} disabled={!students.length}
            className="rounded-full bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-background disabled:opacity-40">
            Next: preview
          </button>
        </div>
      </Card>
    </div>
  );
}

function PreviewStep({ draft, errors, onBack, onEditField, onGenerate, generating, generated, onDownloadDocx, onAnother, onSaveDraft, saving }: {
  draft: Draft; errors: string[];
  onBack: () => void;
  onEditField: (p: Partial<Draft>) => void;
  onGenerate: () => void; generating: boolean;
  generated: { ref_no: string; event: string } | null;
  onDownloadDocx: () => void; onAnother: () => void;
  onSaveDraft: () => void; saving: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [building, setBuilding] = useState(true);

  useEffect(() => {
    let dead = false;
    let made: string | null = null;
    setBuilding(true);
    releaseLetterPdfObjectUrl({ letter_date: draft.letter_date, event_name: draft.event_name, body: draft.body, students: draft.students })
      .then((u) => { if (dead) { URL.revokeObjectURL(u); return; } made = u; setUrl(u); })
      .catch(() => toast.error("Could not build the preview"))
      .finally(() => !dead && setBuilding(false));
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [draft.letter_date, draft.event_name, draft.body, JSON.stringify(draft.students)]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      <Card>
        <SectionTitle sub="Any last correction only affects this letter — never the master template.">Final edits</SectionTitle>
        <div className="space-y-4">
          <Field label="Date"><input type="date" value={draft.letter_date} onChange={(e) => onEditField({ letter_date: e.target.value })} className={inputCls} /></Field>
          <Field label="Event name"><input value={draft.event_name} onChange={(e) => onEditField({ event_name: e.target.value })} className={inputCls} /></Field>
          <Field label="Body"><textarea rows={5} value={draft.body} onChange={(e) => onEditField({ body: e.target.value })} className={inputCls} /></Field>
          <div>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Students</div>
            <div className="space-y-1.5">
              {draft.students.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="truncate">{s.full_name}</span>
                  <span className="ml-auto text-muted-foreground">{s.class_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {errors.length ? (
          <ul className="mt-4 space-y-1 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">
            {errors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={onBack} className="rounded-full border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em]">Back</button>
          <button onClick={onSaveDraft} disabled={saving || errors.length > 0}
            className="rounded-full border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-40">
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button onClick={onGenerate} disabled={generating || errors.length > 0}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-background disabled:opacity-40">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Generate letter
          </button>
        </div>

        {generated ? (
          <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Release letter generated successfully
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{generated.ref_no} · {generated.event}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <IconBtn icon={Download} label="Download PDF" onClick={() => downloadReleaseLetterPdf(
                { letter_date: draft.letter_date, event_name: draft.event_name, body: draft.body, students: draft.students },
                `${generated.ref_no} - ${draft.event_name}.pdf`)} />
              <IconBtn icon={Download} label="Download Word" onClick={onDownloadDocx} />
              <IconBtn icon={Plus} label="Create another" onClick={onAnother} />
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Document preview</div>
          {url ? <a href={url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold underline">Open full size</a> : null}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
          {building || !url ? (
            <div className="grid h-[420px] place-items-center text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Building preview…</span>
            </div>
          ) : (
            <iframe title="Release letter preview" src={url} className="h-[520px] w-full md:h-[760px]" />
          )}
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground">
          Rendered on the official 2026 letterhead artwork. Word download keeps the exact master document.
        </p>
      </Card>
    </div>
  );
}

function TemplateCard() {
  const qc = useQueryClient();
  const list = useServerFn(listLetterTemplates);
  const upload = useServerFn(uploadLetterTemplate);
  const activate = useServerFn(setActiveTemplate);
  const templates = useQuery({ queryKey: ["letter-templates"], queryFn: () => list({} as never) });
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
      await upload({ data: { name: file.name.replace(/\.docx$/i, ""), base64: btoa(bin) } });
      qc.invalidateQueries({ queryKey: ["letter-templates"] });
      toast.success("New master template is now active");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <SectionTitle sub="Existing letters keep the template they were made with.">Master template</SectionTitle>
      <div className="space-y-2">
        {(templates.data ?? []).map((t: any) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
            <span className="font-medium">{t.name}</span>
            {t.active ? (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Active</span>
            ) : (
              <IconBtn icon={CheckCircle2} label="Make active" onClick={async () => { await activate({ data: { id: t.id } }); qc.invalidateQueries({ queryKey: ["letter-templates"] }); }} />
            )}
          </div>
        ))}
      </div>
      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs font-semibold hover:bg-muted">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Replace master .docx
        <input type="file" accept=".docx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </label>
    </Card>
  );
}
