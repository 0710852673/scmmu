-- Server-side error aggregation. No browser role can read or write these records directly.

CREATE TABLE IF NOT EXISTS public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL UNIQUE,
  error_name text NOT NULL DEFAULT 'Error',
  message text NOT NULL,
  route text,
  method text,
  occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note text
);

CREATE INDEX IF NOT EXISTS error_events_last_seen_idx
  ON public.error_events(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS error_events_open_idx
  ON public.error_events(last_seen_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.error_events FROM anon, authenticated;
GRANT ALL ON public.error_events TO service_role;

CREATE OR REPLACE FUNCTION public.record_error_event(
  _fingerprint text,
  _error_name text,
  _message text,
  _route text,
  _method text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.error_events(fingerprint, error_name, message, route, method)
  VALUES (left(_fingerprint, 64), left(_error_name, 100), left(_message, 500), left(_route, 240), left(_method, 12))
  ON CONFLICT (fingerprint) DO UPDATE SET
    error_name = EXCLUDED.error_name,
    message = EXCLUDED.message,
    route = EXCLUDED.route,
    method = EXCLUDED.method,
    occurrence_count = public.error_events.occurrence_count + 1,
    last_seen_at = now(),
    resolved_at = NULL,
    resolved_by = NULL,
    resolution_note = NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.record_error_event(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_error_event(text, text, text, text, text) TO service_role;
