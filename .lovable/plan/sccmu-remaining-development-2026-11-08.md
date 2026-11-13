# SCCMU remaining development

## Inspection findings
The current source does not contain all the work listed as previously completed. Attendance history and yearly charts exist, but staff attendance marking, an admin error dashboard, and yearly CSV/PDF exports are not present. The services editor exists, while the public booking form still uses a fixed list. The welcome-email URL typo and inaccurate homepage fallback statistics remain. Existing review queues, board editing, release-letter history, and Word generation will be reused.

The live database was inspected without writes. Local repository status was clean, but the connected GitHub repository, its checks, and deployed version cannot be verified from local remotes. The quick security scan found no new actionable findings; the deeper source review is running.

## Safe development boundary
- Create a separate development draft for implementation and verify that it has its own test database before any schema change.
- If isolation is unavailable, stop database writes and request authorization; do not use the live backend as a substitute.
- Do not merge, accept the draft into main, publish, deploy, send real emails, modify real administrator permissions, or apply production migrations without explicit authorization.
- Preserve the current SCCMU design, accounts, records, member IDs, existing workflows, and master Word template.

## Priority 1 — PDF template designer
- Extend the existing Release Letters area with administrator-only reusable PDF layouts and a visual editor.
- Support editable headings, static text, dates and dynamic letter fields; position, width, alignment, font size/style, spacing, and supported formatting controls.
- Reuse SCCMU's official logo/letterhead artwork. Keep the master DOCX unchanged and clearly separate PDF layout settings from Word-master output.
- Generate the preview and printable PDF from the same validated layout on the server. Handle wrapping, page boundaries, long member lists, stale previews, and generation failures.
- Save reusable layout versions and associate generated output with the chosen version so later design changes do not alter historical letters.
- Verify saving/reopening, permissions, preview/download consistency, pagination and desktop/mobile use. Render generated PDF pages for visual inspection and confirm master-file preservation.

**Important limitation:** current PDFs are browser-generated compositions, not exact Word conversions. Do not claim the designer converts arbitrary DOCX designs. Exact DOCX-to-PDF rendering may need a compatible external conversion service; disclose that requirement before adding a service, credentials, or cost.

## Priority 2 — Leadership handover
- Extend the existing board/member system with annual periods and current/historical position assignments by department.
- Provide a guided transition: period details, incoming assignments, responsibility transfer, checklist, review and final authorization.
- Track each checklist item's responsible member and completion date; preserve outgoing board history and documents.
- Finalization requires server-side authorization and explicit confirmation. Update current leadership atomically, prevent conflicting active periods, and leave all administrator grants untouched.
- Test draft resumption, checklist completion, unauthorized attempts, finalization, history, and preservation of current administrators.

## Priority 3 — Security hardening
- Review the deeper scan and confirmed evidence across RLS, privileged function grants, storage, authentication, server actions and sensitive output.
- Inspect the unauthenticated notification dispatcher and every caller; secure mail/notification actions without breaking public booking submission.
- Fix only confirmed vulnerabilities with narrowly scoped changes. Preserve deliberately public reads and previously ignored findings.
- Test signed-out, member, staff and administrator boundaries. Document unresolved manual reviews and provider settings rather than claiming everything is secure.

## Priority 4 — Content versioning
Begin only after Priorities 1–3 are complete and verified.
- Extend existing content editors/review queues for announcements, events, projects and gallery content.
- Add Draft, Under Review, Published and Archived states, private owner/staff read paths, reviewer decisions and publication authorization.
- Keep the live published version unchanged while draft revisions are edited.
- Store revision snapshots with creator/editor/reviewer/publisher identities and timestamps; allow authorized historical comparison/restoration and administrator access to archives.
- Test draft privacy, submit/reject/approve/publish, revision restoration, archived access and public pages.

## Priority 5 — Google Drive backups
Begin only after Priorities 1–4 are complete and verified.
- Use a real SCCMU-owned Google Drive connection and a dedicated backup folder; do not create a success-looking interface before the connection works.
- Implement timestamped manual and daily backups, manifests, backup history, success/failure details and last successful backup date.
- Define record/file coverage, exclusions, sensitive-data handling and restoration limitations explicitly. Do not imply application records include authentication credentials or a complete platform recovery image.
- Protect scheduled privileged work with a server-only secret, not the public project key.
- Restore requires authorization, validation, a safety backup, explicit confirmation and a tested recovery procedure. Test restores only in the isolated database.
- Record required Google authorization, folder access, scheduling and deployment steps; pause when credentials or approval are missing.

## Verification follow-ups
Keep the missing attendance/error/export work and confirmed service/URL/statistics issues on the roadmap; do not silently treat them as completed or rebuild them during a higher-priority task. Report their exact remaining scope after Priority 1, then schedule them without starting content versioning or backups early.

## Technical approach
- Reuse TanStack Start server functions, existing authenticated middleware, role tables, portal controls, private letter storage, jsPDF/fflate and current content entities.
- Apply only additive schema changes through the migration tool, and only against the verified isolated development database until production approval.
- Add focused tests for permissions, transition rules, layout validation, master preservation and publication privacy. Never include secrets in logs, exports or browser bundles.
- Use the platform's automatic production-build/typecheck validation; do not manually run project builds. Report actual validation results rather than claiming a requested production build ran.

## Report after each priority
Provide a completion summary, modified-file list, database changes, tests and automatic build results, remaining issues and manual configuration requirements. Do not advance to the next priority while the current one is blocked or its central workflow is unverified.

## 2026-11-13 progress update
- The GitHub Actions run for commit `81d76af6a0e456189134a62ca163ab044feb11e1` completed successfully: dependency install, lint step (configured non-blocking because the existing repository-wide lint baseline is not clean), and production build all completed. This does not mean the lint backlog is fixed.
- A read-only security/integrity review is documented in `docs/security-review-2026-11-13.md`. Confirmed findings: the authenticated `content.submitted` notification exception is forgeable; release-letter member replacement is non-atomic and ignores errors; master-template activation/upload can leave no active template; archive and DOCX generation ignore persistence errors.
- Live Supabase RLS metadata was inspected read-only. The connected Lovable project's database is enabled and is the live backend, not an isolated test database. Do not apply migrations or test writes there.
- PDF designer, leadership handover, and content versioning remain unimplemented. They require an isolated development database and verified transaction/permission tests. Do not use localStorage as a substitute for durable version history or handover records.
- Google Drive backup remains deferred. Attendance/fingerprint remains excluded.
