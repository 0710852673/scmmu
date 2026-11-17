-- Server-verified, one-time notifications for newly created pending content.
-- This migration is additive and must be tested on an isolated database before rollout.
-- Failed claims can be retried; abandoned processing claims expire after ten minutes.

CREATE TABLE IF NOT EXISTS public.content_submission_notification_events (
  content_table text NOT NULL CHECK (content_table IN ('projects', 'gallery_items', 'announcements')),
  content_id uuid NOT NULL,
  submission_version timestamptz NOT NULL,
  submitted_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'delivered', 'failed')),
  claim_token uuid NOT NULL DEFAULT gen_random_uuid(),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (content_table, content_id, submission_version)
);

ALTER TABLE public.content_submission_notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.content_submission_notification_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.content_submission_notification_events TO service_role;

CREATE OR REPLACE FUNCTION public.claim_content_submission_notification(
  p_content_table text,
  p_content_id uuid,
  p_submitted_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_title text;
  v_submission_version timestamptz;
  v_claim_token uuid;
BEGIN
  IF p_content_table IS NULL OR p_content_table NOT IN ('projects', 'gallery_items', 'announcements') THEN
    RAISE EXCEPTION 'Unsupported content table';
  END IF;
  IF p_content_id IS NULL OR p_submitted_by IS NULL THEN
    RAISE EXCEPTION 'Content ID and submitter are required';
  END IF;

  CASE p_content_table
    WHEN 'projects' THEN
      SELECT COALESCE(NULLIF(btrim(title), ''), 'Untitled project'), updated_at
      INTO v_title, v_submission_version
      FROM public.projects
      WHERE id = p_content_id
        AND submitted_by = p_submitted_by
        AND review_status = 'pending'
        AND deleted_at IS NULL
        AND updated_at >= now() - interval '10 minutes'
        AND updated_at <= now() + interval '1 minute';
    WHEN 'gallery_items' THEN
      SELECT COALESCE(NULLIF(btrim(title), ''), 'Untitled media'), updated_at
      INTO v_title, v_submission_version
      FROM public.gallery_items
      WHERE id = p_content_id
        AND submitted_by = p_submitted_by
        AND review_status = 'pending'
        AND deleted_at IS NULL
        AND updated_at >= now() - interval '10 minutes'
        AND updated_at <= now() + interval '1 minute';
    WHEN 'announcements' THEN
      SELECT COALESCE(NULLIF(btrim(title), ''), 'Untitled announcement'), updated_at
      INTO v_title, v_submission_version
      FROM public.announcements
      WHERE id = p_content_id
        AND submitted_by = p_submitted_by
        AND review_status = 'pending'
        AND deleted_at IS NULL
        AND updated_at >= now() - interval '10 minutes'
        AND updated_at <= now() + interval '1 minute';
  END CASE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.content_submission_notification_events AS existing (
    content_table,
    content_id,
    submission_version,
    submitted_by,
    status,
    claim_token,
    claimed_at,
    completed_at
  )
  VALUES (
    p_content_table,
    p_content_id,
    v_submission_version,
    p_submitted_by,
    'processing',
    gen_random_uuid(),
    now(),
    NULL
  )
  ON CONFLICT (content_table, content_id, submission_version) DO UPDATE
  SET
    submitted_by = EXCLUDED.submitted_by,
    status = 'processing',
    claim_token = gen_random_uuid(),
    claimed_at = now(),
    completed_at = NULL
  WHERE existing.status = 'failed'
     OR (existing.status = 'processing' AND existing.claimed_at < now() - interval '10 minutes')
  RETURNING claim_token INTO v_claim_token;

  IF v_claim_token IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object('claim_token', v_claim_token, 'title', v_title);
END;
$function$;

CREATE OR REPLACE FUNCTION public.finish_content_submission_notification(
  p_content_table text,
  p_content_id uuid,
  p_claim_token uuid,
  p_succeeded boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.content_submission_notification_events
  SET
    status = CASE WHEN p_succeeded THEN 'delivered' ELSE 'failed' END,
    completed_at = CASE WHEN p_succeeded THEN now() ELSE NULL END
  WHERE content_table = p_content_table
    AND content_id = p_content_id
    AND claim_token = p_claim_token
    AND status = 'processing';

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_content_submission_notification(text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_content_submission_notification(text, uuid, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.finish_content_submission_notification(text, uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_content_submission_notification(text, uuid, uuid, boolean)
  TO service_role;
