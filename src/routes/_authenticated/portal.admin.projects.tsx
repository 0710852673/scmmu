import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminEditor, useTable, type FieldDef } from "@/components/portal/AdminEditor";

export const Route = createFileRoute("/_authenticated/portal/admin/projects")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r.role)))
      throw redirect({ to: "/portal" });
  },
  component: AdminProjects,
});

type Row = {
  id: string; slug: string; title: string; summary: string | null;
  description: string | null; cover_image: string | null;
  event_date: string | null; is_featured: boolean; published: boolean;
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
        onCreate={async (row) => {
          const { error } = await supabase.from("projects").insert(row as any);
          return { error: error?.message ?? null };
        }}
        onUpdate={async (id, patch) => {
          const { error } = await supabase.from("projects").update(patch as any).eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        onDelete={async (id) => {
          const { error } = await supabase.from("projects").delete().eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        renderRow={(r) => (
          <div className="flex items-center gap-3">
            {r.cover_image
              ? <img src={r.cover_image} alt="" className="h-14 w-20 rounded object-cover" />
              : <div className="h-14 w-20 rounded bg-muted" />}
            <div className="min-w-0">
              <div className="font-semibold truncate">{r.title}</div>
              <div className="text-xs text-muted-foreground truncate">
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
