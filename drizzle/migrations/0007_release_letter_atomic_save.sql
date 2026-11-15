-- Atomically save a release letter and replace its complete member list.
-- This function is intentionally service-role only; the server action enforces staff access.

CREATE OR REPLACE FUNCTION public.save_release_letter_with_members(
  p_letter_id uuid,
  p_letter_date date,
  p_event_name text,
  p_body text,
  p_students jsonb,
  p_template_id uuid,
  p_created_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_letter public.release_letters;
BEGIN
  IF p_letter_date IS NULL THEN
    RAISE EXCEPTION 'A letter date is required';
  END IF;

  IF p_event_name IS NULL OR length(btrim(p_event_name)) = 0 OR length(btrim(p_event_name)) > 200 THEN
    RAISE EXCEPTION 'Event name must contain 1–200 characters';
  END IF;

  IF p_body IS NULL OR length(p_body) > 10000 THEN
    RAISE EXCEPTION 'Letter body must contain 0–10000 characters';
  END IF;

  IF p_students IS NULL OR jsonb_typeof(p_students) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Student list must be an array';
  END IF;

  IF jsonb_array_length(p_students) < 1 OR jsonb_array_length(p_students) > 100 THEN
    RAISE EXCEPTION 'A release letter must contain between 1 and 100 students';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_students) AS s(student)
    WHERE jsonb_typeof(s.student) IS DISTINCT FROM 'object'
      OR NULLIF(btrim(s.student->>'full_name'), '') IS NULL
      OR length(btrim(s.student->>'full_name')) > 200
      OR NULLIF(btrim(s.student->>'class_name'), '') IS NULL
      OR length(btrim(s.student->>'class_name')) > 80
  ) THEN
    RAISE EXCEPTION 'Every student needs a valid name and class';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_students) AS s(student)
    GROUP BY COALESCE(
      NULLIF(lower(btrim(s.student->>'member_user_id')), ''),
      lower(btrim(s.student->>'full_name'))
    )
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A student is listed more than once';
  END IF;

  IF p_letter_id IS NULL THEN
    IF p_created_by IS NULL THEN
      RAISE EXCEPTION 'The creator is required for a new release letter';
    END IF;

    INSERT INTO public.release_letters (
      ref_no,
      letter_date,
      event_name,
      body,
      status,
      template_id,
      created_by
    )
    VALUES (
      public.next_release_letter_ref(),
      p_letter_date,
      btrim(p_event_name),
      p_body,
      'draft',
      p_template_id,
      p_created_by
    )
    RETURNING * INTO v_letter;
  ELSE
    UPDATE public.release_letters
    SET
      letter_date = p_letter_date,
      event_name = btrim(p_event_name),
      body = p_body,
      updated_at = now()
    WHERE id = p_letter_id
    RETURNING * INTO v_letter;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Release letter not found';
    END IF;
  END IF;

  DELETE FROM public.release_letter_members
  WHERE letter_id = v_letter.id;

  INSERT INTO public.release_letter_members (
    letter_id,
    member_user_id,
    full_name,
    class_name,
    position
  )
  SELECT
    v_letter.id,
    CASE
      WHEN NULLIF(btrim(s.student->>'member_user_id'), '') IS NULL THEN NULL
      ELSE (s.student->>'member_user_id')::uuid
    END,
    btrim(s.student->>'full_name'),
    btrim(s.student->>'class_name'),
    (s.ordinality - 1)::integer
  FROM jsonb_array_elements(p_students) WITH ORDINALITY AS s(student, ordinality);

  RETURN to_jsonb(v_letter);
END;
$$;

REVOKE ALL ON FUNCTION public.save_release_letter_with_members(uuid, date, text, text, jsonb, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_release_letter_with_members(uuid, date, text, text, jsonb, uuid, uuid)
  TO service_role;
