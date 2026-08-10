import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, Empty } from "@/components/portal/PortalUI";
import { Megaphone, Plus, Trash2, X, Pin } from "lucide-react";
import { usePublishRights, reviewFields, notifySubmitted } from "@/lib/review";
import { REVIEW_CLASS, REVIEW_LABEL } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/portal/announcements")({
  component: Announcements,
});

function Announcements() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { roles, canPublish } = usePublishRights(user.id);
  const canPost = roles.some((r) => ["administrator", "tic", "section_head", "executive_board"].includes(r));

  const { data } = useQuery({
    queryKey: ["all-announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements")
        .select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function del(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["all-announcements"] });
  }

  return (
    <PortalPage
      eyebrow={canPost ? "STAFF" : "MEMBER"}
      title="Announcements"
      action={canPost && (
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> New announcement
        </button>
      )}
    >
      {data && data.length > 0 ? (
        <ul className="space-y-4 max-w-3xl">
          {data.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {a.pinned && (
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-brand font-bold mb-2">
                      <Pin className="h-3 w-3" /> Pinned
                    </div>
                  )}
                  <h3 className="font-display text-xl font-bold">{a.title}</h3>
                  {a.review_status !== "approved" && (
                    <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${REVIEW_CLASS[a.review_status] ?? ""}`}>
                      {REVIEW_LABEL[a.review_status] ?? a.review_status}
                    </span>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                {canPost && (
                  <button onClick={() => del(a.id)} aria-label="Delete"
                    className="text-destructive hover:bg-destructive/10 rounded-md p-2">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-3 text-foreground/80 whitespace-pre-line">{a.body}</p>
            </Card>
          ))}
        </ul>
      ) : (
        <Empty>
          <Megaphone className="mx-auto mb-3 h-6 w-6 text-brand/70" />
          No announcements yet.
        </Empty>
      )}

      {open && <NewModal onClose={() => setOpen(false)} authorId={user.id} canPublish={canPublish} />}
    </PortalPage>
  );
}

function NewModal({ onClose, authorId, canPublish }: { onClose: () => void; authorId: string; canPublish: boolean }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("announcements").insert({
      title, body, pinned, author_id: authorId, ...reviewFields(canPublish, authorId),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    if (canPublish) toast.success("Announcement published");
    else { toast.success("Sent for review"); await notifySubmitted("Announcement", title); }
    qc.invalidateQueries({ queryKey: ["all-announcements"] });
    qc.invalidateQueries({ queryKey: ["recent-announcements"] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-display text-lg font-bold">NEW ANNOUNCEMENT</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Title *</div>
            <input required value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Body *</div>
            <textarea required rows={5} value={body} onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          {!canPublish && (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Your announcement goes to the review queue. It appears on the public site once an administrator approves it.
            </p>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to top
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-full brand-gradient px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : canPublish ? "Publish" : "Submit for review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
