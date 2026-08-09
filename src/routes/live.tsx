import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Play, Radio, CalendarClock, Facebook, Youtube, Search, Maximize2,
  Archive as ArchiveIcon, Users, Clock, Signal,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { getSiteSettings } from "@/lib/public-data.functions";
import { resolveEmbed, youtubeThumb } from "@/lib/stream";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live & Replays — SCC Media Unit Broadcasts" },
      { name: "description", content: "Watch Sivali Central College Media Unit broadcasts live, see the upcoming schedule, and browse the full replay archive of past productions." },
      { property: "og:title", content: "SCC Media Unit — Live & Replays" },
      { property: "og:description", content: "Live school broadcasts, upcoming schedule and the complete replay archive from the Sivali Central College Media Unit." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

type Stream = {
  id: string; title: string; description: string | null; state: string;
  scheduled_at: string | null; youtube_url: string | null; facebook_url: string | null;
  thumbnail_url: string | null; credits: Record<string, string> | null;
};

/* Stable, SSR-safe date formatting (no locale drift between server and client). */
const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Colombo",
});
const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Colombo",
});
const fmtDate = (v?: string | null) => (v ? DATE_FMT.format(new Date(v)) : null);
const fmtTime = (v?: string | null) => (v ? TIME_FMT.format(new Date(v)) : null);
const fmtFull = (v?: string | null) => (v ? `${fmtDate(v)} · ${fmtTime(v)}` : null);

function LivePage() {
  const streamsQ = useQuery({
    queryKey: ["public-streams"],
    queryFn: async () => {
      const { data } = await supabase.from("live_streams").select("*")
        .eq("published", true).order("display_order").order("scheduled_at", { ascending: false });
      return (data ?? []) as unknown as Stream[];
    },
  });
  const settingsQ = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });

  const streams = streamsQ.data ?? [];
  const live = streams.filter((s) => s.state === "live");
  const upcoming = streams.filter((s) => s.state === "upcoming");
  const replays = streams.filter((s) => s.state === "finished");

  const settings = settingsQ.data;
  /* Emergency/manual override from Site Settings acts as a live stream when no row is live. */
  const overrideLive: Stream | null =
    !live.length && settings?.live_stream_active && settings?.live_stream_url
      ? {
          id: "override", title: settings.live_stream_title || "SCC Media Unit — Live",
          description: null, state: "live", scheduled_at: null,
          youtube_url: settings.live_stream_url, facebook_url: null,
          thumbnail_url: null, credits: null,
        }
      : null;

  const featured = live[0] ?? overrideLive ?? null;
  const otherLive = live.slice(1);
  const loading = streamsQ.isLoading;

  return (
    <SiteShell>
      <StageSection
        featured={featured}
        loading={loading}
        nextUp={upcoming[0] ?? null}
        counts={{ upcoming: upcoming.length, replays: replays.length }}
      />

      <div className="mx-auto w-full max-w-[1600px] px-5 pb-24 md:px-8 lg:px-12">
        {otherLive.length > 0 && (
          <Section title="Also on air" kicker="Parallel feeds">
            <CardGrid>
              {otherLive.map((s, i) => <BroadcastCard key={s.id} s={s} index={i} />)}
            </CardGrid>
          </Section>
        )}

        <Section title="Upcoming broadcasts" kicker="Schedule" icon={<CalendarClock className="h-4 w-4" />}>
          {loading ? <SkeletonGrid /> : upcoming.length === 0 ? (
            <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="Nothing scheduled yet"
              body="New broadcasts are announced here as soon as the crew locks a date." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {upcoming.map((s, i) => <UpcomingCard key={s.id} s={s} index={i} />)}
            </div>
          )}
        </Section>

        <Section title="Recent replays" kicker="Watch again" icon={<Play className="h-4 w-4" />}>
          {loading ? <SkeletonGrid /> : replays.length === 0 ? (
            <EmptyState icon={<Play className="h-6 w-6" />} title="No replays published"
              body="Finished broadcasts appear here with the full production credits." />
          ) : (
            <CardGrid>
              {replays.slice(0, 6).map((s, i) => <BroadcastCard key={s.id} s={s} index={i} />)}
            </CardGrid>
          )}
        </Section>

        <ArchiveSection items={replays} loading={loading} />
      </div>
    </SiteShell>
  );
}

/* ── Stage: the live player is the hero ───────────────────────────── */

