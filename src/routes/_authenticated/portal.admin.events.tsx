import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminEditor, useTable, type FieldDef } from "@/components/portal/AdminEditor";

export const Route = createFileRoute("/_authenticated/portal/admin/events")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r.role)))
      throw redirect({ to: "/portal" });
  },
  component: AdminEvents,
});

type Row = {
  id: string; name: string; event_date: string;
  location: string | null; category: string | null; description: string | null;
  slug?: string | null; is_public?: boolean;
};
const slugify = (v: string) => v.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const withSlug = (r: any) => (r.slug ? { ...r, slug: slugify(r.slug) } : r.name ? { ...r, slug: slugify(r.name) } : r);

const fields: FieldDef[] = [
  { key: "name", label: "Event name", required: true, colSpan: 2 },
  { key: "event_date", label: "Date", type: "date", required: true },
  { key: "category", label: "Category", placeholder: "e.g. Concert, Sports, Ceremony" },
  { key: "location", label: "Location", colSpan: 2 },
  { key: "description", label: "Description", type: "textarea", colSpan: 2 },
  { key: "is_public", label: "Show public coverage page", type: "checkbox" },
  { key: "slug", label: "Page address (e.g. nonimi-26)", placeholder: "nonimi-26" },
  { key: "event_size", label: "Event size", type: "select", options: [{ value: "small", label: "Small (5–15 photos)" }, { value: "large", label: "Large (20–50 photos)" }] },
  { key: "cover_image", label: "Cover image URL", type: "url" },
  { key: "highlight_video_url", label: "Highlight video (YouTube/Facebook)", type: "url", colSpan: 2 },
  { key: "livestream_url", label: "Full livestream (YouTube/Facebook)", type: "url", colSpan: 2 },
  { key: "album_url", label: "Facebook album link", type: "url", colSpan: 2 },
];

function AdminEvents() {
  const { rows, refresh } = useTable<Row>(["admin-events"], async () => {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: false });
    return (data ?? []) as Row[];
  });

  return (
    <PortalPage eyebrow="Editor" title="Events">
      <AdminEditor<Row>
        title="Events"
        rows={rows}
        fields={fields}
        emptyRow={{}}
        refresh={refresh}
        onCreate={async (row) => {
          const { error } = await supabase.from("events").insert(withSlug(row) as any);
          return { error: error?.message ?? null };
        }}
        onUpdate={async (id, patch) => {
          const { error } = await supabase.from("events").update((patch as any).slug ? withSlug(patch) : patch as any).eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        onDelete={async (id) => {
          const { error } = await supabase.from("events").delete().eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        renderRow={(r) => (
          <div className="min-w-0">
            <div className="font-semibold truncate">{r.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {new Date(r.event_date).toLocaleDateString()} · {r.location || "—"} · {r.category || "—"}{r.is_public && r.slug ? <> · <a className="text-brand underline" href={`/events/${r.slug}`} target="_blank" rel="noreferrer">Public page</a></> : null}
            </div>
          </div>
        )}
      />
    </PortalPage>
  );
}
