/** Coverage operations constants — services, service→division routing, workflow stages. */

export type ServiceDef = { value: string; label: string; division: string };

/** The services a client can request, each routed to the division that owns it. */
export const COVERAGE_SERVICES: ServiceDef[] = [
  { value: "Photography", label: "Photography", division: "photography" },
  { value: "Videography", label: "Videography", division: "videography" },
  { value: "Editing", label: "Editing", division: "editing" },
  { value: "Live Streaming", label: "Live Streaming", division: "streaming" },
  { value: "Technical", label: "Technical", division: "technical" },
  { value: "LED Wall", label: "LED Wall", division: "technical" },
  { value: "Announcing", label: "Announcing", division: "announcing" },
  { value: "Social Media", label: "Social Media", division: "social_media" },
];

export const SERVICE_DIVISION: Record<string, string> = Object.fromEntries(
  COVERAGE_SERVICES.map((s) => [s.value, s.division]),
);

/** Divisions involved in a set of requested services (smart assignment). */
export function divisionsForServices(services: string[] | null | undefined): string[] {
  const out = new Set<string>();
  for (const s of services ?? []) {
    const d = SERVICE_DIVISION[s];
    if (d) out.add(d);
  }
  return [...out];
}

export const BOOKING_STAGES = [
  { value: "new", label: "New request", tone: "slate" },
  { value: "contacted", label: "Contacted", tone: "slate" },
  { value: "under_discussion", label: "Under discussion", tone: "amber" },
  { value: "confirmed", label: "Accepted", tone: "emerald" },
  { value: "assigned", label: "Team assigned", tone: "blue" },
  { value: "in_progress", label: "In progress", tone: "blue" },
  { value: "completed", label: "Completed", tone: "emerald" },
  { value: "media_published", label: "Media published", tone: "violet" },
  { value: "rejected", label: "Rejected", tone: "red" },
] as const;

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  BOOKING_STAGES.map((s) => [s.value, s.label]),
);

/** Linear pipeline shown in the ops board (rejected sits outside the flow). */
export const PIPELINE = [
  "new",
  "contacted",
  "under_discussion",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "media_published",
] as const;

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const STAGE_CLASS: Record<string, string> = {
  new: "bg-muted text-foreground",
  contacted: "bg-muted text-foreground",
  under_discussion: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  assigned: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  media_published: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export const PRIORITY_CLASS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-muted text-foreground",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  critical: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export const STREAM_STATES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live now" },
  { value: "finished", label: "Replay" },
] as const;
