-- Services catalogue (service -> division), editable
CREATE TABLE public.services (
  key text PRIMARY KEY,
  label text NOT NULL,
  division division_slug NOT NULL,
  active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services readable" ON public.services FOR SELECT USING (active OR public.has_role(auth.uid(),'administrator'));
CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));
INSERT INTO public.services(key,label,division,display_order) VALUES
 ('Photography','Photography','photography',1),('Videography','Videography','videography',2),
 ('Editing','Editing','editing',3),('Live Streaming','Live Streaming','streaming',4),
 ('Technical','Technical','technical',5),('LED Wall','LED Wall','technical',6),
 ('Announcing','Announcing','announcing',7),('Social Media','Social Media','social_media',8);

-- Audit: old/new values
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS old_value jsonb, ADD COLUMN IF NOT EXISTS new_value jsonb;

CREATE OR REPLACE FUNCTION public.audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nm text; rid text; o jsonb; n jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN o := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN n := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND o = n THEN RETURN NEW; END IF;
  rid := COALESCE(n->>'id', o->>'id', n->>'key', o->>'key', n->>'kind', o->>'kind');
  IF uid IS NOT NULL THEN SELECT full_name INTO nm FROM profiles WHERE id = uid; END IF;
  INSERT INTO activity_logs(actor_id, actor_name, action, entity, entity_id, summary, meta, old_value, new_value)
  VALUES (uid, COALESCE(nm, CASE WHEN uid IS NULL THEN 'System' END), lower(TG_OP), TG_TABLE_NAME, rid,
          initcap(lower(TG_OP)) || ' on ' || TG_TABLE_NAME, '{"source":"db_trigger"}'::jsonb, o, n);
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['user_roles','user_permission_roles','permission_roles','points_log','point_rules','bookings','site_settings','profiles','contributions','coverage_assignments','services','notification_rules'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$s; CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
  END LOOP;
END $$;

-- Login protection
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean NOT NULL,
  reason text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_email_time ON public.login_attempts(lower(email), created_at DESC);
GRANT SELECT ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read login attempts" ON public.login_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'administrator'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;