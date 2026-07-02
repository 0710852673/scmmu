
-- =========================================================================
-- 1. SECURITY DEFINER function grants
-- =========================================================================
-- Revoke default PUBLIC EXECUTE on every SECURITY DEFINER helper.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_points_on_approval()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_mu_number()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_mu_number_on_profile()    FROM PUBLIC, anon, authenticated;

-- Role-check helpers are called by RLS policies of signed-in users, so
-- authenticated must still be able to execute them. Not anon.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid)           TO authenticated;

-- Triggers run as their owner regardless of the caller's grants, and
-- next_mu_number is only called from server-side admin code (service_role
-- keeps its ALL grant), so no additional grants are needed for the rest.

-- touch_updated_at is SECURITY INVOKER — no action needed.

-- =========================================================================
-- 2. profiles: tighten SELECT — only self or staff can read full rows
-- =========================================================================
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;

CREATE POLICY "Own profile readable" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Staff read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- =========================================================================
-- 3. contributions: only owner or staff can read
-- =========================================================================
DROP POLICY IF EXISTS "Contributions readable" ON public.contributions;

CREATE POLICY "Own contributions readable" ON public.contributions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff read all contributions" ON public.contributions
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- =========================================================================
-- 4. points_log: only owner or staff can read
-- =========================================================================
DROP POLICY IF EXISTS "Points readable" ON public.points_log;

CREATE POLICY "Own points readable" ON public.points_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff read all points" ON public.points_log
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- =========================================================================
-- 5. member_achievements: only owner or staff can read
-- =========================================================================
DROP POLICY IF EXISTS "Member achievements readable" ON public.member_achievements;

CREATE POLICY "Own achievements readable" ON public.member_achievements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff read all achievements" ON public.member_achievements
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- =========================================================================
-- 6. attendance: staff writes must record themselves as recorder
-- =========================================================================
DROP POLICY IF EXISTS "Staff manage attendance" ON public.attendance;

CREATE POLICY "Staff insert attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND recorded_by = auth.uid());

CREATE POLICY "Staff update attendance" ON public.attendance
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()) AND recorded_by = auth.uid());

CREATE POLICY "Staff delete attendance" ON public.attendance
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- =========================================================================
-- 7. bookings: require non-empty contact + at least one contact channel
-- =========================================================================
DROP POLICY IF EXISTS "Anyone can submit a booking" ON public.bookings;

CREATE POLICY "Anyone can submit a booking" ON public.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(btrim(contact_person)) > 0
    AND length(btrim(event_name)) > 0
    AND (
      length(btrim(coalesce(whatsapp, ''))) > 0
      OR length(btrim(coalesce(email, ''))) > 0
    )
  );
