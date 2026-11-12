import { getRequest } from "@tanstack/react-start/server";

/** Resolve the signed-in caller (if any) from the bearer token, and whether they are staff. */
export async function getCaller(): Promise<{ userId: string | null; staff: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const auth = getRequest()?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return { userId: null, staff: false };
  const { data } = await supabaseAdmin.auth.getUser(token);
  const userId = data.user?.id ?? null;
  if (!userId) return { userId: null, staff: false };
  const { data: staff } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  return { userId, staff: !!staff };
}

/** Public submitters may only trigger the one-off notification right after creating a record. */
export function isFresh(createdAt: string | null | undefined, minutes = 10) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < minutes * 60_000;
}
