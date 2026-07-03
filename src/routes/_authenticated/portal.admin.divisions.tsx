import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminEditor, useTable, type FieldDef } from "@/components/portal/AdminEditor";

export const Route = createFileRoute("/_authenticated/portal/admin/divisions")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => r.role === "administrator"))
      throw redirect({ to: "/portal" });
  },
  component: AdminDivisions,
});

type Row = {
  slug: string; name: string; description: string | null;
  responsibilities: string | null; cover_image: string | null; display_order: number | null;
};

// AdminEditor expects an `id` field. We map slug -> id.
type WithId = Row & { id: string };

const fields: FieldDef[] = [
  { key: "name", label: "Name", required: true },
  { key: "display_order", label: "Order", type: "number" },
  { key: "description", label: "Short description", type: "textarea", colSpan: 2 },
  { key: "responsibilities", label: "Responsibilities", type: "textarea", colSpan: 2 },
  { key: "cover_image", label: "Cover image URL", type: "url", colSpan: 2 },
];

function AdminDivisions() {
  const { rows, refresh } = useTable<WithId>(["admin-divisions"], async () => {
    const { data } = await supabase.from("divisions").select("*").order("display_order");
    return (data ?? []).map((d) => ({ ...d, id: d.slug })) as WithId[];
  });

  return (
    <PortalPage eyebrow="Administrator" title="Divisions">
      <div className="mb-4 text-sm text-muted-foreground max-w-2xl">
        Divisions are a fixed set; edit their public content here (image, description, responsibilities, order).
      </div>
      <AdminEditor<WithId>
        title="Divisions"
        rows={rows}
        fields={fields}
        emptyRow={{}}
        refresh={refresh}
        onCreate={async () => ({ error: "Divisions cannot be created here — use a migration to add a new slug." })}
        onUpdate={async (id, patch) => {
          const { id: _id, slug: _slug, ...clean } = patch as any;
          const { error } = await supabase.from("divisions").update(clean).eq("slug", id as any);
          return { error: error?.message ?? null };
        }}
        onDelete={async () => ({ error: "Divisions cannot be deleted — they are referenced by roles and events." })}
        renderRow={(r) => (
          <div className="flex items-center gap-3">
            {r.cover_image
              ? <img src={r.cover_image} alt="" className="h-12 w-16 rounded object-cover" />
              : <div className="h-12 w-16 rounded bg-muted" />}
            <div className="min-w-0">
              <div className="font-semibold truncate">{r.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                #{r.display_order ?? "—"} · /{r.slug} · {r.description?.slice(0, 60) || "no description"}
              </div>
            </div>
          </div>
        )}
      />
    </PortalPage>
  );
}
