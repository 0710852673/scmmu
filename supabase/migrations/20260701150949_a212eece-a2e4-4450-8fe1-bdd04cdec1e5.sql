
-- Delete policies for staff/admin
CREATE POLICY "Staff delete messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete bookings" ON public.bookings FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete announcements" ON public.announcements FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Helper to compute next MU number, skipping non-numeric or TIC entries
CREATE OR REPLACE FUNCTION public.next_mu_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(admission_number, '^MU', ''), '')::int), 0) + 1
    INTO n
    FROM public.profiles
   WHERE admission_number ~ '^MU[0-9]+$';
  RETURN 'MU' || lpad(n::text, 3, '0');
END $$;
