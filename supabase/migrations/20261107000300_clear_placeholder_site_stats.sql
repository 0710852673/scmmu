-- Remove only the original placeholder values. Preserve any figures an administrator has edited.
UPDATE public.site_stats
SET total_members = 0,
    active_members = 0,
    photos_captured = 0,
    videos_produced = 0,
    live_streams = 0,
    events_covered = 0,
    projects_published = 0
WHERE id = 1
  AND total_members = 68
  AND active_members = 40
  AND photos_captured = 3000
  AND videos_produced = 240
  AND live_streams = 50
  AND events_covered = 1000
  AND projects_published = 18;
