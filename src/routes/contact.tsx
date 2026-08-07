import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { FacebookIcon, YoutubeIcon, WhatsappIcon, TiktokIcon } from "@/components/site/SocialIcons";
import { supabase } from "@/integrations/supabase/client";
import { getSiteSettings } from "@/lib/public-data.functions";
import { notifyContactMessage } from "@/lib/email.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Sivali Central College Media Unit" },
      { name: "description", content: "Reach the SCC Media Unit on WhatsApp, Gmail and our official social channels." },
      { property: "og:title", content: "Contact SCC Media Unit" },
      { property: "og:description", content: "WhatsApp, Gmail and social channels for the Sivali Central College Media Unit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const s = settings.data;

  const whatsapp = s?.whatsapp_number ?? "+94 70 5951050";
  const whatsappUrl = s?.whatsapp_url ?? "https://wa.me/94705951050";
  const gmail = s?.email_address ?? "mediaunit.scc@gmail.com";
  const address = s?.address_line ?? "Media Unit, Sivali Central College, Ratnapura";

  async function retryEmail() {
    if (!lastMessageId) return;
    setEmailError(null);
    try {
      const res = await notifyContactMessage({ data: { messageId: lastMessageId } });
      if (res?.ok === false) throw new Error("Send failed");
      setSent(true);
    } catch (e: any) {
      setEmailError(e?.message || "Failed to send");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setEmailError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { data: inserted, error } = await supabase
      .from("contact_messages")
      .insert({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        whatsapp: String(fd.get("whatsapp") ?? ""),
        subject: String(fd.get("subject") ?? ""),
        message: String(fd.get("message") ?? ""),
      })
      .select("id")
      .single();
    if (error) {
      setSending(false);
      return toast.error("Couldn't send. " + error.message);
    }
    setLastMessageId(inserted?.id ?? null);
    try {
      if (inserted?.id) {
        const res = await notifyContactMessage({ data: { messageId: inserted.id } });
        if (res?.ok === false) throw new Error("Send failed");
      }
      setSending(false);
      toast.success("Message sent. We'll be in touch soon.");
      form.reset();
      setSent(true);
      setTimeout(() => setSent(false), 6000);
    } catch (e: any) {
      setSending(false);
      setEmailError(e?.message || "Confirmation email failed");
      toast.error("Message saved, but the confirmation email failed. You can retry.");
    }
  }

  const socials = [
    { Icon: FacebookIcon, href: s?.facebook_url ?? "https://facebook.com/Sivali", label: "Facebook" },
    { Icon: YoutubeIcon, href: s?.youtube_url ?? "https://youtube.com/@Sivali_Central_College", label: "YouTube" },
    { Icon: WhatsappIcon, href: s?.whatsapp_channel_url ?? "https://whatsapp.com/channel/0029Val4k7w8V0tw1ipUEs3m", label: "WhatsApp Channel" },
    { Icon: TiktokIcon, href: s?.tiktok_url ?? "https://tiktok.com/@sccmu25", label: "TikTok" },
  ];

  return (
    <SiteShell>
      <PageHeader
        eyebrow="REACH THE UNIT"
        title="CONTACT."
        intro={s?.contact_intro ?? "Quickest reply is on WhatsApp. Anything formal — send us a Gmail. We answer within 48 hours."}
      />
      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 md:grid-cols-2 md:px-8 lg:gap-16">
        <div className="space-y-4">
          <ContactRow icon={Phone} label="WhatsApp" value={whatsapp} href={whatsappUrl} accent />
          <ContactRow icon={Mail} label="Gmail" value={gmail} href={`mailto:${gmail}`} />
          <ContactRow icon={MapPin} label="Address" value={address} />

          <div className="pt-6">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">FOLLOW THE UNIT</div>
            <div className="flex flex-wrap gap-2.5">
              {socials.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-foreground hover:text-background">
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold uppercase tracking-tight">Send a message</h2>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">We reply within 48 hours.</p>
          <Field name="name" label="Your name" required />
          <Field name="email" label="Gmail" type="email" required />
          <Field name="whatsapp" label="WhatsApp" />
          <Field name="subject" label="Subject" />
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Message</label>
            <textarea name="message" required rows={5}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
          </div>
          <button disabled={sending}
            className="w-full rounded-full brand-gradient py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50">
            {sending ? "Sending…" : "Send message"}
          </button>
          {sent && !emailError && (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Message sent — confirmation Gmail on its way.
            </div>
          )}
          {emailError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <div className="font-semibold">Failed to send the confirmation Gmail.</div>
              <div className="mt-1 text-xs">Your message has been saved. {emailError}</div>
              <button type="button" onClick={retryEmail} className="mt-2 text-xs font-bold underline">Retry</button>
            </div>
          )}
        </form>
      </section>
    </SiteShell>
  );
}

function ContactRow({ icon: Icon, label, value, href, accent }: {
  icon: typeof Mail; label: string; value: string; href?: string; accent?: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent ? "brand-gradient text-white" : "bg-muted text-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <div className="mt-0.5 break-words text-base font-semibold leading-snug sm:text-lg">{value}</div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block transition-colors hover:border-brand/40">{inner}</a>
  ) : inner;
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</label>
      <input name={name} type={type} required={required}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
    </div>
  );
}
