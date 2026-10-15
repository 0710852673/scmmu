import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

const MAX_FAILS = 5;
const WINDOW_MIN = 15;

type Result =
  | { ok: true; access_token: string; refresh_token: string }
  | { ok: false; message: string; locked?: boolean };

/**
 * Server-side sign-in with lockout: 5 failed attempts in 15 minutes locks the
 * email temporarily. Every attempt is logged. Inactive members are refused.
 */
export const secureSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => {
    const email = String(d?.email ?? "").trim().toLowerCase().slice(0, 254);
    const password = String(d?.password ?? "").slice(0, 200);
    const isLoginId = /^[a-z0-9]{3,20}$/.test(email);
    if ((!isLoginId && !/^\S+@\S+\.\S+$/.test(email)) || !password) throw new Error("Enter a valid email or login ID and password.");
    return { email, password };
  })
  .handler(async ({ data }): Promise<Result> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.email.includes("@")) {
      const { data: byId } = await supabaseAdmin.from("profiles").select("email").ilike("login_id", data.email).maybeSingle();
      data = { ...data, email: (byId?.email ?? `${data.email}@login-id.invalid`).toLowerCase() };
    }
    const ip = (getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "").split(",")[0].slice(0, 64);
    const ua = (getRequestHeader("user-agent") ?? "").slice(0, 200);
    const log = (success: boolean, reason: string) =>
      supabaseAdmin.from("login_attempts").insert({ email: data.email, success, reason, ip, user_agent: ua } as never);

    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("login_attempts").select("id", { count: "exact", head: true })
      .eq("email", data.email).eq("success", false).gte("created_at", since);
    if ((count ?? 0) >= MAX_FAILS) {
      await log(false, "locked");
      return { ok: false, locked: true, message: `Too many failed attempts. Try again in ${WINDOW_MIN} minutes.` };
    }

    const { data: prof } = await supabaseAdmin.from("profiles").select("id,active").ilike("email", data.email).maybeSingle();
    if (!prof) {
      await log(false, "no_account");
      return { ok: false, message: "No account found" };
    }
    if ((prof as any).active === false) {
      await log(false, "inactive");
      return { ok: false, message: "Account inactive. Contact administration." };
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
        await log(false, "unconfirmed");
        return { ok: false, message: "Please confirm your email address before signing in." };
      }
      await log(false, "wrong_password");
      const left = MAX_FAILS - (count ?? 0) - 1;
      return { ok: false, message: left > 0 ? `Incorrect password. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect password. Account temporarily locked." };
    }
    await log(true, "ok");
    return { ok: true, access_token: body.access_token, refresh_token: body.refresh_token };
  });
