DROP POLICY IF EXISTS "Public read of profiles" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;

DROP POLICY IF EXISTS "Roles visible to authenticated" ON public.user_roles;
CREATE POLICY "Own role readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));