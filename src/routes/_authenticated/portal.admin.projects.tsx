import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminEditor, useTable, type FieldDef } from "@/components/portal/AdminEditor";
import { usePublishRights, reviewFields, notifySubmitted } from "@/lib/review";
import { REVIEW_CLASS, REVIEW_LABEL } from "@/lib/permissions";
import { getPortalAccess, hasAnyPermission } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/portal/admin/projects")({
  beforeLoad: async ({ context }) => {
    const access = await getPortalAccess(context.user.id);
    if (!access.roles.some((role) => ["administrator", "tic", "section_head", "executive_board"].includes(role)) && !hasAnyPermission(access, ["projects.create", "projects.edit", "projects.publish", "projects.delete"]))
      throw redirect({ to: "/portal" });
  },
  component: AdminProjects,
});

type Row = {
  id: string; slug: string; title: string; summary: string | null;
  description: string | null; cover_image: string | null;
  event_date: string | null; is_featured: boolean; published: boolean; review_status: string;
};

const fields: FieldDef[] = [
  { key: "title", label: "Title", required: true },
  { key: "slug", label: "Slug (URL)", required: true, placeholder: "e.g. sports-meet-2026" },
  { key: "summary", label: "Short summary", colSpan: 2 },
  { key: "description", label: "Full description", type: "textarea", colSpan: 2 },
  { key: "cover_image", label: "Cover image URL", type: "url", colSpan: 2, placeholder: "https://…" },
  { key: "event_date", label: "Event date", type: "date" },
  { key: "is_featured", label: "Featured on home", type: "checkbox" },
  { key: "published", label: "Published (visible on site)", type: "checkbox" },
];

function AdminProjects() {
  const { user } = Route.useRouteContext();
  const { roles, permissions, canPublish } = usePublishRights(user.id, "projects.publish");
  const isStaff = roles.some((role) => ["administrator", "tic", "section_head", "executive_board"].includes(role));
  const { rows, refresh } = useTable<Row>(["admin-projects"], async () => {
    const { data } = await supabase.from("projects").select("*").order("event_date", { ascending: false, nullsFirst: false });
    return (data ?? []) as Row[];
  });

  return (
    <PortalPage eyebrow="Editor" title="Projects">
      <AdminEditor<Row>
        title="Projects"
        rows={rows}
        fields={fields}
        emptyRow={{ published: true, is_featured: false } as Partial<Row>}
        refresh={refresh}
        canCreate={isStaff || permissions.includes("projects.create")}
        canEdit={isStaff || permissions.includes("projects.edit")}
        canDelete={isStaff || permissions.includes("projects.delete")}
        onCreate={async (row) => {
          const { error } = await supabase.from("projects")
            .insert({ ...(row as any), published: canPublish ? (row as any).published ?? true : false, ...reviewFields(canPublish, user.id) } as any);
          if (!error && !canPublish) await notifySubmitted("Project", (row as any).title || "Untitled project");
          return { error: error?.message ?? null };
        }}
        onUpdate={async (id, patch) => {
          const { error } = await supabase.from("projects")
            .update({ ...(patch as any), ...(canPublish ? {} : { published: false }), ...reviewFields(canPublish, user.id) } as any).eq("id", id as string);
          if (!error && !canPublish) await notifySubmitted("Project", (patch as any).title || "Untitled project");
          return { error: error?.message ?? null };
        }}
        onDelete={async (id) => {
          const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() } as any).eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        renderRow={(r) => (
          <div className="flex items-center gap-3">
            {r.cover_image
              ? <img src={r.cover_image} alt="" className="h-14 w-20 rounded object-cover" />
              : <div className="h-14 w-20 rounded bg-muted" />}
            <div className="min-w-0">
              <div className="font-semibold truncate">{r.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${REVIEW_CLASS[r.review_status] ?? ""}`}>
                  {REVIEW_LABEL[r.review_status] ?? r.review_status}
                </span>
                /{r.slug} · {r.event_date ?? "no date"} · {r.published ? "Published" : "Draft"}
                {r.is_featured && " · ★ Featured"}
              </div>
            </div>
          </div>
        )}
      />
    </PortalPage>
  );
}