function StageSection({
  featured, loading, nextUp, counts,
}: {
  featured: Stream | null; loading: boolean; nextUp: Stream | null;
  counts: { upcoming: number; replays: number };
}) {
  const embed = featured ? resolveEmbed(featured.youtube_url, featured.facebook_url, { autoplay: true }) : null;
  const credits = featured?.credits && typeof featured.credits === "object" ? featured.credits : {};

  return (
    <section className="relative overflow-hidden border-b border-border bg-surface">
      <div className="absolute inset-0 hero-grid-bg opacity-40" />
      <div className="pointer-events-none absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-10 md:px-8 md:py-14 lg:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand">Broadcast</span>
          <span className="hidden h-px flex-1 bg-border sm:block" />
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Pill>{counts.upcoming} upcoming</Pill>
            <Pill>{counts.replays} replays</Pill>
          </div>
        </div>

        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          {featured ? featured.title : "Live & replays."}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {featured
            ? "Streaming now from Sivali Central College — watch here, or open the broadcast on YouTube or Facebook."
            : "We broadcast school events on YouTube and Facebook. The schedule, the on-air player and the full archive live on this page."}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* Player */}
          <div className="min-w-0">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-2xl shadow-black/20">
              {loading ? (
                <div className="h-full w-full animate-pulse bg-muted" />
              ) : embed ? (
                <iframe
                  key={embed.src}
                  src={embed.src}
                  title={featured?.title ?? "SCC Media Unit live broadcast"}
                  className="absolute inset-0 h-full w-full"
                  frameBorder={0}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <OffAir nextUp={nextUp} />
              )}
              {featured && (
                <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  Live
                </span>
              )}
            </div>

            {/* Controls / secondary actions */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {featured?.youtube_url && (
                <a href={featured.youtube_url} target="_blank" rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors">
                  <Youtube className="h-4 w-4" /> YouTube
                </a>
              )}
              {featured?.facebook_url && (
                <a href={featured.facebook_url} target="_blank" rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors">
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
              )}
              {embed && (
                <button type="button"
                  onClick={() => {
                    const el = document.querySelector("iframe[title]");
                    if (el && "requestFullscreen" in el) (el as HTMLIFrameElement).requestFullscreen?.();
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors">
                  <Maximize2 className="h-4 w-4" /> Fullscreen
                </button>
              )}
            </div>
          </div>

          {/* Info rail */}
          <aside className="min-w-0 rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Signal className="h-3.5 w-3.5" /> {featured ? "On air" : "Broadcast status"}
            </div>
            <h2 className="mt-3 text-xl font-extrabold leading-snug">
              {featured ? featured.title : nextUp ? nextUp.title : "Currently off air"}
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow icon={<CalendarClock className="h-4 w-4" />} label="When"
                value={fmtFull(featured?.scheduled_at ?? nextUp?.scheduled_at) ?? (featured ? "Streaming now" : "To be announced")} />
              <InfoRow icon={<Clock className="h-4 w-4" />} label="Status"
                value={featured ? "Live broadcast" : nextUp ? "Scheduled" : "No active broadcast"} />
              <InfoRow icon={<Users className="h-4 w-4" />} label="Coverage"
                value="SCC Media Unit — streaming, videography & technical crew" />
            </dl>

            {(featured?.description || nextUp?.description) && (
              <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                {featured?.description ?? nextUp?.description}
              </p>
            )}

            {Object.keys(credits).length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Production credits</div>
                <dl className="mt-2 space-y-1.5 text-xs">
                  {Object.entries(credits).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="shrink-0 font-bold uppercase tracking-widest text-muted-foreground">{k}</dt>
                      <dd className="min-w-0 truncate">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function OffAir({ nextUp }: { nextUp: Stream | null }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,color-mix(in_oklab,var(--brand)_18%,transparent),transparent_60%)] px-6 text-center">
      <div>
        <Radio className="mx-auto h-9 w-9 text-white/50" />
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.24em] text-white/80">Off air</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
          {nextUp
            ? `Next broadcast: ${nextUp.title}${fmtFull(nextUp.scheduled_at) ? ` — ${fmtFull(nextUp.scheduled_at)}` : ""}`
            : "The player turns on automatically the moment a broadcast goes live."}
        </p>
      </div>
    </div>
  );
}

/* ── Reusable pieces ──────────────────────────────────────────────── */

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-background/60 px-3 py-1">{children}</span>;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-start">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 shrink-0 text-brand">{icon}</span>
        <div className="min-w-0">
          <dt className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 break-words text-sm">{value}</dd>
        </div>
      </div>
    </div>
  );
}

