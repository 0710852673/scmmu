import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Camera, Radio, Video, Megaphone, Calendar, MapPin, Trophy, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { LogoMark } from "@/components/site/Logo";
import {
  getDivisions,
  getProjects,
  getLiveStats,
  getFeaturedMembers,
  getUpcomingEvents,
} from "@/lib/public-data.functions";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCCMU — Sivali Central College Media Unit" },
      {
        name: "description",
        content:
          "The official student media unit of Sivali Central College. Photography, videography, live streaming and storytelling — by students, for the whole school.",
      },
      { property: "og:title", content: "SCCMU — Sivali Central College Media Unit" },
      { property: "og:description", content: "Student-run media team of Sivali Central College." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  errorComponent: HomeError,
  notFoundComponent: () => <SiteShell><div className="p-20 text-center">Not found.</div></SiteShell>,
  component: Home,
});

function HomeError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "home" }); }, [error]);
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="mt-4 text-foreground/60">We couldn't load the home page.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-8 rounded-full brand-gradient px-6 py-3 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </SiteShell>
  );
}

const DIVISION_ICON: Record<string, typeof Camera> = {
  photography: Camera,
  videography: Video,
  streaming: Radio,
  announcing: Megaphone,
  editing: Sparkles,
  technical: Radio,
  social_media: Megaphone,
};

