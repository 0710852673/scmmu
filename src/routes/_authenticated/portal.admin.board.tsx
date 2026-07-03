import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminEditor, useTable, type FieldDef } from "@/components/portal/AdminEditor";

export const Route = createFileRoute("/_authenticated/portal/admin/board")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => r.role === "administrator"))
      throw redirect({ to: "/portal" });
  },
  component: AdminBoard,
});

type Row = {
  id: string; full_name: string; role_title: string; division: string;
  section: string | null; grade: string | null; photo_url: string | null;
  bio: string | null; board_category: string; display_order: number; active: boolean;
};

const fields: FieldDef[] = [
  { key: "full_name", label: "Full name", required: true },
  { key: "role_title", label: "Role title", required: true, placeholder: "e.g. President, Head of Photography" },
  {
    key: "board_category", label: "Category", type: "select", required: true,
    options: [
      { value: "tic", label: "TIC (Teacher-in-charge)" },
      { value: "executive", label: "Executive Board" },
      { value: "section_head", label: "Section Head" },
      { value: "member", label: "Featured Member" },
    ],
  },
  { key: "division", label: "Division", required: true, placeholder: "e.g. Photography" },
  { key: "section", label: "Section" },
  { key: "grade", label: "Grade / Class" },
  { key: "photo_url", label: "Photo URL", type: "url", colSpan: 2 },
  { key: "bio", label: "Short bio", type: "textarea", colSpan: 2 },
  { key: "display_order", label: "Display order (lower first)", type: "number" },
  { key: "active", label: "Visible on public site", type: "checkbox" },
];

function AdminBoard() {
  const { rows, refresh } = useTable<Row>(["admin-board"], async () => {
    const { data } = await supabase.from("featured_members").select("*").order("board_category").order("display_order");
    return (data ?? []) as Row[];
  });

  return (
    <PortalPage eyebrow="Administrator" title="Board & Leadership">
      <AdminEditor<Row>
        title="Board members"
        rows={rows}
        fields={fields}
        emptyRow={{ active: true, display_order: 0, board_category: "executive" } as Partial<Row>}
        refresh={refresh}
        onCreate={async (row) => {
          const { error } = await supabase.from("featured_members").insert({ ...(row as any), rank: 0, points: 0 });
          return { error: error?.message ?? null };
        }}
        onUpdate={async (id, patch) => {
          const { error } = await supabase.from("featured_members").update(patch as any).eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        onDelete={async (id) => {
          const { error } = await supabase.from("featured_members").delete().eq("id", id as string);
          return { error: error?.message ?? null };
        }}
        renderRow={(r) => (
          <div className="flex items-center gap-3">
            {r.photo_url
              ? <img src={r.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              : <div className="h-12 w-12 rounded-full bg-muted" />}
            <div className="min-w-0">
              <div className="font-semibold truncate">{r.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {r.role_title} · {r.board_category.replace("_", " ")} · {r.division}
                {!r.active && " · Hidden"}
              </div>
            </div>
          </div>
        )}
      />
    </PortalPage>
  );
}
