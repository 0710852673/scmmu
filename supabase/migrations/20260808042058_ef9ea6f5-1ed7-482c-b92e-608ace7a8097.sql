-- 1. bookings extensions
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_divisions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS completion_note text;

-- 2. assignments
CREATE TABLE IF NOT EXISTS public.coverage_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  division public.division_slug,
  service text,
  note text,
  status text NOT NULL DEFAULT 'assigned',
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, user_id, service)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coverage_assignments TO authenticated;
GRANT ALL ON public.coverage_assignments TO service_role;
ALTER TABLE public.coverage_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_staff_all" ON public.coverage_assignments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "assignments_own_read" ON public.coverage_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "assignments_own_update" ON public.coverage_assignments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. status history
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booking_status_history TO authenticated;
GRANT ALL ON public.booking_status_history TO service_role;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_staff_read" ON public.booking_status_history FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "history_staff_insert" ON public.booking_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- 4. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'general',
  link text,
  priority text NOT NULL DEFAULT 'normal',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own_read" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_own_delete" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_staff_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- 5. live streams
CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  state text NOT NULL DEFAULT 'upcoming',
  scheduled_at timestamptz,
  youtube_url text,
  facebook_url text,
  thumbnail_url text,
  credits jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streams_public_read" ON public.live_streams FOR SELECT TO anon, authenticated
  USING (published = true OR public.is_staff(auth.uid()));
CREATE POLICY "streams_staff_all" ON public.live_streams FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER live_streams_touch BEFORE UPDATE ON public.live_streams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();