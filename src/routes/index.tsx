import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, Camera, Radio, Video, Calendar, MapPin, Image as ImageIcon, Tv, Users, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  getProjects, getSiteStats, getBoardMembers, getUpcomingEvents, getSiteSettings,
} from "@/lib/public-data.functions";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCCMU — Sivali Central College Media Unit" },
      { name: "description", content: "Student-run media team of Sivali Central College. Photography, video, live broadcast and storytelling for every school event." },
      { property: "og:title", content: "SCCMU — Sivali Central College Media Unit" },
      { property: "og:description", content: "Student-run media team of Sivali Central College." },
    ],
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
        <button onClick={() => { router.invalidate(); reset(); }}
                className="mt-8 rounded-full brand-gradient px-6 py-3 text-sm font-semibold text-white">Try again</button>
      </div>
    </SiteShell>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

function Home() {
  const stats = useQuery({ queryKey: ["site-stats"], queryFn: () => getSiteStats() });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => getProjects() });
  const board = useQuery({ queryKey: ["board-members"], queryFn: () => getBoardMembers() });
  const events = useQuery({ queryKey: ["upcoming-events"], queryFn: () => getUpcomingEvents() });
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });

  const s = stats.data;
  const featured = (projects.data?.data ?? []).filter((p) => p.is_featured).slice(0, 6);
  const projectsList = featured.length > 0 ? featured : (projects.data?.data ?? []).slice(0, 6);
  const upcoming = (events.data?.data ?? []).slice(0, 4);
  const heroTitle = settings.data?.hero_title ?? "Every frame of school life — told by students.";
  const heroSub = settings.data?.hero_subtitle ?? "Photography, video, live broadcast and storytelling for Sivali Central College.";

  const liveStats = [
    { icon: Calendar, label: "Events covered", value: s?.events_covered ?? 1000, suffix: "+" },
    { icon: ImageIcon, label: "Photos captured", value: s?.photos_captured ?? 3000, suffix: "+" },
    { icon: Video, label: "Videos produced", value: s?.videos_produced ?? 240, suffix: "" },
    { icon: Tv, label: "Live streams", value: s?.live_streams ?? 50, suffix: "+" },
    { icon: Users, label: "Members", value: s?.total_members ?? 68, suffix: "" },
    { icon: Sparkles, label: "Active members", value: s?.active_members ?? 40, suffix: "" },
  ];

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 hero-grid-bg opacity-50" />
        <motion.div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-brand/15 blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }} transition={{ duration: 8, repeat: Infinity }} />
        <motion.div className="absolute -bottom-44 -left-44 h-[460px] w-[460px] rounded-full bg-amber/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 10, repeat: Infinity, delay: 1 }} />

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-28 md:px-8 md:pt-28 md:pb-36">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto max-w-4xl text-center">
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70 backdrop-blur">
              OFFICIAL SITE OF SIVALI CENTRAL COLLEGE MEDIA UNIT
            </motion.div>

            <motion.h1 variants={fadeUp} transition={{ duration: 0.7 }}
              className="mt-7 text-5xl font-extrabold leading-[1.04] tracking-tight md:text-7xl lg:text-[5.5rem]">
              {heroTitle.split("—")[0]}
              {heroTitle.includes("—") && <><br className="hidden sm:block" /><span className="brand-text">—{heroTitle.split("—")[1]}</span></>}
            </motion.h1>

            <motion.p variants={fadeUp} transition={{ duration: 0.7 }}
              className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-foreground/70 md:text-lg">
              {heroSub}
            </motion.p>

            <motion.div variants={fadeUp} transition={{ duration: 0.7 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/projects" className="group inline-flex items-center gap-2 rounded-full brand-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5">
                See our work <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link to="/book" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Request coverage
              </Link>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* LIVE STATS */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="mb-10 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">By the numbers</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">The unit in motion.</h2>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {liveStats.map((st, i) => (
              <motion.div key={st.label} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group rounded-2xl border border-border bg-card p-5 text-center transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg">
                <st.icon className="mx-auto mb-3 h-5 w-5 text-brand transition-transform group-hover:scale-110" />
                <div className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                  <AnimatedNumber value={st.value} suffix={st.suffix} />
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{st.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROJECTS */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">Recent work</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Featured productions.</h2>
          </div>
          <Link to="/projects" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-brand transition-colors">
            All projects <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projectsList.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}>
              <Link to="/projects/$slug" params={{ slug: p.slug }}
                className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5">
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  {p.cover_image ? (
                    <img src={p.cover_image} alt={p.title} loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs uppercase tracking-widest text-muted-foreground">{p.title}</div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                  {p.is_featured && (
                    <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">Featured</span>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-lg font-bold tracking-tight drop-shadow">{p.title}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                    View project <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* BOARD (no ranks, no points) */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">Leadership</span>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">The board behind the work.</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">Teachers in charge, the executive board and section heads guiding the unit.</p>
            </div>
            <Link to="/leadership" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-brand transition-colors">
              Full board <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {(board.data?.data ?? []).slice(0, 8).map((m, i) => (
              <motion.article key={m.id}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:border-brand/30">
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  <img src={m.photo_url ?? ""} alt={m.full_name} loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber">{m.section}</div>
                    <h3 className="mt-1 text-base font-bold leading-tight">{m.full_name}</h3>
                    <p className="text-xs text-white/80">{m.role_title}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">School calendar</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Coming up on campus.</h2>
          </div>
          <Link to="/book" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-brand transition-colors">
            Request coverage <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <div className="grid gap-5 md:grid-cols-2">
          {upcoming.map((e, i) => {
            const d = new Date(e.event_date);
            return (
              <motion.article key={e.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: (i % 2) * 0.08 }}
                className="group flex items-stretch gap-5 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg">
                <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-xl brand-gradient text-white">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-90">{d.toLocaleDateString("en", { month: "short" })}</div>
                  <div className="font-display text-3xl font-extrabold leading-none">{d.getDate()}</div>
                  <div className="text-[10px] font-medium opacity-90">{d.getFullYear()}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{e.category}</span>
                  <h3 className="mt-2 text-lg font-bold leading-tight">{e.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {e.location}</span>
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {d.toLocaleDateString("en", { weekday: "long" })}</span>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 brand-gradient opacity-95" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center text-white md:px-8">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">Got an event we should cover?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">Tell us when, where and what — the unit takes it from there.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/book" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-brand hover:bg-white/90 transition-colors">
              Book coverage <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Contact the unit
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
