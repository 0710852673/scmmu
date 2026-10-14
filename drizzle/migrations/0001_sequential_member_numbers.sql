CREATE OR REPLACE FUNCTION public.renumber_member_numbers()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  WITH base AS (
    SELECT p.id, p.admission_number, p.created_at,
      EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'tic') AS is_tic,
      NULLIF(regexp_replace(COALESCE(p.admission_number,''), '[^0-9]', '', 'g'), '')::int AS oldn
    FROM public.profiles p
  ), numbered AS (
    SELECT id, admission_number,
      CASE WHEN is_tic
        THEN 'TIC' || lpad(row_number() OVER (PARTITION BY is_tic ORDER BY (admission_number LIKE 'TIC%') DESC, oldn NULLS LAST, created_at, id)::text, 2, '0')
        ELSE 'MU' || lpad(row_number() OVER (PARTITION BY is_tic ORDER BY (admission_number LIKE 'MU%') DESC, oldn NULLS LAST, created_at, id)::text, 3, '0')
      END AS newn
    FROM base
  )
  UPDATE public.profiles p SET admission_number = n.newn
  FROM numbered n WHERE p.id = n.id AND p.admission_number IS DISTINCT FROM n.newn;
END $$;
REVOKE EXECUTE ON FUNCTION public.renumber_member_numbers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renumber_member_numbers() TO service_role;

CREATE OR REPLACE FUNCTION public.trg_renumber_members()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.renumber_member_numbers();
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.assign_mu_number_on_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN NEW; END $$;

DROP TRIGGER IF EXISTS renumber_on_profiles ON public.profiles;
CREATE TRIGGER renumber_on_profiles AFTER INSERT OR DELETE ON public.profiles
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_renumber_members();
DROP TRIGGER IF EXISTS renumber_on_roles ON public.user_roles;
CREATE TRIGGER renumber_on_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_renumber_members();

SELECT public.renumber_member_numbers();