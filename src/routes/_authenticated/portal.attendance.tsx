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
      const { data } = await supabase.from("attendance").select("id,attended_on,meeting_label,status").eq("user_id", user.id).order("attended_on", { ascending: false });
      return data ?? [];
    },
  });

  const presentRecords = (data ?? []).filter((r) => r.status === "present");
  const total = presentRecords.length;
  const thisMonth = presentRecords.filter((r) => {
    const d = new Date(r.attended_on);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const thisYear = presentRecords.filter((r) => new Date(r.attended_on).getFullYear() === new Date().getFullYear()).length;

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
              <span className="flex items-center gap-3 text-foreground/60"><span>{a.meeting_label || "Meeting"}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">{a.status || "present"}</span></span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No attendance recorded yet. Manual marking by heads in Phase 1; fingerprint integration is Phase 2.</Empty>
      )}
    </PortalPage>
  );
}
