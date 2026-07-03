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
};

const fields: FieldDef[] = [
  { key: "name", label: "Event name", required: true, colSpan: 2 },
  { key: "event_date", label: "Date", type: "date", required: true },
  { key: "category", label: "Category", placeholder: "e.g. Concert, Sports, Ceremony" },
  { key: "location", label: "Location", colSpan: 2 },
  { key: "description", label: "Description", type: "textarea", colSpan: 2 },
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
          const { error } = await supabase.from("events").insert(row as any);
          return { error: error?.message ?? null };
        }}
        onUpdate={async (id, patch) => {
          const { error } = await supabase.from("events").update(patch as any).eq("id", id as string);
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
              {new Date(r.event_date).toLocaleDateString()} · {r.location || "—"} · {r.category || "—"}
            </div>
          </div>
        )}
      />
    </PortalPage>
  );
}
