import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminEditor, useTable, type FieldDef } from "@/components/portal/AdminEditor";
import { GALLERY_CATEGORIES, prettyLabel } from "@/lib/site-content";
import { usePublishRights, reviewFields, notifySubmitted } from "@/lib/review";
import { REVIEW_CLASS, REVIEW_LABEL } from "@/lib/permissions";
import { getPortalAccess, hasAnyPermission } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/portal/admin/gallery")({
  beforeLoad: async ({ context }) => {
    const access = await getPortalAccess(context.user.id);
    if (!access.roles.some((role) => ["administrator", "tic", "section_head", "executive_board"].includes(role)) && !hasAnyPermission(access, ["gallery.create", "gallery.edit", "gallery.publish", "gallery.delete"]))
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
  review_status: string;
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
  const { user } = Route.useRouteContext();
  const { roles, permissions, canPublish } = usePublishRights(user.id, "gallery.publish");
  const isStaff = roles.some((role) => ["administrator", "tic", "section_head", "executive_board"].includes(role));
  const { rows, refresh } = useTable<Row>(["admin-gallery"], async () => {
    const { data } = await supabase.from("gallery_items").select("*").is("deleted_at", null).order("created_at", { ascending: false });
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
        canCreate={isStaff || permissions.includes("gallery.create")}
        canEdit={isStaff || permissions.includes("gallery.edit")}
        canDelete={isStaff || permissions.includes("gallery.delete")}
        onCreate={async (row) => {
          const { error } = await supabase.from("gallery_items")
            .insert({ ...(row as any), ...reviewFields(canPublish, user.id) } as any);
          if (!error && !canPublish) await notifySubmitted("Gallery media", (row as any).title || "Untitled media");
          return { error: error?.message ?? null };
        }}
        onUpdate={async (id, patch) => {
          const { error } = await supabase.from("gallery_items")
            .update({ ...(patch as any), ...reviewFields(canPublish, user.id) } as any).eq("id", id as string);
          if (!error && !canPublish) await notifySubmitted("Gallery media", (patch as any).title || "Untitled media");
          return { error: error?.message ?? null };
        }}
        onDelete={async (id) => {
          const { error } = await supabase.from("gallery_items").update({ deleted_at: new Date().toISOString() } as any).eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        renderRow={(r) => (
          <div className="flex items-center gap-3">
            <img src={r.image_url} alt="" className="h-14 w-14 rounded object-cover" />
            <div className="min-w-0">
              <div className="truncate font-semibold">{r.title || "Untitled"}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${REVIEW_CLASS[r.review_status] ?? ""}`}>
                  {REVIEW_LABEL[r.review_status] ?? r.review_status}
                </span>
                {prettyLabel(r.category)}{r.media_type === "video" ? " · Video" : ""}{r.event_date ? ` · ${r.event_date}` : ""}
              </div>
            </div>
          </div>
        )}
      />
    </PortalPage>
  );
}
