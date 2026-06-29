import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getDivisions } from "@/lib/public-data.functions";

export const Route = createFileRoute("/divisions/")({
  head: () => ({
    meta: [
      { title: "Divisions — SCCMU" },
      { name: "description", content: "Seven specialist divisions covering photography, video, streaming, technical, announcing and social media." },
      { property: "og:title", content: "SCCMU Divisions" },
      { property: "og:description", content: "Inside the seven specialist crews that make SCCMU." },
    ],
  }),
  component: Divisions,
});

function Divisions() {
  const { data } = useQuery({ queryKey: ["divisions"], queryFn: () => getDivisions() });
  const divs = data?.data ?? [];
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Divisions"
        title="Seven crews. One unit."
        intro="Each division has its own remit, training path and skill levels — together they form the SCCMU workflow."
      />
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-px bg-border ring-1 ring-border md:grid-cols-2 lg:grid-cols-3">
          {divs.map((d) => (
            <Link
              key={d.slug}
              to="/divisions/$slug"
              params={{ slug: d.slug }}
              className="bg-card p-10 hover:bg-muted transition-colors group"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-3">
                DIVISION 0{d.display_order}
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight group-hover:text-brand transition-colors">{d.name.toUpperCase()}</h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">{d.description}</p>
              <span className="mt-6 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-foreground border-b border-foreground pb-1">
                EXPLORE →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
