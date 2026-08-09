
-- ── Wave 2: notification rules, dynamic permissions, content approval ──

CREATE TABLE public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_key text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_roles text[] NOT NULL DEFAULT '{}',
  recipient_divisions text[] NOT NULL DEFAULT '{}',
  recipient_user_ids uuid[] NOT NULL DEFAULT '{}',
  deliver_portal boolean NOT NULL DEFAULT true,
  deliver_email boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'normal',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_rules TO authenticated;
GRANT ALL ON public.notification_rules TO service_role;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read notification rules" ON public.notification_rules
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage notification rules" ON public.notification_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE TRIGGER notification_rules_touch BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.permission_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  permissions text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permission_roles TO authenticated;
GRANT ALL ON public.permission_roles TO service_role;
ALTER TABLE public.permission_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read permission roles" ON public.permission_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage permission roles" ON public.permission_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));
CREATE TRIGGER permission_roles_touch BEFORE UPDATE ON public.permission_roles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_permission_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.permission_roles(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);
GRANT SELECT ON public.user_permission_roles TO authenticated;
GRANT ALL ON public.user_permission_roles TO service_role;
ALTER TABLE public.user_permission_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or staff read permission assignments" ON public.user_permission_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Admins manage permission assignments" ON public.user_permission_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- Content approval workflow ------------------------------------------------
ALTER TABLE public.gallery_items
  ADD COLUMN review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN submitted_by uuid,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN review_note text;
ALTER TABLE public.projects
  ADD COLUMN review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN submitted_by uuid,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN review_note text;
ALTER TABLE public.announcements
  ADD COLUMN review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN submitted_by uuid,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN review_note text;

DROP POLICY "Gallery public read" ON public.gallery_items;
CREATE POLICY "Gallery public read" ON public.gallery_items
  FOR SELECT TO anon, authenticated USING (review_status = 'approved');
DROP POLICY "Projects public read" ON public.projects;
CREATE POLICY "Projects public read" ON public.projects
  FOR SELECT TO anon, authenticated USING (published AND review_status = 'approved');

-- Seed starter permission roles and notification rules ---------------------
INSERT INTO public.permission_roles (key, name, description, permissions) VALUES
  ('gallery_manager', 'Gallery Manager', 'Uploads and captions gallery media but cannot publish or delete.',
   ARRAY['gallery.create','gallery.edit']),
  ('content_manager', 'Content Manager', 'Creates projects and announcements, submits them for review.',
   ARRAY['projects.create','projects.edit','announcements.create','content.submit_review']);

INSERT INTO public.notification_rules (name, trigger_key, conditions, recipient_roles, recipient_divisions, deliver_portal, deliver_email, priority) VALUES
  ('New booking → Admin & board', 'booking.created', '{}'::jsonb,
   ARRAY['administrator','executive_board'], ARRAY[]::text[], true, true, 'high'),
  ('Live streaming request → Streaming head', 'booking.created',
   '{"service_contains":"Live Streaming"}'::jsonb,
   ARRAY['section_head'], ARRAY['streaming'], true, true, 'high'),
  ('Content submitted → Admin review queue', 'content.submitted', '{}'::jsonb,
   ARRAY['administrator'], ARRAY[]::text[], true, false, 'normal'),
  ('Contact message → Admin', 'contact.created', '{}'::jsonb,
   ARRAY['administrator'], ARRAY[]::text[], true, false, 'normal');
