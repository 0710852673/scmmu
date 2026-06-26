import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getProjects } from "@/lib/public-data.functions";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — SCCMU" },
      { name: "description", content: "Major SCCMU productions — concerts, live broadcasts, sports coverage and more." },
      { property: "og:title", content: "SCCMU Projects" },
      { property: "og:description", content: "Featured SCCMU productions and the crews behind them." },
    ],
  }),
  component: Projects,
});

const PLACEHOLDERS = [
  { slug: "live-on-the-lake", title: "Live on the Lake", summary: "Multi-cam concert broadcast and festival coverage." },
  { slug: "student-parliament-live", title: "Student Parliament Live", summary: "Live streaming of the annual legislative session." },
  { slug: "sports-meet", title: "Annual Sports Meet", summary: "High-speed photography and live commentary." },
  { slug: "prize-giving", title: "Prize Giving", summary: "Award ceremony coverage and live production." },
];

function Projects() {
  const { data } = useQuery({ queryKey: ["projects"], queryFn: () => getProjects() });
  const real = data?.data ?? [];
  const list = real.length > 0 ? real : PLACEHOLDERS.map((p, i) => ({
    id: `${i}`, slug: p.slug, title: p.title, summary: p.summary, cover_image: null as string | null, event_date: null,
  }));

  return (
    <SiteShell>
      <PageHeader eyebrow="Productions" title="Projects." intro="Major SCCMU productions — by category and year." />
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          {list.map((p) => (
            <Link key={p.id} to="/projects/$slug" params={{ slug: p.slug }} className="group">
              <div className="aspect-[4/3] bg-muted outline-1 -outline-offset-1 outline-foreground/5 grid place-items-center mb-6 overflow-hidden">
                {p.cover_image ? (
                  <img src={p.cover_image} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <span className="font-serif italic text-foreground/30 text-2xl">{p.title}</span>
                )}
              </div>
              <h3 className="font-serif text-3xl group-hover:text-accent transition-colors">{p.title}</h3>
              <p className="mt-3 text-foreground/60">{p.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
