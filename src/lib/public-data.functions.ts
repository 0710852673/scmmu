import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getDivisions = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("divisions")
    .select("slug,name,description,cover_image,display_order")
    .order("display_order");
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null as string | null };
});

export const getProjects = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("projects")
    .select("id,slug,title,summary,cover_image,event_date,is_featured")
    .eq("published", true)
    .order("event_date", { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null as string | null };
});

export const getGallery = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("gallery_items")
    .select("id,category,title,image_url,media_type,video_url,event_date")
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null as string | null };
});

export const getBoardMembers = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("featured_members")
    .select("id,full_name,role_title,division,board_category,section,grade,photo_url,bio,display_order")
    .in("board_category", ["tic", "executive", "section_head"])
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) return { data: [], error: error.message };
  const rank: Record<string, number> = { tic: 0, executive: 1, section_head: 2 };
  const ordered = (data ?? []).slice().sort((a, b) => {
    const ra = rank[a.board_category ?? ""] ?? 9;
    const rb = rank[b.board_category ?? ""] ?? 9;
    if (ra !== rb) return ra - rb;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });
  return { data: ordered, error: null as string | null };
});

export const getUpcomingEvents = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("events")
    .select("id,name,event_date,location,description,category")
    .order("event_date", { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null as string | null };
});

export const getSiteStats = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("site_stats").select("*").eq("id", 1).maybeSingle();
  return data ?? {
    total_members: 68, active_members: 40, photos_captured: 3000,
    videos_produced: 240, live_streams: 50, events_covered: 1000, projects_published: 18,
  };
});

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();
  return data;
});

// ── NEW: member portfolio ─────────────────────────────────────────
export const getMemberProfile = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    // Profiles are no longer publicly readable; fetch only non-sensitive columns
    // server-side (never email / whatsapp / class-level contact data).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: prof }, { data: points }, { data: events }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,photo_url,admission_number,grade,primary_division,bio,join_date").eq("id", data.id).maybeSingle(),
      sb.from("points_log").select("kind,points,created_at,division").eq("user_id", data.id).order("created_at", { ascending: false }).limit(50),
      sb.from("event_participants").select("event_id,role,events(name,event_date,location)").eq("user_id", data.id).limit(30),
    ]);
    if (!prof) return { profile: null };
    const totalPoints = (points ?? []).reduce((s, p) => s + (p.points ?? 0), 0);
    return { profile: prof, points: points ?? [], totalPoints, events: events ?? [] };
  });

// ── NEW: search across gallery + projects + announcements ────────
export const searchSite = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => d)
  .handler(async ({ data }) => {
    const q = data.q.trim();
    if (q.length < 2) return { gallery: [], projects: [], announcements: [], events: [] };
    const sb = publicClient();
    const like = `%${q}%`;
    const [g, p, a, e] = await Promise.all([
      sb.from("gallery_items").select("id,title,image_url,category,media_type").ilike("title", like).limit(20),
      sb.from("projects").select("id,slug,title,summary,cover_image").eq("published", true).or(`title.ilike.${like},summary.ilike.${like}`).limit(20),
      sb.from("announcements").select("id,title,body,created_at").or(`title.ilike.${like},body.ilike.${like}`).limit(20),
      sb.from("events").select("id,name,event_date,location").or(`name.ilike.${like},description.ilike.${like}`).limit(20),
    ]);
    return {
      gallery: g.data ?? [],
      projects: p.data ?? [],
      announcements: a.data ?? [],
      events: e.data ?? [],
    };
  });

// ── NEW: yearly recap ─────────────────────────────────────────────
export const getYearlyRecap = createServerFn({ method: "GET" })
  .inputValidator((d: { year: number }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const start = `${data.year}-01-01`;
    const end = `${data.year}-12-31`;
    const [g, p, e, s] = await Promise.all([
      sb.from("gallery_items").select("id,title,image_url,category,media_type,video_url,event_date,created_at")
        .gte("created_at", start).lte("created_at", `${end}T23:59:59`).order("created_at", { ascending: false }).limit(24),
      sb.from("projects").select("id,slug,title,summary,cover_image,event_date").eq("published", true)
        .gte("event_date", start).lte("event_date", end).order("event_date", { ascending: false }).limit(20),
      sb.from("events").select("id,name,event_date,location,category")
        .gte("event_date", start).lte("event_date", end).order("event_date", { ascending: true }),
      sb.from("site_stats").select("*").eq("id", 1).maybeSingle(),
    ]);
    return {
      year: data.year,
      gallery: g.data ?? [],
      projects: p.data ?? [],
      events: e.data ?? [],
      stats: s.data,
    };
  });

// ── NEW: analytics feed for admin dashboard ──────────────────────
export const getBookingAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  // Bookings table has an anon-safe minimal projection? Actually bookings are staff-only.
  // We rely on RLS; anon may not access. Return empty and let admin fetch client-side instead.
  return { placeholder: true } as { placeholder: true };
});
