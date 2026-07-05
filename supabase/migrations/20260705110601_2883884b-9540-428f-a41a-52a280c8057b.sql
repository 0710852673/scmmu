
CREATE TABLE public.email_templates (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read templates" ON public.email_templates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can modify templates" ON public.email_templates FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER email_templates_touch BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

INSERT INTO public.email_templates (key, label, subject, body_html) VALUES
('booking_submitted', 'Booking received (to requester)',
  'Request received — {{event_name}}',
  '<p>Hi {{contact_person}},</p><p>We''ve received your coverage request for <strong>{{event_name}}</strong>. Our team will reach out on WhatsApp shortly.</p>{{details_table}}'),
('booking_confirmed', 'Booking confirmed (to requester)',
  'Booking confirmed — {{event_name}}',
  '<p>Hi {{contact_person}},</p><p>Great news — your coverage for <strong>{{event_name}}</strong> on {{event_date}} at {{venue}} has been approved. We''ll coordinate details on WhatsApp.</p>'),
('booking_rejected', 'Booking rejected (to requester)',
  'Booking update — {{event_name}}',
  '<p>Hi {{contact_person}},</p><p>Unfortunately we won''t be able to cover <strong>{{event_name}}</strong>.</p><p><strong>Reason:</strong> {{reason}}</p><p>Feel free to reach us on WhatsApp if you''d like to discuss alternatives.</p>'),
('booking_completed', 'Coverage complete (to requester)',
  'Coverage complete — {{event_name}}',
  '<p>Hi {{contact_person}},</p><p>Your coverage for <strong>{{event_name}}</strong> is complete. Photos and video will be shared shortly. Thank you!</p>'),
('booking_contacted', 'We''ve been in touch (to requester)',
  'We''ve been in touch — {{event_name}}',
  '<p>Hi {{contact_person}},</p><p>Our team has reached out regarding <strong>{{event_name}}</strong>. Please check WhatsApp.</p>'),
('contact_confirmation', 'Contact form confirmation (to sender)',
  'We got your message — {{subject}}',
  '<p>Hi {{name}},</p><p>Thanks for reaching out to SCCMU. We''ve received your message and will reply within 48 hours.</p><blockquote style="border-left:3px solid #e11d48;padding:8px 14px;margin:14px 0;background:#fafafa">{{message}}</blockquote>'),
('staff_notification', 'New booking notification (to staff)',
  'New booking · {{event_name}}',
  '<p>A new coverage request has arrived.</p>{{details_table}}<p style="font-size:13px;color:#666">Review &amp; approve inside the portal.</p>')
ON CONFLICT (key) DO NOTHING;
