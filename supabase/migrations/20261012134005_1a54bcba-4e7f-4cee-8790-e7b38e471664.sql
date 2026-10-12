ALTER TABLE public.gallery_items
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS gallery_items_event_idx ON public.gallery_items(event_id);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cover_image text,
  ADD COLUMN IF NOT EXISTS highlight_video_url text,
  ADD COLUMN IF NOT EXISTS livestream_url text,
  ADD COLUMN IF NOT EXISTS album_url text,
  ADD COLUMN IF NOT EXISTS event_size text NOT NULL DEFAULT 'small';