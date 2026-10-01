import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getDivisions } from "@/lib/public-data.functions";

export const Route = createFileRoute("/divisions/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace("_", " ")} — SCCMU Division` },
      { name: "description", content: `SCCMU ${params.slug.replace("_", " ")} division — team, gallery, statistics and achievements.` },
    ],
  }),
  component: DivisionDetail,
  notFoundComponent: () => <SiteShell><div className="p-20 text-center">Division not found.</div></SiteShell>,
  errorComponent: ({ error }) => <SiteShell><div className="p-20 text-center">{(error as Error).message}</div></SiteShell>,
});

function DivisionDetail() {
  const { slug } = Route.useParams();
  const { data } = useQuery({ queryKey: ["divisions"], queryFn: () => getDivisions() });
  const div = (data?.data ?? []).find((d) => d.slug === slug);

  if (data && !div) throw notFound();

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Division"
        title={div?.name ?? "Loading"}
        intro={div?.description ?? undefined}
      />
      <section className="mx-auto max-w-5xl px-6 py-20 space-y-16">
        <div>
          <h2 className="font-serif text-3xl mb-6">Responsibilities</h2>
          <p className="text-foreground/70 leading-relaxed">
            The {div?.name} crew covers planning, production and post — working with other divisions
            on shared productions. Detailed responsibilities will be added by the section head.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-3xl mb-6">Team</h2>
          <p className="text-foreground/50 text-sm">Team roster coming soon. Heads can publish profiles from the portal.</p>
        </div>

        <div>
          <h2 className="font-serif text-3xl mb-6">Recent gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted outline-1 -outline-offset-1 outline-foreground/5" />
            ))}
          </div>
        </div>

        <Link to="/divisions" className="inline-block text-xs font-bold uppercase tracking-widest border-b border-foreground pb-1">
          ← All Divisions
        </Link>
      </section>
    </SiteShell>
  );
}
