import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PORTAL_URL = "https://scmmu.lovable.app/auth";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "administrator" });
  if (!data) throw new Error("Forbidden: administrator only");
}

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let s = "";
  for (const b of bytes) s += chars[b % chars.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type CreateInput = {
  full_name: string; email: string; grade?: string; class?: string;
  whatsapp?: string; primary_division?: string; role?: string;
};
const ROLES = ["member", "tic", "section_head", "executive_board", "administrator"];
const ROLE_ALIAS: Record<string, string> = { admin: "administrator", head: "section_head", "section head": "section_head", board: "executive_board", "executive board": "executive_board" };

/** Phase A: creates the account only. Never sends or queues email. */
export const onboardCreateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateInput) => {
    const email = String(d.email ?? "").trim().toLowerCase();
    const full_name = String(d.full_name ?? "").trim();
    if (!full_name) throw new Error("Full name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    const r = String(d.role ?? "member").trim().toLowerCase();
    const role = ROLE_ALIAS[r] ?? r;
    if (!ROLES.includes(role)) throw new Error("Role must be Member, TIC, Head, Board or Admin.");
    return { ...d, email, full_name, role };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin.from("profiles").select("id").ilike("email", data.email).maybeSingle();
    if (existing) throw new Error("An account with this email already exists. Nothing was changed.");

    const password = tempPassword();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password, email_confirm: true,
      user_metadata: { full_name: data.full_name },
      app_metadata: { must_change_password: true },
    });
    if (error || !created.user) {
      const msg = /already/i.test(error?.message ?? "") ? "An account with this email already exists. Nothing was changed." : "Account could not be created.";
      throw new Error(msg);
    }
    const uid = created.user.id;
    const patch: Record<string, string | null> = {};
    for (const k of ["grade", "class", "whatsapp", "primary_division"] as const) {
      const v = (data as any)[k]; if (typeof v === "string" && v.trim()) patch[k] = v.trim();
    }
    if (Object.keys(patch).length) await supabaseAdmin.from("profiles").update(patch as any).eq("id", uid);
    if (data.role !== "member") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role as any });
    }
    await supabaseAdmin.from("member_onboarding").insert({ user_id: uid, created_by: context.userId });
    await supabaseAdmin.rpc("renumber_member_numbers" as any);
    const { data: prof } = await supabaseAdmin.from("profiles").select("admission_number").eq("id", uid).maybeSingle();
    // Password is returned once to the admin's screen and never stored.
    return { user_id: uid, role: data.role, email: data.email, full_name: data.full_name, mu: prof?.admission_number ?? null, temp_password: password };
  });

export const onboardList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("member_onboarding").select("*").order("created_at", { ascending: false });
    const ids = (rows ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data: profs } = await supabaseAdmin.from("profiles").select("id,full_name,email,admission_number").in("id", ids);
    const pm = new Map((profs ?? []).map((p) => [p.id, p]));
    const out = [];
    for (const r of rows ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      out.push({ ...r, profile: pm.get(r.user_id) ?? null, must_change: !!u.user?.app_metadata?.must_change_password, account_exists: !!u.user });
    }
    return out;
  });

