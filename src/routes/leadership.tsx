import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getBoardMembers } from "@/lib/public-data.functions";

export const Route = createFileRoute("/leadership")({
  head: () => ({
    meta: [
      { title: "Board & Leadership — SCCMU" },
      { name: "description", content: "Teachers in charge, executive board and section heads of the Sivali Central College Media Unit." },
      { property: "og:title", content: "Board & Leadership — SCCMU" },
    ],
  }),
  component: Leadership,
});

const GROUPS = [
  { key: "tic", label: "TIC Board", subtitle: "Teachers in charge of the unit." },
  { key: "executive", label: "Executive Board", subtitle: "Student leadership running day-to-day operations." },
  { key: "section_head", label: "Section Heads", subtitle: "Heads of every division across the unit." },
] as const;

function Leadership() {
  const members = useQuery({ queryKey: ["board-members"], queryFn: () => getBoardMembers() });
  const list = members.data?.data ?? [];

  return (
    <SiteShell>
      <PageHeader eyebrow="Who runs the unit" title="The Board."
        intro="Three layers of leadership: teachers in charge, the executive board, and the heads of every division." />

      <div className="mx-auto max-w-7xl px-6 pb-24 md:px-8 space-y-20">
        {GROUPS.map((group) => {
          const items = list.filter((m) => m.board_category === group.key);
          if (items.length === 0) return null;
          return (
            <section key={group.key}>
              <div className="mb-8 flex items-end justify-between border-b border-border pb-5">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{group.label}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{group.subtitle}</p>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">{items.length} members</span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((m, i) => (
                  <motion.article key={m.id}
                    initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
                    className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:border-brand/30">
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      <img src={m.photo_url ?? ""} alt={m.full_name} loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber">{m.division}</div>
                        <h3 className="mt-1 text-base font-bold leading-tight">{m.full_name}</h3>
                        <p className="text-xs text-white/80">{m.role_title}</p>
                      </div>
                    </div>
                    {m.bio && <p className="px-5 py-4 text-xs text-muted-foreground line-clamp-3">{m.bio}</p>}
                  </motion.article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </SiteShell>
  );
}
