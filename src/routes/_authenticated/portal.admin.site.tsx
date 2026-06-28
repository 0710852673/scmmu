import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card, SectionTitle } from "@/components/portal/PortalUI";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/admin/site")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    const isAdmin = (data ?? []).some((r) => r.role === "administrator");
    if (!isAdmin) throw redirect({ to: "/portal" });
  },
  component: AdminSite,
});

const Field = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="block">
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
    <input {...props} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
  </label>
);

const NumField = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="block">
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
    <input type="number" {...props} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
  </label>
);

function AdminSite() {
  const settings = useQuery({ queryKey: ["admin-site-settings"], queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data });
  const stats = useQuery({ queryKey: ["admin-site-stats"], queryFn: async () => (await supabase.from("site_stats").select("*").eq("id", 1).maybeSingle()).data });

  const [s, setS] = useState<Record<string, unknown>>({});
  const [st, setSt] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings.data) setS(settings.data); }, [settings.data]);
  useEffect(() => { if (stats.data) setSt(stats.data); }, [stats.data]);

  async function save() {
    setSaving(true);
    const [a, b] = await Promise.all([
      supabase.from("site_settings").upsert({ ...s, id: 1 }),
      supabase.from("site_stats").upsert({ ...st, id: 1 }),
    ]);
    setSaving(false);
    if (a.error || b.error) return toast.error((a.error ?? b.error)!.message);
    toast.success("Site updated. Refresh public site to see changes.");
  }

  const u = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setS((p) => ({ ...p, [k]: e.target.value }));
  const un = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setSt((p) => ({ ...p, [k]: Number(e.target.value) }));

  return (
    <PortalPage
      eyebrow="Administrator"
      title="Site settings"
      action={
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 transition-opacity">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      <div className="space-y-8 max-w-4xl">
        <Card>
          <SectionTitle sub="The headline and pitch on the homepage.">Hero</SectionTitle>
          <div className="space-y-4">
            <Field label="Hero title" value={(s.hero_title as string) ?? ""} onChange={u("hero_title")} />
            <Field label="Hero subtitle" value={(s.hero_subtitle as string) ?? ""} onChange={u("hero_subtitle")} />
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Shown on the stats strip and across the site.">Live statistics</SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <NumField label="Events covered" value={(st.events_covered as number) ?? 0} onChange={un("events_covered")} />
            <NumField label="Photos captured" value={(st.photos_captured as number) ?? 0} onChange={un("photos_captured")} />
            <NumField label="Videos produced" value={(st.videos_produced as number) ?? 0} onChange={un("videos_produced")} />
            <NumField label="Live streams" value={(st.live_streams as number) ?? 0} onChange={un("live_streams")} />
            <NumField label="Total members" value={(st.total_members as number) ?? 0} onChange={un("total_members")} />
            <NumField label="Active members" value={(st.active_members as number) ?? 0} onChange={un("active_members")} />
            <NumField label="Projects published" value={(st.projects_published as number) ?? 0} onChange={un("projects_published")} />
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Footer + contact page.">Contact</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Contact email" value={(s.contact_email as string) ?? ""} onChange={u("contact_email")} />
            <Field label="WhatsApp number" value={(s.contact_whatsapp as string) ?? ""} onChange={u("contact_whatsapp")} />
            <Field label="Address" value={(s.contact_address as string) ?? ""} onChange={u("contact_address")} />
            <Field label="MediaFlow URL" value={(s.mediaflow_url as string) ?? ""} onChange={u("mediaflow_url")} />
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Public social handles.">Social</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Facebook URL" value={(s.facebook_url as string) ?? ""} onChange={u("facebook_url")} />
            <Field label="YouTube URL" value={(s.youtube_url as string) ?? ""} onChange={u("youtube_url")} />
            <Field label="WhatsApp channel URL" value={(s.whatsapp_channel as string) ?? ""} onChange={u("whatsapp_channel")} />
            <Field label="TikTok URL" value={(s.tiktok_url as string) ?? ""} onChange={u("tiktok_url")} />
          </div>
        </Card>
      </div>
    </PortalPage>
  );
}
