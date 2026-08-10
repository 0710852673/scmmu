import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ───────────────────────── guards ───────────────────────── */

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: staff only");
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "administrator",
  });
  if (!data) throw new Error("Forbidden: administrator only");
}

const ELITE = ["administrator", "tic", "section_head", "executive_board"];

export type PerformanceRow = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  admission_number: string | null;
  primary_division: string | null;
  role: string;
  points: number;
  approved: number;
  pending: number;
  rejected: number;
  approvalRate: number;
  attendance: number;
  events: number;
  awards: number;
  lastActive: string | null;
  score: number;
};

function computeScore(r: Omit<PerformanceRow, "score">) {
  // Fairness weighting: points carry the most, but consistency (attendance,
  // events) and quality (approval rate) matter so raw volume can't dominate.
  return Math.round(
    r.points * 1 + r.attendance * 1.5 + r.events * 2 + r.approvalRate * 0.25,
  );
}

/* ─────────────────── performance overview ─────────────────── */

/** Staff-wide performance table: every member with points, quality and consistency metrics. */
export const getPerformanceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, roles, points, contribs, attendance, participation, awards] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id,full_name,photo_url,admission_number,primary_division"),
        supabaseAdmin.from("user_roles").select("user_id,role"),
        supabaseAdmin.from("points_log").select("user_id,points,created_at"),
        supabaseAdmin.from("contributions").select("user_id,status"),
        supabaseAdmin.from("attendance").select("user_id"),
        supabaseAdmin.from("event_participants").select("user_id,status"),
        supabaseAdmin.from("member_achievements").select("user_id"),
      ]);

    const roleMap = new Map<string, string>();
    for (const r of roles.data ?? []) roleMap.set(r.user_id, r.role as string);

    const total = new Map<string, number>();
    const last = new Map<string, string>();
    for (const p of points.data ?? []) {
      total.set(p.user_id, (total.get(p.user_id) ?? 0) + (p.points ?? 0));
      const prev = last.get(p.user_id);
      if (!prev || p.created_at > prev) last.set(p.user_id, p.created_at);
    }

    const bucket = new Map<string, { a: number; p: number; r: number }>();
    for (const c of contribs.data ?? []) {
      const b = bucket.get(c.user_id) ?? { a: 0, p: 0, r: 0 };
      if (c.status === "approved") b.a++;
      else if (c.status === "rejected") b.r++;
      else b.p++;
      bucket.set(c.user_id, b);
    }

    const count = (rows: Array<{ user_id: string }> | null) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
      return m;
    };
    const att = count(attendance.data);
    const evt = count(
      (participation.data ?? []).filter((p: any) => p.status === "approved"),
    );
    const awd = count(awards.data);

    const rows: PerformanceRow[] = (profiles.data ?? []).map((u) => {
      const b = bucket.get(u.id) ?? { a: 0, p: 0, r: 0 };
      const decided = b.a + b.r;
      const base = {
        id: u.id,
        full_name: u.full_name,
        photo_url: u.photo_url,
        admission_number: u.admission_number,
        primary_division: u.primary_division as string | null,
        role: roleMap.get(u.id) ?? "member",
        points: total.get(u.id) ?? 0,
        approved: b.a,
        pending: b.p,
        rejected: b.r,
        approvalRate: decided ? Math.round((b.a / decided) * 100) : 0,
        attendance: att.get(u.id) ?? 0,
        events: evt.get(u.id) ?? 0,
        awards: awd.get(u.id) ?? 0,
        lastActive: last.get(u.id) ?? null,
      };
      return { ...base, score: computeScore(base) };
    });

    rows.sort((a, b) => b.score - a.score);
    return rows;
  });

/** A member's own performance snapshot (no access to anyone else's data). */
export const getMyPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [points, contribs, attendance, participation, mine, defs, allPoints, roles] =
      await Promise.all([
        supabaseAdmin
          .from("points_log")
          .select("kind,points,created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(300),
        supabaseAdmin.from("contributions").select("status").eq("user_id", uid),
        supabaseAdmin.from("attendance").select("attended_on").eq("user_id", uid),
        supabaseAdmin
          .from("event_participants")
          .select("status,events(name,event_date)")
          .eq("user_id", uid),
        supabaseAdmin
          .from("member_achievements")
          .select("id,awarded_at,season,note,achievements(name,description,icon,tier)")
          .eq("user_id", uid)
          .order("awarded_at", { ascending: false }),
        supabaseAdmin
          .from("achievements")
          .select("id,code,name,description,icon,tier,points_threshold,criteria")
          .order("tier"),
        supabaseAdmin.from("points_log").select("user_id,points"),
        supabaseAdmin.from("user_roles").select("user_id,role"),
      ]);

    const pts = points.data ?? [];
    const totalPoints = pts.reduce((s, p) => s + (p.points ?? 0), 0);

    // Monthly trend (last 6 months).
    const trend = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      trend.set(d.toISOString().slice(0, 7), 0);
    }
    for (const p of pts) {
      const k = String(p.created_at).slice(0, 7);
      if (trend.has(k)) trend.set(k, (trend.get(k) ?? 0) + (p.points ?? 0));
    }

    // By kind breakdown.
    const byKind = new Map<string, number>();
    for (const p of pts) byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + (p.points ?? 0));

    // Rank among non-staff members only.
    const elite = new Set(
      (roles.data ?? []).filter((r) => ELITE.includes(r.role as string)).map((r) => r.user_id),
    );
    const totals = new Map<string, number>();
    for (const p of allPoints.data ?? []) {
      if (elite.has(p.user_id)) continue;
      totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points ?? 0));
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([id]) => id === uid) + 1;

    const c = contribs.data ?? [];
    const approved = c.filter((x) => x.status === "approved").length;
    const rejected = c.filter((x) => x.status === "rejected").length;
    const pending = c.filter((x) => x.status === "pending").length;
    const decided = approved + rejected;

    return {
      totalPoints,
      rank: rank || null,
      rankOf: sorted.length,
      approved,
      rejected,
      pending,
      approvalRate: decided ? Math.round((approved / decided) * 100) : 0,
      attendance: (attendance.data ?? []).length,
      events: (participation.data ?? []).filter((p: any) => p.status === "approved").length,
      trend: [...trend.entries()].map(([month, points]) => ({ month, points })),
      byKind: [...byKind.entries()]
        .map(([kind, points]) => ({ kind, points }))
        .sort((a, b) => b.points - a.points),
      awards: mine.data ?? [],
      catalogue: defs.data ?? [],
    };
  });

