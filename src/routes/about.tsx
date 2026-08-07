import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getSiteSettings } from "@/lib/public-data.functions";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Sivali Central College Media Unit" },
      { name: "description", content: "The story, timeline and milestones of the Sivali Central College Media Unit." },
      { property: "og:title", content: "About SCC Media Unit" },
      { property: "og:description", content: "How the Sivali Central College Media Unit grew into the school's media team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

type TimelineItem = { year?: string; title?: string; body?: string };

function parseList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function About() {
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const s = settings.data;

  const timeline = parseList<TimelineItem>(s?.about_timeline);
  const milestones = parseList<string>(s?.about_milestones);

  return (
    <SiteShell>
      <PageHeader
        eyebrow={s?.about_eyebrow ?? "THE UNIT"}
        title={s?.about_title ?? "DOCUMENTING SCHOOL LIFE WITH CRAFT."}
        intro={s?.about_intro ?? "The Sivali Central College Media Unit is a student-run team with seven divisions, covering every event the school hosts."}
      />

      {s?.about_history && (
        <section className="mx-auto max-w-4xl px-6 py-16 md:px-8">
          <h2 className="mb-6 text-[11px] font-bold uppercase tracking-[0.22em] text-brand">OUR HISTORY</h2>
          <div className="space-y-5 text-base leading-relaxed text-foreground/80">
            {s.about_history.split(/\n{2,}/).map((para: string, i: number) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
      )}

      {timeline.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-20 md:px-8">
          <h2 className="mb-10 text-[11px] font-bold uppercase tracking-[0.22em] text-brand">TIMELINE</h2>
          <div className="space-y-10">
            {timeline.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45, delay: i * 0.05 }}
                className="grid gap-4 border-b border-border pb-10 last:border-0 md:grid-cols-[140px_1fr]">
                <div className="font-display text-3xl font-extrabold tracking-tight text-brand">{t.year}</div>
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">{t.title}</h3>
                  <p className="mt-2 leading-relaxed text-foreground/70">{t.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {milestones.length > 0 && (
        <section className="border-y border-border bg-card py-20">
          <div className="mx-auto max-w-5xl px-6 md:px-8">
            <h2 className="mb-8 text-[11px] font-bold uppercase tracking-[0.22em] text-brand">MILESTONES</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {milestones.map((m, i) => (
                <motion.li key={i}
                  initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
                  className="rounded-2xl border border-border bg-background p-6 text-sm font-medium">
                  {m}
                </motion.li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </SiteShell>
  );
}
