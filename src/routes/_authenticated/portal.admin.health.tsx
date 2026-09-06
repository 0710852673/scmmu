import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PortalPage, Card, Stat, Empty, SectionTitle } from "@/components/portal/PortalUI";
import { getSystemHealth } from "@/lib/audit.functions";
import { getPortalAccess } from "@/lib/access";
import { Users, Calendar, Image, Trophy, AlertCircle, Radio, Clock, Trash2 } from "lucide-react";
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
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
          {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
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
