ALTER TABLE public.featured_members
  ADD COLUMN IF NOT EXISTS member_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS featured_members_member_user_id_key;

UPDATE public.featured_members f
SET member_user_id = p.id
FROM public.profiles p
WHERE f.member_user_id IS NULL
  AND lower(trim(p.full_name)) = lower(trim(f.full_name))
  AND (SELECT count(*) FROM public.profiles p2 WHERE lower(trim(p2.full_name)) = lower(trim(f.full_name))) = 1;

DELETE FROM public.featured_members f
USING public.featured_members g
WHERE f.member_user_id IS NOT NULL
  AND f.member_user_id = g.member_user_id
  AND (f.updated_at, f.id) < (g.updated_at, g.id);

CREATE UNIQUE INDEX IF NOT EXISTS featured_members_member_user_id_key
  ON public.featured_members (member_user_id) WHERE member_user_id IS NOT NULL;