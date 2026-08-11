CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permission_roles upr
    JOIN public.permission_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = _user_id
      AND pr.active = true
      AND _permission = ANY(pr.permissions)
  )
$$;

REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

CREATE POLICY "Permission role create gallery"
ON public.gallery_items
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'gallery.create'));

CREATE POLICY "Permission role edit gallery"
ON public.gallery_items
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'gallery.edit'))
WITH CHECK (public.has_permission(auth.uid(), 'gallery.edit'));

CREATE POLICY "Permission role delete gallery"
ON public.gallery_items
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'gallery.delete'));

CREATE POLICY "Permission role read own gallery submissions"
ON public.gallery_items
FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

CREATE POLICY "Permission role create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'projects.create'));

CREATE POLICY "Permission role edit projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'projects.edit'))
WITH CHECK (public.has_permission(auth.uid(), 'projects.edit'));

CREATE POLICY "Permission role delete projects"
ON public.projects
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'projects.delete'));

CREATE POLICY "Permission role read own project submissions"
ON public.projects
FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

CREATE POLICY "Permission role create announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'announcements.create'));

CREATE POLICY "Permission role publish announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (public.has_permission(auth.uid(), 'announcements.publish'))
WITH CHECK (public.has_permission(auth.uid(), 'announcements.publish'));

CREATE POLICY "Permission role read own announcement submissions"
ON public.announcements
FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());