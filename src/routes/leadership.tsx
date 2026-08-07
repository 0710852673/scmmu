import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getSiteSettings } from "@/lib/public-data.functions";
import { BOARD_ORDER } from "@/lib/site-content";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const getAllMembers = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await sb
    .from("featured_members")
    .select("id,full_name,role_title,division,board_category,section,grade,photo_url,bio,display_order")
    .eq("active", true)
    .order("display_order");
  return data ?? [];
});

export const Route = createFileRoute("/leadership")({
  head: () => ({
    meta: [
      { title: "MEMBERS — SCCMU" },
      { name: "description", content: "Board, leadership and members of the Sivali Central College Media Unit." },
    ],
  }),
  component: Leadership,
});

const GROUPS = [
  { key: "tic", label: "TIC BOARD", subtitle: "Teachers in charge of the unit." },
  { key: "executive", label: "EXECUTIVE BOARD", subtitle: "Student leadership running the unit." },
  { key: "section_head", label: "SECTION HEADS", subtitle: "Heads of every division." },
  { key: "member", label: "MEMBERS", subtitle: "The crew behind every event." },
] as const;

function Leadership() {
  const members = useQuery({ queryKey: ["all-members-public"], queryFn: () => getAllMembers() });
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  // TIC -> Executive Board -> Section Heads -> Members, then by the order admins set.
  const list = (members.data ?? []).slice().sort((a, b) => {
    const ra = BOARD_ORDER[a.board_category ?? ""] ?? 9;
    const rb = BOARD_ORDER[b.board_category ?? ""] ?? 9;
    if (ra !== rb) return ra - rb;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

  return (
    <SiteShell>
      <PageHeader eyebrow="THE UNIT" title="MEMBERS."
        intro={settings.data?.leadership_intro ?? "Teachers in charge, executive board, section heads, and every active member."} />

      <div className="mx-auto max-w-7xl px-6 pb-24 md:px-8 space-y-20">
        {GROUPS.map((group) => {
          const items = list.filter((m) => m.board_category === group.key);
          if (items.length === 0) return null;
          const isMembers = group.key === "member";
          return (
            <section key={group.key}>
              <div className="mb-8 flex items-end justify-between border-b border-border pb-5">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">{group.label}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{group.subtitle}</p>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">{items.length}</span>
              </div>
              <div className={`grid gap-5 ${isMembers ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}>
                {items.map((m, i) => (
                  <motion.article key={m.id}
                    initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45, delay: (i % 6) * 0.04 }}
                    className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl hover:border-brand/30">
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      {m.photo_url ? (
                        <img src={m.photo_url} alt={m.full_name} loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full grid place-items-center brand-gradient text-white text-3xl font-display font-extrabold">
                          {m.full_name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        {m.division && <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber">{m.division.toUpperCase()}</div>}
                        <h3 className="mt-1 text-sm font-bold leading-tight">{m.full_name.toUpperCase()}</h3>
                        <p className="text-[11px] text-white/80">{m.role_title}</p>
                      </div>
                    </div>
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
