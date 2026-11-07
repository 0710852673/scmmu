import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty, Stat, SectionTitle } from "@/components/portal/PortalUI";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { listErrorEvents, resolveErrorEvent } from "@/lib/error-management.functions";

export const Route = createFileRoute("/_authenticated/portal/admin/errors")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => r.role === "administrator")) throw redirect({ to: "/portal" });
  },
  component: ErrorManagementPage,
});

function ErrorManagementPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listErrorEvents);
  const resolveFn = useServerFn(resolveErrorEvent);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-error-events"],
    queryFn: () => listFn({}),
    refetchInterval: 60_000,
  });
  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveFn({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-error-events"] });
      toast.success("Error event marked as resolved.");
    },
    onError: () => toast.error("Could not resolve this error event."),
  });

  const events = data ?? [];
  const open = events.filter((event) => !event.resolved_at);
  const occurrences = open.reduce((sum, event) => sum + event.occurrence_count, 0);

  return (
    <PortalPage
      eyebrow="ADMINISTRATOR"
      title="Error management"
      action={
        <button onClick={() => refetch()} disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      }
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Open error groups" value={open.length} icon={AlertTriangle} tone={open.length ? "brand" : "default"} />
        <Stat label="Open occurrences" value={occurrences} />
        <Stat label="Resolved groups" value={events.length - open.length} icon={CheckCircle2} tone="success" />
      </div>

      <SectionTitle sub="Repeated server-side failures are grouped by a redacted fingerprint">Recorded errors</SectionTitle>
      {isLoading ? (
        <Empty>Loading error events…</Empty>
      ) : isError ? (
        <Empty>Could not load error events. Check administrator access and the error-management migration.</Empty>
      ) : events.length === 0 ? (
        <Empty>No server errors have been recorded. This is the ideal, suspiciously rare situation.</Empty>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} className={event.resolved_at ? "opacity-70" : "border-destructive/30"}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{event.error_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${event.resolved_at ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                      {event.resolved_at ? "Resolved" : "Open"}
                    </span>
                    <span className="text-xs text-muted-foreground">{event.occurrence_count} occurrence{event.occurrence_count === 1 ? "" : "s"}</span>
                  </div>
                  <p className="mt-2 break-words text-sm">{event.message}</p>
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    {event.method ?? "—"} {event.route ?? "Unknown route"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>First: {new Date(event.first_seen_at).toLocaleString()}</span>
                    <span>Last: {new Date(event.last_seen_at).toLocaleString()}</span>
                    {event.resolved_at && <span>Resolved: {new Date(event.resolved_at).toLocaleString()}</span>}
                  </div>
                  {event.resolution_note && <p className="mt-2 text-xs text-muted-foreground">Note: {event.resolution_note}</p>}
                </div>
                {!event.resolved_at && (
                  <button onClick={() => resolveMutation.mutate(event.id)} disabled={resolveMutation.isPending}
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50">
                    Mark resolved
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-5 text-xs text-muted-foreground">
        Error messages are redacted before storage. Passwords, tokens and request query strings are not intentionally recorded.
      </p>
    </PortalPage>
  );
}
