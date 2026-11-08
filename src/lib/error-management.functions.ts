import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "administrator",
  });
  if (error || !data) throw new Error("Forbidden: administrator only");
}

export type ErrorEvent = {
  id: string;
  fingerprint: string;
  error_name: string;
  message: string;
  route: string | null;
  method: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
};

export const listErrorEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("error_events")
      .select("*")
      .order("resolved_at", { ascending: true, nullsFirst: true })
      .order("last_seen_at", { ascending: false })
      .limit(250);
    if (error) throw new Error("Could not load error events.");
    return (data ?? []) as ErrorEvent[];
  });

export const resolveErrorEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; note?: string }) => ({
    id: String(d?.id ?? "").slice(0, 64),
    note: String(d?.note ?? "").trim().slice(0, 500),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.id) throw new Error("Missing error event.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("error_events")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
        resolution_note: data.note || null,
      })
      .eq("id", data.id);
    if (error) throw new Error("Could not resolve this error event.");
    const { recordActivity } = await import("@/lib/audit.server");
    await recordActivity(supabaseAdmin as any, context.userId, {
      action: "resolve",
      entity: "error_event",
      entity_id: data.id,
      summary: "Resolved a server error event",
    });
    return { ok: true };
  });
