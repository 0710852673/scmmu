
CREATE TABLE IF NOT EXISTS public.featured_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role_title text NOT NULL,
  division text NOT NULL,
  rank int NOT NULL,
  points int NOT NULL DEFAULT 0,
  grade text,
  photo_url text,
  bio text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.featured_members TO anon, authenticated;
GRANT ALL ON public.featured_members TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.featured_members TO authenticated;

ALTER TABLE public.featured_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Featured members public read" ON public.featured_members
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage featured members" ON public.featured_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrator'::app_role));

INSERT INTO public.featured_members (full_name, role_title, division, rank, points, grade, photo_url, bio, display_order) VALUES
('Senuth Perera',     'President / Editor-in-Chief', 'Leadership',           1, 1820, 'Grade 13', 'https://i.pravatar.cc/400?img=12', 'Leads the unit and oversees every production from script to publish.', 1),
('Dinithi Jayawardena','Vice President',             'Live Streaming',       2, 1675, 'Grade 13', 'https://i.pravatar.cc/400?img=47', 'Runs the live desk for school assemblies and inter-school events.',     2),
('Tharindu Bandara',  'Lead Photographer',           'Photography',          3, 1540, 'Grade 13', 'https://i.pravatar.cc/400?img=15', 'Specialises in low-light sports and stage photography.',                3),
('Hasini Wickrama',   'Lead Video Editor',           'Videography & Editing',4, 1490, 'Grade 12', 'https://i.pravatar.cc/400?img=49', 'Edits the unit''s flagship monthly recap and event aftermovies.',       4),
('Kavindu Silva',     'Head of Graphics',            'Graphic Design',       5, 1355, 'Grade 12', 'https://i.pravatar.cc/400?img=33', 'Designs posters, thumbnails, lower-thirds and the unit''s social kit.', 5),
('Sineli Fernando',   'Social Media Lead',           'Social Media',         6, 1240, 'Grade 12', 'https://i.pravatar.cc/400?img=44', 'Plans the content calendar across Facebook, TikTok and Instagram.',     6),
('Ravindu Gunasekara','Announcer',                   'Announcing',           7, 1110, 'Grade 11', 'https://i.pravatar.cc/400?img=68', 'Voice of the morning bulletin and the live sports commentary team.',    7),
('Akila Madushan',    'Camera Operator',             'Videography & Editing',8,  985, 'Grade 11', 'https://i.pravatar.cc/400?img=60', 'Multi-cam operator for assemblies and the annual prize-giving.',        8),
('Nethmi Rathnayake', 'Junior Photographer',         'Photography',          9,  870, 'Grade 11', 'https://i.pravatar.cc/400?img=45', 'Covers club activities and behind-the-scenes documentation.',           9),
('Lakshan Wijesinghe','Technical Lead',              'Technical',           10,  760, 'Grade 12', 'https://i.pravatar.cc/400?img=53', 'Owns audio mixing, OBS scenes and the streaming hardware.',            10)
ON CONFLICT DO NOTHING;

INSERT INTO public.events (name, event_date, location, description, category) VALUES
('Annual Prize Giving 2026',     '2026-08-12', 'Main Hall',      'Live broadcast and multi-camera coverage of the school''s flagship awards night.', 'Ceremony'),
('Inter-House Sports Meet',      '2026-07-18', 'Sivali Grounds', 'Full-day coverage with live scoreboard, action photography and recap video.',      'Sports'),
('Sinhala & Tamil New Year Fest','2026-04-13', 'School Quad',    'Cultural celebration with traditional games and food stalls.',                    'Cultural'),
('Science Day Exhibition',       '2026-09-05', 'Science Block',  'Student exhibits, demonstrations and a live walkthrough on YouTube.',             'Academic'),
('Old Boys'' Day',                '2026-10-22', 'Main Hall',     'Reunion of alumni with panel talks and a special tribute reel.',                  'Community'),
('Christmas Carol Service',      '2026-12-15', 'School Chapel',  'Streamed carol service with a six-camera setup and live mixing.',                 'Cultural')
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (slug, title, summary, description, cover_image, event_date, is_featured, published) VALUES
('prize-giving-2025', 'Prize Giving 2025 — Aftermovie',
  'A three-minute cut of the year''s biggest night on the Sivali stage.',
  'Shot on five cameras with live audio capture. Released within 48 hours of the event.',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1200&q=80', '2025-08-14', true, true),
('sports-meet-2025', 'Inter-House Sports Meet 2025',
  'Full-day coverage — 1,400 photos, 12 short reels, one recap film.',
  'Trackside cameras, drone overheads and a live scoreboard handled by the technical team.',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80', '2025-07-20', true, true),
('cultural-fest-2025', 'Cultural Fest 2025',
  'A photo-essay on the colours and rituals of the New Year celebration.',
  'Documentary-style coverage focused on the performers and the kitchen crew behind the food stalls.',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80', '2025-04-13', true, true),
('open-day-stream', 'Open Day — Live Stream',
  'First fully student-produced live broadcast of the school''s Open Day.',
  'Three-camera live mix with on-screen graphics, lower-thirds and a roving interviewer.',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80', '2025-09-06', false, true)
ON CONFLICT (slug) DO NOTHING;
