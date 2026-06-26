import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/rankings")({
  component: Rankings,
});

function Rankings() {
  const { data } = useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const [profilesRes, pointsRes] = await Promise.all([
        supabase.from("profiles").select("id,full_name,photo_url,primary_division"),
        supabase.from("points_log").select("user_id,points,division"),
      ]);
      const totals = new Map<string, number>();
      const divs = new Map<string, Record<string, number>>();
      for (const p of pointsRes.data ?? []) {
        totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + p.points);
        if (p.division) {
          const m = divs.get(p.user_id) ?? {};
          m[p.division] = (m[p.division] ?? 0) + p.points;
          divs.set(p.user_id, m);
        }
      }
      return (profilesRes.data ?? [])
        .map((u) => ({ ...u, points: totals.get(u.id) ?? 0, div: divs.get(u.id) ?? {} }))
        .sort((a, b) => b.points - a.points);
    },
  });

  function level(pts: number) {
    const monthly = pts / Math.max(1, new Date().getMonth() + 1);
    if (monthly >= 60) return "Elite";
    if (monthly >= 30) return "Highly Active";
    if (monthly >= 10) return "Active";
    return "Inactive";
  }

  const list = data ?? [];

  return (
    <PortalPage title="Rankings" eyebrow="Overall contribution">
      {list.length === 0 ? (
        <Empty>No ranked members yet.</Empty>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-foreground/40 border-b border-foreground/10">
              <th className="py-3">#</th>
              <th>Member</th>
              <th>Division</th>
              <th>Activity</th>
              <th className="text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u, i) => (
              <tr key={u.id} className="border-b border-foreground/5 hover:bg-muted/40">
                <td className="py-4 font-serif italic text-xl">{i + 1}</td>
                <td className="font-bold">{u.full_name || "Unnamed"}</td>
                <td className="text-foreground/60 capitalize">{u.primary_division?.replace("_", " ") || "—"}</td>
                <td className="text-xs uppercase tracking-widest">{level(u.points)}</td>
                <td className="text-right font-bold">{u.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PortalPage>
  );
}
