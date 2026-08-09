/** Wave 2 catalogs: notification triggers, permission keys, delivery policy. */

export const NOTIFICATION_TRIGGERS = [
  { key: "booking.created", label: "New coverage booking", scope: "public" },
  { key: "booking.status_changed", label: "Booking status changed", scope: "staff" },
  { key: "coverage.assigned", label: "Crew assigned to a job", scope: "staff" },
  { key: "content.submitted", label: "Content submitted for review", scope: "staff" },
  { key: "content.approved", label: "Content approved / published", scope: "staff" },
  { key: "content.rejected", label: "Content rejected or changes requested", scope: "staff" },
  { key: "contact.created", label: "New contact message", scope: "public" },
  { key: "event.created", label: "New event added", scope: "staff" },
  { key: "stream.live", label: "Broadcast went live", scope: "staff" },
] as const;

export type TriggerKey = (typeof NOTIFICATION_TRIGGERS)[number]["key"];

export const TRIGGER_LABEL: Record<string, string> = Object.fromEntries(
  NOTIFICATION_TRIGGERS.map((t) => [t.key, t.label]),
);

/** Triggers that may be fired by unauthenticated public forms. */
export const PUBLIC_TRIGGERS = NOTIFICATION_TRIGGERS.filter((t) => t.scope === "public").map((t) => t.key) as string[];

export const APP_ROLES = [
  { value: "administrator", label: "Administrator" },
  { value: "tic", label: "TIC" },
  { value: "executive_board", label: "Executive Board" },
  { value: "section_head", label: "Section Head" },
  { value: "member", label: "Member" },
] as const;

export const RULE_PRIORITIES = ["low", "normal", "high", "critical"] as const;

/** Fine-grained abilities an admin can bundle into a custom permission role. */
export const PERMISSION_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "Gallery",
    items: [
      { key: "gallery.create", label: "Upload photos / videos" },
      { key: "gallery.edit", label: "Edit captions & details" },
      { key: "gallery.publish", label: "Publish to public gallery" },
      { key: "gallery.delete", label: "Delete gallery items" },
    ],
  },
  {
    group: "Projects",
    items: [
      { key: "projects.create", label: "Create projects" },
      { key: "projects.edit", label: "Edit projects" },
      { key: "projects.publish", label: "Publish projects" },
      { key: "projects.delete", label: "Delete projects" },
    ],
  },
  {
    group: "Announcements",
    items: [
      { key: "announcements.create", label: "Write announcements" },
      { key: "announcements.publish", label: "Publish announcements" },
    ],
  },
  {
    group: "Operations",
    items: [
      { key: "coverage.manage", label: "Manage coverage jobs" },
      { key: "coverage.assign", label: "Assign crew" },
      { key: "events.manage", label: "Manage events" },
      { key: "members.view", label: "View member records" },
    ],
  },
  {
    group: "Review",
    items: [
      { key: "content.submit_review", label: "Submit content for review" },
      { key: "content.review", label: "Approve / reject submitted content" },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const PERMISSION_LABEL: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);

/** Content approval workflow states. */
export const REVIEW_STATES = [
  { value: "draft", label: "Draft", class: "bg-muted text-muted-foreground" },
  { value: "pending", label: "Pending review", class: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { value: "changes_requested", label: "Changes requested", class: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  { value: "approved", label: "Approved", class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { value: "rejected", label: "Rejected", class: "bg-red-500/15 text-red-700 dark:text-red-300" },
] as const;

export const REVIEW_LABEL: Record<string, string> = Object.fromEntries(
  REVIEW_STATES.map((s) => [s.value, s.label]),
);
export const REVIEW_CLASS: Record<string, string> = Object.fromEntries(
  REVIEW_STATES.map((s) => [s.value, s.class]),
);

export const REVIEWABLE_TABLES = [
  { table: "gallery_items", label: "Gallery media", titleField: "title" },
  { table: "projects", label: "Projects", titleField: "title" },
  { table: "announcements", label: "Announcements", titleField: "title" },
] as const;
