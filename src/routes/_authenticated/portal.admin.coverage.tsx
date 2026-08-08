import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty, Stat } from "@/components/portal/PortalUI";
import { notifyBookingStatus } from "@/lib/email.functions";
import { DIVISION_LABEL } from "@/lib/site-content";
import {
  BOOKING_STAGES, PIPELINE, PRIORITIES, PRIORITY_CLASS, STAGE_CLASS, STAGE_LABEL,
  divisionsForServices, SERVICE_DIVISION,
} from "@/lib/coverage";
import {
  Search, X, UserPlus, Link2, Trash2, ChevronRight, Clock, AlertTriangle, CheckCircle2, Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/coverage")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r.role)))
      throw redirect({ to: "/portal" });
  },
  component: CoverageOps,
});

type Booking = {
  id: string; event_name: string; organization: string; contact_person: string;
  email: string | null; whatsapp: string; event_date: string; event_time: string | null;
  venue: string | null; event_type: string | null; services: string[]; audience_size: number | null;
  notes: string | null; status: string; priority: string; assigned_divisions: string[];
  media_links: any; completion_note: string | null; rejection_reason: string | null; created_at: string;
};

type Member = { id: string; full_name: string; admission_number: string | null; primary_division: string | null; photo_url: string | null };

const CLIENT_EMAIL_STAGES = ["contacted", "confirmed", "rejected", "completed"];

