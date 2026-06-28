import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/admin/bookings")({
  component: AdminBookings,
});

function AdminBookings() {
  const qc = useQueryClient();
  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: "confirmed" | "rejected" | "completed" | "contacted") {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
  }

  return (
    <PortalPage eyebrow="Administrator" title="Coverage bookings">
      {bookings && bookings.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {bookings.map((b) => (
            <Card key={b.id}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">{b.event_type ?? "Event"}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest rounded-full bg-muted px-2.5 py-1">{b.status}</span>
              </div>
              <h3 className="font-display font-bold text-lg">{b.event_name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{b.contact_person} · {b.email}</p>
              <p className="text-sm mt-2">{b.event_date} · {b.venue}</p>
              {b.notes && <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{b.notes}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setStatus(b.id, "confirmed")}
                  className="rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700">Confirm</button>
                <button onClick={() => setStatus(b.id, "contacted")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Contacted</button>
                <button onClick={() => setStatus(b.id, "completed")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Completed</button>
                <button onClick={() => setStatus(b.id, "rejected")}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950">Reject</button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>No booking requests yet.</Empty>
      )}
    </PortalPage>
  );
}
