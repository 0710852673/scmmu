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
    .select("id,category,title,image_url")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null as string | null };
});

/**
 * Returns only board members (TIC, Executive, Section Heads) for the public site.
 * Member ranks & points are NEVER exposed publicly — they live only in the portal.
 */
export const getBoardMembers = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("featured_members")
    .select("id,full_name,role_title,division,board_category,section,grade,photo_url,bio,display_order")
    .in("board_category", ["tic", "executive", "section_head"])
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null as string | null };
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
