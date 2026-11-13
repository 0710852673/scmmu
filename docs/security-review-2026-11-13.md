# SCCMU security and integrity review — 2026-11-13

## Scope

Read-only review of the notification dispatcher, content-submission callers, release-letter server functions, relevant authentication middleware, and live Supabase RLS metadata. No database writes, migrations, emails, role changes, deployments, or attendance changes were made.

## Confirmed findings

### 1. Authenticated members can forge content-submission notifications

**Severity: High (notification abuse; no direct content publication bypass identified).**

`dispatchNotification` permits any authenticated caller to invoke the `content.submitted` trigger, while every other trigger requires staff. The exception is not tied to a real pending record, the caller's ownership of that record, or a one-time submission event. The caller controls the title, body, and link. Active notification rules can then deliver portal notifications and email to configured recipients.

The legitimate UI calls this after project/gallery/announcement submissions through `notifySubmitted`, but that helper passes an empty context and does not identify the submitted row. A safe fix needs to replace the generic client-callable exception with a server-side submission notification that verifies the real row, its pending state, and `submitted_by = auth.uid()`, and prevents repeat delivery. Do not simply block all non-staff submissions; that would break the intended review workflow.

**Files:** `src/lib/notify.functions.ts`, `src/lib/review.ts`, and the admin content editor routes.

### 2. Release-letter member replacement can silently lose data

**Severity: High (data integrity).**

`saveReleaseLetter` deletes all existing `release_letter_members` rows and inserts replacements as separate operations, but ignores both returned errors. If the delete succeeds and insert fails, the saved letter can lose its student list while the UI reports success. If delete fails and insert succeeds, duplicate rows can remain.

Use one database transaction/RPC to update the letter and replace its member rows atomically. Validate the complete input and return an error unless every operation succeeds.

**File:** `src/lib/letters.functions.ts`.

### 3. Master-template activation is not atomic and errors are ignored

**Severity: Medium (administrative availability/integrity).**

`setActiveTemplate` deactivates other templates and activates the selected ID in separate unchecked updates. It does not verify that the requested template exists or that either update succeeded. `uploadLetterTemplate` deactivates the current template before inserting the replacement; an insert failure can leave no active template. A successful upload can also leave the uploaded storage object orphaned if the database insert fails.

Move activation to a transactional database function with validation. For uploads, insert and validate the new template before switching the active pointer, and clean up an orphaned upload on failure.

**File:** `src/lib/letters.functions.ts`.

### 4. Several release-letter mutations report success without checking database errors

**Severity: Medium (misleading UI / incomplete operations).**

`archiveReleaseLetter` ignores the update error. `generateReleaseLetterDocx` ignores both the storage upload error and the final database update error, then returns the generated document as if it were fully saved. The UI can therefore claim that a letter was generated even when its stored history is not updated.

Check and surface every storage/database error. Keep the downloaded document distinct from the persisted-generation status.

**File:** `src/lib/letters.functions.ts`.

## RLS observations (read-only)

- Release letters, release-letter members, and letter templates have staff/admin RLS policies; server functions also check staff roles before using the service-role client.
- Notification reads/updates/deletes are scoped to the authenticated user's own rows. The table's authenticated insert policy is staff-only; the dispatcher uses the privileged server client, which is why its caller authorization is critical.
- Public project reads require both `published` and `review_status = 'approved'`; public gallery reads require `review_status = 'approved'`.
- Announcements have a broad authenticated read policy (`USING (true)`). Confirm whether pending submissions are intentionally visible to every signed-in member before changing this policy; no policy change was made.

## Safe next steps

1. Implement and test the server-verified, de-duplicated content-submission notification path.
2. Add transactional RPCs for release-letter save/member replacement and template activation.
3. Check and surface storage/database errors in archive and DOCX generation.
4. Test signed-out, member, section-head, executive-board, TIC, administrator, and Super Admin boundaries.
5. Run these changes against a genuinely isolated development database before applying any migration. The connected Lovable project's database is enabled and is the live project backend; it is not a safe test database.

## Explicit exclusions

No production database writes or schema changes. No production emails, role/permission edits, merge, deployment, or changes to attendance/fingerprint systems. Google Drive backup remains deferred.
