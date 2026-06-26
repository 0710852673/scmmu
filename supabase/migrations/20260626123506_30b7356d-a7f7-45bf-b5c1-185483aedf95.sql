
-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('member','section_head','executive_board','tic','administrator');
CREATE TYPE public.division_slug AS ENUM ('photography','editing','videography','streaming','technical','announcing','social_media');
CREATE TYPE public.skill_tier AS ENUM ('beginner','intermediate','advanced','expert');
CREATE TYPE public.event_participation_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.contribution_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.booking_status AS ENUM ('new','contacted','under_discussion','confirmed','completed','rejected');
CREATE TYPE public.booking_kind AS ENUM ('internal','inter_school');
CREATE TYPE public.media_status AS ENUM ('uploaded','editing','edited','caption_writing','review','approved','published');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  admission_number TEXT,
  grade TEXT,
  class TEXT,
  primary_division public.division_slug,
  join_date DATE DEFAULT CURRENT_DATE,
  whatsapp TEXT,
  email TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  division public.division_slug,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, division)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('section_head','executive_board','tic','administrator')) $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS
CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'administrator'))
  WITH CHECK (public.has_role(auth.uid(),'administrator'));

-- User roles RLS
CREATE POLICY "Roles visible to authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'administrator'))
  WITH CHECK (public.has_role(auth.uid(),'administrator'));

-- ===== DIVISIONS (public content) =====
CREATE TABLE public.divisions (
  slug public.division_slug PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  responsibilities TEXT,
  cover_image TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.divisions TO anon, authenticated;
GRANT ALL ON public.divisions TO service_role;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Divisions public read" ON public.divisions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage divisions" ON public.divisions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));

-- ===== PROJECTS (public content) =====
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  cover_image TEXT,
  event_date DATE,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects public read" ON public.projects FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY "Staff manage projects" ON public.projects FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ===== GALLERY =====
CREATE TYPE public.gallery_category AS ENUM ('photography','videography','behind_the_scenes','live_productions');
CREATE TABLE public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.gallery_category NOT NULL,
  title TEXT,
  image_url TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gallery public read" ON public.gallery_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage gallery" ON public.gallery_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ===== EVENTS =====
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  location TEXT,
  description TEXT,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events visible to authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update events" ON public.events FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins delete events" ON public.events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));

CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  division public.division_slug,
  is_lead BOOLEAN NOT NULL DEFAULT false,
  status public.event_participation_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO authenticated;
GRANT ALL ON public.event_participants TO service_role;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read participants" ON public.event_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members request participation" ON public.event_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff or owner update" ON public.event_participants FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Staff delete" ON public.event_participants FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- Missing event requests
CREATE TABLE public.missing_event_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE,
  description TEXT,
  status public.event_participation_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missing_event_requests TO authenticated;
GRANT ALL ON public.missing_event_requests TO service_role;
ALTER TABLE public.missing_event_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or staff read" ON public.missing_event_requests FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Members create" ON public.missing_event_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "Staff update" ON public.missing_event_requests FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));

-- ===== ATTENDANCE =====
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended_on DATE NOT NULL,
  meeting_label TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, attended_on, meeting_label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or staff read" ON public.attendance FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ===== SKILLS =====
CREATE TABLE public.member_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  division public.division_slug NOT NULL,
  tier public.skill_tier NOT NULL DEFAULT 'beginner',
  assigned_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, division)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_skills TO authenticated;
GRANT ALL ON public.member_skills TO service_role;
ALTER TABLE public.member_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills readable" ON public.member_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage skills" ON public.member_skills FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ===== ACHIEVEMENTS =====
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  division public.division_slug,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements public read" ON public.achievements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage achievements" ON public.achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));

CREATE TABLE public.member_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
GRANT SELECT, INSERT, DELETE ON public.member_achievements TO authenticated;
GRANT ALL ON public.member_achievements TO service_role;
ALTER TABLE public.member_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Member achievements readable" ON public.member_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff award" ON public.member_achievements FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff revoke" ON public.member_achievements FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- ===== CONTRIBUTIONS & POINTS =====
CREATE TYPE public.contribution_kind AS ENUM (
  'attend_meeting','participate_event','lead_event','upload_photo','approved_edit',
  'approved_caption','publish_post','complete_task','stream_op','camera_op','technical_task'
);

CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.contribution_kind NOT NULL,
  division public.division_slug,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  note TEXT,
  status public.contribution_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contributions readable" ON public.contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members log own" ON public.contributions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff review" ON public.contributions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TABLE public.points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_id UUID REFERENCES public.contributions(id) ON DELETE CASCADE,
  kind public.contribution_kind NOT NULL,
  division public.division_slug,
  points INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.points_log TO authenticated;
GRANT ALL ON public.points_log TO service_role;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Points readable" ON public.points_log FOR SELECT TO authenticated USING (true);

-- Auto-award points when a contribution is approved
CREATE OR REPLACE FUNCTION public.award_points_on_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts INT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    pts := CASE NEW.kind
      WHEN 'attend_meeting' THEN 1
      WHEN 'participate_event' THEN 5
      WHEN 'lead_event' THEN 10
      WHEN 'upload_photo' THEN 1
      WHEN 'approved_edit' THEN 3
      WHEN 'approved_caption' THEN 2
      WHEN 'publish_post' THEN 2
      WHEN 'complete_task' THEN 2
      WHEN 'stream_op' THEN 5
      WHEN 'camera_op' THEN 3
      WHEN 'technical_task' THEN 2
      ELSE 1 END;
    INSERT INTO public.points_log (user_id, contribution_id, kind, division, points)
    VALUES (NEW.user_id, NEW.id, NEW.kind, NEW.division, pts);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER award_points AFTER UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_approval();

-- ===== BOOKINGS =====
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.booking_kind NOT NULL,
  event_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  venue TEXT,
  event_type TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  audience_size INT,
  notes TEXT,
  status public.booking_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a booking" ON public.bookings FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Staff read bookings" ON public.bookings FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins delete bookings" ON public.bookings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));

-- ===== CONTACT MESSAGES =====
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone send message" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff read messages" ON public.contact_messages FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update messages" ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));

-- ===== MEDIAFLOW =====
CREATE TABLE public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  uploader_id UUID NOT NULL REFERENCES auth.users(id),
  editor_id UUID REFERENCES auth.users(id),
  caption_writer_id UUID REFERENCES auth.users(id),
  status public.media_status NOT NULL DEFAULT 'uploaded',
  raw_url TEXT,
  edited_url TEXT,
  caption TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_items TO authenticated;
GRANT ALL ON public.media_items TO service_role;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media readable to members" ON public.media_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members create media" ON public.media_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Owner or staff update" ON public.media_items FOR UPDATE TO authenticated
  USING (
    auth.uid() = uploader_id OR auth.uid() = editor_id OR
    auth.uid() = caption_writer_id OR public.is_staff(auth.uid())
  );
CREATE POLICY "Staff delete media" ON public.media_items FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- ===== ANNOUNCEMENTS =====
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  division public.division_slug,
  author_id UUID REFERENCES auth.users(id),
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff post announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));

-- ===== Seed divisions =====
INSERT INTO public.divisions (slug, name, description, display_order) VALUES
  ('photography','Photography','Capturing moments with professional-grade still imagery.',1),
  ('editing','Photo Editing & Graphic Design','Color, composition and design that elevates every frame.',2),
  ('videography','Videography & Video Editing','Cinematic storytelling from capture to final cut.',3),
  ('streaming','Live Streaming','Multi-cam broadcasts of campus events in real time.',4),
  ('technical','Technical','Audio, lighting, LED walls and infrastructure.',5),
  ('announcing','Announcing','Voices that carry the moment to every audience.',6),
  ('social_media','Social Media','The pulse of SCCMU online — captions, posts, reach.',7)
ON CONFLICT (slug) DO NOTHING;

-- ===== Seed achievements =====
INSERT INTO public.achievements (code, name, description) VALUES
  ('first_event','First Event','Participated in your first official event.'),
  ('events_10','10 Events','Participated in 10 events.'),
  ('events_25','25 Events','Participated in 25 events.'),
  ('events_50','50 Events','Participated in 50 events.'),
  ('stream_specialist','Stream Specialist','Operated 10+ live streams.'),
  ('senior_photographer','Senior Photographer','Recognised senior in Photography.'),
  ('senior_editor','Senior Editor','Recognised senior in Editing.'),
  ('most_active','Most Active Member','Top monthly contributor.')
ON CONFLICT (code) DO NOTHING;
