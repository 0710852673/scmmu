import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminEditor, useTable, type FieldDef } from "@/components/portal/AdminEditor";

export const Route = createFileRoute("/_authenticated/portal/admin/gallery")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r.role)))
      throw redirect({ to: "/portal" });
  },
  component: AdminGallery,
});

type Row = {
  id: string; title: string | null;
  category: "photography" | "videography" | "behind_the_scenes" | "live_productions";
  image_url: string;
};

const fields: FieldDef[] = [
  { key: "title", label: "Caption", colSpan: 2 },
  { key: "image_url", label: "Image URL", type: "url", required: true, colSpan: 2 },
  {
    key: "category", label: "Category", type: "select", required: true,
    options: [
      { value: "photography", label: "Photography" },
      { value: "videography", label: "Videography" },
      { value: "behind_the_scenes", label: "Behind the Scenes" },
      { value: "live_productions", label: "Live Productions" },
    ],
  },
];

function AdminGallery() {
  const { rows, refresh } = useTable<Row>(["admin-gallery"], async () => {
    const { data } = await supabase.from("gallery_items").select("*").order("created_at", { ascending: false });
    return (data ?? []) as Row[];
  });

  return (
    <PortalPage eyebrow="Editor" title="Gallery">
      <AdminEditor<Row>
        title="Photos"
        rows={rows}
        fields={fields}
        emptyRow={{ category: "photography" } as Partial<Row>}
        refresh={refresh}
        onCreate={async (row) => {
          const { error } = await supabase.from("gallery_items").insert(row as any);
          return { error: error?.message ?? null };
        }}
        onUpdate={async (id, patch) => {
          const { error } = await supabase.from("gallery_items").update(patch as any).eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        onDelete={async (id) => {
          const { error } = await supabase.from("gallery_items").delete().eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        renderRow={(r) => (
          <div className="flex items-center gap-3">
            <img src={r.image_url} alt="" className="h-14 w-14 rounded object-cover" />
            <div className="min-w-0">
              <div className="font-semibold truncate">{r.title || "Untitled"}</div>
              <div className="text-xs text-muted-foreground">{r.category.replace(/_/g, " ")}</div>
            </div>
          </div>
        )}
      />
    </PortalPage>
  );
}
