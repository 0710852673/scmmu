import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { getYearlyRecap } from "@/lib/public-data.functions";

export const Route = createFileRoute("/recap/$year")({
  loader: ({ params }) => getYearlyRecap({ data: { year: Number(params.year) } }),
  head: ({ params }) => ({
    meta: [
      { title: `SCCMU ${params.year} — Recap` },
      { name: "description", content: `A visual recap of Sivali Central College Media Unit's ${params.year}.` },
    ],
  }),
  errorComponent: ({ error }) => <SiteShell><div className="p-16 text-center text-destructive">{(error as Error).message}</div></SiteShell>,
  component: Recap,
});

function Recap() {
  const year = Number(Route.useParams().year);
  const { data } = useQuery({ queryKey: ["recap", year], queryFn: () => getYearlyRecap({ data: { year } }) });
  const g = data?.gallery ?? [];
  const s = data?.stats;
  return (
    <SiteShell>
      <PageHeader eyebrow="Year in review" title={`SCCMU ${year}.`} intro="Highlights, numbers and moments from the year." />
      <section className="mx-auto max-w-7xl px-6 py-14">
        {s ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
            {[
              ["Events covered", s.events_covered],
              ["Photos captured", s.photos_captured],
              ["Videos produced", s.videos_produced],
              ["Live streams", s.live_streams],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl border border-border bg-card p-5 text-center">
                <div className="font-display text-4xl font-black text-brand">{v as number}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{l as string}</div>
              </div>
            ))}
          </div>
        ) : null}

        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-brand">Events</h2>
        <ul className="grid sm:grid-cols-2 gap-2 mb-14">
          {(data?.events ?? []).map((e: any) => (
            <li key={e.id} className="rounded-lg border border-border bg-card p-3 text-sm flex justify-between">
              <span className="font-medium">{e.name}</span>
              <span className="text-xs text-muted-foreground">{e.event_date}</span>
            </li>
          ))}
          {!data?.events?.length && <li className="text-sm text-muted-foreground">No events recorded.</li>}
        </ul>

        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-brand">Gallery highlights</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {g.map((i: any) => (
            <div key={i.id} className="aspect-square bg-muted overflow-hidden rounded-md relative">
              <img src={i.image_url} alt={i.title ?? ""} className="h-full w-full object-cover" />
              {i.media_type === "video" && (
                <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded uppercase">Video</span>
              )}
            </div>
          ))}
          {!g.length && <p className="text-sm text-muted-foreground col-span-full">No gallery items for {year}.</p>}
        </div>

        <p className="mt-16 text-center text-xs uppercase tracking-widest text-muted-foreground">
          Sivali Central College Media Unit · {year}
        </p>
      </section>
    </SiteShell>
  );
}