/** Phase B: only runs on an explicit, confirmed admin action for ONE member. */
export const onboardSendWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; confirm_email: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("member_onboarding").select("*").eq("user_id", data.user_id).maybeSingle();
    if (!row) throw new Error("This member was not created through onboarding.");
    if (row.email_status === "sending") throw new Error("An email is already being sent.");
    const { data: prof } = await supabaseAdmin.from("profiles").select("full_name,email,admission_number").eq("id", data.user_id).maybeSingle();
    if (!prof?.email || prof.email.toLowerCase() !== String(data.confirm_email).trim().toLowerCase())
      throw new Error("Confirmation email does not match the recipient.");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (!u.user?.app_metadata?.must_change_password)
      throw new Error("This member already set their own password. Welcome email not sent.");

    await supabaseAdmin.from("member_onboarding").update({
      email_status: "sending", email_authorized_by: context.userId, email_authorized_at: new Date().toISOString(), email_error: null,
    }).eq("user_id", data.user_id);

    try {
      // Temporary passwords are never stored, so a fresh one is issued for this email.
      const password = tempPassword();
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password, app_metadata: { must_change_password: true },
      });
      if (pwErr) throw new Error("Could not prepare login details.");
      const { data: s } = await supabaseAdmin.from("site_settings").select("email_address,whatsapp_number,whatsapp_url").eq("id", 1).maybeSingle();
      const { sendMail, wrapHtml } = await import("@/lib/mail.server");
      const name = esc(prof.full_name || "Member");
      const mu = esc(prof.admission_number ?? "Not assigned");
      const supportEmail = s?.email_address ? `<a href="mailto:${esc(s.email_address)}">${esc(s.email_address)}</a>` : "<em>Support email requires configuration</em>";
      const wa = s?.whatsapp_url && s?.whatsapp_number
        ? `WhatsApp: ${esc(s.whatsapp_number)} (messages only)<br/><a href="${esc(s.whatsapp_url)}" style="display:inline-block;margin-top:8px;background:#25D366;color:#fff;padding:8px 16px;border-radius:999px;text-decoration:none;font-weight:600">Message us on WhatsApp</a>`
        : "<em>WhatsApp number requires configuration</em>";
      const body = `<p>Dear ${name},</p>
<p>Welcome to the <b>SCC Media Unit</b>. Your member portal account is ready.</p>
<table style="width:100%;border-collapse:collapse;margin:14px 0;background:#f6f6f7;border-radius:10px">
<tr><td style="padding:10px 14px;color:#6b7280">Member number</td><td style="padding:10px 14px;font-weight:700">${mu}</td></tr>
<tr><td style="padding:10px 14px;color:#6b7280">Login email</td><td style="padding:10px 14px">${esc(prof.email)}</td></tr>
<tr><td style="padding:10px 14px;color:#6b7280">Temporary password</td><td style="padding:10px 14px"><span style="display:inline-block;font-family:monospace;font-size:17px;font-weight:700;letter-spacing:1px;background:#fff;border:1px dashed #f5b91e;border-radius:8px;padding:8px 12px;user-select:all;-webkit-user-select:all">${esc(password)}</span><div style="font-size:11px;color:#6b7280;margin-top:4px">Tap / long-press the password to select and copy it.</div></td></tr>
</table>
<p style="font-size:13px;color:#6b7280">Copy-ready password: <code style="user-select:all;-webkit-user-select:all;font-size:14px">${esc(password)}</code></p>
<p style="text-align:center;margin:20px 0"><a href="${PORTAL_URL}" style="background:#f5b91e;color:#111318;padding:12px 26px;border-radius:999px;text-decoration:none;font-weight:700">Sign in to the portal</a></p>
<p><b>First login:</b> after signing in you will be asked to choose your own new password before you can use the portal. Please do not share your password with anyone.</p>
<p><b>Your MU number</b> is your unique SCCMU identification number. Keep it for future reference.</p>
<div style="margin-top:20px;padding:16px;border:1px solid #e6e6e9;border-radius:10px">
<div style="font-weight:700;font-size:15px;margin-bottom:6px">Need Help? Contact SCCMU</div>
<p style="margin:0 0 8px">If you experience any problems signing in, changing your password, or accessing the portal, please contact the SCCMU administration team for assistance. Please mention your name and MU number.</p>
Email: ${supportEmail}<br/>${wa}
</div>`;
      await sendMail({ to: prof.email, subject: "Welcome to SCC Media Unit | Your Account Details", html: wrapHtml("Welcome to SCC Media Unit", body) });
      await supabaseAdmin.from("member_onboarding").update({ email_status: "accepted", email_sent_at: new Date().toISOString() }).eq("user_id", data.user_id);
      return { ok: true };
    } catch (e: any) {
      const msg = String(e?.message ?? "Send failed").slice(0, 200);
      await supabaseAdmin.from("member_onboarding").update({ email_status: "failed", email_error: msg }).eq("user_id", data.user_id);
      throw new Error(`Email failed: ${msg}`);
    }
  });

/** Member sets own password; server updates it and clears the flag together. */
export const completeFirstLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { password: string }) => {
    const p = String(d.password ?? "");
    if (p.length < 8 || !/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) throw new Error("Use at least 8 characters with letters and numbers.");
    return { password: p };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password, app_metadata: { must_change_password: false },
    });
    if (error) throw new Error("Password could not be updated. Please try again.");
    return { ok: true };
  });
