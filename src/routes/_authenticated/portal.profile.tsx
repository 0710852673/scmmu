import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Empty, Card } from "@/components/portal/PortalUI";
import { Mail, Phone, GraduationCap, Users, Calendar, IdCard } from "lucide-react";

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

  const { data: roles } = useQuery({
    queryKey: ["my-roles", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data ?? []).map((r) => r.role as string);
    },
  });
  const isTic = roles?.includes("tic");
  const isAdmin = roles?.includes("administrator");
  const isElite = isTic || isAdmin || roles?.some((r) => ["section_head", "executive_board"].includes(r));

  const { data: skills } = useQuery({
    queryKey: ["skills", user.id],
    enabled: !isTic,
    queryFn: async () => {
      const { data } = await supabase.from("member_skills").select("division,tier").eq("user_id", user.id);
      return data ?? [];
    },
  });

  const { data: achievements } = useQuery({
    queryKey: ["achievements", user.id],
    enabled: !isTic,
    queryFn: async () => {
      const { data } = await supabase
        .from("member_achievements")
        .select("awarded_at, achievements(name,description)")
        .eq("user_id", user.id);
      return data ?? [];
    },
  });

  const initials = (profile?.full_name || user.email || "?")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <PortalPage eyebrow={isTic ? "Teacher In Charge" : isAdmin ? "Administrator" : isElite ? "Elite Board" : "Member"} title="My Profile">
      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        {/* IDENTITY CARD */}
        <Card className="p-0 overflow-hidden">
          <div className="aspect-square bg-muted grid place-items-center overflow-hidden">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt={profile?.full_name ?? ""} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center brand-gradient text-white font-display text-6xl font-extrabold">
                {initials}
              </div>
            )}
          </div>
          <div className="p-5">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">{profile?.full_name || "Unnamed"}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            {!isTic && profile?.admission_number && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand/10 text-brand px-3 py-1 text-[11px] font-bold tracking-widest">
                <IdCard className="h-3.5 w-3.5" /> {profile.admission_number}
              </div>
            )}
            {profile?.bio && <p className="mt-4 text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>}
          </div>
        </Card>

        {/* DETAILS */}
        <div className="space-y-6">
          <Card>
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4">Details</h3>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">
              <Detail icon={Mail} label="Gmail" value={user.email} />
              <Detail icon={Phone} label="WhatsApp" value={profile?.whatsapp} />
              <Detail icon={GraduationCap} label="Grade" value={profile?.grade} />
              <Detail icon={Users} label="Class" value={profile?.class} />
              <Detail icon={Users} label="Primary division" value={profile?.primary_division} />
              <Detail icon={Calendar} label="Joined" value={profile?.join_date} />
            </dl>
          </Card>

          {!isTic && (
            <>
              <Card>
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4">Skill levels</h3>
                {skills && skills.length > 0 ? (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {skills.map((s) => (
                      <div key={s.division} className="rounded-xl border border-border p-4 bg-background">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.division}</div>
                        <div className="font-bold capitalize mt-1">{s.tier}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty>No skill levels assigned yet.</Empty>
                )}
              </Card>

              <Card>
                <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4">Achievements</h3>
                {achievements && achievements.length > 0 ? (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {achievements.map((a, i) => {
                      const ach = a.achievements as { name?: string; description?: string } | null;
                      return (
                        <div key={i} className="rounded-xl border border-border p-4 bg-background">
                          <div className="font-bold">{ach?.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{ach?.description}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty>No achievements yet — keep contributing.</Empty>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </PortalPage>
  );
}

function Detail({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-brand shrink-0" />
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 truncate">{value || "—"}</dd>
      </div>
    </div>
  );
}
