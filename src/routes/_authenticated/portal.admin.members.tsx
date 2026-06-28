import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/admin/members")({
  component: AdminMembers,
});

function AdminMembers() {
  const { data: members } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,grade,class,primary_division,join_date")
        .order("full_name");
      return data ?? [];
    },
  });

  return (
    <PortalPage eyebrow="Administrator" title="Members">
      <Card className="p-0 overflow-hidden">
        {members && members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Grade</th>
                  <th className="text-left px-5 py-3">Division</th>
                  <th className="text-left px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{m.full_name || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-5 py-3">{m.grade || "—"}</td>
                    <td className="px-5 py-3">{m.primary_division || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{m.join_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6"><Empty>No members yet. They appear here after account creation.</Empty></div>
        )}
      </Card>
      <p className="text-xs text-muted-foreground mt-4">
        Need to add a member? Use <Link to="/portal/admin/site" className="underline">site settings</Link> first, then invite users — full create/edit UI ships next iteration.
      </p>
    </PortalPage>
  );
}
