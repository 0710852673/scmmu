DROP POLICY IF EXISTS "streams_public_read" ON public.live_streams;
CREATE POLICY "streams_anon_read" ON public.live_streams FOR SELECT TO anon USING (published = true);
CREATE POLICY "streams_auth_read" ON public.live_streams FOR SELECT TO authenticated
  USING (published = true OR public.is_staff(auth.uid()));