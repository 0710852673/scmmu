import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/events")({
  component: EventsPage,
});

function EventsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [showMissing, setShowMissing] = useState(false);

  const { data: events } = useQuery({
    queryKey: ["portal-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: myParts } = useQuery({
    queryKey: ["my-parts", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("event_participants").select("event_id,status,role").eq("user_id", user.id);
      return data ?? [];
    },
  });

  async function requestPart(eventId: string, role: string) {
    const { error } = await supabase.from("event_participants").insert({
      event_id: eventId, user_id: user.id, role,
    });
    if (error) return toast.error(error.message);
    toast.success("Requested — pending review");
    qc.invalidateQueries({ queryKey: ["my-parts", user.id] });
  }

  async function submitMissing(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("missing_event_requests").insert({
      requested_by: user.id,
      name: String(fd.get("name")),
      event_date: String(fd.get("event_date")) || null,
      description: String(fd.get("description")) || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Submitted to your head for review");
    (e.target as HTMLFormElement).reset();
    setShowMissing(false);
  }

  return (
    <PortalPage
      title="Events"
      action={
        <button onClick={() => setShowMissing((v) => !v)} className="border border-foreground/20 px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background">
          Missing event?
        </button>
      }
    >
      {showMissing && (
        <form onSubmit={submitMissing} className="bg-card border border-foreground/10 p-6 mb-8 space-y-4 max-w-xl">
          <h3 className="font-serif text-xl">Report missing event</h3>
          <input name="name" required placeholder="Event name" className="w-full border border-foreground/20 p-3 text-sm" />
          <input name="event_date" type="date" className="w-full border border-foreground/20 p-3 text-sm" />
          <textarea name="description" placeholder="Description" rows={3} className="w-full border border-foreground/20 p-3 text-sm" />
          <button className="bg-foreground text-background px-6 py-3 text-xs font-bold uppercase tracking-widest">Submit</button>
        </form>
      )}

      {events && events.length > 0 ? (
        <ul className="space-y-3">
          {events.map((e) => {
            const mine = myParts?.find((p) => p.event_id === e.id);
            return (
              <li key={e.id} className="border border-foreground/10 p-5 bg-card flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="font-bold">{e.name}</h3>
                  <div className="text-xs text-foreground/60 mt-1">
                    {e.event_date} · {e.location || "—"} · {e.category || "Event"}
                  </div>
                </div>
                {mine ? (
                  <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 border border-foreground/20">
                    {mine.status}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      const role = prompt("Your role (e.g. Photographer, Editor)") ?? "";
                      if (role) requestPart(e.id, role);
                    }}
                    className="text-xs font-bold uppercase tracking-widest border-b border-foreground pb-1"
                  >
                    Request to join
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>No events yet. Section heads can add events from the admin.</Empty>
      )}
    </PortalPage>
  );
}
