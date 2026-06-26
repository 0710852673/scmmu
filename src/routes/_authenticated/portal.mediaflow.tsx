import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty } from "@/components/portal/PortalUI";

const STATUS_COLS = ["uploaded", "editing", "edited", "caption_writing", "review", "approved", "published"] as const;

export const Route = createFileRoute("/_authenticated/portal/mediaflow")({
  component: MediaFlow,
});

function MediaFlow() {
  const { data } = useQuery({
    queryKey: ["media-items"],
    queryFn: async () => {
      const { data } = await supabase.from("media_items").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const items = data ?? [];

  return (
    <PortalPage title="MediaFlow" eyebrow="Capture → Publish">
      <p className="text-sm text-foreground/60 mb-8">
        Track every production from upload through editing, caption writing, review and publish.
      </p>

      {items.length === 0 ? (
        <Empty>No media items yet.</Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto">
          {STATUS_COLS.map((s) => {
            const col = items.filter((i) => i.status === s);
            return (
              <div key={s} className="bg-muted/40 border border-foreground/10 p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-3 px-2 capitalize">
                  {s.replace(/_/g, " ")} · {col.length}
                </div>
                <div className="space-y-2">
                  {col.map((i) => (
                    <div key={i.id} className="bg-card border border-foreground/10 p-3 text-sm">
                      <div className="font-bold truncate">{i.title}</div>
                      <div className="text-xs text-foreground/50 mt-1">{new Date(i.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PortalPage>
  );
}
