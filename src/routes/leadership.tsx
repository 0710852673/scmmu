import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getFeaturedMembers } from "@/lib/public-data.functions";

export const Route = createFileRoute("/leadership")({
  head: () => ({
    meta: [
      { title: "Members — SCCMU" },
      { name: "description", content: "Meet the student team behind the Sivali Central College Media Unit — ranked by contribution points." },
      { property: "og:title", content: "SCCMU Members" },
      { property: "og:description", content: "The student team behind Sivali Central College Media Unit." },
      { property: "og:url", content: "/leadership" },
    ],
    links: [{ rel: "canonical", href: "/leadership" }],
  }),
  component: Members,
});

function Members() {
  const { data } = useQuery({ queryKey: ["featured-members"], queryFn: () => getFeaturedMembers() });
  const list = data?.data ?? [];

  return (
    <SiteShell>
      <PageHeader
        eyebrow="The Team"
        title="Members."
        intro="The student crew of the Sivali Central College Media Unit, ranked by contribution points across events, edits and broadcasts."
      />

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <article
              key={m.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-foreground/5"
            >
              <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                <Trophy className="h-3 w-3" /> #{m.rank}
              </div>
              <img
                src={m.photo_url ?? ""}
                alt={m.full_name}
                className="h-24 w-24 rounded-2xl object-cover ring-2 ring-card"
                loading="lazy"
              />
              <h3 className="mt-5 text-xl font-bold tracking-tight">{m.full_name}</h3>
              <p className="mt-0.5 text-sm font-medium text-brand">{m.role_title}</p>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.bio}</p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
                <span className="text-muted-foreground">{m.division}</span>
                <span className="text-muted-foreground">{m.grade}</span>
                <span className="font-display font-bold text-foreground">{m.points} pts</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
