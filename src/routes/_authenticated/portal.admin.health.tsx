import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileDown, FileSpreadsheet, Users, Calendar, Image, Trophy, AlertCircle, Radio, Clock, Trash2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { PortalPage, Card, Stat, Empty, SectionTitle } from "@/components/portal/PortalUI";
import { getSystemHealth } from "@/lib/audit.functions";
import { getPortalAccess } from "@/lib/access";
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

function csvCell(value: string | number) {
  const raw = String(value ?? "");
  const safe = /^[=+@\\-\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportHealthCsv(data: Awaited<ReturnType<typeof getSystemHealth>>, year: number) {
  const rows: Array<Array<string | number>> = [
    ["SCCMU System Health & Analytics", year],
    [],
    ["Metric", "Value"],
    ["Total members", data.totals.members],
    ["New members", data.totals.newMembers],
    ["Events", data.totals.events],
    ["Gallery items", data.totals.gallery],
    ["Projects", data.totals.projects],
    ["Announcements", data.totals.announcements],
    ["Streams", data.totals.streams],
    ["Points awarded", data.totals.pointsAwarded],
    [],
    ["Monthly activity", "Contributions", "Points", "Bookings"],
    ...data.months.map((m) => [m.month, m.contributions, m.points, m.bookings]),
    [],
    ["Attention needed", "Count"],
    ["Pending contributions", data.health.pendingContributions],
    ["Awaiting review", data.health.pendingReview],
    ["Open bookings", data.health.openBookings],
    ["Unread notifications", data.health.unreadNotifications],
    ["Items in bin", data.health.trashed],
    ["Live streams", data.health.liveStreams],
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sccmu-health-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportHealthPdf(data: Awaited<ReturnType<typeof getSystemHealth>>, year: number) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 16;
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SCCMU System Health & Analytics", left, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Annual report: ${year}  |  Generated: ${new Date().toLocaleString()}`, left, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Annual totals", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const totals = [
    ["Members", data.totals.members], ["New members", data.totals.newMembers],
    ["Events", data.totals.events], ["Gallery items", data.totals.gallery],
    ["Projects", data.totals.projects], ["Announcements", data.totals.announcements],
    ["Streams", data.totals.streams], ["Points awarded", data.totals.pointsAwarded],
  ];
  for (const [label, value] of totals) {
    doc.text(String(label), left, y);
    doc.text(String(value), 100, y);
    y += 6;
  }
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Monthly activity", left, y);
  y += 7;
  doc.setFontSize(9);
  doc.text("Month", left, y);
  doc.text("Contributions", 75, y);
  doc.text("Points", 125, y);
  doc.text("Bookings", 165, y);
  y += 2;
  doc.line(left, y, 194, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  for (const m of data.months) {
    doc.text(m.month, left, y);
    doc.text(String(m.contributions), 75, y);
    doc.text(String(m.points), 125, y);
    doc.text(String(m.bookings), 165, y);
    y += 6;
  }
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Attention needed", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const attention = [
    ["Pending contributions", data.health.pendingContributions],
    ["Awaiting review", data.health.pendingReview],
    ["Open bookings", data.health.openBookings],
    ["Unread notifications", data.health.unreadNotifications],
    ["Items in bin", data.health.trashed],
    ["Live streams", data.health.liveStreams],
  ];
  for (const [label, value] of attention) {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(String(label), left, y);
    doc.text(String(value), 100, y);
    y += 6;
  }
  doc.save(`sccmu-health-${year}.pdf`);
}

function HealthPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const { data, isLoading } = useQuery({
    queryKey: ["system-health", year],
    queryFn: () => getSystemHealth({ data: { year } }),
  });

  if (isLoading || !data) return <PortalPage eyebrow="SYSTEM" title="Health & Analytics"><Empty>Loading…</Empty></PortalPage>;

  return (
    <PortalPage
      eyebrow="SYSTEM"
      title="Health & Analytics"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => exportHealthCsv(data, year)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </button>
          <button type="button" onClick={() => exportHealthPdf(data, year)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
            <FileDown className="h-4 w-4" /> PDF
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
