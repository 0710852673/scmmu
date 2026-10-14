import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MemberRole = "member" | "section_head" | "executive_board" | "tic" | "administrator";
type BoardCategory = "tic" | "executive" | "section_head" | "member";

type ProfilePatch = {
  full_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  grade?: string | null;
  class?: string | null;
  whatsapp?: string | null;
  primary_division?: string | null;
  bio?: string | null;
  join_date?: string | null;
  past_works?: string | null;
};

type CreateInput = ProfilePatch & {
  email: string;
  password: string;
  full_name: string;
  role: MemberRole;
  role_title?: string | null;
  board_category?: BoardCategory;
  section?: string | null;
  display_order?: number | null;
  show_on_site?: boolean;
};

type UpdateInput = {
  user_id: string;
  patch: ProfilePatch;
  role?: MemberRole;
  role_title?: string | null;
  board_category?: BoardCategory;
  section?: string | null;
  display_order?: number | null;
  show_on_site?: boolean;
  new_password?: string | null;
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "administrator" });
  if (!data) throw new Error("Forbidden: administrator only");
}

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: staff only");
}

/** Strip empty strings so we don't overwrite enum/date columns with '' (which errors). */
function clean<T extends Record<string, any>>(o: T): Partial<T> {
  const out: any = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") { out[k] = null; continue; }
    out[k] = v;
  }
  return out;
}

function boardCategoryFor(role: MemberRole, explicit?: BoardCategory): BoardCategory {
  if (explicit) return explicit;
  if (role === "tic") return "tic";
  if (role === "executive_board") return "executive";
  if (role === "section_head") return "section_head";
  return "member";
}

/** Mirror the account into the public `featured_members` listing. */
async function syncFeatured(
  admin: any,
  userId: string,
  p: {
    full_name?: string | null; photo_url?: string | null; grade?: string | null;
    primary_division?: string | null;
  },
  opts: { role_title?: string | null; board_category?: BoardCategory; section?: string | null; display_order?: number | null; show_on_site?: boolean },
) {
  if (opts.show_on_site === undefined) return;
  const { data: existing } = await admin
    .from("featured_members").select("id").eq("member_user_id", userId).maybeSingle();

  if (!opts.show_on_site) {
    if (existing?.id) await admin.from("featured_members").delete().eq("id", existing.id);
    return;
  }

  const row = {
    member_user_id: userId,
    full_name: p.full_name ?? "Member",
    role_title: opts.role_title ?? "Member",
    division: p.primary_division ?? opts.section ?? "General",
    section: opts.section ?? null,
    grade: p.grade ?? null,
    photo_url: p.photo_url ?? null,
    board_category: opts.board_category ?? "member",
    display_order: opts.display_order ?? 0,
    active: true,
  };
  if (existing?.id) await admin.from("featured_members").update(row).eq("id", existing.id);
  else await admin.from("featured_members").insert({ ...row, rank: 0, points: 0 });
}

export const adminCreateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password || `${crypto.randomUUID().slice(0, 8)}-Aa1`,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
      app_metadata: { must_change_password: true },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;

    // MU number for everyone EXCEPT TIC.

    const profilePatch = clean({
      full_name: data.full_name,
      photo_url: data.photo_url,
      grade: data.grade,
      class: data.class,
      whatsapp: data.whatsapp,
      primary_division: data.primary_division,
      email: data.email,
      bio: data.bio,
      join_date: data.join_date,
      past_works: data.past_works,
    });

    const { error: upErr } = await supabaseAdmin.from("profiles").update(profilePatch as any).eq("id", uid);
    if (upErr) throw new Error(`Profile update failed: ${upErr.message}`);

    if (data.role !== "member") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    }

    await syncFeatured(supabaseAdmin, uid, data, {
      role_title: data.role_title,
      board_category: boardCategoryFor(data.role, data.board_category),
      section: data.section,
      display_order: data.display_order,
      show_on_site: data.show_on_site ?? true,
    });

    await supabaseAdmin.from("member_onboarding").insert({ user_id: uid, created_by: context.userId });
    await supabaseAdmin.rpc("renumber_member_numbers" as any);
    const { data: pr } = await supabaseAdmin.from("profiles").select("admission_number").eq("id", uid).maybeSingle();
    return { id: uid, ok: true, admission_number: pr?.admission_number ?? null };
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

    await syncFeatured(supabaseAdmin, data.user_id, data.patch, {
      role_title: data.role_title,
      board_category: data.board_category,
      section: data.section,
      display_order: data.display_order,
      show_on_site: data.show_on_site,
    });

    return { ok: true };
  });

export const adminDeleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("featured_members").delete().eq("member_user_id", data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Full member directory for staff (TIC, executive board, section heads, admin). */
export const staffListMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: roles }, { data: featured }] = await Promise.all([
      supabaseAdmin.from("profiles")
        .select("id,full_name,email,photo_url,admission_number,grade,class,primary_division,whatsapp,bio,join_date,past_works")
        .order("admission_number", { ascending: true, nullsFirst: false }),
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.from("featured_members").select("member_user_id,role_title,board_category,section,display_order,active"),
    ]);
    const roleMap = new Map<string, string>();
    for (const r of roles ?? []) roleMap.set(r.user_id, r.role as string);
    const featMap = new Map<string, any>();
    for (const f of featured ?? []) if (f.member_user_id) featMap.set(f.member_user_id, f);

    return (profiles ?? []).map((p) => ({
      ...p,
      role: roleMap.get(p.id) ?? "member",
      featured: featMap.get(p.id) ?? null,
    }));
  });

/** Everything about one member: points, attendance, events, skills, achievements. */
export const staffGetMemberDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.user_id;
    const [profile, role, points, attendance, participation, contributions] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabaseAdmin.from("points_log").select("kind,division,points,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("attendance").select("attended_on,meeting_label").eq("user_id", uid).order("attended_on", { ascending: false }).limit(200),
      supabaseAdmin.from("event_participants").select("role,status,is_lead,event_id,events(name,event_date,location)").eq("user_id", uid).limit(200),
      supabaseAdmin.from("contributions").select("kind,division,status,note,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
    ]);

    const pts = points.data ?? [];
    return {
      profile: profile.data,
      role: (role.data?.role as string) ?? "member",
      points: pts,
      totalPoints: pts.reduce((s, p) => s + (p.points ?? 0), 0),
      attendance: attendance.data ?? [],
      events: participation.data ?? [],
      contributions: contributions.data ?? [],
    };
  });
