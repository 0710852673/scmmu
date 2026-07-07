import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getGallery } from "@/lib/public-data.functions";
import { Play, X } from "lucide-react";

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
      { name: "description", content: "Photography, video and live production imagery from SCC Media Unit." },
      { property: "og:title", content: "SCCMU Gallery" },
      { property: "og:description", content: "Visual archive of SCC Media Unit productions." },
    ],
  }),
  component: Gallery,
});

type Item = {
  id: string;
  title: string | null;
  category: string;
  image_url: string;
  media_type: string | null;
  video_url: string | null;
};

function Gallery() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [preview, setPreview] = useState<Item | null>(null);
  const { data } = useQuery({ queryKey: ["gallery"], queryFn: () => getGallery() });
  const items = ((data?.data ?? []) as Item[]).filter((i) => tab === "all" || i.category === tab);

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
                tab === t.key ? "bg-foreground text-background border-foreground" : "border-foreground/20 hover:border-foreground"
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
              <button key={i.id} onClick={() => setPreview(i)}
                className="group aspect-square bg-muted overflow-hidden relative">
                <img src={i.image_url} alt={i.title ?? ""} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                {i.media_type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-black">
                      <Play className="h-5 w-5" />
                    </span>
                  </span>
                )}
                {i.title && (
                  <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition text-left">
                    {i.title}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setPreview(null)}><X className="h-6 w-6" /></button>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl">
            {preview.media_type === "video" && preview.video_url ? (
              <VideoPlayer url={preview.video_url} />
            ) : (
              <img src={preview.image_url} alt={preview.title ?? ""} className="max-h-[85vh] w-full object-contain" />
            )}
            {preview.title && <div className="mt-3 text-center text-white/80 text-sm">{preview.title}</div>}
          </div>
        </div>
      )}
    </SiteShell>
  );
}

function VideoPlayer({ url }: { url: string }) {
  // Support YouTube + direct video files
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  if (yt) {
    return (
      <div className="aspect-video">
        <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yt[1]}?autoplay=1`}
          title="Video" frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return <video src={url} controls autoPlay className="w-full max-h-[85vh]" />;
}
