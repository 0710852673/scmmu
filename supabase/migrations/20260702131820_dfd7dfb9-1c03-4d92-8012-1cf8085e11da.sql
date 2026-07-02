
-- Auto-assign MU number on new profile (skip TIC — role assigned separately)
CREATE OR REPLACE FUNCTION public.assign_mu_number_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    NEW.admission_number := public.next_mu_number();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_mu_number ON public.profiles;
CREATE TRIGGER trg_assign_mu_number
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_mu_number_on_profile();

-- Backfill existing profiles that are missing an MU number and are NOT TIC.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.id
      FROM public.profiles p
     WHERE (p.admission_number IS NULL OR p.admission_number = '')
       AND NOT EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = p.id AND ur.role = 'tic'
       )
     ORDER BY p.created_at NULLS LAST
  LOOP
    UPDATE public.profiles SET admission_number = public.next_mu_number() WHERE id = r.id;
  END LOOP;
END $$;
