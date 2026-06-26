import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getGallery } from "@/lib/public-data.functions";

const TABS = [
  { key: "all", label: "All" },
  { key: "photography", label: "Photography" },
  { key: "videography", label: "Videography" },
  { key: "behind_the_scenes", label: "Behind the Scenes" },
  { key: "live_productions", label: "Live Productions" },
] as const;

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — SCCMU" },
      { name: "description", content: "Photography, video stills, behind-the-scenes and live production imagery from SCCMU." },
      { property: "og:title", content: "SCCMU Gallery" },
      { property: "og:description", content: "Visual archive of SCCMU productions." },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const { data } = useQuery({ queryKey: ["gallery"], queryFn: () => getGallery() });
  const items = (data?.data ?? []).filter((i) => tab === "all" || i.category === tab);

  return (
    <SiteShell>
      <PageHeader eyebrow="Visual archive" title="Gallery." />
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap gap-2 mb-12">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-widest border transition-colors ${
                tab === t.key
                  ? "bg-foreground text-background border-foreground"
                  : "border-foreground/20 hover:border-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted outline-1 -outline-offset-1 outline-foreground/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((i) => (
              <div key={i.id} className="aspect-square bg-muted overflow-hidden">
                <img src={i.image_url} alt={i.title ?? ""} className="h-full w-full object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
