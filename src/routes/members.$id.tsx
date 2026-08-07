import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site/SiteShell";
import { getMemberProfile } from "@/lib/public-data.functions";
import { exportSectionsPdf } from "@/lib/pdf";
import { Download, Trophy, Calendar as CalIcon } from "lucide-react";

export const Route = createFileRoute("/members/$id")({
  loader: async ({ params }) => {
    const res = await getMemberProfile({ data: { id: params.id } });
    if (!res.profile) throw notFound();
    return res;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.profile?.full_name ?? "Member"} — SCCMU Portfolio` },
      { name: "description", content: `${loaderData?.profile?.full_name ?? "Member"} · ${loaderData?.profile?.primary_division ?? ""} · SCC Media Unit portfolio.` },
    ],
  }),
  notFoundComponent: () => <SiteShell><div className="p-16 text-center">Member not found.</div></SiteShell>,
  errorComponent: ({ error }) => <SiteShell><div className="p-16 text-center text-destructive">{error.message}</div></SiteShell>,
  component: MemberPortfolio,
});

function MemberPortfolio() {
  const id = Route.useParams().id;
  const { data } = useQuery({ queryKey: ["member-profile", id], queryFn: () => getMemberProfile({ data: { id } }) });
  const p = data?.profile;
  if (!p) return null;

  function downloadPdf() {
    if (!p) return;
    const kv: Array<[string, string | number | null | undefined]> = [
      ["Name", p.full_name],
      ["MU number", p.admission_number],
      ["Grade", p.grade],
      ["Division", p.primary_division],
      ["Joined", p.join_date],
      ["Total points", data?.totalPoints ?? 0],
    ];
    const eventRows = (data?.events ?? []).map((e: any) => [
      e.events?.name ?? "—",
      e.events?.event_date ?? "—",
      e.events?.location ?? "—",
      e.role ?? "—",
    ]);
    const pointRows = (data?.points ?? []).map((pt: any) => [
      new Date(pt.created_at).toLocaleDateString(),
      pt.kind, pt.division ?? "—", pt.points,
    ]);
    exportSectionsPdf(
      `SCCMU-${p.admission_number || p.id}.pdf`,
      p.full_name ?? "Member portfolio",
      p.bio ?? undefined,
      [
        { heading: "Profile", kv },
        { heading: "Events covered", table: { columns: ["Event", "Date", "Location", "Role"], rows: eventRows } },
        { heading: "Points history", table: { columns: ["Date", "Kind", "Division", "Points"], rows: pointRows } },
      ],
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-6 py-14">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 sm:flex sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            {p.photo_url ? (
              <img src={p.photo_url} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-2 ring-brand/30" />
            ) : (
              <div className="h-24 w-24 shrink-0 rounded-2xl brand-gradient grid place-items-center text-white text-3xl font-black">
                {(p.full_name || "?")[0]}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.2em] text-brand font-bold">SCCMU Portfolio</div>
              <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold truncate">{p.full_name}</h1>
              <div className="mt-1 text-sm text-muted-foreground">
                {p.admission_number} · {p.primary_division ?? "—"} · Grade {p.grade ?? "—"}
              </div>
            </div>
          </div>
          <button onClick={downloadPdf}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </header>

        {p.bio && <p className="mt-6 max-w-3xl text-base leading-relaxed text-foreground/80">{p.bio}</p>}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Stat label="Total points" value={data?.totalPoints ?? 0} icon={Trophy} />
          <Stat label="Events covered" value={data?.events?.length ?? 0} icon={CalIcon} />
          <Stat label="Contributions" value={data?.points?.length ?? 0} icon={Trophy} />
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-brand">Events</h2>
            <ul className="space-y-2">
              {(data?.events ?? []).map((e: any) => (
                <li key={e.event_id} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <div className="font-semibold">{e.events?.name}</div>
                  <div className="text-xs text-muted-foreground">{e.events?.event_date} · {e.events?.location} · {e.role}</div>
                </li>
              ))}
              {!data?.events?.length && <li className="text-sm text-muted-foreground">No events yet.</li>}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-brand">Recent points</h2>
            <ul className="space-y-2">
              {(data?.points ?? []).slice(0, 12).map((pt: any, i: number) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm">
                  <div>
                    <div className="font-medium">{pt.kind.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">{new Date(pt.created_at).toLocaleDateString()} · {pt.division ?? "—"}</div>
                  </div>
                  <div className="text-lg font-black text-brand">+{pt.points}</div>
                </li>
              ))}
              {!data?.points?.length && <li className="text-sm text-muted-foreground">No points yet.</li>}
            </ul>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em]">{label}</div>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
    </div>
  );
}
