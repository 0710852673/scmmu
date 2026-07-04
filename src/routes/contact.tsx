import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Facebook, Youtube, MessageCircle, CheckCircle2 } from "lucide-react";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { getSiteSettings } from "@/lib/public-data.functions";
import { notifyContactMessage } from "@/lib/email.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SCCMU" },
      { name: "description", content: "Reach SCCMU on WhatsApp, email and social media." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const s = settings.data;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
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
    setSending(false);
    if (error) return toast.error("Couldn't send. " + error.message);
    if (inserted?.id) {
      notifyContactMessage({ data: { messageId: inserted.id } }).catch(() => {});
    }
    toast.success("Message sent. We'll be in touch soon.");
    form.reset();
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  }

  return (
    <SiteShell>
      <PageHeader eyebrow="Reach the unit" title="Contact." intro="Quickest reply via WhatsApp. Anything formal — drop us an email." />
      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-8 grid md:grid-cols-2 gap-12 lg:gap-16">
        <div className="space-y-8">
          <ContactRow icon={Phone} label="WhatsApp"
            value={s?.whatsapp_number ?? "+94 70 5951050"}
            href={s?.whatsapp_url ?? "https://wa.me/94705951050"} accent />
          <ContactRow icon={Mail} label="Email"
            value={s?.email_address ?? "mediaunit.scc@gmail.com"}
            href={`mailto:${s?.email_address ?? "mediaunit.scc@gmail.com"}`} />
          <ContactRow icon={MapPin} label="Address"
            value={s?.address_line ?? "Media Unit, Sivali Central College, Ratnapura"} />

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-3">Follow the unit</div>
            <div className="flex gap-2">
              {[
                { Icon: Facebook, href: s?.facebook_url, label: "Facebook" },
                { Icon: Youtube, href: s?.youtube_url, label: "YouTube" },
                { Icon: MessageCircle, href: s?.whatsapp_channel_url, label: "WhatsApp Channel" },
              ].map(({ Icon, href, label }) => (
                <a key={label} href={href ?? "#"} target="_blank" rel="noopener noreferrer" aria-label={label}
                   className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card hover:bg-foreground hover:text-background transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
              <a href={s?.tiktok_url ?? "#"} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                 className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card hover:bg-foreground hover:text-background transition-colors text-xs font-bold">
                TT
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-8">
          <h2 className="text-2xl font-extrabold tracking-tight">Send a message</h2>
          <p className="text-sm text-muted-foreground -mt-2 mb-4">We reply within 48 hours.</p>
          <Field name="name" label="Your name" required />
          <Field name="email" label="Email" type="email" />
          <Field name="whatsapp" label="WhatsApp" />
          <Field name="subject" label="Subject" />
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">Message</label>
            <textarea name="message" required rows={5}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
          </div>
          <button disabled={sending}
            className="w-full rounded-full brand-gradient py-3.5 text-sm font-semibold text-white hover:opacity-95 transition-opacity disabled:opacity-50">
            {sending ? "Sending…" : "Send message"}
          </button>
          {sent && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Message sent successfully — confirmation email on its way.
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
    <div className="flex items-start gap-4">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accent ? "brand-gradient text-white" : "bg-muted text-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">{inner}</a> : inner;
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">{label}</label>
      <input name={name} type={type} required={required}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
    </div>
  );
}
