import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { PERMISSION_GROUPS, PERMISSION_LABEL } from "@/lib/permissions";
import { Plus, Save, Trash2, ShieldCheck, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/permissions")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => r.role === "administrator")) throw redirect({ to: "/portal" });
  },
  component: PermissionsPage,
});

type Role = { id: string; key: string; name: string; description: string | null; permissions: string[]; active: boolean };
type Assignment = { id: string; user_id: string; role_id: string };
type Member = { id: string; full_name: string; admission_number: string | null };

const blank = (): Partial<Role> => ({ key: "", name: "", description: "", permissions: [], active: true });

function PermissionsPage() {
  const [draft, setDraft] = useState<Partial<Role> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [assignRole, setAssignRole] = useState<string>("");
  const [assignUser, setAssignUser] = useState<string>("");

  const rolesQ = useQuery({
    queryKey: ["permission-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("permission_roles").select("*").order("name");
      return (data ?? []) as unknown as Role[];
    },
  });
  const assignQ = useQuery({
    queryKey: ["permission-assignments"],
    queryFn: async () => {
      const { data } = await supabase.from("user_permission_roles").select("id,user_id,role_id");
      return (data ?? []) as Assignment[];
    },
  });
  const membersQ = useQuery({
    queryKey: ["permission-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,admission_number").order("full_name");
      return (data ?? []) as Member[];
    },
  });

  const memberName = (id: string) => {
    const m = membersQ.data?.find((x) => x.id === id);
    return m ? `${m.full_name}${m.admission_number ? ` · ${m.admission_number}` : ""}` : id.slice(0, 8);
  };

  async function saveRole() {
    if (!draft?.name?.trim()) { setMsg("Name the role."); return; }
    const key = (draft.key?.trim() || draft.name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const payload = {
      key, name: draft.name, description: draft.description ?? null,
      permissions: draft.permissions ?? [], active: draft.active ?? true,
    };
    const { error } = draft.id
      ? await supabase.from("permission_roles").update(payload as never).eq("id", draft.id)
      : await supabase.from("permission_roles").insert(payload as never);
    setMsg(error ? error.message : "Role saved.");
    if (!error) { setDraft(null); rolesQ.refetch(); }
  }

  async function removeRole(id: string) {
    await supabase.from("permission_roles").delete().eq("id", id);
    rolesQ.refetch(); assignQ.refetch();
  }

  async function assign() {
    if (!assignRole || !assignUser) { setMsg("Pick a member and a role."); return; }
    const { error } = await supabase.from("user_permission_roles")
      .insert({ user_id: assignUser, role_id: assignRole, assigned_by: (await supabase.auth.getUser()).data.user?.id ?? null } as never);
    setMsg(error ? error.message : "Role assigned.");
    if (!error) { setAssignUser(""); assignQ.refetch(); }
  }
  async function unassign(id: string) {
    await supabase.from("user_permission_roles").delete().eq("id", id);
    assignQ.refetch();
  }

  return (
    <PortalPage eyebrow="PERMISSIONS" title="Roles & abilities">
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
        Build your own roles instead of hard-coding them. A Gallery Manager can upload and caption but never publish or delete;
        a Content Manager can draft projects and announcements and send them to review. Assign as many roles to a member as you like.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setDraft(blank())}
          className="inline-flex min-h-11 items-center gap-2 rounded-full brand-gradient px-5 text-xs font-bold uppercase tracking-widest text-white">
          <Plus className="h-4 w-4" /> New role
        </button>
        {msg && <span className="text-xs font-semibold text-muted-foreground">{msg}</span>}
      </div>

      {draft && (
        <div className="mb-8 rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block min-w-0">
              <span className={labelCls}>Role name</span>
              <input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Gallery Manager" className={inputCls} />
            </label>
            <label className="block min-w-0">
              <span className={labelCls}>Description</span>
              <input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Uploads and captions gallery media." className={inputCls} />
            </label>
          </div>

          <div className="mt-6 space-y-5">
            {PERMISSION_GROUPS.map((g) => (
              <div key={g.group}>
                <div className={labelCls}>{g.group}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {g.items.map((i) => {
                    const on = (draft.permissions ?? []).includes(i.key);
                    return (
                      <button key={i.key} type="button"
                        onClick={() => setDraft({
                          ...draft,
                          permissions: on
                            ? (draft.permissions ?? []).filter((p) => p !== i.key)
                            : [...(draft.permissions ?? []), i.key],
                        })}
                        className={`min-h-10 rounded-full border px-3 text-xs font-semibold transition-colors ${
                          on ? "border-transparent bg-emerald-600 text-white" : "border-border hover:bg-muted"}`}>
                        {on ? "✓ " : ""}{i.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={saveRole}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-xs font-bold uppercase tracking-widest text-background">
              <Save className="h-4 w-4" /> Save role
            </button>
            <button type="button" onClick={() => setDraft(null)}
              className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-xs font-bold uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Roles</h2>
          {(rolesQ.data ?? []).map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 truncate font-bold"><ShieldCheck className="h-4 w-4 shrink-0 text-brand" />{r.name}</h3>
                  {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setDraft(r)} className={iconBtn}>Edit</button>
                  <button type="button" onClick={() => removeRole(r.id)} className={`${iconBtn} text-red-600`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(r.permissions ?? []).map((p) => (
                  <span key={p} className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold">{PERMISSION_LABEL[p] ?? p}</span>
                ))}
                {(r.permissions ?? []).length === 0 && <span className="text-xs text-muted-foreground">No abilities selected</span>}
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Assignments</h2>
          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={assignUser} onChange={(e) => setAssignUser(e.target.value)} className={inputCls}>
                <option value="">Choose member…</option>
                {(membersQ.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name}{m.admission_number ? ` · ${m.admission_number}` : ""}</option>)}
              </select>
              <select value={assignRole} onChange={(e) => setAssignRole(e.target.value)} className={inputCls}>
                <option value="">Choose role…</option>
                {(rolesQ.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <button type="button" onClick={assign}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-xs font-bold uppercase tracking-widest text-background">
              <UserPlus className="h-4 w-4" /> Assign
            </button>

            <ul className="mt-4 divide-y divide-border">
              {(assignQ.data ?? []).map((a) => (
                <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{memberName(a.user_id)}</p>
                    <p className="text-xs text-muted-foreground">{rolesQ.data?.find((r) => r.id === a.role_id)?.name ?? "—"}</p>
                  </div>
                  <button type="button" onClick={() => unassign(a.id)} className={`${iconBtn} text-red-600`}>Remove</button>
                </li>
              ))}
              {(assignQ.data ?? []).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No custom roles assigned yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </PortalPage>
  );
}

const inputCls = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand";
const labelCls = "block text-[11px] font-bold uppercase tracking-widest text-muted-foreground";
const iconBtn = "inline-flex min-h-10 items-center justify-center gap-1 rounded-full border border-border px-3 text-[10px] font-bold uppercase tracking-widest hover:bg-muted";
