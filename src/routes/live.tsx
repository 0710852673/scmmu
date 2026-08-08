import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Radio, CalendarClock, Facebook } from "lucide-react";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live & Replays — SCC Media Unit" },
      { name: "description", content: "Watch Sivali Central College Media Unit broadcasts live on YouTube and Facebook, or catch up with full replays of past productions." },
      { property: "og:title", content: "SCC Media Unit — Live & Replays" },
      { property: "og:description", content: "Upcoming broadcasts, live coverage and full replays from the Sivali Central College Media Unit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

type Stream = {
  id: string; title: string; description: string | null; state: string;
  scheduled_at: string | null; youtube_url: string | null; facebook_url: string | null;
  thumbnail_url: string | null; credits: any;
};

function LivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-streams"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("live_streams").select("*")
        .eq("published", true).order("display_order").order("scheduled_at", { ascending: false });
      return (rows ?? []) as unknown as Stream[];
    },
  });

  const streams = data ?? [];
  const live = streams.filter((s) => s.state === "live");
  const upcoming = streams.filter((s) => s.state === "upcoming");
  const replays = streams.filter((s) => s.state === "finished");

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Broadcast"
        title="Live & replays."
        intro="We stream on YouTube and Facebook. This page is the schedule, the on-air link and the full archive."
      />

      <section className="mx-auto max-w-6xl px-6 pb-24">
        {isLoading ? (
          <p className="py-16 text-center text-foreground/50">Loading broadcasts…</p>
        ) : streams.length === 0 ? (
          <p className="py-16 text-center text-foreground/50">No broadcasts scheduled right now — check back soon.</p>
        ) : (
          <div className="space-y-16">
            {live.length > 0 && <Group label="On air now" items={live} accent />}
            {upcoming.length > 0 && <Group label="Upcoming" items={upcoming} />}
            {replays.length > 0 && <Group label="Replays" items={replays} />}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function Group({ label, items, accent }: { label: string; items: Stream[]; accent?: boolean }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        {accent && <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" /></span>}
        <h2 className="text-[11px] font-bold uppercase tracking-[0.28em] text-foreground/60">{label}</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s, i) => <StreamCard key={s.id} s={s} index={i} />)}
      </div>
    </div>
  );
}

function StreamCard({ s, index }: { s: Stream; index: number }) {
  const credits: Record<string, string> = s.credits && typeof s.credits === "object" ? s.credits : {};
  const isLive = s.state === "live";
  const watch = s.youtube_url || s.facebook_url;
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="group overflow-hidden border border-foreground/10 bg-card"
    >
      <div className="relative aspect-video overflow-hidden bg-foreground/5">
        {s.thumbnail_url ? (
          <img src={s.thumbnail_url} alt={s.title} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-foreground/20"><Radio className="h-10 w-10" /></div>
        )}
        {isLive && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
          </span>
        )}
        {s.state === "finished" && (
          <span className="absolute left-3 top-3 bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-background">Replay</span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-serif text-xl leading-snug">{s.title}</h3>
        {s.scheduled_at && (
          <p className="mt-2 flex items-center gap-2 text-xs text-foreground/60">
            <CalendarClock className="h-3.5 w-3.5" />{new Date(s.scheduled_at).toLocaleString()}
          </p>
        )}
        {s.description && <p className="mt-3 text-sm text-foreground/70 line-clamp-3">{s.description}</p>}

        {Object.keys(credits).length > 0 && (
          <dl className="mt-4 space-y-1 border-t border-foreground/10 pt-3 text-[11px] text-foreground/60">
            {Object.entries(credits).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="font-bold uppercase tracking-widest">{k}</dt>
                <dd className="truncate">{String(v)}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {s.youtube_url && (
            <a href={s.youtube_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-foreground px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-background hover:bg-accent transition-colors">
              <Play className="h-3.5 w-3.5" />{isLive ? "Watch live" : s.state === "finished" ? "Watch replay" : "Set reminder"}
            </a>
          )}
          {s.facebook_url && (
            <a href={s.facebook_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 border border-foreground/20 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:border-foreground transition-colors">
              <Facebook className="h-3.5 w-3.5" /> Facebook
            </a>
          )}
          {!watch && <span className="text-[11px] text-foreground/50">Link announced soon</span>}
        </div>
      </div>
    </motion.article>
  );
}
