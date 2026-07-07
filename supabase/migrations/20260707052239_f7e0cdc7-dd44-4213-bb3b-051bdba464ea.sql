
-- 1. Gallery: add video + metadata
ALTER TABLE public.gallery_items
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Site settings: live stream fields
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS live_stream_url text,
  ADD COLUMN IF NOT EXISTS live_stream_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_stream_title text;

-- 3. Point rules (editable)
CREATE TABLE IF NOT EXISTS public.point_rules (
  kind text PRIMARY KEY,
  label text NOT NULL,
  points integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.point_rules TO anon, authenticated;
GRANT ALL ON public.point_rules TO service_role;
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read point rules"
  ON public.point_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage point rules"
  ON public.point_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));

INSERT INTO public.point_rules (kind, label, points) VALUES
  ('attend_meeting', 'Attend a meeting', 1),
  ('participate_event', 'Participate in an event', 5),
  ('lead_event', 'Lead an event', 10),
  ('upload_photo', 'Upload a photo', 1),
  ('approved_edit', 'Approved edit', 3),
  ('approved_caption', 'Approved caption', 2),
  ('publish_post', 'Publish a post', 2),
  ('complete_task', 'Complete a task', 2),
  ('stream_op', 'Live stream operation', 5),
  ('camera_op', 'Camera operation', 3),
  ('technical_task', 'Technical task', 2)
ON CONFLICT (kind) DO NOTHING;

-- Update award function to read from point_rules
CREATE OR REPLACE FUNCTION public.award_points_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE pts INT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT points INTO pts FROM public.point_rules WHERE kind = NEW.kind::text;
    IF pts IS NULL THEN pts := 1; END IF;
    INSERT INTO public.points_log (user_id, contribution_id, kind, division, points)
    VALUES (NEW.user_id, NEW.id, NEW.kind, NEW.division, pts);
  END IF;
  RETURN NEW;
END $$;

-- 4. Public profiles view: allow anon read of safe columns for portfolio pages
DROP POLICY IF EXISTS "Public read of profiles" ON public.profiles;
CREATE POLICY "Public read of profiles"
  ON public.profiles FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.profiles TO anon;
