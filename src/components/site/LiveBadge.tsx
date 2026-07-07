import { useQuery } from "@tanstack/react-query";
import { getSiteSettings } from "@/lib/public-data.functions";
import { Radio } from "lucide-react";

/** Fixed "LIVE NOW" badge — bottom right on public pages when a stream is active. */
export function LiveBadge() {
  const s = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const active = s.data?.live_stream_active;
  const url = s.data?.live_stream_url;
  const title = s.data?.live_stream_title || "Live now on YouTube";
  if (!active || !url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 group flex items-center gap-2 rounded-full bg-red-600 pl-3 pr-4 py-2.5 text-white shadow-2xl shadow-red-600/40 ring-2 ring-white/40 hover:scale-105 transition-transform"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
      </span>
      <Radio className="h-3.5 w-3.5" />
      <span className="text-[11px] font-bold uppercase tracking-widest">Live · {title}</span>
    </a>
  );
}
