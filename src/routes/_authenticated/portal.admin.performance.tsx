import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, FileDown, Trophy, Users, CheckCircle2, Activity } from "lucide-react";
import { getPerformanceOverview, type PerformanceRow } from "@/lib/performance.functions";
import { PortalPage, Card, Stat, Empty } from "@/components/portal/PortalUI";
import { exportTablePdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/portal/admin/performance")({
  component: PerformanceDashboard,
});

type SortKey = "score" | "points" | "approvalRate" | "attendance" | "events" | "full_name";

function PerformanceDashboard() {
  const fetchRows = useServerFn(getPerformanceOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["performance-overview"],
    queryFn: () => fetchRows(),
  });

  const [q, setQ] = useState("");
  const [division, setDivision] = useState("all");
  const [sort, setSort] = useState<SortKey>("score");

  const divisions = useMemo(
    () => [...new Set((data ?? []).map((r) => r.primary_division).filter(Boolean))] as string[],
    [data],
  );

  const rows = useMemo(() => {
    let list = (data ?? []).filter((r) => {
      const hay = `${r.full_name ?? ""} ${r.admission_number ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    if (division !== "all") list = list.filter((r) => r.primary_division === division);
    return [...list].sort((a, b) =>
      sort === "full_name"
        ? (a.full_name ?? "").localeCompare(b.full_name ?? "")
        : (b[sort] as number) - (a[sort] as number),
    );
  }, [data, q, division, sort]);

  const totals = useMemo(() => {
    const list = data ?? [];
    const active = list.filter((r) => r.points > 0).length;
    const rate = list.length
      ? Math.round(list.reduce((s, r) => s + r.approvalRate, 0) / list.length)
      : 0;
    return {
      members: list.length,
      active,
      points: list.reduce((s, r) => s + r.points, 0),
      rate,
    };
  }, [data]);

  function exportPdf() {
    exportTablePdf(
      "member-performance.pdf",
      "Member Performance Report",
      `${rows.length} members · ${new Date().toLocaleDateString()}`,
      ["#", "MU No.", "Member", "Division", "Points", "Approved", "Rate", "Meetings", "Events", "Score"],
      rows.map((r, i) => [
        i + 1,
        r.admission_number ?? "—",
        r.full_name ?? "—",
        r.primary_division ?? "—",
        r.points,
        r.approved,
        `${r.approvalRate}%`,
        r.attendance,
        r.events,
        r.score,
      ]),
      { orientation: "landscape" } as any,
    );
  }

  return (
    <PortalPage
      eyebrow="INTELLIGENCE"
      title="Member Performance"
      action={
        <button
          onClick={exportPdf}
          disabled={!rows.length}
          className="inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" /> Export PDF
        </button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Members tracked" value={totals.members} icon={Users} />
        <Stat label="Contributing" value={totals.active} icon={Activity} tone="info" />
        <Stat label="Total points" value={totals.points} icon={Trophy} tone="brand" />
        <Stat label="Avg approval rate" value={`${totals.rate}%`} icon={CheckCircle2} tone="success" />
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or MU number"
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="all">All divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="score">Sort: Performance score</option>
            <option value="points">Sort: Points</option>
            <option value="approvalRate">Sort: Approval rate</option>
            <option value="attendance">Sort: Attendance</option>
            <option value="events">Sort: Events</option>
            <option value="full_name">Sort: Name</option>
          </select>
        </div>
      </Card>

      {isLoading ? (
        <Empty>Loading performance data…</Empty>
      ) : rows.length === 0 ? (
        <Empty>No members match this filter.</Empty>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-5 py-3">#</th>
                <th className="px-3 py-3">Member</th>
                <th className="px-3 py-3">Division</th>
                <th className="px-3 py-3">Points</th>
                <th className="px-3 py-3">Approved</th>
                <th className="px-3 py-3">Rate</th>
                <th className="px-3 py-3">Meetings</th>
                <th className="px-3 py-3">Events</th>
                <th className="px-3 py-3">Awards</th>
                <th className="px-5 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: PerformanceRow, i) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {r.photo_url ? (
                        <img src={r.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{r.full_name ?? "—"}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {r.admission_number ?? "—"} · {r.role.replace(/_/g, " ")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 capitalize text-muted-foreground">
                    {r.primary_division ?? "—"}
                  </td>
                  <td className="px-3 py-3 font-semibold">{r.points}</td>
                  <td className="px-3 py-3">
                    {r.approved}
                    {r.pending ? (
                      <span className="ml-1 text-[10px] text-amber-600">+{r.pending} pending</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        r.approvalRate >= 80
                          ? "text-emerald-600"
                          : r.approvalRate >= 50
                            ? "text-amber-600"
                            : "text-muted-foreground"
                      }
                    >
                      {r.approvalRate}%
                    </span>
                  </td>
                  <td className="px-3 py-3">{r.attendance}</td>
                  <td className="px-3 py-3">{r.events}</td>
                  <td className="px-3 py-3">{r.awards}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-foreground/5 px-2.5 py-1 text-xs font-bold">
                      {r.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PortalPage>
  );
}
