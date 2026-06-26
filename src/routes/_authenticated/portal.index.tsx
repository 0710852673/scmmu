import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Stat, Empty } from "@/components/portal/PortalUI";

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

  const { data: announcements } = useQuery({
    queryKey: ["recent-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,title,body,created_at,pinned")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <PortalPage eyebrow={`Welcome${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} title="Dashboard">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <Stat label="Meetings attended" value={stats?.attendance ?? "—"} />
        <Stat label="Events" value={stats?.events ?? "—"} />
        <Stat label="Total points" value={stats?.points ?? "—"} />
        <Stat label="Achievements" value={stats?.achievements ?? "—"} />
      </div>

      <h2 className="font-serif text-2xl mb-4">Announcements</h2>
      {announcements && announcements.length > 0 ? (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.id} className="border border-foreground/10 p-5 bg-card">
              <div className="flex items-center gap-3 mb-2">
                {a.pinned && <span className="text-[10px] uppercase tracking-widest text-accent font-bold">Pinned</span>}
                <span className="text-xs text-foreground/40">{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
              <h3 className="font-bold">{a.title}</h3>
              <p className="mt-1 text-sm text-foreground/70">{a.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No announcements yet.</Empty>
      )}
    </PortalPage>
  );
}
