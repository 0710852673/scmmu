ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS evidence_url text,
  ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS criteria text,
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS points_threshold integer;

ALTER TABLE public.member_achievements
  ADD COLUMN IF NOT EXISTS season text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS awarded_by uuid;