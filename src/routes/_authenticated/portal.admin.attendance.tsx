import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty, Stat, SectionTitle } from "@/components/portal/PortalUI";
import { Save, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/attendance")({
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (error || !(data ?? []).some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r.role))) {
      throw redirect({ to: "/portal" });
    }
  },
  component: AdminAttendancePage,
});

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type Member = { id: string; full_name: string; admission_number: string | null; grade: string | null; primary_division: string | null };
type Session = { id: string; attended_on: string; meeting_label: string; created_at: string };
type AttendanceRecord = { user_id: string; status: AttendanceStatus };

function localDateValue() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

function AdminAttendancePage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");
  const [meetingDate, setMeetingDate] = useState(localDateValue());
  const [meetingLabel, setMeetingLabel] = useState("Unit Meeting");
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | "">>({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const membersQuery = useQuery({
    queryKey: ["attendance-roster-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,admission_number,grade,primary_division")
        .eq("active", true)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["attendance-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("id,attended_on,meeting_label,created_at")
        .order("attended_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  useEffect(() => {
    if (!sessionId && sessionsQuery.data?.length) setSessionId(sessionsQuery.data[0]!.id);
  }, [sessionId, sessionsQuery.data]);

  const selectedSession = sessionsQuery.data?.find((s) => s.id === sessionId);

  const recordsQuery = useQuery({
    queryKey: ["attendance-session-records", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("user_id,status")
        .eq("session_id", sessionId);
      if (error) throw error;
      return (data ?? []) as AttendanceRecord[];
    },
  });

  useEffect(() => {
    if (!recordsQuery.data) return;
    setStatuses(Object.fromEntries(recordsQuery.data.map((r) => [r.user_id, r.status])));
  }, [recordsQuery.data, sessionId]);

  const members = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (membersQuery.data ?? []).filter((m) =>
      !term || [m.full_name, m.admission_number, m.grade, m.primary_division]
        .some((v) => String(v ?? "").toLowerCase().includes(term)),
    );
  }, [membersQuery.data, search]);

  const counts = useMemo(() => {
    const values = Object.values(statuses);
    return {
      marked: values.filter(Boolean).length,
      present: values.filter((v) => v === "present").length,
      absent: values.filter((v) => v === "absent").length,
      late: values.filter((v) => v === "late").length,
      excused: values.filter((v) => v === "excused").length,
    };
  }, [statuses]);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    const label = meetingLabel.trim();
    if (!meetingDate || !label) return toast.error("Enter a meeting date and name.");
    setCreating(true);
    const { data: existing, error: lookupError } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("attended_on", meetingDate)
      .eq("meeting_label", label)
      .maybeSingle();
    if (lookupError) {
      setCreating(false);
      return toast.error("Could not check existing meetings.");
    }
    if (existing) {
      setSessionId(existing.id);
      setCreating(false);
      toast.info("That meeting already exists. Opened it instead.");
      return;
    }
    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert({ attended_on: meetingDate, meeting_label: label, created_by: user.id })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) return toast.error("Could not create the meeting.");
    await queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] });
    setSessionId(data.id);
    setStatuses({});
    toast.success("Meeting roster created.");
  }

  async function saveAttendance() {
    if (!selectedSession) return;
    const marked = Object.entries(statuses).filter(([, status]) => status !== "");
    if (!marked.length) return toast.error("Mark at least one member before saving.");
    setSaving(true);
    const rows = marked.map(([userId, status]) => ({
      user_id: userId,
      attended_on: selectedSession.attended_on,
      meeting_label: selectedSession.meeting_label,
      session_id: selectedSession.id,
      recorded_by: user.id,
      status: status as AttendanceStatus,
    }));
    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "user_id,attended_on,meeting_label" });
    setSaving(false);
    if (error) return toast.error("Attendance could not be saved. Check the database migration and try again.");
    await queryClient.invalidateQueries({ queryKey: ["attendance-session-records", sessionId] });
    await queryClient.invalidateQueries({ queryKey: ["att",] });
    await queryClient.invalidateQueries({ queryKey: ["dash-stats"] });
    toast.success(`Saved attendance for ${marked.length} members.`);
  }

  return (
    <PortalPage
      eyebrow="STAFF OPERATIONS"
      title="Meeting attendance"
      action={
        <button
          onClick={saveAttendance}
          disabled={!selectedSession || saving || counts.marked === 0}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save roster"}
        </button>
      }
    >
      <Card className="mb-6">
        <SectionTitle>Create a meeting roster</SectionTitle>
        <form onSubmit={createSession} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
          <label className="text-xs text-muted-foreground">
            Meeting date
            <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" required />
          </label>
          <label className="text-xs text-muted-foreground">
            Meeting name
            <input value={meetingLabel} onChange={(e) => setMeetingLabel(e.target.value)}
              maxLength={120} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" required />
          </label>
          <button disabled={creating} className="self-end rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            {creating ? "Creating…" : "Create / open"}
          </button>
        </form>
      </Card>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="text-xs text-muted-foreground sm:max-w-md sm:flex-1">
          Select meeting
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="">Choose a meeting…</option>
            {(sessionsQuery.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.attended_on} · {s.meeting_label}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Present" value={counts.present} />
          <Stat label="Absent" value={counts.absent} />
          <Stat label="Late" value={counts.late} />
          <Stat label="Excused" value={counts.excused} />
        </div>
      </div>

      {sessionsQuery.isError || membersQuery.isError || recordsQuery.isError ? (
        <Empty>Could not load attendance data. Confirm the attendance migration has been applied and refresh.</Empty>
      ) : !selectedSession ? (
        <Empty>Create a meeting or select an existing one to load the member roster.</Empty>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionTitle sub={`${counts.marked} of ${membersQuery.data?.length ?? 0} active members marked`}>Member roster</SectionTitle>
            <label className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm" />
            </label>
          </div>
          {membersQuery.isLoading || recordsQuery.isLoading ? (
            <Empty>Loading roster…</Empty>
          ) : members.length === 0 ? (
            <Empty>No active members found.</Empty>
          ) : (
            <Card className="p-0">
              <div className="divide-y divide-border">
                {members.map((member) => (
                  <div key={member.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{member.full_name || "Unnamed member"}</div>
                      <div className="text-xs text-muted-foreground">
                        {[member.admission_number, member.grade, member.primary_division?.replace(/_/g, " ")]
                          .filter(Boolean).join(" · ") || "No member details"}
                      </div>
                    </div>
                    <select
                      aria-label={`Attendance for ${member.full_name}`}
                      value={statuses[member.id] ?? ""}
                      onChange={(e) => setStatuses((current) => ({
                        ...current,
                        [member.id]: e.target.value as AttendanceStatus | "",
                      }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm sm:w-40"
                    >
                      <option value="">Not marked</option>
                      {(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map((status) => (
                        <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
      <p className="mt-5 text-xs text-muted-foreground">
        Unmarked members are left unchanged. Only explicitly selected statuses are saved.
      </p>
    </PortalPage>
  );
}
