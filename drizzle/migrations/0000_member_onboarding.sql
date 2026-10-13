CREATE TABLE public.member_onboarding (
  user_id uuid PRIMARY KEY,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  email_status text NOT NULL DEFAULT 'awaiting_authorization',
  email_authorized_by uuid,
  email_authorized_at timestamptz,
  email_sent_at timestamptz,
  email_error text
);
GRANT SELECT ON public.member_onboarding TO authenticated;
GRANT ALL ON public.member_onboarding TO service_role;
ALTER TABLE public.member_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read onboarding" ON public.member_onboarding FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));
CREATE TRIGGER audit_member_onboarding AFTER INSERT OR UPDATE OR DELETE ON public.member_onboarding
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();