
DROP POLICY IF EXISTS "Anyone send message" ON public.contact_messages;

CREATE POLICY "Anyone send message" ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(btrim(name)) > 0
    AND length(btrim(message)) > 0
    AND (
      length(btrim(coalesce(email, ''))) > 0
      OR length(btrim(coalesce(whatsapp, ''))) > 0
    )
  );
