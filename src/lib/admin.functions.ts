import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MemberRole = "member" | "section_head" | "executive_board" | "tic" | "administrator";

type CreateInput = {
  email: string;
  password: string;
  full_name: string;
  photo_url?: string | null;
  grade?: string | null;
  class?: string | null;
  whatsapp?: string | null;
  primary_division?: string | null;
  role: MemberRole;
  role_title?: string | null;
  board_category?: "tic" | "executive" | "section_head" | "member";
  section?: string | null;
  bio?: string | null;
  show_on_site?: boolean;
};

type UpdateInput = {
  user_id: string;
  patch: {
    full_name?: string | null;
    email?: string | null;
    photo_url?: string | null;
    grade?: string | null;
    class?: string | null;
    whatsapp?: string | null;
    primary_division?: string | null;
    bio?: string | null;
  };
  role?: MemberRole;
  role_title?: string | null;
  board_category?: "tic" | "executive" | "section_head" | "member";
  section?: string | null;
  show_on_site?: boolean;
  new_password?: string | null;
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "administrator" });
  if (!data) throw new Error("Forbidden: administrator only");
}

/** Strip empty strings so we don't overwrite enum columns with '' (which errors). */
function clean<T extends Record<string, any>>(o: T): Partial<T> {
  const out: any = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") { out[k] = null; continue; }
    out[k] = v;
  }
  return out;
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

    // Assign an MU number for everyone EXCEPT TIC.
    let admission_number: string | null = null;
    if (data.role !== "tic") {
      const { data: mu } = await supabaseAdmin.rpc("next_mu_number");
      admission_number = (mu as unknown as string) ?? null;
    }

    const profilePatch = clean({
      full_name: data.full_name,
      photo_url: data.photo_url,
      grade: data.grade,
      class: data.class,
      whatsapp: data.whatsapp,
      primary_division: data.primary_division,
      email: data.email,
      bio: data.bio,
      admission_number,
    });

    const { error: upErr } = await supabaseAdmin.from("profiles").update(profilePatch as any).eq("id", uid);
    if (upErr) throw new Error(`Profile update failed: ${upErr.message}`);

    if (data.role !== "member") {
      // Clear default 'member' role from trigger and set the requested one.
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
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
        board_category: data.board_category ?? (data.role === "tic" ? "tic" : data.role === "executive_board" ? "executive" : data.role === "section_head" ? "section_head" : "member"),
        rank: 0, points: 0, display_order: 0, active: true,
      });
    }

    return { id: uid, ok: true, admission_number };
  });

export const adminDeleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("featured_members").delete().eq("full_name", "___never___"); // no-op guard
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpdateInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch = clean(data.patch);
    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(patch as any).eq("id", data.user_id);
      if (error) throw new Error(`Profile update failed: ${error.message}`);
    }

    if (data.patch.email) {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, { email: data.patch.email });
    }

    if (data.new_password && data.new_password.length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.new_password });
      if (error) throw new Error(`Password update failed: ${error.message}`);
    }

    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    }

    // Sync featured_members row keyed by full_name (best-effort; a member may not be listed publicly)
    if (data.show_on_site !== undefined && data.patch.full_name) {
      const existing = await supabaseAdmin.from("featured_members").select("id").eq("full_name", data.patch.full_name).maybeSingle();
      if (data.show_on_site) {
        const row = {
          full_name: data.patch.full_name,
          role_title: data.role_title ?? "Member",
          division: data.patch.primary_division ?? data.section ?? "General",
          section: data.section ?? null,
          grade: data.patch.grade ?? null,
          photo_url: data.patch.photo_url ?? null,
          board_category: data.board_category ?? "member",
          active: true,
        };
        if (existing.data?.id) {
          await supabaseAdmin.from("featured_members").update(row).eq("id", existing.data.id);
        } else {
          await supabaseAdmin.from("featured_members").insert({ ...row, rank: 0, points: 0, display_order: 0 });
        }
      } else if (existing.data?.id) {
        await supabaseAdmin.from("featured_members").delete().eq("id", existing.data.id);
      }
    }

    return { ok: true };
  });
