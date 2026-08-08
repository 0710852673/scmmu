ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'media_published';