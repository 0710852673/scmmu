ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
COMMENT ON TABLE public.profiles IS 'Member records. id matches auth.users.id for members with a login; members without a login (e.g. some TICs) have a standalone id.';