function Home() {
  const stats = useQuery({ queryKey: ["live-stats"], queryFn: () => getLiveStats() });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => getProjects() });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => getDivisions() });
  const members = useQuery({ queryKey: ["featured-members"], queryFn: () => getFeaturedMembers() });
  const events = useQuery({ queryKey: ["upcoming-events"], queryFn: () => getUpcomingEvents() });

  const featured = (projects.data?.data ?? []).filter((p) => p.is_featured).slice(0, 3);
  const projectsList = featured.length > 0 ? featured : (projects.data?.data ?? []).slice(0, 3);
  const topThree = (members.data?.data ?? []).slice(0, 3);
  const restMembers = (members.data?.data ?? []).slice(3, 10);
  const upcoming = (events.data?.data ?? []).slice(0, 4);

  return (
    <SiteShell>
      {/* ========================== HERO ========================== */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 hero-grid-bg opacity-60" />
        <div className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-amber/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32 lg:pt-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-foreground/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              The official media unit of Sivali Central College
            </div>

            <h1 className="mt-7 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl lg:text-[5.5rem]">
              We capture every <br className="hidden sm:block" />
              <span className="brand-text">moment that matters.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-foreground/70 md:text-lg">
              SCCMU is the student-run media team of Sivali Central College — covering
              assemblies, sports, cultural events and everything in between with
              professional photography, video and live broadcasts.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 rounded-full brand-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 hover:opacity-95 transition-opacity"
              >
                See our work <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/book"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Request coverage
              </Link>
            </div>

            {/* Logo medallion */}
            <div className="mt-16 flex items-center justify-center gap-6 opacity-90">
              <LogoMark size={64} />
            </div>
          </div>
        </div>
      </section>

      {/* ========================== STATS STRIP ========================== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border px-6 md:grid-cols-4 md:px-8">
          {[
            { label: "Active members", value: stats.data?.members, fallback: "10" },
            { label: "Events covered", value: stats.data?.events, fallback: "6" },
            { label: "Projects shipped", value: stats.data?.projects, fallback: "4" },
            { label: "Divisions", value: 7, fallback: "7" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-8 text-center md:py-10">
              <div className="font-display text-3xl font-extrabold text-foreground md:text-4xl">
                {s.value ?? s.fallback}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================== FEATURED PROJECTS ========================== */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-8">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">Recent work</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Featured productions.</h2>
          </div>
          <Link to="/projects" className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-brand">
            All projects <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {projectsList.map((p) => (
            <Link
              key={p.id}
              to="/projects/$slug"
              params={{ slug: p.slug }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                {p.cover_image ? (
                  <img
                    src={p.cover_image}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs uppercase tracking-widest text-muted-foreground">
                    {p.title}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                {p.is_featured && (
                  <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
                    Featured
                  </span>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold tracking-tight">{p.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ========================== MEMBERS / RANKINGS ========================== */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
                <Trophy className="h-3.5 w-3.5" /> Member rankings
              </span>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">The team behind the lens.</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Members earn points for events covered, edits delivered and broadcasts run.
                Here's the current leaderboard.
              </p>
            </div>
            <Link to="/leadership" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-brand">
              All members <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Podium */}
          <div className="grid gap-5 md:grid-cols-3">
            {topThree.map((m, i) => (
              <article
                key={m.id}
                className={`relative overflow-hidden rounded-2xl border border-border bg-card p-6 ${
                  i === 0 ? "md:-translate-y-3 ring-1 ring-brand/30" : ""
                }`}
              >
                <div className="absolute right-5 top-5 text-5xl font-extrabold text-foreground/5 font-display">
                  #{m.rank}
                </div>
                <div className="flex items-center gap-4">
                  <img
                    src={m.photo_url ?? ""}
                    alt={m.full_name}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-card"
                  />
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{m.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{m.role_title}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm text-foreground/70 leading-relaxed line-clamp-3">{m.bio}</p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs font-medium text-muted-foreground">{m.division}</span>
                  <span className="font-display text-lg font-bold text-brand">{m.points} pts</span>
                </div>
              </article>
            ))}
          </div>

          {/* Rest of leaderboard */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="px-5 py-3 text-left font-semibold">Rank</th>
                  <th className="px-5 py-3 text-left font-semibold">Member</th>
                  <th className="hidden px-5 py-3 text-left font-semibold sm:table-cell">Role</th>
                  <th className="hidden px-5 py-3 text-left font-semibold md:table-cell">Division</th>
                  <th className="px-5 py-3 text-right font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {restMembers.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 font-display font-bold text-muted-foreground">#{m.rank}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img src={m.photo_url ?? ""} alt={m.full_name} className="h-9 w-9 rounded-full object-cover" />
                        <div>
                          <div className="font-semibold">{m.full_name}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">{m.role_title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 text-foreground/70 sm:table-cell">{m.role_title}</td>
                    <td className="hidden px-5 py-4 text-muted-foreground md:table-cell">{m.division}</td>
                    <td className="px-5 py-4 text-right font-semibold text-brand">{m.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================== DIVISIONS ========================== */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-8">
        <div className="mb-12">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">Divisions</span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Seven crews. One unit.</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(divisions.data?.data ?? []).map((d) => {
            const Icon = DIVISION_ICON[d.slug] ?? Camera;
            return (
              <Link
                key={d.slug}
                to="/divisions/$slug"
                params={{ slug: d.slug }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:brand-gradient group-hover:text-white transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">{d.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{d.description}</p>
                <ArrowUpRight className="mt-5 h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ========================== UPCOMING EVENTS ========================== */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">School calendar</span>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Coming up on campus.</h2>
            </div>
            <Link to="/book" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-brand">
              Request coverage <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {upcoming.map((e) => {
              const d = new Date(e.event_date);
              return (
                <article key={e.id} className="group flex items-stretch gap-5 rounded-2xl border border-border bg-card p-6 hover:border-brand/40 transition-colors">
                  <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-xl brand-gradient text-white">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-90">
                      {d.toLocaleDateString("en", { month: "short" })}
                    </div>
                    <div className="font-display text-3xl font-extrabold leading-none">{d.getDate()}</div>
                    <div className="text-[10px] font-medium opacity-90">{d.getFullYear()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {e.category}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold leading-tight">{e.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {e.location}</span>
                      <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {d.toLocaleDateString("en", { weekday: "long" })}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================== CTA ========================== */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-8">
        <div className="relative overflow-hidden rounded-3xl brand-gradient p-10 text-center text-white md:p-16">
          <div className="absolute inset-0 opacity-20 hero-grid-bg" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              Got an event? We've got the crew.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/90">
              Tell us what you're planning and we'll get back to you on WhatsApp within 24 hours.
            </p>
            <Link
              to="/book"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand hover:bg-white/90 transition-colors"
            >
              Book Coverage <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
