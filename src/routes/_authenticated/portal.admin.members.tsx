import { toast } from "sonner";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";
import {
  adminCreateMember, adminDeleteMember, adminUpdateMember,
  staffListMembers, staffGetMemberDetail,
} from "@/lib/admin.functions";
import { ACCOUNT_ROLES, BOARD_CATEGORIES, DIVISIONS, DIVISION_LABEL, ROLE_ORDER, prettyLabel } from "@/lib/site-content";
import { exportSectionsPdf } from "@/lib/pdf";
import { MemberReportBuilder } from "@/components/portal/MemberReportBuilder";
import { Plus, Trash2, X, Pencil, Search, Download, Loader2, FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/members")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    const roles = (data ?? []).map((r) => r.role as string);
    const staff = roles.some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r));
    if (!staff) throw redirect({ to: "/portal" });
    return { roles };
  },
  component: AdminMembers,
});

type Member = Awaited<ReturnType<typeof staffListMembers>>[number];

const ROLE_BADGE: Record<string, string> = {
  tic: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  administrator: "bg-brand/15 text-brand",
  executive_board: "bg-blue-500/15 text-blue-500",
  section_head: "bg-indigo-500/15 text-indigo-400",
  member: "bg-muted text-muted-foreground",
};

function AdminMembers() {
  const { roles } = Route.useRouteContext();
  const isAdmin = roles.includes("administrator");
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const listFn = useServerFn(staffListMembers);
  const createFn = useServerFn(adminCreateMember);
  const updateFn = useServerFn(adminUpdateMember);
  const deleteFn = useServerFn(adminDeleteMember);

  const { data: members, isLoading } = useQuery({
    queryKey: ["staff-members"],
    queryFn: () => listFn({}),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["staff-members"] });
    qc.invalidateQueries({ queryKey: ["all-members-public"] });
    qc.invalidateQueries({ queryKey: ["board-members"] });
  };

  const createMut = useMutation({ mutationFn: (i: any) => createFn({ data: i }), onSuccess: () => { invalidate(); setNewOpen(false); toast.success("Account created. Send the welcome email from Member Onboarding."); } });
  const updateMut = useMutation({ mutationFn: (i: any) => updateFn({ data: i }), onSuccess: () => { invalidate(); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn: (user_id: string) => deleteFn({ data: { user_id } }), onSuccess: invalidate });

  // TIC → Executive Board → Section Heads → Members, then by MU number.
  const ordered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (members ?? [])
      .filter((m) => {
        if (!term) return true;
        return [m.full_name, m.email, m.admission_number, m.grade, m.class, m.primary_division]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(term));
      })
      .slice()
      .sort((a, b) => {
        const ra = ROLE_ORDER[a.role] ?? 9, rb = ROLE_ORDER[b.role] ?? 9;
        if (ra !== rb) return ra - rb;
        return (a.admission_number ?? "zzz").localeCompare(b.admission_number ?? "zzz");
      });
  }, [members, q]);

  return (
    <PortalPage
      eyebrow={isAdmin ? "ADMINISTRATOR" : "STAFF"}
      title="MEMBERS"
      action={(
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            <FileDown className="h-4 w-4" /> Custom PDF
          </button>
          {isAdmin && (
            <button onClick={() => setNewOpen(true)}
              className="inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> Add member
            </button>
          )}
        </div>
      )}
    >
      <div className="mb-5 relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, MU number, gmail, grade or division…"
          className="w-full rounded-full border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-10 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : ordered.length > 0 ? (
          <div className="overflow-x-auto -mx-px">
            <table className="w-full min-w-[560px] text-sm">

              <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3">MU #</th>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Gmail</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Grade / Class</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Division</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ordered.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setDetailId(m.id)}>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{m.admission_number || "—"}</td>
                    <td className="px-5 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar url={m.photo_url} name={m.full_name || m.email} />
                        <span>{m.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${ROLE_BADGE[m.role] ?? ROLE_BADGE.member}`}>
                        {prettyLabel(m.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{m.email}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">{[m.grade, m.class].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">{DIVISION_LABEL[m.primary_division ?? ""] ?? "—"}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setDetailId(m.id)}
                        className="rounded-md px-2.5 py-1.5 text-xs hover:bg-muted">View</button>
                      {isAdmin && (
                        <>
                          <button onClick={() => setEditing(m)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs hover:bg-muted">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => { if (confirm(`Delete ${m.full_name || m.email}? This cannot be undone.`)) deleteMut.mutate(m.id); }}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6"><Empty>{q ? "No members match that search." : "No members yet."}</Empty></div>
        )}
      </Card>

      {reportOpen && <MemberReportBuilder members={(members ?? []) as any} searchTerm={q} onClose={() => setReportOpen(false)} />}
      {detailId && <MemberDetail userId={detailId} onClose={() => setDetailId(null)} />}
      {newOpen && <MemberModal mode="new" onClose={() => setNewOpen(false)} onSubmit={(d) => createMut.mutate(d)} pending={createMut.isPending} error={(createMut.error as any)?.message} />}
      {editing && (
        <MemberModal mode="edit" initial={editing} onClose={() => setEditing(null)}
          onSubmit={(d) => updateMut.mutate({ user_id: editing.id, ...d })}
          pending={updateMut.isPending} error={(updateMut.error as any)?.message} />
      )}
    </PortalPage>
  );
}

function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" style={{ height: size, width: size }} className="rounded-full object-cover shrink-0" />;
  return (
    <div style={{ height: size, width: size }}
      className="shrink-0 rounded-full brand-gradient grid place-items-center text-white text-xs font-bold">
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

/* ───────────────────────── Member detail drawer ───────────────────────── */

function MemberDetail({ userId, onClose }: { userId: string; onClose: () => void }) {
  const detailFn = useServerFn(staffGetMemberDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["staff-member-detail", userId],
    queryFn: () => detailFn({ data: { user_id: userId } }),
  });
  const p: any = data?.profile;
  const isRanked = data ? !["tic", "administrator", "section_head", "executive_board"].includes(data.role) : true;

  function downloadPdf() {
    if (!p || !data) return;
    void exportSectionsPdf(
      `SCCMU-${p.admission_number || p.id}.pdf`,
      p.full_name ?? "Member record",
      p.bio ?? undefined,
      [
        {
          heading: "Profile", kv: [
            ["Name", p.full_name], ["MU number", p.admission_number ?? "—"],
            ["Role", prettyLabel(data.role)], ["Gmail", p.email],
            ["WhatsApp", p.whatsapp], ["Grade / Class", [p.grade, p.class].filter(Boolean).join(" / ")],
            ["Division", DIVISION_LABEL[p.primary_division ?? ""] ?? "—"],
            ["Joined", p.join_date], ["Total points", data.totalPoints],
            ["Attendance", data.attendance.length],
          ] as Array<[string, any]>,
        },
        ...(p.past_works
          ? [{ heading: "Past works (before this platform)", kv: [["Summary", p.past_works]] as Array<[string, any]> }]
          : []),
        {
          heading: "Events covered",
          table: {
            columns: ["Event", "Date", "Location", "Role", "Status"],
            rows: data.events.map((e: any) => [e.events?.name ?? "—", e.events?.event_date ?? "—", e.events?.location ?? "—", e.role ?? "—", e.status]),
          },
        },
        {
          heading: "Attendance",
          table: { columns: ["Date", "Meeting"], rows: data.attendance.map((a: any) => [a.attended_on, a.meeting_label ?? "—"]) },
        },
        {
          heading: "Points history",
          table: {
            columns: ["Date", "Kind", "Division", "Points"],
            rows: data.points.map((pt: any) => [new Date(pt.created_at).toLocaleDateString(), prettyLabel(pt.kind), prettyLabel(pt.division), pt.points]),
          },
        },
      ],
      {
        photoUrl: p.photo_url,
        kicker: prettyLabel(data.role),
        confidential: true,
        chips: [
          { label: "Total points", value: isRanked ? data.totalPoints : "—" },
          { label: "Attendance", value: data.attendance.length },
          { label: "Events", value: data.events.length },
          { label: "Requests", value: data.contributions.length },
        ],
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-card border-l border-border" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h3 className="font-display text-lg font-bold uppercase tracking-tight">Member record</h3>
          <div className="flex items-center gap-2">
            <button onClick={downloadPdf} disabled={!p}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-muted disabled:opacity-40">
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button onClick={onClose}><X className="h-5 w-5" /></button>
          </div>
        </div>

        {isLoading || !p ? (
          <div className="p-16 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="p-6 space-y-7">
            <div className="flex items-center gap-4">
              <Avatar url={p.photo_url} name={p.full_name} size={72} />
              <div className="min-w-0">
                <h4 className="font-display text-2xl font-extrabold tracking-tight truncate">{p.full_name}</h4>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${ROLE_BADGE[data!.role] ?? ROLE_BADGE.member}`}>
                    {prettyLabel(data!.role)}
                  </span>
                  {p.admission_number && <span className="font-mono">{p.admission_number}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Points" value={isRanked ? data!.totalPoints : "Elite"} />
              <Metric label="Attendance" value={data!.attendance.length} />
              <Metric label="Events" value={data!.events.length} />
              <Metric label="Requests" value={data!.contributions.length} />
            </div>

            <DetailGrid rows={[
              ["Gmail", p.email], ["WhatsApp", p.whatsapp],
              ["Grade", p.grade], ["Class", p.class],
              ["Division", DIVISION_LABEL[p.primary_division ?? ""] ?? "—"],
              ["Joined the unit", p.join_date],
            ]} />

            {p.bio && <Block title="Bio"><p className="text-sm leading-relaxed text-foreground/80">{p.bio}</p></Block>}
            {p.past_works && (
              <Block title="Past works before this platform">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{p.past_works}</p>
              </Block>
            )}

            <Block title="Events covered">
              {data!.events.length ? (
                <ul className="space-y-2">
                  {data!.events.map((e: any, i: number) => (
                    <li key={i} className="rounded-lg border border-border p-3 text-sm">
                      <div className="font-semibold">{e.events?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.events?.event_date ?? "—"} · {e.events?.location ?? "—"} · {e.role ?? "—"} · {e.status}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <Empty>No events yet.</Empty>}
            </Block>

            <Block title="Attendance">
              {data!.attendance.length ? (
                <div className="flex flex-wrap gap-2">
                  {data!.attendance.map((a: any, i: number) => (
                    <span key={i} className="rounded-full border border-border px-3 py-1 text-xs">
                      {a.attended_on}{a.meeting_label ? ` · ${a.meeting_label}` : ""}
                    </span>
                  ))}
                </div>
              ) : <Empty>No attendance recorded.</Empty>}
            </Block>

            {isRanked && (
              <Block title="Points history">
                {data!.points.length ? (
                  <ul className="space-y-2">
                    {data!.points.map((pt: any, i: number) => (
                      <li key={i} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                        <div>
                          <div className="font-medium">{prettyLabel(pt.kind)}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(pt.created_at).toLocaleDateString()} · {prettyLabel(pt.division)}
                          </div>
                        </div>
                        <div className="text-lg font-black text-brand">+{pt.points}</div>
                      </li>
                    ))}
                  </ul>
                ) : <Empty>No points yet.</Empty>}
              </Block>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-brand">{title}</div>
      {children}
    </div>
  );
}
function DetailGrid({ rows }: { rows: Array<[string, any]> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border bg-background p-5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{k}</dt>
          <dd className="mt-0.5 font-medium break-words">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ───────────────────────── Create / edit modal ───────────────────────── */

function MemberModal({ mode, initial, onClose, onSubmit, pending, error }: {
  mode: "new" | "edit"; initial?: Member; onClose: () => void; onSubmit: (d: any) => void; pending: boolean; error?: string;
}) {
  const feat: any = (initial as any)?.featured;
  const [f, setF] = useState({
    email: initial?.email ?? "",
    password: "",
    full_name: initial?.full_name ?? "",
    photo_url: initial?.photo_url ?? "",
    grade: initial?.grade ?? "",
    class: initial?.class ?? "",
    whatsapp: initial?.whatsapp ?? "",
    primary_division: initial?.primary_division ?? "",
    join_date: (initial as any)?.join_date ?? "",
    past_works: (initial as any)?.past_works ?? "",
    bio: initial?.bio ?? "",
    role: (initial?.role ?? "member") as string,
    role_title: feat?.role_title ?? "Member",
    board_category: feat?.board_category ?? "member",
    section: feat?.section ?? "",
    display_order: feat?.display_order ?? 0,
    show_on_site: feat ? !!feat.active : true,
  });
  const upd = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const shared = {
      role: f.role, role_title: f.role_title, board_category: f.board_category,
      section: f.section, display_order: Number(f.display_order) || 0, show_on_site: f.show_on_site,
    };
    const profile = {
      full_name: f.full_name, email: f.email, photo_url: f.photo_url,
      grade: f.grade, class: f.class, whatsapp: f.whatsapp,
      primary_division: f.primary_division, bio: f.bio,
      join_date: f.join_date || null, past_works: f.past_works,
    };
    if (mode === "new") onSubmit({ ...profile, ...shared, password: f.password });
    else onSubmit({ patch: profile, ...shared, new_password: f.password || null });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="my-8 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h3 className="font-display text-lg font-bold uppercase">{mode === "new" ? "New member account" : "Edit member account"}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full name" required value={f.full_name} onChange={(v) => upd("full_name", v)} />
            <Field label="Photo URL" value={f.photo_url} onChange={(v) => upd("photo_url", v)} placeholder="https://…" />
            <Field label="Gmail" type="email" required value={f.email} onChange={(v) => upd("email", v)} />
            <Field label={mode === "new" ? "Password" : "Reset password (optional)"} type="text"
              required={mode === "new"} value={f.password} onChange={(v) => upd("password", v)}
              placeholder={mode === "edit" ? "Leave blank to keep" : ""} />
            <Field label="WhatsApp" value={f.whatsapp} onChange={(v) => upd("whatsapp", v)} />
            <Field label="Grade" value={f.grade} onChange={(v) => upd("grade", v)} />
            <Field label="Class" value={f.class} onChange={(v) => upd("class", v)} />
            <Field label="Joined the unit" type="date" value={f.join_date} onChange={(v) => upd("join_date", v)} />
            <Select label="Division" value={f.primary_division} onChange={(v) => upd("primary_division", v)}
              options={[{ value: "", label: "— None —" }, ...DIVISIONS]} />
            <Field label="Role title on public site" value={f.role_title} onChange={(v) => upd("role_title", v)}
              placeholder="President / Head of Photography / Member" />
            <Select label="Account role" value={f.role} onChange={(v) => upd("role", v)} options={ACCOUNT_ROLES} />
            <Select label="Public board category" value={f.board_category} onChange={(v) => upd("board_category", v)} options={BOARD_CATEGORIES} />
            <Field label="Section label (optional)" value={f.section} onChange={(v) => upd("section", v)} />
            <Field label="Display order (lower first)" type="number" value={String(f.display_order)} onChange={(v) => upd("display_order", v)} />
            <div className="md:col-span-2">
              <Label>Bio</Label>
              <textarea value={f.bio} onChange={(e) => upd("bio", e.target.value)} rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <Label>Past works before joining this platform</Label>
              <textarea value={f.past_works} onChange={(e) => upd("past_works", e.target.value)} rows={3}
                placeholder="Events covered, productions and credits earned before the platform launched."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.show_on_site} onChange={(e) => upd("show_on_site", e.target.checked)} />
            Show this person on the public Members page
          </label>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={pending}
              className="rounded-full brand-gradient px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "Saving…" : mode === "new" ? "Create account" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{children}</div>;
}
function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}{required && " *"}</Label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly { value: string; label: string }[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
