import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty, Stat } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { user } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["att", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*").eq("user_id", user.id).order("attended_on", { ascending: false });
      return data ?? [];
    },
  });

  const total = data?.length ?? 0;
  const thisMonth = (data ?? []).filter((r) => {
    const d = new Date(r.attended_on);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const thisYear = (data ?? []).filter((r) => new Date(r.attended_on).getFullYear() === new Date().getFullYear()).length;

  return (
    <PortalPage title="Attendance">
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <Stat label="All time" value={total} />
        <Stat label="This month" value={thisMonth} />
        <Stat label="This year" value={thisYear} />
      </div>

      <h2 className="font-display text-2xl mb-4">Records</h2>
      {data && data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((a) => (
            <li key={a.id} className="border border-border px-4 py-3 bg-card flex justify-between">
              <span>{a.attended_on}</span>
              <span className="text-foreground/60">{a.meeting_label || "Meeting"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No attendance recorded yet. Manual marking by heads in Phase 1; fingerprint integration is Phase 2.</Empty>
      )}
    </PortalPage>
  );
}
