import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
// SCCMU = Sivali Central College Media Unit. Never write "SCCMU Media Unit" (redundant).
const FROM = "SCC Media Unit <mediaunit.scc@gmail.com>";

// ── low-level helpers ─────────────────────────────────────────────
function toB64(s: string) {
  return typeof Buffer !== "undefined"
    ? Buffer.from(s, "utf-8").toString("base64")
    : btoa(unescape(encodeURIComponent(s)));
}
function b64url(s: string) {
  return toB64(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// RFC 2047 encoded-word for non-ASCII headers (fixes the Ã‚Â· mojibake).
function encodeHeader(s: string) {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${toB64(s)}?=`;
}

function buildRaw(opts: { to: string; subject: string; html: string }) {
  const msg = [
    `From: ${FROM}`,
    `To: ${opts.to}`,
    `Subject: ${encodeHeader(opts.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    toB64(opts.html).replace(/(.{76})/g, "$1\r\n"),
  ].join("\r\n");
  return b64url(msg);
}

async function gmailSend(raw: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !gmailKey) throw new Error("Gmail connector not configured");
  const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gmailKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gmail ${res.status}: ${t.slice(0, 240)}`);
  }
  return res.json();
}

function escapeHtml(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function row(label: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return `<tr><td style="padding:6px 10px 6px 0;color:#666;width:120px;vertical-align:top">${label}</td><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`;
}
function detailsTable(b: any) {
  return `<table style="width:100%;font-size:14px;border-collapse:collapse;margin:14px 0">
    ${row("Event", b.event_name)}
    ${row("Type", b.event_type)}
    ${row("Organisation", b.organization)}
    ${row("Date", b.event_date)}
    ${row("Time", b.event_time)}
    ${row("Venue", b.venue)}
    ${row("Services", Array.isArray(b.services) ? b.services.join(", ") : "")}
    ${row("Audience", b.audience_size)}
    ${row("Contact", `${b.contact_person ?? ""} ${b.whatsapp ? "· " + b.whatsapp : ""} ${b.email ? "· " + b.email : ""}`)}
  </table>`;
}

// ── template rendering ────────────────────────────────────────────
type Settings = {
  email_address?: string | null;
  whatsapp_number?: string | null;
  whatsapp_url?: string | null;
  address_line?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  whatsapp_channel_url?: string | null;
};

function footer(s: Settings) {
  const email = s.email_address || "mediaunit.scc@gmail.com";
  const wa = s.whatsapp_number || "";
  const waUrl = s.whatsapp_url || (wa ? `https://wa.me/${wa.replace(/[^0-9]/g, "")}` : "");
  const addr = s.address_line || "Sivali Central College, Ratnapura, Sri Lanka";
  const socials: Array<[string, string]> = [];
  if (s.facebook_url) socials.push(["Facebook", s.facebook_url]);
  if (s.youtube_url) socials.push(["YouTube", s.youtube_url]);
  if (s.tiktok_url) socials.push(["TikTok", s.tiktok_url]);
  if (s.whatsapp_channel_url) socials.push(["WhatsApp Channel", s.whatsapp_channel_url]);
  const socialLinks = socials
    .map(([l, u]) => `<a href="${u}" style="color:#dc2626;text-decoration:none;font-weight:600">${l}</a>`)
    .join(' <span style="color:#d1d5db">•</span> ');
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #eef0f3;padding-top:18px;margin-top:8px;font-size:12px;color:#6b7280;line-height:1.6">
    <tr>
      <td style="vertical-align:top;width:60%;padding-right:12px">
        <div style="font-weight:800;color:#111827;font-size:13px;margin-bottom:4px">SCC Media Unit</div>
        <div>${escapeHtml(addr)}</div>
        <div style="margin-top:6px"><a href="mailto:${email}" style="color:#dc2626;text-decoration:none">${email}</a></div>
        ${wa ? `<div><a href="${waUrl}" style="color:#dc2626;text-decoration:none">${escapeHtml(wa)}</a> · WhatsApp</div>` : ""}
      </td>
      <td style="vertical-align:top;width:40%;text-align:right">
        ${socialLinks ? `<div>${socialLinks}</div>` : ""}
        <div style="margin-top:10px;color:#9ca3af;font-size:11px">Automated message · Please do not reply</div>
      </td>
    </tr>
  </table>`;
}

function brandWrap(title: string, bodyHtml: string, s: Settings) {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;padding:24px 12px">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.08);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111">
      <tr><td style="background:linear-gradient(135deg,#dc2626,#f59e0b);padding:26px 32px;color:#fff">
        <div style="font-size:11px;letter-spacing:.28em;font-weight:800;opacity:.9">SCCMU</div>
        <div style="font-size:22px;font-weight:800;margin-top:4px;line-height:1.25">${escapeHtml(title)}</div>
        <div style="font-size:11px;letter-spacing:.14em;margin-top:6px;opacity:.85;text-transform:uppercase">Sivali Central College Media Unit</div>
      </td></tr>
      <tr><td style="padding:28px 32px;font-size:15px;line-height:1.65">${bodyHtml}</td></tr>
      <tr><td style="padding:0 32px 28px">${footer(s)}</td></tr>
    </table>
  </body></html>`;
}

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

async function loadTemplate(admin: any, key: string) {
  const { data } = await admin.from("email_templates").select("subject,body_html,label").eq("key", key).maybeSingle();
  return data as { subject: string; body_html: string; label: string } | null;
}
async function loadSettings(admin: any): Promise<Settings> {
  const { data } = await admin.from("site_settings").select("*").limit(1).maybeSingle();
  return (data ?? {}) as Settings;
}

// ── booking submitted ─────────────────────────────────────────────
export const notifyBookingSubmitted = createServerFn({ method: "POST" })
  .inputValidator((d: { bookingId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin.from("bookings").select("*").eq("id", data.bookingId).maybeSingle();
    if (!b) return { ok: false, reason: "not_found" as const };
    const settings = await loadSettings(supabaseAdmin);

    const vars: Record<string, string> = {
      contact_person: escapeHtml(b.contact_person),
      event_name: escapeHtml(b.event_name),
      event_date: escapeHtml(b.event_date),
      event_time: escapeHtml(b.event_time),
      venue: escapeHtml(b.venue),
      organization: escapeHtml(b.organization),
      event_type: escapeHtml(b.event_type),
      details_table: detailsTable(b),
    };

    const results: Array<{ to: string; ok: boolean; error?: string }> = [];

    const reqTpl = await loadTemplate(supabaseAdmin, "booking_submitted");
    if (b.email && reqTpl) {
      try {
        await gmailSend(buildRaw({
          to: b.email,
          subject: render(reqTpl.subject, vars),
          html: brandWrap("Request received", render(reqTpl.body_html, vars), settings),
        }));
        results.push({ to: b.email, ok: true });
      } catch (e: any) { results.push({ to: b.email, ok: false, error: e.message }); }
    }

    // ── Smart assignment: services -> divisions -> responsible heads only ──
    const { data: svcRows } = await supabaseAdmin.from("services").select("key,division").eq("active", true);
    const svcMap = new Map((svcRows ?? []).map((r: any) => [String(r.key).toLowerCase(), r.division as string]));
    const divisions = Array.from(new Set(((b.services ?? []) as string[]).map((s) => svcMap.get(s.toLowerCase())).filter(Boolean) as string[]));
    const alreadyAssigned = ((b.assigned_divisions ?? []) as string[]).length > 0;
    let headIds: string[] = [];
    if (divisions.length) {
      const { data: heads } = await supabaseAdmin.from("user_roles").select("user_id,division").eq("role", "section_head").in("division", divisions as never[]);
      headIds = Array.from(new Set((heads ?? []).map((h: any) => h.user_id)));
      if (!alreadyAssigned) {
        await supabaseAdmin.from("bookings").update({ assigned_divisions: divisions as never }).eq("id", b.id);
        const { data: existing } = await supabaseAdmin.from("coverage_assignments").select("user_id").eq("booking_id", b.id);
        const have = new Set((existing ?? []).map((e: any) => e.user_id));
        const rows = (heads ?? []).filter((h: any) => !have.has(h.user_id)).map((h: any) => ({
          booking_id: b.id, user_id: h.user_id, division: h.division, service: "Division lead",
          note: "Auto-assigned from requested services", status: "assigned",
        }));
        if (rows.length) await supabaseAdmin.from("coverage_assignments").insert(rows as never);
        await supabaseAdmin.from("booking_status_history").insert({
          booking_id: b.id, from_status: b.status, to_status: b.status,
          note: `Smart assignment: ${divisions.join(", ")} (${rows.length} head${rows.length === 1 ? "" : "s"})`,
        } as never);
      }
    }
    // Portal notifications: relevant heads + TIC/Admin oversight (portal only, no email)
    const { data: oversight } = await supabaseAdmin.from("user_roles").select("user_id").in("role", ["tic", "administrator"]);
    const portalIds = new Set<string>([...headIds, ...(oversight ?? []).map((r: any) => r.user_id)]);
    if (portalIds.size && !alreadyAssigned) {
      await supabaseAdmin.from("notifications").insert([...portalIds].map((uid) => ({
        user_id: uid, title: `New booking: ${b.event_name}`,
        body: headIds.includes(uid) ? "Your division has been assigned to this coverage request." : `Divisions involved: ${divisions.join(", ") || "none matched"}`,
        kind: "booking", link: "/portal/admin/coverage", priority: headIds.includes(uid) ? "high" : "normal",
      })) as never);
    }
    // Email only the heads whose divisions are actually needed
    const staffTpl = await loadTemplate(supabaseAdmin, "staff_notification");
    if (staffTpl && headIds.length && !alreadyAssigned) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("email").in("id", headIds);
      const emails = (profs ?? []).map((p: any) => p.email).filter((e: any): e is string => !!e && e.includes("@"));
      for (const to of emails) {
        try {
          await gmailSend(buildRaw({
            to,
            subject: render(staffTpl.subject, vars),
            html: brandWrap("New coverage assignment", render(staffTpl.body_html, vars), settings),
          }));
          results.push({ to, ok: true });
        } catch (e: any) { results.push({ to, ok: false, error: e.message }); }
      }
    }
    const anyFail = results.some((r) => !r.ok);
    return { ok: !anyFail, results };
  });

// ── booking status change ─────────────────────────────────────────
export const notifyBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { bookingId: string; status: string; reason?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin.from("bookings").select("*").eq("id", data.bookingId).maybeSingle();
    if (!b) return { ok: false, error: "booking_not_found" };
    if (!b.email) return { ok: false, error: "requester_has_no_email" };
    const settings = await loadSettings(supabaseAdmin);

    const keyMap: Record<string, string> = {
      confirmed: "booking_confirmed",
      rejected: "booking_rejected",
      completed: "booking_completed",
      contacted: "booking_contacted",
    };
    const key = keyMap[data.status];
    if (!key) return { ok: false, error: "no_template_for_status" };
    const tpl = await loadTemplate(supabaseAdmin, key);
    if (!tpl) return { ok: false, error: "template_missing" };

    // persist rejection reason
    if (data.status === "rejected" && data.reason) {
      await supabaseAdmin.from("bookings").update({ rejection_reason: data.reason }).eq("id", b.id);
    }

    const vars: Record<string, string> = {
      contact_person: escapeHtml(b.contact_person),
      event_name: escapeHtml(b.event_name),
      event_date: escapeHtml(b.event_date),
      venue: escapeHtml(b.venue),
      reason: escapeHtml(data.reason ?? b.rejection_reason ?? ""),
    };

    try {
      await gmailSend(buildRaw({
        to: b.email,
        subject: render(tpl.subject, vars),
        html: brandWrap(tpl.label, render(tpl.body_html, vars), settings),
      }));
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

// ── contact message ───────────────────────────────────────────────
export const notifyContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { messageId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin.from("contact_messages").select("*").eq("id", data.messageId).maybeSingle();
    if (!m) return { ok: false, reason: "not_found" as const };
    const settings = await loadSettings(supabaseAdmin);
    const results: Array<{ to: string; ok: boolean; error?: string }> = [];

    const tpl = await loadTemplate(supabaseAdmin, "contact_confirmation");
    if (m.email && tpl) {
      const vars = {
        name: escapeHtml(m.name),
        subject: escapeHtml(m.subject || "SCCMU"),
        message: escapeHtml(m.message).replace(/\n/g, "<br/>"),
      };
      try {
        await gmailSend(buildRaw({
          to: m.email,
          subject: render(tpl.subject, vars),
          html: brandWrap("Message received", render(tpl.body_html, vars), settings),
        }));
        results.push({ to: m.email, ok: true });
      } catch (e: any) { results.push({ to: m.email, ok: false, error: e.message }); }
    }

    // internal copy — always plain, not templated
    try {
      const internal = `<p><strong>${escapeHtml(m.name)}</strong> (${escapeHtml(m.email)} ${m.whatsapp ? "· " + escapeHtml(m.whatsapp) : ""})</p>
        <p><strong>Subject:</strong> ${escapeHtml(m.subject ?? "")}</p>
        <blockquote style="border-left:3px solid #e11d48;padding:8px 14px;margin:14px 0;background:#fafafa">${escapeHtml(m.message).replace(/\n/g, "<br/>")}</blockquote>`;
      await gmailSend(buildRaw({
        to: settings.email_address || "mediaunit.scc@gmail.com",
        subject: `Contact form: ${m.subject || m.name}`,
        html: brandWrap("New contact message", internal, settings),
      }));
      results.push({ to: "internal", ok: true });
    } catch (e: any) { results.push({ to: "internal", ok: false, error: e.message }); }

    const anyFail = results.some((r) => !r.ok);
    return { ok: !anyFail, results };
  });
