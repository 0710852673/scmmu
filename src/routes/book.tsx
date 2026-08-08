import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { SiteShell, PageHeader } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { notifyBookingSubmitted } from "@/lib/email.functions";
import { COVERAGE_SERVICES } from "@/lib/coverage";

const SERVICES = COVERAGE_SERVICES.map((s) => s.value);

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book an Event — SCCMU" },
      { name: "description", content: "Request SCCMU coverage for school clubs, departments, teacher events or inter-school occasions." },
      { property: "og:title", content: "Book SCCMU Coverage" },
      { property: "og:description", content: "Submit an event coverage request — internal or inter-school." },
    ],
  }),
  component: Book,
});

function Book() {
  const [kind, setKind] = useState<"internal" | "inter_school">("internal");
  const [services, setServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function toggleService(s: string) {
    setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function retryEmail() {
    if (!lastBookingId) return;
    setEmailError(null);
    try {
      const res = await notifyBookingSubmitted({ data: { bookingId: lastBookingId } });
      if (res?.ok === false) throw new Error("Send failed");
      setJustSent(true);
      setTimeout(() => setDone(true), 700);
    } catch (e: any) {
      setEmailError(e?.message || "Failed to send email");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setEmailError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert({
        kind,
        event_name: String(fd.get("event_name") ?? ""),
        organization: String(fd.get("organization") ?? ""),
        contact_person: String(fd.get("contact_person") ?? ""),
        whatsapp: String(fd.get("whatsapp") ?? ""),
        email: String(fd.get("email") ?? "") || null,
        event_date: String(fd.get("event_date") ?? ""),
        event_time: String(fd.get("event_time") ?? "") || null,
        venue: String(fd.get("venue") ?? ""),
        event_type: String(fd.get("event_type") ?? ""),
        services,
        audience_size: Number(fd.get("audience_size") ?? 0) || null,
        notes: String(fd.get("notes") ?? "") || null,
      })
      .select("id")
      .single();
    if (error) {
      setSubmitting(false);
      return toast.error("Submission failed: " + error.message);
    }
    setLastBookingId(inserted?.id ?? null);
    // Await email so we can show inline failure and preserve form data on error
    try {
      if (inserted?.id) {
        const res = await notifyBookingSubmitted({ data: { bookingId: inserted.id } });
        if (res?.ok === false) throw new Error("Send failed");
      }
      setSubmitting(false);
      form.reset();
      setServices([]);
      setJustSent(true);
      toast.success("Request sent successfully");
      setTimeout(() => setDone(true), 900);
    } catch (e: any) {
      setSubmitting(false);
      setEmailError(e?.message || "Confirmation email failed to send");
      toast.error("Request saved, but email failed. You can retry below.");
    }
  }

  if (done) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="font-serif text-5xl">Request received.</h1>
          <p className="mt-6 text-foreground/70 text-lg">
            Our team will contact you through WhatsApp shortly.
          </p>
          <button
            onClick={() => { setDone(false); setJustSent(false); setServices([]); }}
            className="mt-10 border border-foreground px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
          >
            Submit another
          </button>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHeader eyebrow="Booking" title="Request coverage." intro="Tell us about the event and the services you need. We reply on WhatsApp." />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex gap-2 mb-8">
          {(["internal", "inter_school"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 px-6 py-4 text-xs font-bold uppercase tracking-widest border ${
                kind === k ? "bg-foreground text-background border-foreground" : "border-foreground/20 hover:border-foreground"
              }`}
            >
              {k === "internal" ? "Internal School Request" : "Inter-School Request"}
            </button>
          ))}
        </div>

        <p className="text-sm text-foreground/60 mb-6 italic">
          {kind === "internal"
            ? "For departments, clubs, teachers and student organisations within school."
            : "For other schools and educational organisations."}
        </p>

        <form ref={formRef} onSubmit={onSubmit} className="bg-card border border-foreground/10 p-8 space-y-5">
          <Field name="event_name" label="Event Name" required />
          <Field name="organization" label={kind === "internal" ? "Department / Club" : "School / Organisation"} required />
          <div className="grid sm:grid-cols-2 gap-5">
            <Field name="contact_person" label="Contact Person" required />
            <Field name="whatsapp" label="WhatsApp Number" required />
          </div>
          <Field name="email" label="Email (optional)" type="email" />
          <div className="grid sm:grid-cols-2 gap-5">
            <Field name="event_date" label="Date" type="date" required />
            <Field name="event_time" label="Time" type="time" />
          </div>
          <Field name="venue" label="Venue" />
          <Field name="event_type" label="Event Type" placeholder="e.g. Concert, Sports Meet, Assembly" />

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-3">
              Required Services <span className="text-accent">— select all that apply</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SERVICES.map((s) => {
                const on = services.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleService(s)}
                    className={`px-3 py-3 text-xs font-bold uppercase tracking-widest border text-left transition-colors ${
                      on ? "bg-foreground text-background border-foreground" : "border-foreground/20 hover:border-foreground"
                    }`}
                  >
                    {on ? "✓ " : ""}{s}
                  </button>
                );
              })}
            </div>
          </div>

          <Field name="audience_size" label="Audience Size" type="number" />
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Notes</label>
            <textarea name="notes" rows={4} className="w-full border border-foreground/20 bg-background p-3 text-sm focus:outline-none focus:border-foreground" />
          </div>

          <button
            disabled={submitting || services.length === 0}
            className="w-full bg-foreground text-background py-4 text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
          {justSent && !emailError && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Request sent successfully — check your email for confirmation.
            </div>
          )}
          {emailError && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              <div className="font-semibold">Failed to send confirmation email.</div>
              <div className="text-xs mt-1">Your request has been saved. {emailError}</div>
              <button type="button" onClick={retryEmail} className="mt-2 text-xs font-bold underline">Retry sending email</button>
            </div>
          )}
        </form>
      </section>
    </SiteShell>
  );
}

function Field({
  name, label, type = "text", required, placeholder,
}: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full border border-foreground/20 bg-background p-3 text-sm focus:outline-none focus:border-foreground"
      />
    </div>
  );
}
