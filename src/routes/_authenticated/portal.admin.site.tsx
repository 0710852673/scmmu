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
    if (!(data ?? []).some((r) => r.role === "administrator")) throw redirect({ to: "/portal" });
  },
  component: AdminSite,
});

const inputCls =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40";
const labelCls = "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground";

function AdminSite() {
  const settings = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const stats = useQuery({
    queryKey: ["admin-site-stats"],
    queryFn: async () => (await supabase.from("site_stats").select("*").eq("id", 1).maybeSingle()).data,
  });

  const [s, setS] = useState<Record<string, any>>({});
  const [st, setSt] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings.data) setS(settings.data); }, [settings.data]);
  useEffect(() => { if (stats.data) setSt(stats.data); }, [stats.data]);

  async function save() {
    setSaving(true);
    const payload = { ...s, id: 1 };
    for (const key of ["about_timeline", "about_milestones"]) {
      if (typeof payload[key] === "string") {
        try { payload[key] = JSON.parse(payload[key]); }
        catch { setSaving(false); return toast.error(`${key.replace("_", " ")} is not valid JSON.`); }
      }
    }
    const [a, b] = await Promise.all([
      supabase.from("site_settings").upsert(payload),
      supabase.from("site_stats").upsert({ ...st, id: 1 }),
    ]);
    setSaving(false);
    if (a.error || b.error) return toast.error((a.error ?? b.error)!.message);
    toast.success("Site updated.");
  }

  const T = (k: string, label: string, ph?: string) => (
    <label className="block" key={k}>
      <span className={labelCls}>{label}</span>
      <input value={s[k] ?? ""} placeholder={ph} onChange={(e) => setS((p) => ({ ...p, [k]: e.target.value }))} className={inputCls} />
    </label>
  );
  const A = (k: string, label: string, rows = 4, ph?: string) => (
    <label className="block sm:col-span-2" key={k}>
      <span className={labelCls}>{label}</span>
      <textarea rows={rows} value={typeof s[k] === "string" ? s[k] : s[k] ? JSON.stringify(s[k], null, 2) : ""}
        placeholder={ph} onChange={(e) => setS((p) => ({ ...p, [k]: e.target.value }))} className={inputCls} />
    </label>
  );
  const N = (k: string, label: string) => (
    <label className="block" key={k}>
      <span className={labelCls}>{label}</span>
      <input type="number" value={st[k] ?? 0} onChange={(e) => setSt((p) => ({ ...p, [k]: Number(e.target.value) }))} className={inputCls} />
    </label>
  );

  return (
    <PortalPage
      eyebrow="ADMINISTRATOR"
      title="SITE SETTINGS"
      action={
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      <div className="max-w-4xl space-y-8">
        <Card>
          <SectionTitle sub="The first thing visitors read on the homepage.">Hero</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("hero_eyebrow", "Eyebrow line")}
            {T("hero_cta_label", "Button label")}
            {A("hero_title", "Hero title", 2)}
            {A("hero_subtitle", "Hero subtitle", 3)}
            {T("hero_cta_href", "Button link")}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Counters shown across the public site.">Live statistics</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {N("events_covered", "Events covered")}
            {N("photos_captured", "Photos captured")}
            {N("videos_produced", "Videos produced")}
            {N("live_streams", "Live streams")}
            {N("total_members", "Total members")}
            {N("active_members", "Active members")}
            {N("projects_published", "Projects published")}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Every word on the About page.">About page</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("about_eyebrow", "Eyebrow")}
            {T("about_title", "Page title")}
            {A("about_intro", "Intro paragraph", 3)}
            {A("about_history", "History", 6)}
            {A("about_timeline", "Timeline (JSON list)", 8, '[{"year":"2015","title":"Founded","body":"…"}]')}
            {A("about_milestones", "Milestones (JSON list of text)", 6, '["Inter-School Media Excellence"]')}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Section intros used across the public pages.">Page intros</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("divisions_title", "Divisions title")}
            {A("divisions_intro", "Divisions intro", 3)}
            {A("gallery_intro", "Gallery intro", 3)}
            {A("projects_intro", "Projects intro", 3)}
            {A("leadership_intro", "Members / leadership intro", 3)}
            {A("contact_intro", "Contact intro", 3)}
            {A("footer_note", "Footer note", 2)}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Shown when a broadcast is on air.">Live stream</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("live_stream_title", "Stream title")}
            {T("live_stream_url", "Stream URL")}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={!!s.live_stream_active}
                onChange={(e) => setS((p) => ({ ...p, live_stream_active: e.target.checked }))} />
              <span className="font-semibold">We are live right now</span>
            </label>
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Footer and contact page.">Contact</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("email_address", "Gmail")}
            {T("whatsapp_number", "WhatsApp number")}
            {T("whatsapp_url", "WhatsApp chat link")}
            {T("address_line", "Address")}
            {T("mediaflow_url", "MediaFlow URL")}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Official social channels.">Social</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {T("facebook_url", "Facebook URL")}
            {T("youtube_url", "YouTube URL")}
            {T("whatsapp_channel_url", "WhatsApp channel URL")}
            {T("tiktok_url", "TikTok URL")}
          </div>
        </Card>
      </div>
    </PortalPage>
  );
}
