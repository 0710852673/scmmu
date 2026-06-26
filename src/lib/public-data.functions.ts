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

export const getFeaturedMembers = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("featured_members")
    .select("id,full_name,role_title,division,rank,points,grade,photo_url,bio,display_order")
    .order("rank", { ascending: true });
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

export const getLiveStats = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [{ count: members }, { count: events }, { count: projects }, { count: media }] = await Promise.all([
    sb.from("featured_members").select("*", { count: "exact", head: true }),
    sb.from("events").select("*", { count: "exact", head: true }),
    sb.from("projects").select("*", { count: "exact", head: true }).eq("published", true),
    sb.from("media_items").select("*", { count: "exact", head: true }),
  ]);
  return {
    members: members ?? 0,
    events: events ?? 0,
    projects: projects ?? 0,
    productions: media ?? 0,
  };
});
