CREATE OR REPLACE FUNCTION public.next_release_letter_ref()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
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