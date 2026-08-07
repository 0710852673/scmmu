import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminEditor, useTable, type FieldDef } from "@/components/portal/AdminEditor";
import { GALLERY_CATEGORIES, prettyLabel } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/portal/admin/gallery")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r)))
      throw redirect({ to: "/portal" });
  },
  component: AdminGallery,
});

type Row = {
  id: string;
  title: string | null;
  category: string;
  image_url: string;
  media_type: string;
  video_url: string | null;
  event_date: string | null;
};

const fields: FieldDef[] = [
  { key: "title", label: "Caption", colSpan: 2 },
  { key: "image_url", label: "Image URL (thumbnail)", type: "url", required: true, colSpan: 2 },
  {
    key: "category", label: "Category", type: "select", required: true,
    options: GALLERY_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
  },
  {
    key: "media_type", label: "Media type", type: "select",
    options: [{ value: "photo", label: "Photo" }, { value: "video", label: "Video" }],
  },
  { key: "video_url", label: "Video URL (for videos)", type: "url", colSpan: 2 },
  { key: "event_date", label: "Event date", type: "date" },
];

function AdminGallery() {
  const { rows, refresh } = useTable<Row>(["admin-gallery"], async () => {
    const { data } = await supabase.from("gallery_items").select("*").order("created_at", { ascending: false });
    return (data ?? []) as Row[];
  });

  return (
    <PortalPage eyebrow="EDITOR" title="GALLERY">
      <AdminEditor<Row>
        title="Gallery items"
        rows={rows}
        fields={fields}
        emptyRow={{ category: "photography", media_type: "photo" } as Partial<Row>}
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
              <div className="truncate font-semibold">{r.title || "Untitled"}</div>
              <div className="text-xs text-muted-foreground">
                {prettyLabel(r.category)}{r.media_type === "video" ? " · Video" : ""}{r.event_date ? ` · ${r.event_date}` : ""}
              </div>
            </div>
          </div>
        )}
      />
    </PortalPage>
  );
}
