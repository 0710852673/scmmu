import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PortalPage, Card } from "@/components/portal/PortalUI";

export const Route = createFileRoute("/_authenticated/portal/admin/email-templates")({
  component: EmailTemplates,
});

const PLACEHOLDERS: Record<string, string[]> = {
  booking_submitted: ["contact_person", "event_name", "event_date", "venue", "details_table"],
  booking_confirmed: ["contact_person", "event_name", "event_date", "venue"],
  booking_rejected: ["contact_person", "event_name", "reason"],
  booking_completed: ["contact_person", "event_name"],
  booking_contacted: ["contact_person", "event_name"],
  contact_confirmation: ["name", "subject", "message"],
  staff_notification: ["event_name", "details_table"],
};

function EmailTemplates() {
  const qc = useQueryClient();
  const { data: templates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("email_templates").select("*").order("key");
      return data ?? [];
    },
  });
  const [active, setActive] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!active && templates?.length) setActive(templates[0].key);
  }, [templates, active]);

  useEffect(() => {
    const t = templates?.find((x) => x.key === active);
    if (t) { setSubject(t.subject); setBody(t.body_html); }
  }, [active, templates]);

  async function save() {
    if (!active) return;
    const { error } = await supabase.from("email_templates")
      .update({ subject, body_html: body }).eq("key", active);
    if (error) return toast.error(error.message);
    toast.success("Template saved — future emails use this");
    qc.invalidateQueries({ queryKey: ["email-templates"] });
  }

  const t = templates?.find((x) => x.key === active);
  const placeholders = active ? PLACEHOLDERS[active] ?? [] : [];

  return (
    <PortalPage eyebrow="ADMIN" title="Email templates">
      <p className="text-sm text-muted-foreground -mt-4 mb-6 max-w-2xl">
        Edit the subject line and HTML body of every automated email. Emails still send automatically after edits — use placeholders like <code className="bg-muted px-1 rounded">{"{{event_name}}"}</code> to insert live data. The SCCMU header, contact footer and social links are added automatically.
      </p>
      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <div className="space-y-1">
          {templates?.map((tp) => (
            <button key={tp.key} onClick={() => setActive(tp.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${active === tp.key ? "bg-foreground text-background" : "hover:bg-muted"}`}>
              {tp.label}
            </button>
          ))}
        </div>
        {t && (
          <Card>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Body (HTML allowed)</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14}
                  className="w-full rounded-lg border border-border bg-background p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand/40" />
              </div>
              {placeholders.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <div className="font-semibold mb-1">Available placeholders:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {placeholders.map((p) => (
                      <code key={p} className="bg-muted px-2 py-0.5 rounded">{`{{${p}}}`}</code>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={save} className="rounded-full bg-foreground text-background px-5 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90">Save template</button>
                <button onClick={() => { setSubject(t.subject); setBody(t.body_html); }} className="rounded-full border border-border px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-muted">Reset</button>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-6">Preview</div>
                <div className="rounded-lg border border-border p-4 bg-white text-black" dangerouslySetInnerHTML={{ __html: body }} />
              </div>
            </div>
          </Card>
        )}
      </div>
    </PortalPage>
  );
}
