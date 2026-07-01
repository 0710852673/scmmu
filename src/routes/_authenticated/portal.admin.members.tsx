import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";
import { adminCreateMember, adminDeleteMember, adminUpdateMember } from "@/lib/admin.functions";
import { Plus, Trash2, X, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/members")({
  component: AdminMembers,
});

const ROLES = [
  { v: "member", l: "Member" },
  { v: "section_head", l: "Section Head" },
  { v: "executive_board", l: "Executive Board" },
  { v: "tic", l: "TIC (Teacher)" },
  { v: "administrator", l: "Administrator" },
] as const;

const DIVISIONS = [
  { v: "", l: "— None —" },
  { v: "photography", l: "Photography" },
  { v: "editing", l: "Photo Editing & Graphic Designing" },
  { v: "videography", l: "Videography & Video Editing" },
  { v: "streaming", l: "Live Streaming" },
  { v: "technical", l: "Technical" },
  { v: "announcing", l: "Announcing" },
  { v: "social_media", l: "Social Media" },
] as const;

const BOARD_CATS = [
  { v: "member", l: "Member" },
  { v: "section_head", l: "Section Head" },
  { v: "executive", l: "Executive Board" },
  { v: "tic", l: "TIC Board" },
] as const;

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  grade: string | null;
  class: string | null;
  primary_division: string | null;
  photo_url: string | null;
  admission_number: string | null;
  whatsapp: string | null;
  bio: string | null;
};

function AdminMembers() {
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const createFn = useServerFn(adminCreateMember);
  const updateFn = useServerFn(adminUpdateMember);
  const deleteFn = useServerFn(adminDeleteMember);

  const { data: members } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,grade,class,primary_division,photo_url,admission_number,whatsapp,bio")
        .order("admission_number", { ascending: true, nullsFirst: false });
      return (data ?? []) as Member[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-members"] });
    qc.invalidateQueries({ queryKey: ["all-members-public"] });
  };

  const createMut = useMutation({
    mutationFn: (input: any) => createFn({ data: input }),
    onSuccess: () => { invalidate(); setNewOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: (input: any) => updateFn({ data: input }),
    onSuccess: () => { invalidate(); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (user_id: string) => deleteFn({ data: { user_id } }),
    onSuccess: invalidate,
  });

  return (
    <PortalPage eyebrow="ADMINISTRATOR" title="MEMBERS"
      action={
        <button onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Add member
        </button>
      }>
      <Card className="p-0 overflow-hidden">
        {members && members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3">MU #</th>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Grade / Class</th>
                  <th className="text-left px-5 py-3">Division</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{m.admission_number || "—"}</td>
                    <td className="px-5 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full brand-gradient grid place-items-center text-white text-xs font-bold">
                            {(m.full_name || m.email || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span>{m.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-5 py-3">{[m.grade, m.class].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-5 py-3">{m.primary_division || "—"}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(m)}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs hover:bg-muted mr-1">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => { if (confirm(`Delete ${m.full_name || m.email}? This cannot be undone.`)) deleteMut.mutate(m.id); }}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6"><Empty>No members yet. Use "Add member" to create the first account.</Empty></div>
        )}
      </Card>

      {newOpen && <MemberModal mode="new" onClose={() => setNewOpen(false)} onSubmit={(d) => createMut.mutate(d)} pending={createMut.isPending} error={(createMut.error as any)?.message} />}
      {editing && <MemberModal mode="edit" initial={editing} onClose={() => setEditing(null)} onSubmit={(d) => updateMut.mutate({ user_id: editing.id, ...d })} pending={updateMut.isPending} error={(updateMut.error as any)?.message} />}
    </PortalPage>
  );
}

function MemberModal({ mode, initial, onClose, onSubmit, pending, error }: {
  mode: "new" | "edit"; initial?: Member; onClose: () => void; onSubmit: (d: any) => void; pending: boolean; error?: string;
}) {
  const [f, setF] = useState({
    email: initial?.email ?? "",
    password: "",
    full_name: initial?.full_name ?? "",
    photo_url: initial?.photo_url ?? "",
    grade: initial?.grade ?? "",
    class: initial?.class ?? "",
    whatsapp: initial?.whatsapp ?? "",
    primary_division: initial?.primary_division ?? "",
    bio: initial?.bio ?? "",
    role: "member" as any,
    role_title: "Member",
    board_category: "member" as any,
    section: "",
    show_on_site: true,
  });
  const upd = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "new") {
      onSubmit(f);
    } else {
      onSubmit({
        patch: {
          full_name: f.full_name,
          email: f.email,
          photo_url: f.photo_url,
          grade: f.grade,
          class: f.class,
          whatsapp: f.whatsapp,
          primary_division: f.primary_division,
          bio: f.bio,
        },
        role: f.role,
        role_title: f.role_title,
        board_category: f.board_category,
        section: f.section,
        show_on_site: f.show_on_site,
        new_password: f.password || null,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-display text-lg font-bold">{mode === "new" ? "NEW MEMBER ACCOUNT" : "EDIT MEMBER ACCOUNT"}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full name" required value={f.full_name} onChange={(v) => upd("full_name", v)} />
            <Field label="Photo URL" value={f.photo_url} onChange={(v) => upd("photo_url", v)} placeholder="https://…" />
            <Field label="Gmail" type="email" required value={f.email} onChange={(v) => upd("email", v)} />
            <Field label={mode === "new" ? "Password" : "Reset password (optional)"} type="text" required={mode === "new"} value={f.password} onChange={(v) => upd("password", v)} placeholder={mode === "edit" ? "Leave blank to keep" : ""} />
            <Field label="WhatsApp" value={f.whatsapp} onChange={(v) => upd("whatsapp", v)} />
            <Field label="Grade" value={f.grade} onChange={(v) => upd("grade", v)} />
            <Field label="Class" value={f.class} onChange={(v) => upd("class", v)} />
            <div>
              <Label>Division</Label>
              <select value={f.primary_division} onChange={(e) => upd("primary_division", e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {DIVISIONS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
            </div>
            <Field label="Role title on site" value={f.role_title} onChange={(v) => upd("role_title", v)} placeholder="Member / President / Head / Custom" />
            <div>
              <Label>Account role</Label>
              <select value={f.role} onChange={(e) => upd("role", e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </div>
            <div>
              <Label>Public board category</Label>
              <select value={f.board_category} onChange={(e) => upd("board_category", e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {BOARD_CATS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Bio</Label>
              <textarea value={f.bio} onChange={(e) => upd("bio", e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.show_on_site} onChange={(e) => upd("show_on_site", e.target.checked)} />
            Show this person on the public Members page
          </label>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={pending} className="rounded-full brand-gradient px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "Saving…" : mode === "new" ? "Create account" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{children}</div>;
}
function Field({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <Label>{label}{required && " *"}</Label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
