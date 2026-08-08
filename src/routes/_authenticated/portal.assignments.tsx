import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty } from "@/components/portal/PortalUI";
import { STAGE_CLASS, STAGE_LABEL } from "@/lib/coverage";
import { toast } from "sonner";
import { CalendarDays, MapPin, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/assignments")({
  component: MyAssignments,
});

function MyAssignments() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-assignments", user.id],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("coverage_assignments").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      const ids = [...new Set((rows ?? []).map((r) => r.booking_id))];
      const { data: bookings } = ids.length
        ? await supabase.from("bookings").select("id, event_name, organization, event_date, event_time, venue, status, priority").in("id", ids)
        : { data: [] as any[] };
      return (rows ?? []).map((r) => ({ ...r, booking: (bookings ?? []).find((b: any) => b.id === r.booking_id) }));
    },
  });

  async function respond(id: string, status: "accepted" | "declined") {
    const { error } = await supabase.from("coverage_assignments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "accepted" ? "Assignment accepted" : "Assignment declined");
    qc.invalidateQueries({ queryKey: ["my-assignments", user.id] });
  }

  return (
    <PortalPage eyebrow="CREW" title="My assignments">
      {isLoading ? (
        <Empty>Loading your assignments…</Empty>
      ) : (data ?? []).length === 0 ? (
        <Empty>You have no coverage assignments right now.</Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {(data ?? []).map((a: any) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${STAGE_CLASS[a.booking?.status] ?? "bg-muted"}`}>
                  {STAGE_LABEL[a.booking?.status] ?? a.booking?.status ?? "Job"}
                </span>
                <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">{a.status}</span>
                {a.service && <span className="rounded-full bg-brand/10 text-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">{a.service}</span>}
              </div>
              <h3 className="mt-2 font-display text-lg font-bold">{a.booking?.event_name ?? "Coverage job"}</h3>
              <p className="text-xs text-muted-foreground">{a.booking?.organization}</p>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />{a.booking?.event_date}{a.booking?.event_time ? ` · ${a.booking.event_time}` : ""}</div>
                {a.booking?.venue && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{a.booking.venue}</div>}
              </div>
              {a.status === "assigned" && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => respond(a.id, "accepted")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button onClick={() => respond(a.id, "declined")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-muted">
                    <XCircle className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
