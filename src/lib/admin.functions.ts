import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateInput = {
  email: string;
  password: string;
  full_name: string;
  photo_url?: string | null;
  admission_number?: string | null;
  grade?: string | null;
  class?: string | null;
  whatsapp?: string | null;
  primary_division?: string | null;
  role: "member" | "section_head" | "executive_board" | "tic" | "administrator";
  role_title?: string | null;
  board_category?: "tic" | "executive" | "section_head" | "member";
  section?: string | null;
  show_on_site?: boolean;
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "administrator" });
  if (!data) throw new Error("Forbidden: administrator only");
}

export const adminCreateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const uid = created.user.id;

    await supabaseAdmin.from("profiles").update({
      full_name: data.full_name,
      photo_url: data.photo_url ?? null,
      admission_number: data.admission_number ?? null,
      grade: data.grade ?? null,
      class: data.class ?? null,
      whatsapp: data.whatsapp ?? null,
      primary_division: (data.primary_division ?? null) as any,
      email: data.email,
    } as any).eq("id", uid);

    if (data.role !== "member") {
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    }

    if (data.show_on_site) {
      await supabaseAdmin.from("featured_members").insert({
        full_name: data.full_name,
        role_title: data.role_title ?? "Member",
        division: data.primary_division ?? data.section ?? "General",
        section: data.section ?? null,
        grade: data.grade ?? null,
        photo_url: data.photo_url ?? null,
        board_category: data.board_category ?? "member",
        rank: 0, points: 0, display_order: 0, active: true,
      });
    }

    return { id: uid, ok: true };
  });

export const adminDeleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; patch: Record<string, any>; role?: CreateInput["role"] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (Object.keys(data.patch).length > 0) {
      await supabaseAdmin.from("profiles").update(data.patch).eq("id", data.user_id);
    }
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      if (data.role !== "member") {
        await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
      } else {
        await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: "member" });
      }
    }
    return { ok: true };
  });
