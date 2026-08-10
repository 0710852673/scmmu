import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Award, Target, TrendingUp, CalendarCheck, CheckCircle2, Trophy } from "lucide-react";
import { getMyPerformance } from "@/lib/performance.functions";
import { PortalPage, Card, SectionTitle, Stat, Empty } from "@/components/portal/PortalUI";
import { exportSectionsPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/portal/performance")({
  component: MyPerformance,
});

function label(kind: string) {
  return kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function MyPerformance() {
  const { user } = Route.useRouteContext();
  const fetchPerf = useServerFn(getMyPerformance);
  const { data, isLoading } = useQuery({
    queryKey: ["my-performance", user.id],
    queryFn: () => fetchPerf(),
  });

  const max = Math.max(1, ...(data?.trend ?? []).map((t) => t.points));
  const maxKind = Math.max(1, ...(data?.byKind ?? []).map((k) => k.points));

  async function exportPdf() {
    if (!data) return;
    await exportSectionsPdf(
      "my-performance.pdf",
      "Member Performance Report",
      new Date().toLocaleDateString(),
      [
        {
          heading: "Headline metrics",
          kv: [
            ["Total points", data.totalPoints],
            ["Rank", data.rank ? `#${data.rank} of ${data.rankOf}` : "Unranked"],
            ["Approval rate", `${data.approvalRate}%`],
            ["Approved contributions", data.approved],
            ["Pending contributions", data.pending],
            ["Meetings attended", data.attendance],
            ["Events covered", data.events],
          ],
        },
        {
          heading: "Points by contribution type",
          table: {
            columns: ["Type", "Points"],
            rows: data.byKind.map((k) => [label(k.kind), k.points]),
          },
        },
        {
          heading: "Monthly trend",
          table: {
            columns: ["Month", "Points"],
            rows: data.trend.map((t) => [t.month, t.points]),
          },
        },
        {
          heading: "Awards",
          table: {
            columns: ["Award", "Awarded"],
            rows: (data.awards as any[]).map((a) => [
              a.achievements?.name ?? "Award",
              new Date(a.awarded_at).toLocaleDateString(),
            ]),
          },
        },
      ],
      { kicker: "SCCMU", photoUrl: null },
    );
  }

  return (
    <PortalPage
      eyebrow="MY RECORD"
      title="Performance"
      action={
        <button
          onClick={exportPdf}
          disabled={!data}
          className="rounded-full brand-gradient px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"
        >
          Export PDF
        </button>
      }
    >
      {isLoading || !data ? (
        <Empty>Loading your performance…</Empty>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total points" value={data.totalPoints} icon={Trophy} tone="brand" />
            <Stat
              label="Rank"
              value={data.rank ? `#${data.rank}` : "—"}
              sub={data.rank ? `of ${data.rankOf} members` : "No points yet"}
              icon={TrendingUp}
              tone="info"
            />
            <Stat
              label="Approval rate"
              value={`${data.approvalRate}%`}
              sub={`${data.approved} approved · ${data.pending} pending`}
              icon={CheckCircle2}
              tone="success"
            />
            <Stat
              label="Consistency"
              value={data.attendance + data.events}
              sub={`${data.attendance} meetings · ${data.events} events`}
              icon={CalendarCheck}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle sub="Points earned per month over the last six months.">
                Momentum
              </SectionTitle>
              <div className="flex h-44 items-end gap-3">
                {data.trend.map((t) => (
                  <div key={t.month} className="flex flex-1 flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(t.points / max) * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="w-full min-h-[4px] rounded-t-md brand-gradient"
                      title={`${t.points} pts`}
                    />
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {t.month.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle sub="Where your points come from.">Contribution mix</SectionTitle>
              {data.byKind.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved contributions yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.byKind.slice(0, 7).map((k) => (
                    <li key={k.kind}>
                      <div className="mb-1 flex justify-between text-xs font-semibold">
                        <span>{label(k.kind)}</span>
                        <span className="text-muted-foreground">{k.points} pts</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(k.points / maxKind) * 100}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full brand-gradient"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <SectionTitle sub="Awards you've earned, and what's still ahead.">Awards</SectionTitle>
            {(data.awards as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground">No awards yet — keep contributing.</p>
            ) : (
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(data.awards as any[]).map((a) => (
                  <div key={a.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-brand" />
                      <span className="font-semibold">{a.achievements?.name ?? "Award"}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.achievements?.description ?? a.note ?? "—"}
                    </p>
                    <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {new Date(a.awarded_at).toLocaleDateString()}
                      {a.season ? ` · ${a.season}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Next milestones
            </div>
            <ul className="mt-3 space-y-3">
              {(data.catalogue as any[])
                .filter((c) => c.points_threshold)
                .sort((a, b) => a.points_threshold - b.points_threshold)
                .slice(0, 5)
                .map((c) => {
                  const pct = Math.min(100, Math.round((data.totalPoints / c.points_threshold) * 100));
                  return (
                    <li key={c.id}>
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.name}
                        </span>
                        <span className="text-muted-foreground">
                          {data.totalPoints}/{c.points_threshold}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full brand-gradient" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </Card>
        </div>
      )}
    </PortalPage>
  );
}
