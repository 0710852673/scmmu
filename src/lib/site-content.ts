/** Shared, non-secret constants used across the portal and public site. */

export const DIVISIONS = [
  { value: "photography", label: "Photography" },
  { value: "editing", label: "Photo Editing & Graphic Designing" },
  { value: "videography", label: "Videography & Video Editing" },
  { value: "streaming", label: "Live Streaming" },
  { value: "technical", label: "Technical" },
  { value: "announcing", label: "Announcing" },
  { value: "social_media", label: "Social Media" },
] as const;

export const DIVISION_LABEL: Record<string, string> = Object.fromEntries(
  DIVISIONS.map((d) => [d.value, d.label]),
);

export const ACCOUNT_ROLES = [
  { value: "member", label: "Member" },
  { value: "section_head", label: "Section Head" },
  { value: "executive_board", label: "Executive Board" },
  { value: "tic", label: "TIC (Teacher-in-charge)" },
  { value: "administrator", label: "Administrator" },
] as const;

export const BOARD_CATEGORIES = [
  { value: "tic", label: "TIC Board" },
  { value: "executive", label: "Executive Board" },
  { value: "section_head", label: "Section Head" },
  { value: "member", label: "Member" },
] as const;

/** TIC → Executive Board → Section Heads → Members. Used everywhere ordering matters. */
export const BOARD_ORDER: Record<string, number> = {
  tic: 0,
  executive: 1,
  section_head: 2,
  member: 3,
};

export const ROLE_ORDER: Record<string, number> = {
  tic: 0,
  administrator: 1,
  executive_board: 2,
  section_head: 3,
  member: 4,
};

/** Suggested role titles for the public board, in the order they should appear. */
export const ROLE_TITLES = [
  "Teacher-in-charge",
  "President",
  "Vice President",
  "Secretary",
  "Assistant Secretary",
  "Treasurer",
  "Section Head",
  "Member",
] as const;

export const GALLERY_CATEGORIES = [
  { value: "photography", label: "Photography" },
  { value: "photo_editing", label: "Photo Editing" },
  { value: "graphic_design", label: "Graphic Design" },
  { value: "videography", label: "Videography" },
  { value: "live_streaming", label: "Live Streaming" },
  { value: "live_productions", label: "Live Productions" },
  { value: "technical", label: "Technical" },
  { value: "announcing", label: "Announcing" },
  { value: "social_media", label: "Social Media" },
  { value: "behind_the_scenes", label: "Behind the Scenes" },
  { value: "events", label: "Events" },
  { value: "sports", label: "Sports" },
  { value: "cultural", label: "Cultural" },
  { value: "portraits", label: "Portraits" },
  { value: "custom", label: "Custom" },
] as const;

export function prettyLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
