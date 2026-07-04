import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM = "SCCMU Media Unit <mediaunit.scc@gmail.com>";

function b64url(s: string) {
  // Use Buffer if available (server), else btoa
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(s, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRaw(opts: { to: string; subject: string; html: string; cc?: string }) {
  const headers = [
    `From: ${FROM}`,
    `To: ${opts.to}`,
    opts.cc ? `Cc: ${opts.cc}` : null,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    opts.html,
  ]
    .filter(Boolean)
    .join("\r\n");
  return b64url(headers);
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
    throw new Error(`Gmail send failed: ${res.status} ${t}`);
  }
  return res.json();
}

const brandWrap = (title: string, body: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#111;background:#fff;border:1px solid #eee;border-radius:12px">
  <div style="border-bottom:2px solid #e11d48;padding-bottom:10px;margin-bottom:18px">
    <div style="font-size:11px;letter-spacing:.22em;font-weight:700;color:#e11d48">SCCMU · MEDIA UNIT</div>
    <h1 style="margin:6px 0 0;font-size:22px">${title}</h1>
  </div>
  ${body}
  <p style="font-size:12px;color:#666;margin-top:24px;border-top:1px solid #eee;padding-top:12px">
    Sivali Central College Media Unit · Ratnapura<br/>
    <a href="mailto:mediaunit.scc@gmail.com" style="color:#e11d48;text-decoration:none">mediaunit.scc@gmail.com</a>
  </p>
</div>`;

// ────────────────────────────────────────────────────────────────
// Booking submitted → confirm requester + notify top board
// ────────────────────────────────────────────────────────────────
export const notifyBookingSubmitted = createServerFn({ method: "POST" })
  .inputValidator((d: { bookingId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!b) return { ok: false, reason: "not_found" };

    const details = `
      <p style="font-size:15px;line-height:1.55">Hi ${escapeHtml(b.contact_person ?? "there")},</p>
      <p style="font-size:15px;line-height:1.55">We've received your coverage request. Our team will reach out on WhatsApp shortly.</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:14px">
        ${row("Event", b.event_name)}
        ${row("Type", b.event_type)}
        ${row("Organisation", b.organization)}
        ${row("Date", b.event_date)}
        ${row("Time", b.event_time)}
        ${row("Venue", b.venue)}
        ${row("Services", Array.isArray(b.services) ? b.services.join(", ") : "")}
        ${row("Audience", b.audience_size)}
      </table>`;

    const results: Array<{ to: string; ok: boolean; error?: string }> = [];

    // 1) Confirmation to requester
    if (b.email) {
      try {
        await gmailSend(
          buildRaw({
            to: b.email,
            subject: `Request received — ${b.event_name}`,
            html: brandWrap("Request received", details),
          }),
        );
        results.push({ to: b.email, ok: true });
      } catch (e: any) {
        results.push({ to: b.email, ok: false, error: e.message });
      }
    }

    // 2) Notify top board (staff) — pull emails from profiles joined via user_roles
    const { data: staff } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["tic", "executive_board", "section_head", "administrator"]);
    const ids = Array.from(new Set((staff ?? []).map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("id", ids);
      const emails = (profs ?? [])
        .map((p) => p.email)
        .filter((e): e is string => !!e && e.includes("@"));
      const notifyBody = `
        <p style="font-size:15px">A new coverage request has arrived.</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:8px">
          ${row("Event", b.event_name)}
          ${row("Type", b.event_type)}
          ${row("Requester", `${b.contact_person} (${b.whatsapp ?? ""} ${b.email ?? ""})`)}
          ${row("Organisation", b.organization)}
          ${row("Date", b.event_date)}
          ${row("Venue", b.venue)}
          ${row("Services", Array.isArray(b.services) ? b.services.join(", ") : "")}
          ${row("Notes", b.notes)}
        </table>
        <p style="font-size:13px;color:#666;margin-top:14px">Review & approve inside the portal.</p>`;
      for (const to of emails) {
        try {
          await gmailSend(
            buildRaw({
              to,
              subject: `New booking · ${b.event_name}`,
              html: brandWrap("New coverage booking", notifyBody),
            }),
          );
          results.push({ to, ok: true });
        } catch (e: any) {
          results.push({ to, ok: false, error: e.message });
        }
      }
    }
    return { ok: true, results };
  });

// ────────────────────────────────────────────────────────────────
// Booking status change → notify requester
// ────────────────────────────────────────────────────────────────
export const notifyBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { bookingId: string; status: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!b || !b.email) return { ok: false, reason: "no_email" };

    const map: Record<string, { title: string; msg: string }> = {
      confirmed: {
        title: "Booking confirmed",
        msg: "Great news — your coverage request has been approved. We'll coordinate the rest on WhatsApp.",
      },
      rejected: {
        title: "Booking not approved",
        msg: "Sorry — we can't cover this event. Feel free to reach out on WhatsApp if you'd like to discuss.",
      },
      completed: {
        title: "Coverage complete",
        msg: "Your event coverage is complete. Photos/video will be shared shortly. Thank you!",
      },
      contacted: {
        title: "We've been in touch",
        msg: "Our team has reached out regarding your request. Please check WhatsApp.",
      },
    };
    const m = map[data.status] ?? { title: `Status: ${data.status}`, msg: `Your booking status is now: ${data.status}` };

    const body = `
      <p style="font-size:15px">Hi ${escapeHtml(b.contact_person ?? "there")},</p>
      <p style="font-size:15px;line-height:1.55">${m.msg}</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:14px">
        ${row("Event", b.event_name)}
        ${row("Date", b.event_date)}
        ${row("Venue", b.venue)}
      </table>`;
    try {
      await gmailSend(
        buildRaw({
          to: b.email,
          subject: `${m.title} — ${b.event_name}`,
          html: brandWrap(m.title, body),
        }),
      );
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

// ────────────────────────────────────────────────────────────────
// Contact message submitted → confirm sender + notify inbox
// ────────────────────────────────────────────────────────────────
export const notifyContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { messageId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin
      .from("contact_messages")
      .select("*")
      .eq("id", data.messageId)
      .maybeSingle();
    if (!m) return { ok: false, reason: "not_found" };

    const results: Array<{ to: string; ok: boolean; error?: string }> = [];
    if (m.email) {
      const body = `
        <p style="font-size:15px">Hi ${escapeHtml(m.name ?? "there")},</p>
        <p style="font-size:15px;line-height:1.55">Thanks for reaching out to SCCMU — we've received your message and will reply within 48 hours.</p>
        <blockquote style="border-left:3px solid #e11d48;padding:8px 14px;margin:14px 0;background:#fafafa;font-size:14px;color:#333">
          ${escapeHtml(m.message ?? "")}
        </blockquote>`;
      try {
        await gmailSend(
          buildRaw({
            to: m.email,
            subject: `We got your message — ${m.subject || "SCCMU"}`,
            html: brandWrap("Message received", body),
          }),
        );
        results.push({ to: m.email, ok: true });
      } catch (e: any) {
        results.push({ to: m.email, ok: false, error: e.message });
      }
    }
    // internal notify
    try {
      const internalBody = `
        <p><strong>${escapeHtml(m.name ?? "")}</strong> (${escapeHtml(m.email ?? "")}, ${escapeHtml(m.whatsapp ?? "")})</p>
        <p><strong>Subject:</strong> ${escapeHtml(m.subject ?? "")}</p>
        <blockquote style="border-left:3px solid #e11d48;padding:8px 14px;margin:14px 0;background:#fafafa">
          ${escapeHtml(m.message ?? "")}
        </blockquote>`;
      await gmailSend(
        buildRaw({
          to: "mediaunit.scc@gmail.com",
          subject: `Contact form · ${m.subject || m.name}`,
          html: brandWrap("New contact message", internalBody),
        }),
      );
      results.push({ to: "mediaunit.scc@gmail.com", ok: true });
    } catch (e: any) {
      results.push({ to: "mediaunit.scc@gmail.com", ok: false, error: e.message });
    }
    return { ok: true, results };
  });

// helpers
function escapeHtml(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br/>");
}
function row(label: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return `<tr><td style="padding:6px 10px 6px 0;color:#666;width:110px;vertical-align:top">${label}</td><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`;
}
