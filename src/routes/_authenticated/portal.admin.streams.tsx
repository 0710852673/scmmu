import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminEditor, useTable, type FieldDef } from "@/components/portal/AdminEditor";
import { STREAM_STATES } from "@/lib/coverage";

export const Route = createFileRoute("/_authenticated/portal/admin/streams")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r.role)))
      throw redirect({ to: "/portal" });
  },
  component: AdminStreams,
});

type Row = {
  id: string;
  title: string;
  description: string | null;
  state: string;
  scheduled_at: string | null;
  youtube_url: string | null;
  facebook_url: string | null;
  thumbnail_url: string | null;
  published: boolean;
  display_order: number;
};

const fields: FieldDef[] = [
  { key: "title", label: "Broadcast title", required: true, colSpan: 2 },
  { key: "state", label: "State", type: "select", required: true, options: STREAM_STATES.map((s) => ({ value: s.value, label: s.label })) },
  { key: "scheduled_at", label: "Scheduled (YYYY-MM-DDTHH:MM)", },
  { key: "youtube_url", label: "YouTube URL", type: "url", colSpan: 2 },
  { key: "facebook_url", label: "Facebook URL", type: "url", colSpan: 2 },
  { key: "thumbnail_url", label: "Thumbnail image URL", type: "url", colSpan: 2 },
  { key: "description", label: "Description", type: "textarea", colSpan: 2 },
  { key: "display_order", label: "Display order", type: "number" },
];

function AdminStreams() {
  const { rows, refresh } = useTable<Row>(["admin-streams"], async () => {
    const { data } = await supabase.from("live_streams").select("*")
      .order("display_order").order("created_at", { ascending: false });
    return (data ?? []) as Row[];
  });

  return (
    <PortalPage eyebrow="BROADCAST" title="Live streams & replays">
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
        Streams are hosted on YouTube and Facebook — the site only presents them. Set the state to
        <strong> Upcoming</strong> for a countdown card, <strong>Live now</strong> to show the on-air banner and watch button,
        and <strong>Replay</strong> once the broadcast ends.
      </p>
      <AdminEditor<Row>
        title="Broadcasts"
        rows={rows}
        fields={fields}
        emptyRow={{ state: "upcoming", published: true, display_order: 0 } as Partial<Row>}
        refresh={refresh}
        onCreate={async (row) => {
          const { error } = await supabase.from("live_streams").insert(row as any);
          return { error: error?.message ?? null };
        }}
        onUpdate={async (id, patch) => {
          const { error } = await supabase.from("live_streams").update(patch as any).eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        onDelete={async (id) => {
          const { error } = await supabase.from("live_streams").delete().eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        renderRow={(r) => (
          <div className="flex items-center gap-3">
            {r.thumbnail_url
              ? <img src={r.thumbnail_url} alt="" className="h-14 w-24 rounded object-cover" />
              : <div className="h-14 w-24 rounded bg-muted" />}
            <div className="min-w-0">
              <div className="truncate font-semibold">{r.title}</div>
              <div className="text-xs text-muted-foreground">
                {STREAM_STATES.find((s) => s.value === r.state)?.label ?? r.state}
                {r.scheduled_at ? ` · ${new Date(r.scheduled_at).toLocaleString()}` : ""}
              </div>
            </div>
          </div>
        )}
      />
    </PortalPage>
  );
}
