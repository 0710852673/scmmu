CREATE TABLE public.letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  storage_path text NOT NULL,
  letterhead_image_url text,
  active boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.letter_templates TO authenticated;
GRANT ALL ON public.letter_templates TO service_role;
ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read templates" ON public.letter_templates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage templates" ON public.letter_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));
CREATE TRIGGER letter_templates_touch BEFORE UPDATE ON public.letter_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.release_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no text NOT NULL UNIQUE,
  letter_date date NOT NULL DEFAULT current_date,
  event_name text NOT NULL,
  body text NOT NULL DEFAULT '',
  intro_line text,
  status text NOT NULL DEFAULT 'draft',
  template_id uuid REFERENCES public.letter_templates(id),
  docx_path text,
  pdf_path text,
  generated_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_letters TO authenticated;
GRANT ALL ON public.release_letters TO service_role;
ALTER TABLE public.release_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage release letters" ON public.release_letters FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER release_letters_touch BEFORE UPDATE ON public.release_letters FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.release_letter_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid NOT NULL REFERENCES public.release_letters(id) ON DELETE CASCADE,
  member_user_id uuid,
  full_name text NOT NULL,
  class_name text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX release_letter_members_letter_idx ON public.release_letter_members(letter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_letter_members TO authenticated;
GRANT ALL ON public.release_letter_members TO service_role;
ALTER TABLE public.release_letter_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage release letter members" ON public.release_letter_members FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_release_letter_ref()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  n int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(ref_no, '^RL-' || yr || '-', ''), '')::int), 0) + 1
    INTO n
    FROM public.release_letters
   WHERE ref_no ~ ('^RL-' || yr || '-[0-9]+$');
  RETURN 'RL-' || yr || '-' || lpad(n::text, 4, '0');
END $$;
REVOKE ALL ON FUNCTION public.next_release_letter_ref() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.next_release_letter_ref() TO authenticated, service_role;

CREATE POLICY "Staff read letter files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'letter-templates' AND public.is_staff(auth.uid()));
CREATE POLICY "Admins write letter files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'letter-templates' AND public.has_role(auth.uid(),'administrator'));
CREATE POLICY "Admins update letter files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'letter-templates' AND public.has_role(auth.uid(),'administrator'));

INSERT INTO public.letter_templates (name, storage_path, letterhead_image_url, active)
VALUES ('SCCMU Official Release Letter 2026', 'masters/sccmu-release-letter-2026.docx', '/__l5e/assets-v1/879e7489-42db-4ceb-b696-ce98837d734d/letterhead-2026.png', true);