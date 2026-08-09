import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getSiteSettings } from "@/lib/public-data.functions";
import { supabase } from "@/integrations/supabase/client";
import { Radio } from "lucide-react";

/**
 * Fixed "LIVE NOW" badge — appears automatically whenever a broadcast is
 * published with state "live", or when an admin flips the manual override in
 * Site Settings (kept for emergencies). Disappears when the stream ends.
 */
export function LiveBadge() {
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const streams = useQuery({
    queryKey: ["live-now-badge"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("live_streams")
        .select("id,title")
        .eq("published", true)
        .eq("state", "live")
        .order("display_order")
        .limit(1);
      return data ?? [];
    },
  });

  const liveRow = streams.data?.[0];
  const override = settings.data?.live_stream_active && settings.data?.live_stream_url;
  if (!liveRow && !override) return null;

  const title = liveRow?.title || settings.data?.live_stream_title || "Live now";

  return (
    <Link
      to="/live"
      className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2.5rem)] items-center gap-2 rounded-full bg-red-600 py-2.5 pl-3 pr-4 text-white shadow-2xl shadow-red-600/40 ring-2 ring-white/40 transition-transform hover:scale-105"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <Radio className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate text-[11px] font-bold uppercase tracking-widest">Live · {title}</span>
    </Link>
  );
}
