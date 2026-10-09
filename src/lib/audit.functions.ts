import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden: staff only");
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "administrator" });
  if (!data) throw new Error("Forbidden: administrator only");
}

export type ActivityRow = {
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
  meta: Record<string, any>;
  created_at: string;
};

/* ───────────────────────── activity log ───────────────────────── */

export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entity?: string; action?: string; search?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(400);
    if (data.entity && data.entity !== "all") q = q.eq("entity", data.entity);
    if (data.action && data.action !== "all") q = q.eq("action", data.action);
    if (data.search?.trim()) q = q.ilike("summary", `%${data.search.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ActivityRow[];
  });

/* ─────────────────────── trash / restore ─────────────────────── */

const TRASHABLE = {
  gallery_items: { label: "Gallery item", title: "title" },
  projects: { label: "Project", title: "title" },
  announcements: { label: "Announcement", title: "title" },
} as const;

export type TrashTable = keyof typeof TRASHABLE;

export type TrashRow = {
  table: TrashTable;
  label: string;
  id: string;
  title: string;
  deleted_at: string;
};

export const listTrash = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tables = Object.keys(TRASHABLE) as TrashTable[];
    const results = await Promise.all(
      tables.map((t) =>
        supabaseAdmin
          .from(t)
          .select("id,title,deleted_at")
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false })
          .limit(200),
      ),
    );
    const rows: TrashRow[] = [];
    results.forEach((res, i) => {
      const table = tables[i]!;
      for (const r of (res.data ?? []) as any[]) {
        rows.push({
          table,
          label: TRASHABLE[table].label,
          id: r.id,
          title: r.title || "Untitled",
          deleted_at: r.deleted_at,
        });
      }
    });
    rows.sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1));
    return rows;
  });

export const restoreTrashItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: TrashTable; id: string; title?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    if (!(data.table in TRASHABLE)) throw new Error("Unknown item type");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordActivity } = await import("@/lib/audit.server");
    const { error } = await supabaseAdmin
      .from(data.table)
      .update({ deleted_at: null } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await recordActivity(supabaseAdmin as any, context.userId, {
      action: "restore",
      entity: data.table,
      entity_id: data.id,
      summary: `Restored ${TRASHABLE[data.table].label.toLowerCase()} “${data.title ?? data.id}” from the bin`,
    });
    return { ok: true };
  });

export const purgeTrashItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: TrashTable; id: string; title?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!(data.table in TRASHABLE)) throw new Error("Unknown item type");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordActivity } = await import("@/lib/audit.server");
    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await recordActivity(supabaseAdmin as any, context.userId, {
      action: "purge",
      entity: data.table,
      entity_id: data.id,
      summary: `Permanently deleted ${TRASHABLE[data.table].label.toLowerCase()} “${data.title ?? data.id}”`,
    });
    return { ok: true };
  });

/* ───────────── system health + yearly analytics ───────────── */

export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const year = data.year ?? new Date().getFullYear();
    const from = `${year}-01-01`;
    const to = `${year + 1}-01-01`;

    const [
      profiles, contributions, bookings, events, gallery, projects,
      announcements, streams, points, notifications, activity, trashCounts,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,created_at"),
      supabaseAdmin.from("contributions").select("status,created_at,kind"),
      supabaseAdmin.from("bookings").select("status,created_at"),
      supabaseAdmin.from("events").select("id,event_date"),
      supabaseAdmin.from("gallery_items").select("id,created_at,review_status,deleted_at"),
      supabaseAdmin.from("projects").select("id,created_at,review_status,published,deleted_at"),
      supabaseAdmin.from("announcements").select("id,created_at,review_status,deleted_at"),
      supabaseAdmin.from("live_streams").select("id,state,created_at"),
      supabaseAdmin.from("points_log").select("points,created_at"),
      supabaseAdmin.from("notifications").select("id,read_at,created_at"),
      supabaseAdmin.from("activity_logs").select("id,created_at").order("created_at", { ascending: false }).limit(1),
      supabaseAdmin.from("gallery_items").select("id").not("deleted_at", "is", null),
    ]);

    const inYear = (d?: string | null) => !!d && d >= from && d < to;
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i, 1).toLocaleString("en", { month: "short" }),
      contributions: 0,
      points: 0,
      bookings: 0,
    }));
    for (const c of contributions.data ?? []) {
      if (inYear(c.created_at)) months[new Date(c.created_at).getMonth()]!.contributions++;
    }
    for (const p of points.data ?? []) {
      if (inYear(p.created_at)) months[new Date(p.created_at).getMonth()]!.points += p.points ?? 0;
    }
    for (const b of bookings.data ?? []) {
      if (inYear(b.created_at)) months[new Date(b.created_at).getMonth()]!.bookings++;
    }

    const bookingStatus = new Map<string, number>();
    for (const b of bookings.data ?? []) {
      if (!inYear(b.created_at)) continue;
      bookingStatus.set(b.status, (bookingStatus.get(b.status) ?? 0) + 1);
    }

    const pendingReview =
      (gallery.data ?? []).filter((g) => g.review_status === "pending" && !g.deleted_at).length +
      (projects.data ?? []).filter((p) => p.review_status === "pending" && !p.deleted_at).length +
      (announcements.data ?? []).filter((a) => a.review_status === "pending" && !a.deleted_at).length;

    const years = new Set<number>([year]);
    for (const c of contributions.data ?? []) years.add(new Date(c.created_at).getFullYear());
    for (const b of bookings.data ?? []) years.add(new Date(b.created_at).getFullYear());

    return {
      year,
      years: [...years].sort((a, b) => b - a),
      totals: {
        members: (profiles.data ?? []).length,
        newMembers: (profiles.data ?? []).filter((p) => inYear(p.created_at)).length,
        events: (events.data ?? []).filter((e) => inYear(e.event_date)).length,
        gallery: (gallery.data ?? []).filter((g) => !g.deleted_at).length,
        projects: (projects.data ?? []).filter((p) => !p.deleted_at).length,
        announcements: (announcements.data ?? []).filter((a) => !a.deleted_at).length,
        streams: (streams.data ?? []).length,
        pointsAwarded: (points.data ?? [])
          .filter((p) => inYear(p.created_at))
          .reduce((s, p) => s + (p.points ?? 0), 0),
      },
      health: {
        pendingContributions: (contributions.data ?? []).filter((c) => c.status === "pending").length,
        pendingReview,
        openBookings: (bookings.data ?? []).filter((b) =>
          ["new", "contacted", "under_discussion"].includes(b.status),
        ).length,
        unreadNotifications: (notifications.data ?? []).filter((n) => !n.read_at).length,
        trashed: (trashCounts.data ?? []).length,
        lastActivityAt: (activity.data ?? [])[0]?.created_at ?? null,
        liveStreams: (streams.data ?? []).filter((s) => s.state === "live").length,
      },
      months,
      bookingStatus: [...bookingStatus.entries()].map(([status, count]) => ({ status, count })),
    };
  });