function Section({ title, kicker, icon, children }: { title: string; kicker?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="pt-14 md:pt-20">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          {kicker && (
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-brand">
              {icon}{kicker}
            </span>
          )}
          <h2 className="mt-2 truncate text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function SkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="aspect-video w-full animate-pulse bg-muted" />
          <div className="space-y-2 p-5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <p className="mt-4 text-base font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Thumb({ s }: { s: Stream }) {
  const src = s.thumbnail_url || youtubeThumb(s.youtube_url);
  return src ? (
    <img src={src} alt={s.title} loading="lazy"
      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
  ) : (
    <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground"><Radio className="h-8 w-8" /></div>
  );
}

function UpcomingCard({ s, index }: { s: Stream; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.04 }}
      className="group grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-brand/50"
    >
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl brand-gradient text-white">
        <div className="text-center leading-none">
          <div className="text-lg font-extrabold">{s.scheduled_at ? fmtDate(s.scheduled_at)!.slice(0, 2) : "–"}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest">
            {s.scheduled_at ? fmtDate(s.scheduled_at)!.slice(3, 6) : "TBA"}
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Upcoming</span>
        <h3 className="mt-2 line-clamp-2 font-bold leading-snug">{s.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{fmtFull(s.scheduled_at) ?? "Time to be announced"}</p>
        {(s.youtube_url || s.facebook_url) && (
          <a href={(s.youtube_url || s.facebook_url)!} target="_blank" rel="noreferrer"
            className="mt-3 inline-flex min-h-10 items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand hover:underline">
            Set reminder
          </a>
        )}
      </div>
    </motion.article>
  );
}

function BroadcastCard({ s, index }: { s: Stream; index: number }) {
  const isLive = s.state === "live";
  const watch = s.youtube_url || s.facebook_url;
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.05 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-xl hover:shadow-black/5"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <Thumb s={s} />
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${isLive ? "bg-red-600 text-white" : "bg-background/90 text-foreground"}`}>
          {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
          {isLive ? "Live" : "Replay"}
        </span>
        {watch && (
          <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-black"><Play className="h-5 w-5" /></span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug">{s.title}</h3>
        {s.scheduled_at && (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />{fmtFull(s.scheduled_at)}
          </p>
        )}
        {s.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {s.youtube_url && (
            <a href={s.youtube_url} target="_blank" rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-background transition-opacity hover:opacity-90">
              <Play className="h-3.5 w-3.5" />{isLive ? "Watch live" : "Watch replay"}
            </a>
          )}
          {s.facebook_url && (
            <a href={s.facebook_url} target="_blank" rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors">
              <Facebook className="h-3.5 w-3.5" /> Facebook
            </a>
          )}
          {!watch && <span className="text-[11px] text-muted-foreground">Link announced soon</span>}
        </div>
      </div>
    </motion.article>
  );
}

/* ── Archive: searchable / filterable ─────────────────────────────── */

function ArchiveSection({ items, loading }: { items: Stream[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const [year, setYear] = useState("all");

  const years = useMemo(() => {
    const set = new Set<string>();
    items.forEach((s) => { if (s.scheduled_at) set.add(String(new Date(s.scheduled_at).getFullYear())); });
    return [...set].sort((a, b) => Number(b) - Number(a));
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((s) => {
      const okYear = year === "all" || (s.scheduled_at && String(new Date(s.scheduled_at).getFullYear()) === year);
      const okQ = !needle || `${s.title} ${s.description ?? ""}`.toLowerCase().includes(needle);
      return okYear && okQ;
    });
  }, [items, q, year]);

  return (
    <Section title="Broadcast archive" kicker="Every past production" icon={<ArchiveIcon className="h-4 w-4" />}>
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block min-w-0">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search broadcasts by title or description…"
            className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-brand"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["all", ...years].map((y) => (
            <button key={y} type="button" onClick={() => setYear(y)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold uppercase tracking-widest transition-colors ${
                year === y ? "border-transparent brand-gradient text-white" : "border-border hover:bg-muted"}`}>
              {y === "all" ? "All years" : y}
            </button>
          ))}
        </div>
      </div>

      {loading ? <SkeletonGrid /> : filtered.length === 0 ? (
        <EmptyState icon={<ArchiveIcon className="h-6 w-6" />} title="No broadcasts match"
          body="Try a different search term or clear the year filter." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((s) => (
            <li key={s.id} className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 p-4 transition-colors hover:bg-muted/50 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:gap-5">
              <div className="aspect-video overflow-hidden rounded-lg bg-muted"><Thumb s={s} /></div>
              <div className="min-w-0">
                <h3 className="truncate font-bold">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{fmtFull(s.scheduled_at) ?? "Date not recorded"}</p>
                {s.description && <p className="mt-1 hidden truncate text-sm text-muted-foreground sm:block">{s.description}</p>}
              </div>
              {(s.youtube_url || s.facebook_url) && (
                <a href={(s.youtube_url || s.facebook_url)!} target="_blank" rel="noreferrer"
                  className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-[10px] font-bold uppercase tracking-widest hover:bg-muted sm:col-span-1">
                  <Play className="h-3.5 w-3.5" /> Watch
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
