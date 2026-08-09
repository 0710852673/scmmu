import { createServerFn } from "@tanstack/react-start";
import { NOTIFICATION_TRIGGERS } from "@/lib/permissions";

type DispatchInput = {
  trigger: string;
  title: string;
  body?: string | null;
  link?: string | null;
  /** Free-form facts used to evaluate rule conditions (e.g. { services: [...], priority: "high" }). */
  context?: Record<string, unknown>;
};

const VALID = new Set(NOTIFICATION_TRIGGERS.map((t) => t.key as string));

function matches(conditions: Record<string, unknown>, ctx: Record<string, unknown>) {
  const svc = conditions["service_contains"];
  if (typeof svc === "string" && svc.trim()) {
    const services = (ctx["services"] as string[] | undefined) ?? [];
    if (!services.some((s) => s.toLowerCase() === svc.toLowerCase())) return false;
  }
  const pr = conditions["priority_is"];
  if (typeof pr === "string" && pr.trim() && pr !== "any") {
    if (String(ctx["priority"] ?? "") !== pr) return false;
  }
  const kw = conditions["text_contains"];
  if (typeof kw === "string" && kw.trim()) {
    const hay = JSON.stringify(ctx).toLowerCase();
    if (!hay.includes(kw.toLowerCase())) return false;
  }
  return true;
}

/**
 * Runs every active notification rule for a trigger: resolves recipients from
 * roles / divisions / explicit users, writes portal notifications and, when the
 * rule says so, sends an email. Email is reserved for action-required rules.
 */
export const dispatchNotification = createServerFn({ method: "POST" })
  .inputValidator((d: DispatchInput) => d)
  .handler(async ({ data }) => {
    if (!VALID.has(data.trigger)) return { delivered: 0, emails: 0, error: "Unknown trigger" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ctx = data.context ?? {};

    const { data: rules } = await supabaseAdmin
      .from("notification_rules")
      .select("*")
      .eq("trigger_key", data.trigger)
      .eq("active", true);

    const portalUsers = new Map<string, string>(); // userId -> priority
    const emailUsers = new Set<string>();

    for (const rule of rules ?? []) {
      if (!matches((rule.conditions ?? {}) as Record<string, unknown>, ctx)) continue;

      const ids = new Set<string>((rule.recipient_user_ids ?? []) as string[]);
      const roles = (rule.recipient_roles ?? []) as string[];
      if (roles.length) {
        let q = supabaseAdmin.from("user_roles").select("user_id,role,division").in("role", roles as never[]);
        const { data: rows } = await q;
        const divs = (rule.recipient_divisions ?? []) as string[];
        for (const r of rows ?? []) {
          if (divs.length && r.division && !divs.includes(r.division)) continue;
          if (divs.length && !r.division && r.role === "section_head") continue;
          ids.add(r.user_id);
        }
      }

      for (const id of ids) {
        if (rule.deliver_portal) portalUsers.set(id, rule.priority ?? "normal");
        if (rule.deliver_email) emailUsers.add(id);
      }
    }

    let delivered = 0;
    if (portalUsers.size) {
      const rows = [...portalUsers.entries()].map(([user_id, priority]) => ({
        user_id,
        title: data.title,
        body: data.body ?? null,
        kind: data.trigger,
        link: data.link ?? null,
        priority,
      }));
      const { error } = await supabaseAdmin.from("notifications").insert(rows);
      if (!error) delivered = rows.length;
    }

    let emails = 0;
    if (emailUsers.size) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id,email,full_name")
        .in("id", [...emailUsers]);
      const { sendMail, wrapHtml } = await import("@/lib/mail.server");
      for (const p of profs ?? []) {
        if (!p.email) continue;
        try {
          await sendMail({
            to: p.email,
            subject: data.title,
            html: wrapHtml(
              data.title,
              `<p>Hi ${p.full_name || "there"},</p><p>${data.body ?? ""}</p>` +
                (data.link ? `<p><a href="${data.link}">Open in the member portal</a></p>` : ""),
            ),
          });
          emails++;
        } catch {
          /* email is best-effort; the portal notification already landed */
        }
      }
    }

    return { delivered, emails, error: null as string | null };
  });
