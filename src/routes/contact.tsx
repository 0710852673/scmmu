import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SCCMU" },
      { name: "description", content: "Reach SCCMU on WhatsApp, email, social and through our contact form." },
      { property: "og:title", content: "Contact SCCMU" },
      { property: "og:description", content: "Get in touch with the SCCMU team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("contact_messages").insert({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      whatsapp: String(fd.get("whatsapp") ?? ""),
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
    });
    setSending(false);
    if (error) return toast.error("Couldn't send. " + error.message);
    toast.success("Message sent. We'll be in touch on WhatsApp.");
    (e.currentTarget as HTMLFormElement).reset();
  }

  return (
    <SiteShell>
      <PageHeader eyebrow="Reach the unit" title="Contact." intro="Quickest reply via WhatsApp. Anything formal — drop us an email." />
      <section className="mx-auto max-w-7xl px-6 py-20 grid md:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-foreground/40">WhatsApp</div>
            <a href="#" className="font-serif text-3xl italic text-accent">Chat with SCCMU</a>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-foreground/40">Email</div>
            <a href="mailto:hello@sccmu.lk" className="text-xl">hello@sccmu.lk</a>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-foreground/40">Address</div>
            <p className="text-foreground/70">Student Council Media Unit, Sri Lanka</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-3">Social</div>
            <div className="flex gap-3">
              {["Facebook", "WhatsApp Channel", "TikTok", "YouTube"].map((s) => (
                <a key={s} href="#" className="border border-foreground/20 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors">
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 bg-card border border-foreground/10 p-8">
          <h2 className="font-serif text-2xl mb-4">Send a message</h2>
          <Field name="name" label="Your name" required />
          <Field name="email" label="Email" type="email" />
          <Field name="whatsapp" label="WhatsApp" />
          <Field name="subject" label="Subject" />
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Message</label>
            <textarea name="message" required rows={5} className="w-full border border-foreground/20 bg-background p-3 text-sm focus:outline-none focus:border-foreground" />
          </div>
          <button disabled={sending} className="bg-foreground text-background w-full py-4 text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-50">
            {sending ? "Sending…" : "Send Message"}
          </button>
        </form>
      </section>
    </SiteShell>
  );
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full border border-foreground/20 bg-background p-3 text-sm focus:outline-none focus:border-foreground"
      />
    </div>
  );
}
