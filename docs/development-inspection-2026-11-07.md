# SCCMU existing-work inspection — 7 November 2026

## Scope and verification limits
Read-only inspection of current source, route inventory, local Git status/history, live public schema, selected RLS/storage policies, and database function execution grants. No production records, accounts, templates, policies, or schema were changed. No emails were sent. No merge, publish, or deploy occurred. No workflow has been browser-tested or production-built in this inspection.

Local working tree was clean before inspection. Latest local commit was `27ba20c` (README.md). No tracked GitHub Actions workflow was found. Local remotes are Lovable-managed, not proof of the connected GitHub repository or its CI status; that status must be checked in the project's Git panel.

The live database contains 38 public tables, including attendance, services, notification_rules, letter_templates, release_letters, release_letter_members, and the existing content-review entities. No dedicated leadership-period, content-revision, backup-history, PDF-layout, or application-error tables were found. Source migration files alone do not establish that every statement was applied; the current schema is the authoritative inspected state.

## Existing features
| Feature | Verified state | Main evidence |
| --- | --- | --- |
| Attendance | Personal history and totals exist; no staff roster/marking route found. | `src/routes/_authenticated/portal.attendance.tsx` |
| Error monitoring | Error reporting utilities exist; no persistent admin error viewer found. | `src/lib/error-capture.ts`, `src/lib/lovable-error-reporting.ts`, `src/routes/_authenticated/portal.admin.health.tsx` |
| Yearly analytics | Year selection, totals and charts exist; yearly CSV/PDF export controls not found. | `src/lib/audit.functions.ts`, `src/routes/_authenticated/portal.admin.health.tsx` |
| Dynamic services | Services catalogue and editor exist in source and live schema; public booking still uses COVERAGE_SERVICES. | `src/routes/book.tsx`, `src/routes/_authenticated/portal.admin.services.tsx` |
| Booking notifications | Rule-driven notification/email dispatcher exists, but the exported dispatcher has no authentication middleware or caller authorization. | `src/lib/notify.functions.ts` |
| Homepage statistics | Reads configured statistics, but still has invented fallback values such as 68 members and 1,000 events. | `src/routes/index.tsx:60–68` |
| Welcome URL | Typo remains: `https://scmmu.lovable.app/auth`, not the primary SCCMU hostname. | `src/lib/onboarding.functions.ts:4` |
| GitHub build validation | No tracked Actions workflow; external GitHub connection/build/deployment status unverified. | Local repository inspection |

## Priority 1 foundations
Existing release-letter history, draft builder, student selection/reordering, Word generation, PDF preview/download, template upload/activation, archive, and delete are present.

The server DOCX generator downloads the master, updates placeholders in an in-memory copy, and writes a generated document. The stored master is not overwritten. PDF rendering is a separate browser jsPDF composition over extracted official letterhead artwork; it is **not** DOCX conversion and is **not** server-side. The PDF path ignores the stored per-template letterhead URL and uses a fixed bundled artwork pointer. Existing `pdf_path` does not establish that generated PDFs are stored.

Shared visual settings are not stored in the current schema. Persistent template designs need an additive storage model, generated type refresh, server validation, and explicit administrator authorization. PDF layout output must be distinguished from exact Word-master conversion; do not promise matching fonts/layout without a verified renderer.

Existing staff release-letter access includes administrator, TIC, section_head and executive_board. Do not silently widen or narrow this as part of designer work. Template changes remain administrator-only.

## Priority 2 foundations
The existing board editor manages `featured_members` and member links. It does not model annual leadership periods, checklist history, or authorized handover finalization. Preserve the current public board and all existing administrator grants. Historical position assignments must not become login privileges.

## Security review status
The quick scan returned no new actionable findings; its returned findings had already been ignored by the user and were left untouched. Connector credential scanning was skipped, so this is not a clean bill of health. A deep source-level review was started and its results are pending.

Confirmed source-level review target: `dispatchNotification` is an unauthenticated server function that uses the privileged client and can send mail/write notifications from caller-supplied content. Review all its callers before changing it so public bookings remain functional; do not merely add staff authentication to a public booking flow.

Inspected execution grants already restrict most privileged functions to service_role, and role helpers remain callable by authenticated users for RLS. `trg_renumber_members` is a SECURITY DEFINER trigger function with broad execution grants; review its callable behavior before any permission change rather than treating the grant alone as proof of exploitation. Letter storage is private with staff reads and administrator writes. No policy was removed or changed.

## Development boundary
The current thread is on the main project, which shares one backend with production. Therefore do not call the migration tool here without explicit production authorization. Use a development draft and verify its separate test database first; if draft isolation fails, stop all database writes. No real production data should be copied into tests or invented in production.