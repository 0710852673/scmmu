import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMemberRankings } from "@/lib/rankings.functions";
import { PortalPage, Empty } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/rankings")({
  component: Rankings,
});

function Rankings() {
  const fetchRankings = useServerFn(getMemberRankings);
  const { data } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => fetchRankings(),
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
        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-foreground/40 border-b border-border">
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
                <td className="py-4 font-display italic text-xl">{i + 1}</td>
                <td className="font-bold">{u.full_name || "Unnamed"}</td>
                <td className="text-foreground/60 capitalize">{u.primary_division?.replace("_", " ") || "—"}</td>
                <td className="text-xs uppercase tracking-widest">{level(u.points)}</td>
                <td className="text-right font-bold">{u.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </PortalPage>
  );
}
