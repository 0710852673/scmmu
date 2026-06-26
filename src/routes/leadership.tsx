import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";

export const Route = createFileRoute("/leadership")({
  head: () => ({
    meta: [
      { title: "Leadership — SCCMU" },
      { name: "description", content: "The Executive Board, Section Heads and TIC Board of SCCMU." },
      { property: "og:title", content: "SCCMU Leadership" },
      { property: "og:description", content: "Meet the people behind SCCMU." },
    ],
  }),
  component: Leadership,
});

const GROUPS = [
  { title: "Executive Board", people: ["President", "Vice President", "Secretary", "Treasurer"] },
  { title: "Section Heads", people: ["Head of Photography", "Head of Editing", "Head of Videography", "Head of Streaming", "Head of Technical", "Head of Announcing", "Head of Social Media"] },
  { title: "TIC Board", people: ["Teacher-in-Charge", "Deputy TIC"] },
];

function Leadership() {
  return (
    <SiteShell>
      <PageHeader eyebrow="The Council" title="Leadership." intro="The board, section heads and TIC board behind SCCMU." />
      <section className="mx-auto max-w-7xl px-6 py-20 space-y-20">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h2 className="font-serif text-3xl mb-10">{g.title}</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
              {g.people.map((p) => (
                <div key={p} className="border border-foreground/10 p-6 bg-card">
                  <div className="aspect-square bg-muted mb-4" />
                  <h3 className="font-bold">{p}</h3>
                  <p className="text-xs uppercase tracking-widest text-foreground/40 mt-1">Coming soon</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </SiteShell>
  );
}
