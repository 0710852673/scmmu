import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ELITE = ["administrator", "tic", "section_head", "executive_board"];

/**
 * Member-only leaderboard. Runs server-side so the browser never needs to read
 * every profile row or enumerate the full role table — it returns only
 * ranking-safe fields (name, photo, division, points).
 */
export const getMemberRankings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profiles, points, roles] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,photo_url,primary_division"),
      supabaseAdmin.from("points_log").select("user_id,points"),
      supabaseAdmin.from("user_roles").select("user_id,role"),
    ]);

    const elite = new Set(
      (roles.data ?? []).filter((r) => ELITE.includes(r.role as string)).map((r) => r.user_id),
    );
    const totals = new Map<string, number>();
    for (const p of points.data ?? []) {
      totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points ?? 0));
    }

    return (profiles.data ?? [])
      .filter((u) => !elite.has(u.id))
      .map((u) => ({
        id: u.id,
        full_name: u.full_name,
        photo_url: u.photo_url,
        primary_division: u.primary_division,
        points: totals.get(u.id) ?? 0,
      }))
      .sort((a, b) => b.points - a.points);
  });
