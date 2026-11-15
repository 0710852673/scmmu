import { createServerFn } from "@tanstack/react-start";
import { NOTIFICATION_TRIGGERS } from "@/lib/permissions";

type DispatchInput = {
  trigger: string;
  title: string;
  body?: string | null;
  link?: string | null;
  /** Free-form facts used to evaluate rule conditions. */
  context?: Record<string, unknown>;
};

const VALID = new Set(NOTIFICATION_TRIGGERS.map((t) => t.key as string));
const CONTENT_SUBMISSION_TABLES = ["projects", "gallery_items", "announcements"] as const;
export type ContentSubmissionTable = (typeof CONTENT_SUBMISSION_TABLES)[number];

const CONTENT_LABELS: Record<ContentSubmissionTable, string> = {
  projects: "Project",
  gallery_items: "Gallery media",
  announcements: "Announcement",
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function matches(conditions: Record<string, unknown>, ctx: Record<string, unknown>) {
  const svc = conditions["service_contains"];
  if (typeof svc === "string" && svc.trim()) {
    const services = Array.isArray(ctx["services"])
      ? ctx["services"].filter((value): value is string => typeof value === "string")
      : [];
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

/** Resolve recipients and deliver one already-authorized notification. */
async function deliverNotification(supabaseAdmin: any, input: DispatchInput) {
  const data: DispatchInput = {
    ...input,
    title: String(input.title ?? "").slice(0, 200),
    body: input.body == null ? null : String(input.body).slice(0, 2000),
    link: typeof input.link === "string" && /^\/(?!\/)/.test(input.link) ? input.link : null,
  };
  const ctx = data.context ?? {};

  const { data: rules, error: rulesError } = await supabaseAdmin
    .from("notification_rules")
    .select("*")
    .eq("trigger_key", data.trigger)
    .eq("active", true);
  if (rulesError) throw new Error("Could not load notification rules: " + rulesError.message);

  const portalUsers = new Map<string, string>();
  const emailUsers = new Set<string>();

  for (const rule of rules ?? []) {
    if (!matches((rule.conditions ?? {}) as Record<string, unknown>, ctx)) continue;

    const ids = new Set<string>((rule.recipient_user_ids ?? []) as string[]);
    const roles = (rule.recipient_roles ?? []) as string[];
    if (roles.length) {
      const { data: rows, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id,role,division")
        .in("role", roles as never[]);
      if (rolesError) throw new Error("Could not resolve notification recipients: " + rolesError.message);
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
    if (error) throw new Error("Could not create portal notifications: " + error.message);
    delivered = rows.length;
  }

  let emails = 0;
  if (emailUsers.size) {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name")
      .in("id", [...emailUsers]);
    if (profilesError) throw new Error("Could not resolve notification email recipients: " + profilesError.message);

    const { sendMail, wrapHtml } = await import("@/lib/mail.server");
    const esc = (value: unknown) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    for (const profile of profiles ?? []) {
      if (!profile.email) continue;
      try {
        await sendMail({
          to: profile.email,
          subject: data.title,
          html: wrapHtml(
            esc(data.title),
            "<p>Hi " + esc(profile.full_name || "there") + ",</p><p>" + esc(data.body) + "</p>" +
              (data.link
                ? '<p><a href="https://sccmu.lovable.app' + esc(data.link) + '">Open in the member portal</a></p>'
                : ""),
          ),
        });
        emails++;
      } catch {
        /* Email is best-effort; portal delivery is the durable notification. */
      }
    }
  }

  return { delivered, emails };
}

/**
 * General dispatcher for trusted staff workflows. Content-submission events
 * must use notifyContentSubmission so the submitted row is verified server-side.
 */
export const dispatchNotification = createServerFn({ method: "POST" })
  .inputValidator((data: DispatchInput) => data)
  .handler(async ({ data }) => {
    if (!VALID.has(data.trigger)) return { delivered: 0, emails: 0, error: "Unknown trigger" };
    if (data.trigger === "content.submitted") {
      return { delivered: 0, emails: 0, error: "Use the verified content-submission endpoint" };
    }

    const { getCaller } = await import("@/lib/caller.server");
    const caller = await getCaller();
    if (!caller.userId) return { delivered: 0, emails: 0, error: "Unauthorized" };
    if (!caller.staff) return { delivered: 0, emails: 0, error: "Forbidden" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await deliverNotification(supabaseAdmin, data);
    return { ...result, error: null as string | null };
  });

type ContentSubmissionInput = {
  table: ContentSubmissionTable;
  id: string;
};

/**
 * Notify reviewers only after the database confirms that this caller owns a
 * fresh pending submission. A database claim makes repeated requests idempotent.
 */
export const notifyContentSubmission = createServerFn({ method: "POST" })
  .inputValidator((data: ContentSubmissionInput) => {
    if (!data || !CONTENT_SUBMISSION_TABLES.includes(data.table)) {
      throw new Error("Unsupported content table");
    }
    if (typeof data.id !== "string" || !UUID_PATTERN.test(data.id)) {
      throw new Error("A valid content ID is required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { getCaller } = await import("@/lib/caller.server");
    const caller = await getCaller();
    if (!caller.userId) return { delivered: 0, emails: 0, error: "Unauthorized", skipped: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rpcClient = supabaseAdmin as any;
    const { data: claim, error: claimError } = await rpcClient.rpc("claim_content_submission_notification", {
      p_content_table: data.table,
      p_content_id: data.id,
      p_submitted_by: caller.userId,
    });
    if (claimError) throw new Error("Could not verify content submission: " + claimError.message);

    const claimData = claim as { claim_token?: string; title?: string } | null;
    if (!claimData?.claim_token) {
      return { delivered: 0, emails: 0, error: null as string | null, skipped: true };
    }

    const finishClaim = async (succeeded: boolean) => {
      const { data: finished, error } = await rpcClient.rpc("finish_content_submission_notification", {
        p_content_table: data.table,
        p_content_id: data.id,
        p_claim_token: claimData.claim_token,
        p_succeeded: succeeded,
      });
      if (error) throw new Error("Could not finalize notification claim: " + error.message);
      if (finished !== true) throw new Error("Notification claim is no longer current");
    };

    try {
      const result = await deliverNotification(supabaseAdmin, {
        trigger: "content.submitted",
        title: CONTENT_LABELS[data.table] + " submitted for review: " + String(claimData.title ?? "Untitled").slice(0, 160),
        body: "A new item is waiting in the content review queue.",
        link: "/portal/admin/review-queue",
        context: { content_table: data.table, content_id: data.id },
      });
      await finishClaim(true);
      return { ...result, error: null as string | null, skipped: false };
    } catch (error) {
      try {
        await finishClaim(false);
      } catch {
        /* Preserve the original delivery error; stale claims can be retried after their lease. */
      }
      throw error;
    }
  });
