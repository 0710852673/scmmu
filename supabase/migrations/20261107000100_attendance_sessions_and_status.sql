-- Attendance sessions and explicit attendance outcomes.
-- Existing attendance rows remain valid and default to "present".

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attended_on date NOT NULL,
  meeting_label text NOT NULL CHECK (length(btrim(meeting_label)) BETWEEN 1 AND 120),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attended_on, meeting_label)
);

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.attendance_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'present',
  ADD COLUMN IF NOT EXISTS note text;

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'absent', 'late', 'excused'));

CREATE INDEX IF NOT EXISTS attendance_session_id_idx
  ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS attendance_user_date_idx
  ON public.attendance(user_id, attended_on DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Staff manage attendance sessions"
  ON public.attendance_sessions
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- The existing attendance policies require staff status and recorded_by = auth.uid()
-- for inserts/updates. Keep those controls in place.
