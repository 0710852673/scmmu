import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty } from "@/components/portal/PortalUI";

const KINDS = [
  { v: "attend_meeting", l: "Attended Meeting", p: 1 },
  { v: "participate_event", l: "Participated in Event", p: 5 },
  { v: "lead_event", l: "Led Event", p: 10 },
  { v: "upload_photo", l: "Uploaded Photo", p: 1 },
  { v: "approved_edit", l: "Edit", p: 3 },
  { v: "approved_caption", l: "Caption", p: 2 },
  { v: "publish_post", l: "Publish Post", p: 2 },
  { v: "complete_task", l: "Completed Task", p: 2 },
  { v: "stream_op", l: "Stream Operation", p: 5 },
  { v: "camera_op", l: "Camera Operation", p: 3 },
  { v: "technical_task", l: "Technical Task", p: 2 },
] as const;

export const Route = createFileRoute("/_authenticated/portal/contributions")({
  component: ContributionsPage,
});

function ContributionsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: mine } = useQuery({
    queryKey: ["contribs", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("contributions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("contributions").insert({
      user_id: user.id,
      kind: fd.get("kind") as "attend_meeting",
      note: String(fd.get("note") ?? "") || null,
      evidence_url: String(fd.get("evidence_url") ?? "").trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Logged — pending head approval");
    qc.invalidateQueries({ queryKey: ["contribs", user.id] });
    (e.target as HTMLFormElement).reset();
    setOpen(false);
  }

  return (
    <PortalPage
      title="Contributions"
      action={
        <button onClick={() => setOpen((v) => !v)} className="bg-foreground text-background px-5 py-2 text-xs font-bold uppercase tracking-widest">
          Log contribution
        </button>
      }
    >
      <p className="text-sm text-foreground/60 mb-6">
        Every contribution requires head approval before points are awarded. This prevents spam and keeps the rankings fair.
      </p>

      {open && (
        <form onSubmit={submit} className="bg-card border border-border p-6 mb-8 space-y-4 max-w-xl">
          <select name="kind" className="w-full border border-border p-3 text-sm bg-background" required>
            {KINDS.map((k) => (
              <option key={k.v} value={k.v}>{k.l} (+{k.p} pts)</option>
            ))}
          </select>
          <textarea name="note" placeholder="Details (event, what you did)" rows={3} className="w-full border border-border p-3 text-sm" />
          <input name="evidence_url" type="url" placeholder="Evidence link (Drive, published post, gallery, etc.)" className="w-full border border-border bg-background p-3 text-sm" />
          <button className="bg-foreground text-background px-6 py-3 text-xs font-bold uppercase tracking-widest">Submit</button>
        </form>
      )}

      {mine && mine.length > 0 ? (
        <ul className="space-y-2">
          {mine.map((c) => (
            <li key={c.id} className="border border-border p-4 bg-card flex justify-between items-center flex-wrap gap-3">
              <div>
                <div className="font-bold capitalize">{c.kind.replace(/_/g, " ")}</div>
                <div className="text-xs text-foreground/60 mt-1">{c.note || "—"} · {new Date(c.created_at).toLocaleDateString()}</div>
                {c.evidence_url && <a href={c.evidence_url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs font-semibold text-brand hover:underline">View evidence</a>}
                {c.review_note && <div className="mt-2 text-xs"><strong>Reviewer note:</strong> {c.review_note}</div>}
              </div>
              <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 border ${
                c.status === "approved" ? "border-brand text-brand" :
                c.status === "rejected" ? "border-destructive text-destructive" :
                "border-border"
              }`}>{c.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No contributions logged yet.</Empty>
      )}
    </PortalPage>
  );
}
