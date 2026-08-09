import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage } from "@/components/portal/PortalUI";
import { REVIEW_CLASS, REVIEW_LABEL, REVIEWABLE_TABLES } from "@/lib/permissions";
import { dispatchNotification } from "@/lib/notify.functions";
import { Check, X, MessageSquare, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/review-queue")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    if (!(data ?? []).some((r) => ["administrator", "tic", "executive_board"].includes(r.role)))
      throw redirect({ to: "/portal" });
  },
  component: ReviewQueue,
});

type Item = {
  table: string; label: string; id: string; title: string;
  review_status: string; created_at: string; submitted_by: string | null;
  preview: string | null; note: string | null;
};

const PENDING = ["pending", "changes_requested"];

function ReviewQueue() {
  const { user } = Route.useRouteContext();
  const [filter, setFilter] = useState<string>("all");
  const [msg, setMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const out: Item[] = [];
      const [gallery, projects, announcements] = await Promise.all([
        supabase.from("gallery_items").select("id,title,image_url,review_status,created_at,submitted_by,review_note").in("review_status", PENDING),
        supabase.from("projects").select("id,title,cover_image,summary,review_status,created_at,submitted_by,review_note").in("review_status", PENDING),
        supabase.from("announcements").select("id,title,body,review_status,created_at,submitted_by,review_note").in("review_status", PENDING),
      ]);
      for (const g of gallery.data ?? []) out.push({
        table: "gallery_items", label: "Gallery media", id: g.id, title: g.title || "Untitled media",
        review_status: g.review_status, created_at: g.created_at, submitted_by: g.submitted_by,
        preview: g.image_url, note: g.review_note,
      });
      for (const p of projects.data ?? []) out.push({
        table: "projects", label: "Project", id: p.id, title: p.title,
        review_status: p.review_status, created_at: p.created_at, submitted_by: p.submitted_by,
        preview: p.cover_image, note: p.review_note,
      });
      for (const a of announcements.data ?? []) out.push({
        table: "announcements", label: "Announcement", id: a.id, title: a.title,
        review_status: a.review_status, created_at: a.created_at, submitted_by: a.submitted_by,
        preview: null, note: a.review_note,
      });
      return out.sort((x, y) => y.created_at.localeCompare(x.created_at));
    },
  });

  async function decide(item: Item, status: "approved" | "rejected" | "changes_requested") {
    let note: string | null = null;
    if (status !== "approved") {
      note = window.prompt(status === "rejected" ? "Reason for rejection" : "What needs to change?") ?? null;
      if (note === null) return;
    }
    const patch: Record<string, unknown> = {
      review_status: status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    };
    if (item.table === "projects" && status !== "approved") patch.published = false;
    const { error } = await supabase.from(item.table as never).update(patch as never).eq("id", item.id);
    if (error) { setMsg(error.message); return; }
    setMsg(`${item.title} — ${REVIEW_LABEL[status]}.`);
    await dispatchNotification({
      data: {
        trigger: status === "approved" ? "content.approved" : "content.rejected",
        title: `${item.label} ${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "needs changes"}: ${item.title}`,
        body: note ?? "Reviewed by the administrator.",
        link: "/portal/notifications",
        context: { table: item.table },
      },
    }).catch(() => null);
    q.refetch();
  }

  const items = (q.data ?? []).filter((i) => filter === "all" || i.table === filter);

  return (
    <PortalPage eyebrow="PUBLISHING" title="Content review queue">
      <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
        Nothing reaches the public site until it is approved here. Submitted gallery media, projects and announcements
        queue up in this list — approve to publish, request changes, or reject with a reason.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {[{ table: "all", label: `All (${q.data?.length ?? 0})` }, ...REVIEWABLE_TABLES.map((t) => ({
          table: t.table, label: `${t.label} (${(q.data ?? []).filter((i) => i.table === t.table).length})`,
        }))].map((t) => (
          <button key={t.table} type="button" onClick={() => setFilter(t.table)}
            className={`min-h-11 rounded-full border px-4 text-xs font-bold uppercase tracking-widest transition-colors ${
              filter === t.table ? "border-transparent brand-gradient text-white" : "border-border hover:bg-muted"}`}>
            {t.label}
          </button>
        ))}
        {msg && <span className="self-center text-xs font-semibold text-muted-foreground">{msg}</span>}
      </div>

      {q.isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading queue…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-bold">Queue is clear</p>
          <p className="mt-1 text-sm text-muted-foreground">Nothing is waiting for review right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <article key={`${i.table}-${i.id}`} className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[8rem_minmax(0,1fr)] md:p-5">
              <div className="aspect-video overflow-hidden rounded-lg bg-muted sm:aspect-square">
                {i.preview ? <img src={i.preview} alt="" className="h-full w-full object-cover" />
                  : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No preview</div>}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">{i.label}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${REVIEW_CLASS[i.review_status] ?? ""}`}>
                    {REVIEW_LABEL[i.review_status] ?? i.review_status}
                  </span>
                </div>
                <h3 className="mt-2 truncate text-lg font-bold">{i.title}</h3>
                {i.note && <p className="mt-1 text-xs text-muted-foreground">Last note: {i.note}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => decide(i, "approved")}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-xs font-bold uppercase tracking-widest text-white">
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button type="button" onClick={() => decide(i, "changes_requested")}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-xs font-bold uppercase tracking-widest hover:bg-muted">
                    <MessageSquare className="h-3.5 w-3.5" /> Request changes
                  </button>
                  <button type="button" onClick={() => decide(i, "rejected")}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-muted">
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
