import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, Inbox, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { listContributionQueue, reviewContribution } from "@/lib/performance.functions";
import { PortalPage, Empty } from "@/components/portal/PortalUI";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/portal/admin/verification")({
  head: () => ({
    meta: [
      { title: "Contribution Verification — SCCMU" },
      { name: "description", content: "Review SCCMU member contribution evidence." },
      { property: "og:title", content: "Contribution Verification — SCCMU" },
      { property: "og:description", content: "Review SCCMU member contribution evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerificationQueue,
});

function VerificationQueue() {
  const queryClient = useQueryClient();
  const fetchQueue = useServerFn(listContributionQueue);
  const review = useServerFn(reviewContribution);
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["contribution-verification", status],
    queryFn: () => fetchQueue({ data: { status } }),
  });

  async function decide(id: string, next: "approved" | "rejected" | "pending") {
    const note = notes[id]?.trim() || null;
    if (next === "rejected" && !note) return toast.error("Add a reviewer note before rejecting.");
    setBusyId(id);
    try {
      await review({ data: { id, status: next, review_note: note } });
      toast.success(next === "approved" ? "Contribution approved" : next === "rejected" ? "Contribution rejected" : "Contribution reopened");
      await queryClient.invalidateQueries({ queryKey: ["contribution-verification"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PortalPage eyebrow="WAVE 3 · VERIFICATION" title="Contribution verification">
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Contribution status">
        {["pending", "approved", "rejected", "all"].map((item) => (
          <Button key={item} type="button" variant={status === item ? "default" : "outline"} onClick={() => setStatus(item)} className="capitalize">{item}</Button>
        ))}
      </div>
      {query.isLoading ? <Empty>Loading verification queue…</Empty> : !query.data?.length ? (
        <Empty><Inbox className="mx-auto mb-3 h-7 w-7" />Nothing in this queue.</Empty>
      ) : (
        <div className="space-y-3">
          {query.data.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-card p-4 md:p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    {item.member?.photo_url ? <img src={item.member.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="h-11 w-11 rounded-full bg-muted" />}
                    <div className="min-w-0">
                      <h2 className="truncate font-bold">{item.member?.full_name ?? "Unknown member"}</h2>
                      <p className="text-xs text-muted-foreground">{item.member?.admission_number ?? "No MU number"} · {item.member?.primary_division?.replace(/_/g, " ") ?? "No division"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold capitalize">{item.kind.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">{item.rule?.points ?? 0} points · {new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-3 text-sm text-foreground/80">{item.note || "No details supplied."}</p>
                  {item.evidence_url ? (
                    <a href={item.evidence_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                      <ExternalLink className="h-4 w-4" /> Open submitted evidence
                    </a>
                  ) : <p className="mt-3 text-xs font-semibold text-amber-600">No evidence link supplied.</p>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reviewer note
                    <textarea value={notes[item.id] ?? item.review_note ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} rows={3} placeholder="Explain the decision or request clarification…" className="mt-2 w-full rounded-md border border-border bg-background p-3 text-sm font-normal normal-case tracking-normal" />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" disabled={busyId === item.id} onClick={() => decide(item.id, "approved")}><Check /> Approve</Button>
                    <Button type="button" variant="destructive" disabled={busyId === item.id} onClick={() => decide(item.id, "rejected")}><X /> Reject</Button>
                    {item.status !== "pending" && <Button type="button" variant="outline" disabled={busyId === item.id} onClick={() => decide(item.id, "pending")}><RotateCcw /> Reopen</Button>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PortalPage>
  );
}