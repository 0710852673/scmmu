/** Server-only helper that records an entry in the admin activity log. Never throws. */
export type ActivityEntry = {
  action: string;
  entity: string;
  entity_id?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
};

export async function recordActivity(
  admin: { from: (table: string) => any },
  actorId: string | null,
  entry: ActivityEntry,
) {
  try {
    let actorName: string | null = null;
    if (actorId) {
      const { data } = await admin
        .from("profiles")
        .select("full_name,admission_number")
        .eq("id", actorId)
        .maybeSingle();
      actorName = data?.full_name
        ? `${data.full_name}${data.admission_number ? ` (${data.admission_number})` : ""}`
        : null;
    }
    await admin.from("activity_logs").insert({
      actor_id: actorId,
      actor_name: actorName,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id ?? null,
      summary: entry.summary,
      meta: entry.meta ?? {},
    });
  } catch {
    /* logging must never break the action it describes */
  }
}
