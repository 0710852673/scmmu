import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Stat, Empty, Card, SectionTitle, RoleBadge } from "@/components/portal/PortalUI";
import {
  ClipboardCheck, Calendar, Trophy, Award, Megaphone, Users,
  BookmarkCheck, Mail, FolderKanban, Settings, ArrowUpRight, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["my-roles", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data ?? []).map((r) => r.role as string);
    },
  });

  const isAdmin = roles?.includes("administrator");
  const isHead = roles?.some((r) => ["section_head", "executive_board", "tic"].includes(r));
  const tier: "Administrator" | "Head / Board" | "Member" = isAdmin ? "Administrator" : isHead ? "Head / Board" : "Member";

  const { data: stats } = useQuery({
    queryKey: ["dash-stats", user.id],
    queryFn: async () => {
      const [att, pts, events, ach] = await Promise.all([
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("points_log").select("points").eq("user_id", user.id),
        supabase.from("event_participants").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
        supabase.from("member_achievements").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      const totalPts = (pts.data ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
      return {
        attendance: att.count ?? 0,
        points: totalPts,
        events: events.count ?? 0,
        achievements: ach.count ?? 0,
      };
    },
  });

  const { data: adminStats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const [members, bookings, msgs, events] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("handled", false),
        supabase.from("events").select("*", { count: "exact", head: true }),
      ]);
      return {
        members: members.count ?? 0,
        pendingBookings: bookings.count ?? 0,
        unreadMessages: msgs.count ?? 0,
        events: events.count ?? 0,
      };
    },
  });

  const { data: pendingContribs } = useQuery({
    queryKey: ["pending-contribs"],
    enabled: !!(isAdmin || isHead),
    queryFn: async () => {
      const { data } = await supabase
        .from("contributions")
        .select("id,kind,division,note,created_at,user_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const { data: announcements } = useQuery({
    queryKey: ["recent-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,body,created_at,pinned")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  const firstName = profile?.full_name ? profile.full_name.split(" ")[0] : "there";

  return (
    <PortalPage
      eyebrow="Portal"
      title={`Welcome back, ${firstName}.`}
      action={<RoleBadge role={tier} />}
    >
      {/* MEMBER STATS — everyone sees these */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Total points" value={stats?.points ?? "—"} icon={Trophy} tone="brand" />
        <Stat label="Meetings attended" value={stats?.attendance ?? "—"} icon={ClipboardCheck} tone="info" />
        <Stat label="Events" value={stats?.events ?? "—"} icon={Calendar} tone="success" />
        <Stat label="Achievements" value={stats?.achievements ?? "—"} icon={Award} />
      </div>

      {/* ADMIN COMMAND CENTER */}
      {isAdmin && adminStats && (
        <section className="mb-10">
          <SectionTitle sub="Live across the unit. Everything here is editable.">Administrator command center</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <Stat label="Total members" value={adminStats.members} icon={Users} tone="brand" />
            <Stat label="Pending bookings" value={adminStats.pendingBookings} icon={BookmarkCheck} tone="info" />
            <Stat label="Unread messages" value={adminStats.unreadMessages} icon={Mail} />
            <Stat label="Events in calendar" value={adminStats.events} icon={Calendar} tone="success" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink to="/portal/admin/site" icon={Settings} label="Site settings" sub="Hero, stats, contact" />
            <QuickLink to="/portal/admin/projects" icon={FolderKanban} label="Projects" sub="Publish & edit" />
            <QuickLink to="/portal/admin/board" icon={Users} label="Board" sub="TIC, executive, heads" />
            <QuickLink to="/portal/admin/bookings" icon={BookmarkCheck} label="Bookings" sub="Approve coverage" />
          </div>
        </section>
      )}

      {/* HEAD / BOARD APPROVAL QUEUE */}
      {(isHead || isAdmin) && (
        <section className="mb-10">
          <SectionTitle sub="Approve member contributions to award points.">Approval queue</SectionTitle>
          {pendingContribs && pendingContribs.length > 0 ? (
            <Card className="p-0 overflow-hidden">
              <ul className="divide-y divide-border">
                {pendingContribs.map((c) => (
                  <li key={c.id} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-widest text-brand">{c.kind.replace(/_/g, " ")}</span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.division}</span>
                      </div>
                      <p className="text-sm mt-1 truncate">{c.note || "No note provided."}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Empty>Nothing waiting. Section is up to date.</Empty>
          )}
        </section>
      )}

      {/* ANNOUNCEMENTS */}
      <section className="mb-10">
        <SectionTitle>Announcements</SectionTitle>
        {announcements && announcements.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {announcements.map((a) => (
              <Card key={a.id}>
                <div className="flex items-center gap-3 mb-2">
                  {a.pinned && <Megaphone className="h-3.5 w-3.5 text-brand" />}
                  {a.pinned && <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Pinned</span>}
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="font-display font-bold text-base">{a.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{a.body}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>No announcements yet.</Empty>
        )}
      </section>

      {/* QUICK LINKS — members */}
      <section>
        <SectionTitle>Jump to</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink to="/portal/profile" icon={Award} label="My profile" sub="Skills & achievements" />
          <QuickLink to="/portal/contributions" icon={ClipboardCheck} label="Log contribution" sub="Earn points" />
          <QuickLink to="/portal/rankings" icon={Trophy} label="Rankings" sub="See where you stand" />
          <a
            href="https://sccmu.cybertec.lk/"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-border bg-card p-5 hover:border-brand/40 hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <ExternalLink className="h-5 w-5 text-brand mb-3" />
            <div className="font-display font-bold">MediaFlow</div>
            <div className="text-xs text-muted-foreground mt-0.5">Open production board</div>
          </a>
        </div>
      </section>
    </PortalPage>
  );
}

function QuickLink({ to, icon: Icon, label, sub }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; sub: string }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-card p-5 hover:border-brand/40 hover:-translate-y-0.5 transition-all shadow-sm"
    >
      <div className="flex items-start justify-between">
        <Icon className="h-5 w-5 text-brand mb-3" />
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="font-display font-bold">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </Link>
  );
}