/* ───────────────────────── awards ───────────────────────── */

export const listAwards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [defs, granted, profiles] = await Promise.all([
      supabaseAdmin.from("achievements").select("*").order("name"),
      supabaseAdmin
        .from("member_achievements")
        .select("id,user_id,achievement_id,awarded_at,season,note"),
      supabaseAdmin.from("profiles").select("id,full_name,photo_url,admission_number"),
    ]);
    return {
      definitions: defs.data ?? [],
      granted: granted.data ?? [],
      members: profiles.data ?? [],
    };
  });

export const saveAward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      code: string;
      name: string;
      description?: string | null;
      icon?: string | null;
      tier?: string;
      criteria?: string | null;
      points_threshold?: number | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description || null,
      icon: data.icon || null,
      tier: data.tier || "standard",
      criteria: data.criteria || null,
      points_threshold: data.points_threshold ?? null,
    };
    const { error } = data.id
      ? await supabaseAdmin.from("achievements").update(row).eq("id", data.id)
      : await supabaseAdmin.from("achievements").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("member_achievements").delete().eq("achievement_id", data.id);
    const { error } = await supabaseAdmin.from("achievements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const grantAward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { user_id: string; achievement_id: string; season?: string | null; note?: string | null }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("member_achievements").insert({
      user_id: data.user_id,
      achievement_id: data.achievement_id,
      season: data.season || null,
      note: data.note || null,
      awarded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.user_id,
      title: "You earned an award",
      body: data.note || "An award has been added to your member record.",
    });
    return { ok: true };
  });

export const revokeAward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("member_achievements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Fair awards: grant every threshold-based award to everyone who has earned it. */
export const runAutoAwards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [defs, points, existing] = await Promise.all([
      supabaseAdmin.from("achievements").select("id,points_threshold").not("points_threshold", "is", null),
      supabaseAdmin.from("points_log").select("user_id,points"),
      supabaseAdmin.from("member_achievements").select("user_id,achievement_id"),
    ]);

    const totals = new Map<string, number>();
    for (const p of points.data ?? []) {
      totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points ?? 0));
    }
    const have = new Set((existing.data ?? []).map((e) => `${e.user_id}:${e.achievement_id}`));

    const inserts: any[] = [];
    for (const d of defs.data ?? []) {
      for (const [userId, total] of totals) {
        if (total >= (d.points_threshold ?? 0) && !have.has(`${userId}:${d.id}`)) {
          inserts.push({
            user_id: userId,
            achievement_id: d.id,
            note: "Automatically awarded on reaching the points threshold.",
            awarded_by: context.userId,
          });
        }
      }
    }
    if (inserts.length) {
      const { error } = await supabaseAdmin.from("member_achievements").insert(inserts);
      if (error) throw new Error(error.message);
      await supabaseAdmin.from("notifications").insert(
        inserts.map((i) => ({
          user_id: i.user_id,
          title: "You earned an award",
          body: "You reached a points milestone and an award was added to your record.",
        })),
      );
    }
    return { granted: inserts.length };
  });

/* ─────────────── contribution verification ─────────────── */

export const listContributionQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("contributions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status as "approved" | "pending" | "rejected");
    }
    const [rows, profiles, rules] = await Promise.all([
      q,
      supabaseAdmin.from("profiles").select("id,full_name,photo_url,admission_number,primary_division"),
      supabaseAdmin.from("point_rules").select("kind,label,points"),
    ]);
    const pmap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
    const rmap = new Map((rules.data ?? []).map((r) => [r.kind, r]));
    return (rows.data ?? []).map((c: any) => ({
      ...c,
      member: pmap.get(c.user_id) ?? null,
      rule: rmap.get(c.kind) ?? null,
    }));
  });

export const reviewContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id: string; status: "approved" | "rejected" | "pending"; review_note?: string | null }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("contributions")
      .update({ status: data.status, review_note: data.review_note || null })
      .eq("id", data.id)
      .select("user_id,kind")
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (row) {
      await supabaseAdmin.from("notifications").insert({
        user_id: row.user_id,
        title:
          data.status === "approved"
            ? "Contribution verified"
            : data.status === "rejected"
              ? "Contribution rejected"
              : "Contribution reopened",
        body:
          (data.review_note ? `${data.review_note} — ` : "") +
          `${String(row.kind).replace(/_/g, " ")}`,
      });
    }
    return { ok: true };
  });
