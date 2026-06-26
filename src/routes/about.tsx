import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SCCMU" },
      { name: "description", content: "The history, milestones and achievements of the Student Council Media Unit." },
      { property: "og:title", content: "About SCCMU" },
      { property: "og:description", content: "How SCCMU became the campus media powerhouse it is today." },
    ],
  }),
  component: About,
});

const TIMELINE = [
  { year: "2015", title: "Founded", body: "SCCMU is established as the official media arm of the Student Council." },
  { year: "2018", title: "First Live Broadcast", body: "Student Parliament Live — our first multi-cam streamed event." },
  { year: "2021", title: "Seven Divisions", body: "The current division structure is formalised across photography, video, streaming, technical, announcing and social media." },
  { year: "2024", title: "Digital Platform", body: "sccmu.lk launches as our public showcase and internal media workflow." },
];

function About() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="The Unit"
        title="Documenting campus life with craft."
        intro="SCCMU is more than a media club. It is a structured organisation with divisions, crews and a workflow built around professional standards."
      />

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-serif text-3xl mb-12">Timeline</h2>
        <div className="space-y-12">
          {TIMELINE.map((t) => (
            <div key={t.year} className="grid md:grid-cols-[120px_1fr] gap-6 border-b border-foreground/10 pb-12 last:border-0">
              <div className="text-3xl font-serif italic text-accent">{t.year}</div>
              <div>
                <h3 className="text-xl font-bold">{t.title}</h3>
                <p className="mt-3 text-foreground/70 leading-relaxed">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border-y border-foreground/5 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-serif text-3xl mb-8">Awards & milestones</h2>
          <ul className="grid sm:grid-cols-2 gap-4 text-foreground/80">
            <li className="border border-foreground/10 p-6 bg-background">Inter-School Media Excellence</li>
            <li className="border border-foreground/10 p-6 bg-background">100+ live productions delivered</li>
            <li className="border border-foreground/10 p-6 bg-background">Featured campus broadcast partner</li>
            <li className="border border-foreground/10 p-6 bg-background">Multi-million social reach</li>
          </ul>
          <p className="mt-8 text-xs uppercase tracking-widest text-foreground/40">
            Replace with real achievements via Admin.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
