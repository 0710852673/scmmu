DROP POLICY IF EXISTS "Members read participants" ON public.event_participants;
CREATE POLICY "Own or staff read participants" ON public.event_participants FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read permission roles" ON public.permission_roles;
CREATE POLICY "Staff or assigned read permission roles" ON public.permission_roles FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.user_permission_roles upr WHERE upr.role_id = permission_roles.id AND upr.user_id = auth.uid()));

DROP POLICY IF EXISTS "Media readable to members" ON public.media_items;
CREATE POLICY "Involved or staff read media" ON public.media_items FOR SELECT TO authenticated
USING (auth.uid() IN (uploader_id, editor_id, caption_writer_id) OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Skills readable" ON public.member_skills;
CREATE POLICY "Own or staff read skills" ON public.member_skills FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff(auth.uid()));