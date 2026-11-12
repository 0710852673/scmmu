DROP POLICY IF EXISTS "Permission role create gallery" ON public.gallery_items;
CREATE POLICY "Permission role create gallery" ON public.gallery_items FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'gallery.create') AND (
  public.has_permission(auth.uid(), 'gallery.publish')
  OR (review_status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
));
DROP POLICY IF EXISTS "Permission role edit gallery" ON public.gallery_items;
CREATE POLICY "Permission role edit gallery" ON public.gallery_items FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'gallery.edit'))
WITH CHECK (public.has_permission(auth.uid(), 'gallery.edit') AND (
  public.has_permission(auth.uid(), 'gallery.publish')
  OR (review_status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
));