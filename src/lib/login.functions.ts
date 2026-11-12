import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

const MAX_FAILS = 5;
const WINDOW_MIN = 15;

type Result =
  | { ok: true; access_token: string; refresh_token: string }
  | { ok: false; message: string; locked?: boolean };

/**
 * Server-side sign-in with lockout: 5 failed attempts in 15 minutes locks the
 * email for that network address only, so others cannot lock a member out remotely. Every attempt is logged. Inactive members are refused.
 */
export const secureSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => {
    const email = String(d?.email ?? "").trim().toLowerCase().slice(0, 254);
    const password = String(d?.password ?? "").slice(0, 200);
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) throw new Error("Enter a valid email and password.");
    return { email, password };
  })
  .handler(async ({ data }): Promise<Result> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = (getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "").split(",")[0].slice(0, 64);
    const ua = (getRequestHeader("user-agent") ?? "").slice(0, 200);
    const log = (success: boolean, reason: string) =>
      supabaseAdmin.from("login_attempts").insert({ email: data.email, success, reason, ip, user_agent: ua } as never);

    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("login_attempts").select("id", { count: "exact", head: true })
      .eq("email", data.email).eq("ip", ip).eq("success", false).gte("created_at", since);
    // Fail closed: if the limiter cannot be checked, do not bypass it.
    if (countError || count === null) {
      console.error("[Auth] Failed to check login attempts:", countError?.message);
      return { ok: false, message: "Sign-in is temporarily unavailable. Please try again shortly." };
    }
    if (count >= MAX_FAILS) {
      await log(false, "locked");
      return { ok: false, locked: true, message: `Too many failed attempts. Try again in ${WINDOW_MIN} minutes.` };
    }

    const { data: prof, error: profileError } = await supabaseAdmin
      .from("profiles").select("id,active").ilike("email", data.email).maybeSingle();
    if (profileError) {
      console.error("[Auth] Failed to look up sign-in profile:", profileError.message);
      return { ok: false, message: "Sign-in is temporarily unavailable. Please try again shortly." };
    }
    if (!prof) {
      const { error: logError } = await log(false, "no_account");
      if (logError) console.error("[Auth] Failed to record login attempt:", logError.message);
      return { ok: false, message: "Invalid email or password." };
    }
    if ((prof as any).active === false) {
      const { error: logError } = await log(false, "inactive");
      if (logError) console.error("[Auth] Failed to record login attempt:", logError.message);
      return { ok: false, message: "Invalid email or password." };
    }

    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
      const code = String(body?.error_code ?? body?.code ?? body?.msg ?? "").toLowerCase();
      if (code.includes("not_confirmed")) {
        const { error: logError } = await log(false, "unconfirmed");
        if (logError) console.error("[Auth] Failed to record login attempt:", logError.message);
        return { ok: false, message: "Invalid email or password." };
      }
      const { error: logError } = await log(false, "wrong_password");
      if (logError) {
        console.error("[Auth] Failed to record login attempt:", logError.message);
        return { ok: false, message: "Sign-in is temporarily unavailable. Please try again shortly." };
      }
      const left = MAX_FAILS - count - 1;
      return { ok: false, message: left > 0 ? `Incorrect password. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect password. Account temporarily locked." };
    }
    const { error: successLogError } = await log(true, "ok");
    if (successLogError) console.error("[Auth] Failed to record successful login:", successLogError.message);
    return { ok: true, access_token: body.access_token, refresh_token: body.refresh_token };
  });
