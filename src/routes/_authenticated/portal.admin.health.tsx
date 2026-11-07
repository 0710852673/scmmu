import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PortalPage, Card, Stat, Empty, SectionTitle } from "@/components/portal/PortalUI";
import { getSystemHealth } from "@/lib/audit.functions";
import { getPortalAccess } from "@/lib/access";
import { Users, Calendar, Image, Trophy, AlertCircle, Radio, Clock, Trash2, Download } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/portal/admin/health")({
  beforeLoad: async ({ context }) => {
    const access = await getPortalAccess(context.user.id);
    if (!access.roles.some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r)))
      throw redirect({ to: "/portal" });
  },
  component: HealthPage,
});

function HealthPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState<number>(new Date().getFullYear() - 1);
  const { data, isLoading } = useQuery({
    queryKey: ["system-health", year],
    queryFn: () => getSystemHealth({ data: { year } }),
  });
  const comparisonQuery = useQuery({
    queryKey: ["system-health", compareYear],
    queryFn: () => getSystemHealth({ data: { year: compareYear } }),
    enabled: compareYear !== year,
  });
  const comparison = compareYear === year ? data : comparisonQuery.data;

  useEffect(() => {
    if (data?.years.length && !data.years.includes(compareYear)) {
      setCompareYear(data.years.find((y) => y !== year) ?? year);
    }
  }, [data?.years, compareYear, year]);

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Month", "Contributions", "Points awarded", "Bookings"],
      ...data.months.map((m) => [m.month, m.contributions, m.points, m.bookings]),
      [],
      ["Metric", "Value"],
      ["Members", data.totals.members],
      ["New members", data.totals.newMembers],
      ["Events", data.totals.events],
      ["Gallery items", data.totals.gallery],
      ["Projects", data.totals.projects],
      ["Announcements", data.totals.announcements],
      ["Points awarded", data.totals.pointsAwarded],
    ];
    const csv = rows.map((row) => row.map((cell) => {
      const value = String(cell ?? "");
      return `"${value.replace(/"/g, '""')}"`;
    }).join(",")).join("\r\n");
    const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SCCMU-Analytics-${data.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading || !data) return <PortalPage eyebrow="SYSTEM" title="Health & Analytics"><Empty>Loading…</Empty></PortalPage>;

  return (
    <PortalPage
      eyebrow="SYSTEM"
      title="Health & Analytics"
      action={
        <div className="flex flex-wrap gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Report year" className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Members" value={data.totals.members} sub={`${data.totals.newMembers} joined in ${year}`} icon={Users} />
        <Stat label={`Events in ${year}`} value={data.totals.events} icon={Calendar} />
        <Stat label="Gallery items" value={data.totals.gallery} icon={Image} />
        <Stat label={`Points awarded ${year}`} value={data.totals.pointsAwarded} icon={Trophy} />
      </div>

      <SectionTitle sub="Things waiting on a human right now">Attention needed</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending contributions" value={data.health.pendingContributions} icon={AlertCircle} tone={data.health.pendingContributions ? "brand" : "default"} />
        <Stat label="Awaiting review" value={data.health.pendingReview} icon={Clock} tone={data.health.pendingReview ? "brand" : "default"} />
        <Stat label="Open bookings" value={data.health.openBookings} icon={Calendar} />
        <Stat label="Live now" value={data.health.liveStreams} icon={Radio} />
        <Stat label="Unread notifications" value={data.health.unreadNotifications} icon={AlertCircle} />
        <Stat label="Items in bin" value={data.health.trashed} icon={Trash2} />
        <Stat label="Projects" value={data.totals.projects} icon={Image} />
        <Stat label="Announcements" value={data.totals.announcements} icon={Image} />
      </div>

      <SectionTitle sub="Compare activity between two reporting years">Year comparison</SectionTitle>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted-foreground">
          Compare against
          <select value={compareYear} onChange={(e) => setCompareYear(Number(e.target.value))}
            className="ml-2 h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        {comparisonQuery.isFetching && <span className="text-xs text-muted-foreground">Loading comparison…</span>}
      </div>
      {comparison && (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={`Members · ${compareYear}`} value={comparison.totals.members} sub={`Current total in database`} />
          <Stat label={`Events · ${compareYear}`} value={comparison.totals.events} />
          <Stat label={`Gallery · ${compareYear}`} value={comparison.totals.gallery} />
          <Stat label={`Points · ${compareYear}`} value={comparison.totals.pointsAwarded} />
        </div>
      )}

      <SectionTitle sub={`Monthly activity across ${year}`}>Yearly analytics</SectionTitle>
      <Card>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.months}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="contributions" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="points" fill="var(--amber)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bookings" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Booking outcomes</SectionTitle>
      {data.bookingStatus.length === 0 ? (
        <Empty>No bookings in {year}.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.bookingStatus.map((b) => (
            <Card key={b.status} className="py-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{b.status.replace(/_/g, " ")}</div>
              <div className="font-display text-2xl font-extrabold">{b.count}</div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Last recorded activity: {data.health.lastActivityAt ? new Date(data.health.lastActivityAt).toLocaleString() : "—"}
      </p>
    </PortalPage>
  );
}
