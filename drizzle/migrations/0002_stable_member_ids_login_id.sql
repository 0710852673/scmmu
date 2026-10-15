ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_id text, ADD COLUMN IF NOT EXISTS org_position text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_login_id_key ON public.profiles (upper(login_id));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_admission_number_key ON public.profiles (admission_number);

CREATE TABLE IF NOT EXISTS public.member_id_counters (prefix text PRIMARY KEY, last_value integer NOT NULL DEFAULT 0);
GRANT ALL ON public.member_id_counters TO service_role;
ALTER TABLE public.member_id_counters ENABLE ROW LEVEL SECURITY;
INSERT INTO public.member_id_counters VALUES
 ('MU', COALESCE((SELECT max(substring(admission_number from '^MU0*([0-9]+)$')::int) FROM public.profiles),0)),
 ('TIC', GREATEST(
   COALESCE((SELECT max(substring(admission_number from '^TIC0*([0-9]+)$')::int) FROM public.profiles),0),
   COALESCE((SELECT max(substring(upper(login_id) from '^TIC0*([0-9]+)$')::int) FROM public.profiles),0)))
ON CONFLICT (prefix) DO NOTHING;

CREATE OR REPLACE FUNCTION public.take_member_id(_prefix text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  INSERT INTO public.member_id_counters(prefix,last_value) VALUES (_prefix,0) ON CONFLICT DO NOTHING;
  UPDATE public.member_id_counters SET last_value = last_value + 1 WHERE prefix = _prefix RETURNING last_value INTO n;
  RETURN _prefix || lpad(n::text, 3, '0');
END $$;
REVOKE EXECUTE ON FUNCTION public.take_member_id(text) FROM PUBLIC, anon, authenticated;

-- New profiles: next MU number after the highest ever issued (no gap filling, no reuse).
CREATE OR REPLACE FUNCTION public.assign_mu_number_on_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    NEW.admission_number := public.take_member_id('MU');
  END IF;
  RETURN NEW;
END $$;

-- When someone is given the TIC role, swap a fresh MU number for the next TIC number.
CREATE OR REPLACE FUNCTION public.trg_renumber_members() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_TABLE_NAME = 'user_roles' AND TG_OP IN ('INSERT','UPDATE') AND NEW.role = 'tic' THEN
    UPDATE public.profiles SET admission_number = public.take_member_id('TIC'), org_position = COALESCE(org_position,'TIC')
    WHERE id = NEW.user_id AND (admission_number IS NULL OR admission_number NOT LIKE 'TIC%');
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS renumber_on_profiles ON public.profiles;
DROP TRIGGER IF EXISTS renumber_on_roles ON public.user_roles;
CREATE TRIGGER renumber_on_roles AFTER INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.trg_renumber_members();

-- Kept for callers; no longer renumbers existing members.
CREATE OR REPLACE FUNCTION public.renumber_member_numbers() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT NULL::void $$;

UPDATE public.profiles SET login_id = 'TIC001', org_position = 'TIC' WHERE id = 'f3dce14c-2f5a-4248-85e8-c8562e615a6a';
UPDATE public.member_id_counters SET last_value = GREATEST(last_value, 1) WHERE prefix = 'TIC';