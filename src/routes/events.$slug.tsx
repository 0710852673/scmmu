import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getEventPage } from "@/lib/public-data.functions";
import { resolveEmbed } from "@/lib/stream";
import { Camera, Film, Radio, FolderOpen, Users, X } from "lucide-react";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ params }) => {
    const res = await getEventPage({ data: { slug: params.slug } });
    if (!res.event) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const ev = loaderData?.event;
    const title = ev ? `${ev.name} — Coverage | SCCMU` : "Event coverage — SCCMU";
    const desc = ev?.description?.slice(0, 155) || `Photos, highlights and livestream from ${ev?.name ?? "this event"} by the Sivali Central College Media Unit.`;
    const img = ev?.cover_image?.startsWith("https://") ? ev.cover_image : null;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "article" }, { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  component: EventPage,
  errorComponent: () => <SiteShell><div className="p-20 text-center">Something went wrong. Our team has been notified.</div></SiteShell>,
  notFoundComponent: () => <SiteShell><div className="p-20 text-center">This event page isn't available.</div></SiteShell>,
});

const DIV_LABEL: Record<string, string> = {
  photography: "Photography", videography: "Videography", streaming: "Streaming", editing: "Editing",
  technical: "Technical", announcing: "Announcing", social_media: "Social Media", other: "Crew",
};

function Embed({ url, title }: { url: string; title: string }) {
  const e = resolveEmbed(url, url);
  if (!e) return <a href={url} target="_blank" rel="noreferrer" className="text-brand underline">Watch {title}</a>;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
      <iframe src={e.src} title={title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
    </div>
  );
}

function EventPage() {
  const { event: ev, photos, team } = Route.useLoaderData();
  const [open, setOpen] = useState<string | null>(null);
  if (!ev) return null;
  const groups = team.reduce<Record<string, string[]>>((a, m) => { (a[m.division] ??= []).push(m.name); return a; }, {});

  return (
    <SiteShell>
      <PageHeader eyebrow={`Coverage · ${new Date(ev.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`} title={ev.name} intro={ev.description ?? undefined} />
      <section className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6">
        {photos.length > 0 && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold"><Camera className="h-5 w-5 text-brand" /> Selected photos</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <button key={p.id} onClick={() => setOpen(p.image_url)} className="group aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={p.image_url} alt={p.title ?? ev.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </button>
              ))}
            </div>
          </div>
        )}
        {ev.highlight_video_url && (
          <div><h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold"><Film className="h-5 w-5 text-brand" /> Highlight video</h2><Embed url={ev.highlight_video_url} title="highlight video" /></div>
        )}
        {ev.livestream_url && (
          <div><h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold"><Radio className="h-5 w-5 text-brand" /> Full livestream</h2><Embed url={ev.livestream_url} title="full livestream" /></div>
        )}
        {ev.album_url && (
          <a href={ev.album_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-brand">
            <FolderOpen className="h-6 w-6 text-brand" />
            <div><div className="font-semibold">Full photo album</div><div className="text-sm text-muted-foreground">See every photo on Facebook</div></div>
          </a>
        )}
        {Object.keys(groups).length > 0 && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold"><Users className="h-5 w-5 text-brand" /> Coverage team</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(groups).map(([d, names]) => (
                <div key={d} className="rounded-xl border border-border bg-card p-4">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-brand">{DIV_LABEL[d] ?? d}</div>
                  <div className="mt-2 text-sm">{names.join(", ")}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 p-4" onClick={() => setOpen(null)}>
          <button className="absolute right-4 top-4" aria-label="Close"><X className="h-6 w-6" /></button>
          <img src={open} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </SiteShell>
  );
}
