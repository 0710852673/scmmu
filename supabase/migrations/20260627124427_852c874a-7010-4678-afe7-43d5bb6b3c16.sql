
-- 1. Extend featured_members with board categorisation
ALTER TABLE public.featured_members
  ADD COLUMN IF NOT EXISTS board_category TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS section TEXT;

-- 2. site_stats: editable counters shown on the public homepage
CREATE TABLE IF NOT EXISTS public.site_stats (
  id INT PRIMARY KEY DEFAULT 1,
  total_members INT NOT NULL DEFAULT 68,
  active_members INT NOT NULL DEFAULT 40,
  photos_captured INT NOT NULL DEFAULT 3000,
  videos_produced INT NOT NULL DEFAULT 240,
  live_streams INT NOT NULL DEFAULT 50,
  events_covered INT NOT NULL DEFAULT 1000,
  projects_published INT NOT NULL DEFAULT 18,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_stats_singleton CHECK (id = 1)
);
GRANT SELECT ON public.site_stats TO anon, authenticated;
GRANT ALL ON public.site_stats TO service_role;
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stats public read" ON public.site_stats FOR SELECT USING (true);
CREATE POLICY "stats admin write" ON public.site_stats FOR ALL
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));
INSERT INTO public.site_stats (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 3. site_settings: hero text, contact, socials
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  hero_eyebrow TEXT NOT NULL DEFAULT 'Sivali Central College Media Unit',
  hero_title TEXT NOT NULL DEFAULT 'Every frame of school life — told by students.',
  hero_subtitle TEXT NOT NULL DEFAULT 'Photography, videography, live broadcast and storytelling for Sivali Central College. Run entirely by students, mentored by teachers in charge.',
  hero_cta_label TEXT NOT NULL DEFAULT 'Book Coverage',
  hero_cta_href TEXT NOT NULL DEFAULT '/book',
  whatsapp_number TEXT NOT NULL DEFAULT '+94 70 5951050',
  whatsapp_url TEXT NOT NULL DEFAULT 'https://wa.me/94705951050',
  email_address TEXT NOT NULL DEFAULT 'mediaunit.scc@gmail.com',
  address_line TEXT NOT NULL DEFAULT 'Media Unit, Sivali Central College, Ratnapura',
  facebook_url TEXT NOT NULL DEFAULT 'https://facebook.com/Sivali',
  youtube_url TEXT NOT NULL DEFAULT 'https://youtube.com/@Sivali_Central_College',
  whatsapp_channel_url TEXT NOT NULL DEFAULT 'https://whatsapp.com/channel/0029Val4k7w8V0tw1ipUEs3m',
  tiktok_url TEXT NOT NULL DEFAULT 'https://tiktok.com/@sccmu25',
  mediaflow_url TEXT NOT NULL DEFAULT 'https://sccmu.cybertec.lk/',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.site_settings FOR ALL
  USING (public.has_role(auth.uid(), 'administrator'))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'));
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 4. Helper trigger for updated_at on the singletons
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS site_stats_touch ON public.site_stats;
CREATE TRIGGER site_stats_touch BEFORE UPDATE ON public.site_stats
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS site_settings_touch ON public.site_settings;
CREATE TRIGGER site_settings_touch BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
