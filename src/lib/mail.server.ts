/** Server-only Gmail sender shared by the notification rule engine. */

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM = "SCC Media Unit <mediaunit.scc@gmail.com>";

function toB64(s: string) {
  return typeof Buffer !== "undefined"
    ? Buffer.from(s, "utf-8").toString("base64")
    : btoa(unescape(encodeURIComponent(s)));
}
function b64url(s: string) {
  return toB64(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function encodeHeader(s: string) {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${toB64(s)}?=`;
}

export function wrapHtml(title: string, body: string) {
  return `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f6f6f7;padding:28px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e6e9">
    <div style="background:#111318;padding:20px 26px;color:#fff">
      <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#f5b91e">SCC Media Unit</div>
      <div style="font-size:19px;font-weight:700;margin-top:6px">${title}</div>
    </div>
    <div style="padding:24px 26px;color:#20232a;font-size:14px;line-height:1.65">${body}</div>
    <div style="padding:16px 26px;background:#fafafa;border-top:1px solid #eee;color:#6b7280;font-size:12px">
      Media Unit, Sivali Central College, Ratnapura · mediaunit.scc@gmail.com · WhatsApp +94 70 5951050
    </div>
  </div>
</div>`;
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !gmailKey) throw new Error("Gmail connector not configured");
  const raw = b64url(
    [
      `From: ${FROM}`,
      `To: ${opts.to}`,
      `Subject: ${encodeHeader(opts.subject)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      toB64(opts.html).replace(/(.{76})/g, "$1\r\n"),
    ].join("\r\n"),
  );
  const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gmailKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail ${res.status}`);
  return true;
}