function CoverageOps() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("active");
  const [openId, setOpenId] = useState<string | null>(null);

  const bookings = useQuery({
    queryKey: ["ops-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Booking[];
    },
  });

  const assignments = useQuery({
    queryKey: ["ops-assignments"],
    queryFn: async () => {
      const { data } = await supabase.from("coverage_assignments").select("*");
      return data ?? [];
    },
  });

  const members = useQuery({
    queryKey: ["ops-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("id, full_name, admission_number, primary_division, photo_url")
        .order("full_name");
      return (data ?? []) as Member[];
    },
  });

  const rows = useMemo(() => {
    const all = bookings.data ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter((b) => {
      if (stageFilter === "active" && ["completed", "media_published", "rejected"].includes(b.status)) return false;
      if (stageFilter !== "active" && stageFilter !== "all" && b.status !== stageFilter) return false;
      if (!needle) return true;
      return [b.event_name, b.organization, b.contact_person, b.venue, b.event_type]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [bookings.data, q, stageFilter]);

  const open = (bookings.data ?? []).find((b) => b.id === openId) ?? null;

  const counts = useMemo(() => {
    const all = bookings.data ?? [];
    return {
      active: all.filter((b) => !["completed", "media_published", "rejected"].includes(b.status)).length,
      awaiting: all.filter((b) => b.status === "new").length,
      inProgress: all.filter((b) => ["assigned", "in_progress"].includes(b.status)).length,
      done: all.filter((b) => ["completed", "media_published"].includes(b.status)).length,
    };
  }, [bookings.data]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["ops-bookings"] });
    qc.invalidateQueries({ queryKey: ["ops-assignments"] });
  }

  async function setStage(b: Booking, to: string, extra?: { reason?: string; note?: string }) {
    const patch: Record<string, unknown> = { status: to };
    if (extra?.reason) patch.rejection_reason = extra.reason;
    if (extra?.note) patch.completion_note = extra.note;
    const { error } = await supabase.from("bookings").update(patch as any).eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("booking_status_history").insert({
      booking_id: b.id, from_status: b.status, to_status: to,
      note: extra?.reason ?? extra?.note ?? null, changed_by: user.id,
    });
    refresh();
    qc.invalidateQueries({ queryKey: ["booking-history", b.id] });
    toast.success(`Moved to ${STAGE_LABEL[to] ?? to}`);
    if (CLIENT_EMAIL_STAGES.includes(to) && b.email) {
      try {
        await notifyBookingStatus({ data: { bookingId: b.id, status: to, reason: extra?.reason } });
        toast.success("Client notified by email");
      } catch {
        toast.error("Stage saved, but the client email failed to send");
      }
    }
  }

  return (
    <PortalPage eyebrow="OPERATIONS" title="Coverage Operations Center">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Active jobs" value={counts.active} icon={Clock} tone="brand" />
        <Stat label="Awaiting review" value={counts.awaiting} icon={AlertTriangle} tone="info" />
        <Stat label="In production" value={counts.inProgress} icon={Users} />
        <Stat label="Delivered" value={counts.done} icon={CheckCircle2} tone="success" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search event, client, venue…"
            className="w-full rounded-full border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
        </div>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm">
          <option value="active">Active pipeline</option>
          <option value="all">All requests</option>
          {BOOKING_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {bookings.isLoading ? (
        <Empty>Loading coverage requests…</Empty>
      ) : rows.length === 0 ? (
        <Empty>No coverage requests match this view.</Empty>
      ) : (
        <div className="space-y-2">
          {rows.map((b) => {
            const mine = (assignments.data ?? []).filter((a: any) => a.booking_id === b.id);
            return (
              <button key={b.id} onClick={() => setOpenId(b.id)}
                className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-brand/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${STAGE_CLASS[b.status] ?? "bg-muted"}`}>
                        {STAGE_LABEL[b.status] ?? b.status}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${PRIORITY_CLASS[b.priority] ?? ""}`}>
                        {b.priority}
                      </span>
                    </div>
                    <div className="mt-2 font-display text-lg font-bold truncate">{b.event_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {b.organization} · {b.event_date}{b.venue ? ` · ${b.venue}` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(b.services ?? []).map((s) => (
                        <span key={s} className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-semibold">{mine.length} assigned</div>
                    <ChevronRight className="ml-auto mt-2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <JobDrawer
          booking={open}
          members={members.data ?? []}
          assignments={(assignments.data ?? []).filter((a: any) => a.booking_id === open.id)}
          allAssignments={assignments.data ?? []}
          userId={user.id}
          onClose={() => setOpenId(null)}
          onStage={setStage}
          refresh={refresh}
        />
      )}
    </PortalPage>
  );
}

function JobDrawer({ booking, members, assignments, allAssignments, userId, onClose, onStage, refresh }: {
  booking: Booking; members: Member[]; assignments: any[]; allAssignments: any[]; userId: string;
  onClose: () => void; onStage: (b: Booking, to: string, extra?: { reason?: string; note?: string }) => Promise<void>;
  refresh: () => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState(booking.completion_note ?? "");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const divisions = divisionsForServices(booking.services);

  const history = useQuery({
    queryKey: ["booking-history", booking.id],
    queryFn: async () => {
      const { data } = await supabase.from("booking_status_history").select("*")
        .eq("booking_id", booking.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  /** Workload = active assignments on jobs that are not finished. */
  const workload = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of allAssignments) map[a.user_id] = (map[a.user_id] ?? 0) + 1;
    return map;
  }, [allAssignments]);

  const candidates = useMemo(() => {
    const assignedIds = new Set(assignments.map((a) => a.user_id));
    return members
      .filter((m) => !assignedIds.has(m.id))
      .filter((m) => divisions.length === 0 || (m.primary_division && divisions.includes(m.primary_division)))
      .sort((a, b) => (workload[a.id] ?? 0) - (workload[b.id] ?? 0));
  }, [members, assignments, divisions, workload]);

  const mediaLinks: { label: string; url: string }[] = Array.isArray(booking.media_links) ? booking.media_links : [];

  async function assign(m: Member) {
    const service = (booking.services ?? []).find((s) => SERVICE_DIVISION[s] === m.primary_division) ?? null;
    const { error } = await supabase.from("coverage_assignments").insert({
      booking_id: booking.id, user_id: m.id, division: (m.primary_division as any) ?? null,
      service, assigned_by: userId,
    });
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: m.id, kind: "assignment", priority: booking.priority === "critical" ? "high" : "normal",
      title: `You're assigned: ${booking.event_name}`,
      body: `${booking.event_date}${booking.venue ? ` · ${booking.venue}` : ""}${service ? ` · ${service}` : ""}`,
      link: "/portal/assignments",
    });
    toast.success(`${m.full_name} assigned`);
    refresh();
  }

  async function unassign(a: any) {
    const { error } = await supabase.from("coverage_assignments").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function saveMedia(next: { label: string; url: string }[]) {
    const { error } = await supabase.from("bookings").update({ media_links: next as any }).eq("id", booking.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function setPriority(p: string) {
    const { error } = await supabase.from("bookings").update({ priority: p }).eq("id", booking.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  const stageIndex = PIPELINE.indexOf(booking.status as any);
  const nextStage = stageIndex >= 0 && stageIndex < PIPELINE.length - 1 ? PIPELINE[stageIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-background border-l border-border" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background/95 backdrop-blur px-6 py-5">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand">Coverage job</div>
            <h2 className="font-display text-2xl font-extrabold truncate">{booking.event_name}</h2>
            <div className="text-xs text-muted-foreground mt-1">{booking.organization}</div>
          </div>
          <button onClick={onClose} className="rounded-full border border-border p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-8">
          {/* pipeline */}
          <section>
            <SecTitle>Workflow</SecTitle>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE.map((s, i) => (
                <span key={s} className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  i <= stageIndex ? STAGE_CLASS[s] : "bg-muted/50 text-muted-foreground"}`}>{STAGE_LABEL[s]}</span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {nextStage && booking.status !== "rejected" && (
                <button onClick={() => onStage(booking, nextStage)}
                  className="rounded-full bg-foreground text-background px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand transition-colors">
                  Advance → {STAGE_LABEL[nextStage]}
                </button>
              )}
              {BOOKING_STAGES.filter((s) => s.value !== booking.status && s.value !== "rejected").map((s) => (
                <button key={s.value} onClick={() => onStage(booking, s.value)}
                  className="rounded-full border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">{s.label}</button>
              ))}
            </div>
            {booking.status !== "rejected" && (
              <div className="mt-4 rounded-xl border border-border p-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reject with reason</label>
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason emailed to the client…"
                  className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm" />
                <button onClick={() => reason.trim() ? onStage(booking, "rejected", { reason: reason.trim() }) : toast.error("Give a reason")}
                  className="mt-2 rounded-full bg-red-600 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-red-700">
                  Reject &amp; notify
                </button>
              </div>
            )}
            {booking.rejection_reason && (
              <p className="mt-3 text-xs text-red-600"><strong>Rejection reason:</strong> {booking.rejection_reason}</p>
            )}
          </section>

          {/* client + event */}
          <section>
            <SecTitle>Client &amp; event</SecTitle>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Info label="Contact" value={booking.contact_person} />
              <Info label="WhatsApp" value={booking.whatsapp} />
              <Info label="Email" value={booking.email ?? "—"} />
              <Info label="Type" value={booking.event_type ?? "—"} />
              <Info label="Date / time" value={`${booking.event_date}${booking.event_time ? ` · ${booking.event_time}` : ""}`} />
              <Info label="Venue" value={booking.venue ?? "—"} />
              <Info label="Audience" value={booking.audience_size ? String(booking.audience_size) : "—"} />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Priority</div>
                <select value={booking.priority} onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            {booking.notes && <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{booking.notes}</p>}
          </section>

          {/* smart assignment */}
          <section>
            <SecTitle>Team assignment</SecTitle>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {divisions.length === 0 ? <span className="text-xs text-muted-foreground">No division mapped from the requested services.</span> :
                divisions.map((d) => (
                  <span key={d} className="rounded-full bg-brand/10 text-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
                    {DIVISION_LABEL[d] ?? d}
                  </span>
                ))}
            </div>

            {assignments.length > 0 && (
              <div className="space-y-2 mb-4">
                {assignments.map((a) => {
                  const m = members.find((x) => x.id === a.user_id);
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                      <Avatar member={m} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{m?.full_name ?? "Member"}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {a.service ?? DIVISION_LABEL[a.division] ?? "Crew"} · {a.status}
                        </div>
                      </div>
                      <button onClick={() => unassign(a)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-xl border border-border">
              <div className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Available crew — lowest workload first
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {candidates.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No unassigned members in these divisions.</div>
                ) : candidates.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5">
                    <Avatar member={m} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{m.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {m.admission_number ?? "—"} · {m.primary_division ? DIVISION_LABEL[m.primary_division] : "No division"} · {workload[m.id] ?? 0} active job(s)
                      </div>
                    </div>
                    <button onClick={() => assign(m)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-foreground hover:text-background">
                      <UserPlus className="h-3.5 w-3.5" /> Assign
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* media */}
          <section>
            <SecTitle>Final media</SecTitle>
            <div className="space-y-2">
              {mediaLinks.map((l, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                  <Link2 className="h-3.5 w-3.5 text-brand shrink-0" />
                  <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm hover:underline">{l.label || l.url}</a>
                  <button onClick={() => saveMedia(mediaLinks.filter((_, j) => j !== i))}
                    className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="mt-2 grid sm:grid-cols-[1fr_2fr_auto] gap-2">
              <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label (Facebook album)"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <button onClick={() => {
                if (!linkUrl.trim()) return toast.error("Add a URL");
                saveMedia([...mediaLinks, { label: linkLabel.trim() || linkUrl.trim(), url: linkUrl.trim() }]);
                setLinkLabel(""); setLinkUrl("");
              }} className="rounded-lg bg-foreground text-background px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand">Add</button>
            </div>
            <label className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Completion note</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" />
            <button onClick={async () => {
              const { error } = await supabase.from("bookings").update({ completion_note: note }).eq("id", booking.id);
              error ? toast.error(error.message) : toast.success("Saved"); refresh();
            }} className="mt-2 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">Save note</button>
          </section>

          {/* history */}
          <section>
            <SecTitle>Status history</SecTitle>
            {(history.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No stage changes recorded yet.</p>
            ) : (
              <ol className="space-y-2">
                {(history.data ?? []).map((h: any) => (
                  <li key={h.id} className="rounded-lg border border-border p-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${STAGE_CLASS[h.to_status] ?? "bg-muted"}`}>
                        {STAGE_LABEL[h.to_status] ?? h.to_status}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {h.from_status ? `from ${STAGE_LABEL[h.from_status] ?? h.from_status} · ` : ""}
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                    {h.note && <p className="mt-1 text-xs text-muted-foreground">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-muted-foreground mb-3">{children}</h3>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words">{value}</div>
    </div>
  );
}

function Avatar({ member }: { member?: Member }) {
  if (member?.photo_url) return <img src={member.photo_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />;
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
      {(member?.full_name ?? "?")[0]?.toUpperCase()}
    </div>
  );
}
