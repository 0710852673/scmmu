DROP POLICY IF EXISTS "Permission role create announcements" ON public.announcements;
CREATE POLICY "Permission role create announcements" ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'announcements.create') AND (
  public.has_permission(auth.uid(), 'announcements.publish')
  OR (review_status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
));
DROP POLICY IF EXISTS "Staff or owner update" ON public.event_participants;
CREATE POLICY "Staff update participants" ON public.event_participants FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owner update pending participation" ON public.event_participants FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);