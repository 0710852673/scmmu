import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { searchSite } from "@/lib/public-data.functions";
import { Search as SearchIcon, Image as ImageIcon, FolderOpen, Megaphone, Calendar } from "lucide-react";

const schema = z.object({ q: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(schema),
  head: () => ({ meta: [
    { title: "Search — SCCMU" },
    { name: "description", content: "Search photos, projects, announcements and events across SCC Media Unit." },
  ] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const [text, setText] = useState(q);
  const navigate = Route.useNavigate();
  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchSite({ data: { q } }),
    enabled: q.length >= 2,
  });

  const total =
    (data?.gallery.length ?? 0) +
    (data?.projects.length ?? 0) +
    (data?.announcements.length ?? 0) +
    (data?.events.length ?? 0);

  return (
    <SiteShell>
      <PageHeader eyebrow="Find anything" title="Search." intro="Photos, videos, projects, announcements and events." />
      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          onSubmit={(e) => { e.preventDefault(); navigate({ search: { q: text.trim() } }); }}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-brand/40"
        >
          <SearchIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Try “sports meet”, “drama”, “photography”…"
            className="flex-1 bg-transparent border-none outline-none text-base min-w-0"
          />
          <button type="submit" className="rounded-full brand-gradient px-4 py-1.5 text-xs font-bold text-white uppercase tracking-widest">Go</button>
        </form>

        {q.length >= 2 && (
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
            {isFetching ? "Searching…" : `${total} result${total === 1 ? "" : "s"} for “${q}”`}
          </p>
        )}

        <div className="mt-8 space-y-10">
          {data?.gallery?.length ? (
            <Group icon={ImageIcon} title="Gallery">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.gallery.map((g: any) => (
                  <Link key={g.id} to="/gallery" className="aspect-square bg-muted overflow-hidden rounded-md">
                    <img src={g.image_url} alt={g.title ?? ""} className="h-full w-full object-cover" />
                  </Link>
                ))}
              </div>
            </Group>
          ) : null}

          {data?.projects?.length ? (
            <Group icon={FolderOpen} title="Projects">
              <div className="grid sm:grid-cols-2 gap-4">
                {data.projects.map((p: any) => (
                  <Link key={p.id} to="/projects/$slug" params={{ slug: p.slug }}
                        className="flex gap-3 rounded-lg border border-border bg-card p-3 hover:border-brand/40 transition">
                    {p.cover_image && <img src={p.cover_image} alt="" className="h-16 w-24 object-cover rounded" />}
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{p.summary}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Group>
          ) : null}

          {data?.events?.length ? (
            <Group icon={Calendar} title="Events">
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {data.events.map((e: any) => (
                  <li key={e.id} className="px-4 py-3 text-sm flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{e.name}</span>
                    <span className="text-xs text-muted-foreground">{e.event_date} · {e.location}</span>
                  </li>
                ))}
              </ul>
            </Group>
          ) : null}

          {data?.announcements?.length ? (
            <Group icon={Megaphone} title="Announcements">
              <ul className="space-y-3">
                {data.announcements.map((a: any) => (
                  <li key={a.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-3 mt-1">{a.body}</div>
                  </li>
                ))}
              </ul>
            </Group>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}

function Group({ icon: Icon, title, children }: { icon: any; title: string; children: any }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}
