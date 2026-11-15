# SCCMU remaining development

- [x] Inspect existing source, routes, permissions, live schema, local repository changes, and release-letter foundations without changing production data.
- [ ] Priority 1: PDF template designer, reusable layouts, live preview, printable server-generated PDFs; preserve the Word master.
- [ ] Priority 2: annual leadership periods, position assignments, historical boards, responsibility checklist, authorized finalization without administrator role changes.
- [ ] Priority 3: review deep security results, fix confirmed authorization/exposure issues, test access boundaries, document manual review.
- [ ] Priority 4: private drafts, review/publish/archive workflow and revision history, extending existing content review.
- [ ] Priority 5: real Google Drive connection, scheduled/manual backups, history and verified safe restore.
- [x] Empty homepage events hidden.
- [ ] Re-verify the welcome-email URL and dynamic public booking behavior on main; related changes remain in open review branches.
- [ ] Secure content.submitted notifications: main still allows forged authenticated requests; the guarded implementation is prepared in the 2026-11-15 feature branch.
- [ ] Follow-ups: error dashboard, yearly CSV/PDF exports, dynamic public booking services, GitHub CI status. (Attendance out of scope.)

## Authorization boundary
Production database changes, merging, publishing, and deployment require explicit user authorization. Implement schema-dependent work in an isolated development draft only after its separate test database is verified. GitHub provider connection/status cannot be established from local Git remotes alone.


## 2026-11-15 execution status
- GitHub repository 0710852673/scmmu is confirmed as the Lovable-connected repository: the Lovable project's latest commit matches GitHub main at 4ad3132f38b65156f395b70cd68398b2722315f4.
- Release-letter member replacement is prepared in PR #5. Its GitHub Actions CI passed, but its migration is not applied and the PR remains unmerged.
- Content-submission notification hardening is prepared in the dependent feature branch. It verifies ownership, pending status and record age in the database, and uses a unique claim to prevent repeated delivery. Its migration still requires isolated-database verification before rollout.
- Do not treat either change as production-complete until the migration and workflow are verified in an isolated database and reviewed.
- Attendance/fingerprint and Google Drive remain deferred.
