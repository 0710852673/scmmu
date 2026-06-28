import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: skills } = useQuery({
    queryKey: ["skills", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("member_skills").select("division,tier").eq("user_id", user.id);
      return data ?? [];
    },
  });

  const { data: achievements } = useQuery({
    queryKey: ["achievements", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("member_achievements")
        .select("awarded_at, achievements(name,description)")
        .eq("user_id", user.id);
      return data ?? [];
    },
  });

  return (
    <PortalPage eyebrow="Member" title="Profile">
      <div className="grid md:grid-cols-[200px_1fr] gap-10">
        <div className="aspect-square bg-muted border border-border grid place-items-center">
          {profile?.photo_url ? (
            <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display italic text-foreground/30 text-4xl">
              {profile?.full_name?.[0] ?? "M"}
            </span>
          )}
        </div>
        <div>
          <h2 className="font-display text-3xl">{profile?.full_name || "Unnamed member"}</h2>
          <p className="text-foreground/60">{user.email}</p>
          <dl className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
            <Detail label="Admission #" value={profile?.admission_number} />
            <Detail label="Grade" value={profile?.grade} />
            <Detail label="Class" value={profile?.class} />
            <Detail label="Primary division" value={profile?.primary_division} />
            <Detail label="Joined" value={profile?.join_date} />
            <Detail label="WhatsApp" value={profile?.whatsapp} />
          </dl>
        </div>
      </div>

      <h2 className="font-display text-2xl mt-16 mb-4">Skill levels</h2>
      {skills && skills.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {skills.map((s) => (
            <div key={s.division} className="border border-border p-4 bg-card">
              <div className="text-[10px] uppercase tracking-widest text-foreground/40">{s.division}</div>
              <div className="font-bold capitalize mt-1">{s.tier}</div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>No skill levels assigned yet.</Empty>
      )}

      <h2 className="font-display text-2xl mt-16 mb-4">Achievements</h2>
      {achievements && achievements.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {achievements.map((a, i) => {
            const ach = a.achievements as { name?: string; description?: string } | null;
            return (
              <div key={i} className="border border-border p-4 bg-card">
                <div className="font-bold">{ach?.name}</div>
                <div className="text-xs text-foreground/60 mt-1">{ach?.description}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>No achievements yet — keep contributing.</Empty>
      )}
    </PortalPage>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-foreground/40">{label}</dt>
      <dd className="mt-1">{value || "—"}</dd>
    </div>
  );
}
