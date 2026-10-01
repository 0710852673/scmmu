import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getProjects } from "@/lib/public-data.functions";

export const Route = createFileRoute("/projects/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — SCCMU Project` },
      { name: "description", content: `An SCCMU production — ${params.slug.replace(/-/g, " ")}.` },
    ],
  }),
  component: ProjectDetail,
  errorComponent: ({ error }) => <SiteShell><div className="p-20 text-center">{(error as Error).message}</div></SiteShell>,
  notFoundComponent: () => <SiteShell><div className="p-20 text-center">Project not found.</div></SiteShell>,
});

function ProjectDetail() {
  const { slug } = Route.useParams();
  const { data } = useQuery({ queryKey: ["projects"], queryFn: () => getProjects() });
  const project = (data?.data ?? []).find((p) => p.slug === slug);

  const title = project?.title ?? slug.replace(/-/g, " ");

  return (
    <SiteShell>
      <PageHeader eyebrow="Project" title={title} intro={project?.summary ?? undefined} />
      <section className="mx-auto max-w-5xl px-6 py-20 space-y-16">
        <div className="aspect-video bg-muted outline-1 -outline-offset-1 outline-foreground/5 overflow-hidden">
          {project?.cover_image ? (
            <img src={project.cover_image} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <span className="font-serif italic text-foreground/30 text-3xl">{title}</span>
            </div>
          )}
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <h2 className="font-serif text-3xl mb-6">About</h2>
            <p className="text-foreground/70 leading-relaxed">
              {project?.summary ?? "A flagship SCCMU production. Full description will appear here once published from the admin."}
            </p>
          </div>
          <aside className="space-y-6 text-sm">
            <div><div className="text-[10px] uppercase tracking-widest text-foreground/40">Crew</div><div>Coming soon</div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-foreground/40">Date</div><div>{project?.event_date ?? "—"}</div></div>
          </aside>
        </div>
        <Link to="/projects" className="inline-block text-xs font-bold uppercase tracking-widest border-b border-foreground pb-1">
          ← All Projects
        </Link>
      </section>
    </SiteShell>
  );
}
