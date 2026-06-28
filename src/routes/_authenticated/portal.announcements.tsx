import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/announcements")({
  component: Announcements,
});

function Announcements() {
  const { data } = useQuery({
    queryKey: ["all-announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <PortalPage title="Announcements">
      {data && data.length > 0 ? (
        <ul className="space-y-4">
          {data.map((a) => (
            <li key={a.id} className="border border-border p-6 bg-card">
              {a.pinned && <div className="text-[10px] uppercase tracking-widest text-brand font-bold mb-2">Pinned</div>}
              <h3 className="font-display text-xl">{a.title}</h3>
              <div className="text-xs text-foreground/40 mt-1">{new Date(a.created_at).toLocaleString()}</div>
              <p className="mt-3 text-foreground/80 whitespace-pre-line">{a.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No announcements yet.</Empty>
      )}
    </PortalPage>
  );
}
