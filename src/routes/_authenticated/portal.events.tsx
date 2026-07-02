import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty, Card, SectionTitle } from "@/components/portal/PortalUI";
import { Calendar, MapPin, CheckCircle2, XCircle, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/events")({
  component: EventsPage,
});


function EventsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [showMissing, setShowMissing] = useState(false);

  const { data: roles } = useQuery({
    queryKey: ["my-roles", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data ?? []).map((r) => r.role as string);
    },
  });
  const isStaff = !!roles?.some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r));

  const { data: events } = useQuery({
    queryKey: ["portal-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: myParts } = useQuery({
    queryKey: ["my-parts", user.id],
    enabled: !isStaff,
    queryFn: async () => {
      const { data } = await supabase.from("event_participants").select("event_id,status,role").eq("user_id", user.id);
      return data ?? [];
    },
  });

  // STAFF: pending join requests to approve
  const { data: pendingJoins } = useQuery({
    queryKey: ["pending-event-joins"],
    enabled: isStaff,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_participants")
        .select("id,event_id,user_id,role,status,created_at,events(name,event_date),profiles(full_name,photo_url)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function decideJoin(id: string, approve: boolean) {
    const { error } = await supabase.from("event_participants").update({ status: approve ? "approved" : "rejected" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["pending-event-joins"] });
  }

  async function requestPart(eventId: string, role: string) {
    const { error } = await supabase.from("event_participants").insert({ event_id: eventId, user_id: user.id, role });
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
      eyebrow="Schedule"
      title="Events"
      action={
        !isStaff && (
          <button onClick={() => setShowMissing((v) => !v)} className="rounded-full border border-border px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors">
            Missing event?
          </button>
        )
      }
    >
      {/* STAFF APPROVAL QUEUE */}
      {isStaff && (
        <section className="mb-10">
          <SectionTitle sub="Approve member requests to join events.">Event join requests</SectionTitle>
          {pendingJoins && pendingJoins.length > 0 ? (
            <Card className="p-0 overflow-hidden">
              <ul className="divide-y divide-border">
                {pendingJoins.map((r: any) => (
                  <li key={r.id} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                    {r.profiles?.photo_url ? (
                      <img src={r.profiles.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full brand-gradient grid place-items-center text-white text-xs font-bold">
                        {(r.profiles?.full_name ?? "?")[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{r.profiles?.full_name ?? "Member"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.events?.name} · {r.events?.event_date} · Role: <span className="capitalize">{r.role}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => decideJoin(r.id, true)}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button onClick={() => decideJoin(r.id, false)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Empty>No pending join requests.</Empty>
          )}
        </section>
      )}

      {showMissing && !isStaff && (
        <form onSubmit={submitMissing} className="bg-card border border-border rounded-2xl p-6 mb-8 space-y-4 max-w-xl">
          <h3 className="font-display text-xl font-bold">Report missing event</h3>
          <input name="name" required placeholder="Event name" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
          <input name="event_date" type="date" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
          <textarea name="description" placeholder="Description" rows={3} className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
          <button className="rounded-full brand-gradient px-6 py-3 text-xs font-bold uppercase tracking-widest text-white">Submit</button>
        </form>
      )}

      <SectionTitle>All events</SectionTitle>
      {events && events.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {events.map((e) => {
            const mine = myParts?.find((p) => p.event_id === e.id);
            const d = e.event_date ? new Date(e.event_date) : null;
            return (
              <Card key={e.id} className="flex gap-4">
                {d && (
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl brand-gradient text-white py-2">
                    <div className="text-[10px] font-bold uppercase opacity-90">{d.toLocaleDateString("en", { month: "short" })}</div>
                    <div className="font-display text-2xl font-extrabold leading-none">{d.getDate()}</div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base leading-tight">{e.name}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                    {e.category && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{e.category}</span>}
                  </div>
                  {e.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{e.description}</p>}
                  {!isStaff && (
                    <div className="mt-3">
                      {mine ? (
                        <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border border-border">
                          {mine.status}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            const role = prompt("Your role (e.g. Photographer, Editor)") ?? "";
                            if (role) requestPart(e.id, role);
                          }}
                          className="text-xs font-bold uppercase tracking-widest text-brand hover:underline"
                        >
                          Request to join →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty>No events yet.</Empty>
      )}
    </PortalPage>
  );
}
