# SCCMU — Missing Systems Integration Plan

Many of the 14 items already exist in part (coverage center, crew assignment, notification rules, activity log, bin, scheduled publishing, health page, yearly analytics, login error messages). This plan **extends** those rather than rebuilding them, and is split into 4 delivery batches so each one is tested before moving on.

## Batch A — Operations backbone (items 1, 2, 8, 11)
- **Smart Assignment:** a "services" list (Photography, Live Streaming, Editing…) each linked to a division. When a booking is saved, the matching division heads are auto-assigned, notified in the portal, and emailed. Admin can reassign; every change is kept in an assignment history. New services can be added from the admin page.
- **Smart Email:** extend the existing notification rules with an "email" switch per event type (client: received/approved/rejected/completed; heads: assignment; board: critical; members: assignment only). All sending goes through one central place.
- **Audit Log upgrade:** the existing activity log gains old value / new value, and database-level tracking for roles, points, bookings, settings, permissions and member details. Nobody can edit or delete entries; admins with the audit permission only.
- **Login protection:** failed-attempt counting, a 15-minute lock after 5 failures, logging of attempts, and an "Account inactive" state. Messages stay generic where needed to avoid revealing which emails exist.

## Batch B — Media & event pages (items 3, 4, 12)
- Gallery items gain: event link, caption, external link, "featured/selected" and publish status, with a soft limit warning (15 small / 50 large event).
- New **public event coverage page** per event (e.g. /events/nonimi-26): selected photos, highlight video, full livestream playable on the page (YouTube/Facebook embed), Facebook album link, and the coverage team grouped by division (pulled from assignments). Public/private toggle.
- Scheduled publishing: add cancel/reschedule and publication history; times shown and set in Sri Lanka time; an hourly check publishes due items.

## Batch C — Content lifecycle & PDFs (items 5, 6, 9)
- **Version history:** Draft → Review → Published → Archived for projects, announcements and event pages. Each save stores a version; admins can view, compare side-by-side, and restore. The live version stays unchanged while a draft is edited.
- **PDF Template Editor:** templates saved in the database (Official Letter, Certificate, Event Report, Contribution Report, Member Report, Booking Report) with logo, header, footer, stamp, watermark, colours, fonts, sizes, margins and alignment.
- **Live PDF preview:** the preview is the real PDF rendered in the page, so preview and download match exactly, including page count. Generated documents are stored and logged.

## Batch D — Reliability & continuity (items 7, 10, 13, 14)
- **Backup & Recovery Center** using Google Drive (you'll be asked to connect a Google account): Backup Now, history with type/size/status, daily database / weekly media / monthly full schedule. Restore needs the backup permission, a typed confirmation, and takes an automatic safety backup first.
- **Error management:** users only ever see "Something went wrong. Our team has been notified." Details are logged with passwords/tokens stripped, grouped by repeat count, with severity and a resolve status on an admin dashboard.
- **Yearly analytics:** extend the current page with a year picker (auto-lists every year with data), year-vs-year comparison, division and achievement breakdowns, and PDF/CSV export.
- **Leadership handover:** handover records (outgoing team, incoming team, date, status, responsibility checklist), handover documentation pages, and a guided role transfer that keeps the previous leadership in history.

## Permissions
New abilities added to the existing permissions system: `manage_backups`, `edit_pdf_templates`, `view_audit`, `manage_handover`, `manage_publishing`, `view_errors`. Admins don't get them automatically except the two current owner accounts. Every sensitive action is checked on the server.

## Technical details
- New tables: services, booking_assignments (+ history), login_attempts, media fields on gallery_items, event_pages, content_versions, publication_log, pdf_templates, generated_documents, backups, error_events (grouped by fingerprint), handovers, handover_docs. Audit triggers write to activity_logs (old/new jsonb).
- Scheduling via an hourly scheduled job (publishing) and daily job (backup) calling protected server routes; times in Asia/Colombo.
- PDF rendering via the existing jsPDF pipeline, previewed as a blob in an iframe.
- Every admin screen built mobile-first with card layouts on small screens.

## Note on usage
This is a large build. Your workspace was low on monthly credits last time — I'll deliver batch by batch (A first) so nothing is left half-finished.
