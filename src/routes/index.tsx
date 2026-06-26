import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site/SiteShell";
import { getDivisions, getProjects, getLiveStats } from "@/lib/public-data.functions";
import { reportLovableError } from "@/lib/lovable-error-reporting";

const STATS = [
  { key: "members", label: "Members", fallback: "150+" },
  { key: "events", label: "Live Events", fallback: "42" },
  { key: "productions", label: "Productions", fallback: "300+" },
  { key: "photos", label: "Photos", fallback: "12k+" },
  { key: "videos", label: "Videos", fallback: "500+" },
  { key: "reach", label: "Reach", fallback: "1M+" },
] as const;

function fmt(n: number, fallback: string) {
  if (!n || n <= 0) return fallback;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
  return `${n}+`;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCCMU — Student Council Media Unit" },
      {
        name: "description",
        content:
          "The Student Council Media Unit (sccmu.lk) — professional student media organization producing photography, videography, live broadcasts and digital storytelling.",
      },
      { property: "og:title", content: "SCCMU — Student Council Media Unit" },
      {
        property: "og:description",
        content:
          "Professional student media organization. Photography, video, live broadcasts and digital storytelling from the heart of campus.",
      },
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
        <h1 className="font-serif text-4xl">Something went wrong</h1>
        <p className="mt-4 text-foreground/60">We couldn't load the home page.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-8 bg-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest text-background"
        >
          Try again
        </button>
      </div>
    </SiteShell>
  );
}

function Home() {
  const stats = useQuery({ queryKey: ["live-stats"], queryFn: () => getLiveStats() });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => getProjects() });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => getDivisions() });

  const featured = (projects.data?.data ?? []).filter((p) => p.is_featured).slice(0, 3);
  const projectsList = featured.length > 0 ? featured : (projects.data?.data ?? []).slice(0, 3);

  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative border-b border-foreground/10">
        <div className="mx-auto grid max-w-7xl md:grid-cols-2">
          <div className="flex flex-col justify-center px-6 py-20 md:py-32">
            <h1 className="font-serif text-6xl leading-[1.1] md:text-8xl">
              The Voice <br />
              <span className="italic text-accent">of the Campus.</span>
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-foreground/70">
              SCCMU is the student media unit producing professional-grade photography, video,
              live broadcasts and digital storytelling — every event, every day.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/about"
                className="bg-foreground px-8 py-4 text-sm font-bold uppercase tracking-widest text-background hover:bg-accent transition-colors"
              >
                Explore SCCMU
              </Link>
              <Link
                to="/projects"
                className="border border-foreground/20 px-8 py-4 text-sm font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-all"
              >
                View Projects
              </Link>
            </div>
          </div>
          <div className="relative min-h-[400px] bg-muted">
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-foreground/5 to-foreground/20">
              <span className="font-serif text-3xl italic text-foreground/30">SCCMU</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="bg-foreground py-12 text-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
            {STATS.map((s) => {
              const value = stats.data ? fmt((stats.data as Record<string, number>)[s.key] ?? 0, s.fallback) : s.fallback;
              return (
                <div key={s.key} className="text-center">
                  <div className="text-3xl font-bold">{value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-background/50">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 flex items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Case Studies</span>
              <h2 className="mt-4 font-serif text-5xl">Featured Media</h2>
            </div>
            <Link to="/projects" className="border-b border-foreground pb-1 text-sm font-bold uppercase tracking-widest">
              All Projects
            </Link>
          </div>

          {projectsList.length === 0 ? (
            <div className="grid gap-8 md:grid-cols-3">
              {["Live on the Lake", "Student Parliament Live", "Annual Sports Meet"].map((title, i) => (
                <article key={title} className="group">
                  <div className="aspect-[4/5] bg-muted outline-1 -outline-offset-1 outline-foreground/5 grid place-items-center mb-6">
                    <span className="text-[10px] uppercase tracking-widest text-foreground/30 italic">Project {i + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-sm text-foreground/60 italic leading-relaxed">
                    Coming soon — major SCCMU production.
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-3">
              {projectsList.map((p) => (
                <Link
                  key={p.id}
                  to="/projects/$slug"
                  params={{ slug: p.slug }}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[4/5] bg-muted outline-1 -outline-offset-1 outline-foreground/5 group-hover:scale-[0.98] transition-transform grid place-items-center mb-6 overflow-hidden">
                    {p.cover_image ? (
                      <img src={p.cover_image} alt={p.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-foreground/30 italic">{p.title}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold">{p.title}</h3>
                  <p className="mt-2 text-sm text-foreground/60 italic leading-relaxed">{p.summary}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Divisions */}
      <section className="bg-card py-24 border-y border-foreground/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Divisions</span>
            <h2 className="mt-4 font-serif text-4xl">Seven teams. One masthead.</h2>
          </div>
          <div className="grid gap-px bg-foreground/10 ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
            {(divisions.data?.data ?? []).map((d) => (
              <Link
                key={d.slug}
                to="/divisions/$slug"
                params={{ slug: d.slug }}
                className="bg-card p-8 hover:bg-muted transition-colors group"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-3">
                  Division
                </div>
                <h3 className="font-serif text-2xl group-hover:text-accent transition-colors">{d.name}</h3>
                <p className="mt-3 text-sm text-foreground/60 line-clamp-3">{d.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-y border-foreground/10 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-serif text-5xl leading-tight">
            Have an event? <span className="italic text-accent">Let us cover it.</span>
          </h2>
          <p className="mt-6 text-foreground/70 max-w-xl mx-auto">
            From a club showcase to an inter-school championship — submit a booking request and our
            crew will be in touch on WhatsApp.
          </p>
          <Link
            to="/book"
            className="mt-10 inline-block bg-foreground px-10 py-4 text-sm font-bold uppercase tracking-widest text-background hover:bg-accent transition-colors"
          >
            Book an Event
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
