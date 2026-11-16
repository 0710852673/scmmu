# SCCMU 2.0 delivery tracker

## Feature delivery
- [ ] First PDF layout-designer increment: live preview controls for margins, font size, line spacing, paragraph spacing and signature spacing. Implemented in draft PR #7; settings are browser-local and preview verification is pending.
- [ ] Complete the shared PDF template designer: reusable layouts, shared presets, server-side persistence and reliable printable output.
- [ ] Annual leadership terms, position assignments, board history and handover records.
- [ ] Content versioning and revision history across projects, gallery items and announcements.
- [ ] Role-based permission hardening with one user-controlled Super Admin and scoped regular Admin roles.
- [x] Existing admin activity/error monitoring and yearly analytics exports are present in the current codebase.
- [ ] AI coordination assistant using an existing model; Telegram first, WhatsApp later.

## Reliability work in review
- [ ] PR #5: atomic release-letter/member replacement. Draft; CI passed. Migration is prepared but has not been tested against an isolated development database or applied.
- [ ] PR #6: server-verified content-submission notifications. Draft stacked on PR #5; CI passed. Initial pending submissions are covered; later resubmissions still need versioned submission events.
- [x] Existing public booking, member, review, points and admin workflows are retained; do not redesign working dashboard areas without a verified reason.

## Explicitly deferred
- Google Drive backup and restore.
- Attendance and fingerprint-machine integration.

## Safety boundary
The connected Supabase database is production and must remain untouched. Do not apply migrations, write test data, change roles, send emails, merge pull requests, publish or deploy without explicit authorization. Validate database-dependent changes against a genuinely isolated development database first.
