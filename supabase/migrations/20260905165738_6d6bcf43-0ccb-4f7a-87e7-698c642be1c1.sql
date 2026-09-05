CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  summary text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read activity logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX activity_logs_created_at_idx ON public.activity_logs (created_at DESC);
CREATE INDEX activity_logs_entity_idx ON public.activity_logs (entity, entity_id);

ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS publish_at timestamptz;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS publish_at timestamptz;