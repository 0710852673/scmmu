# SCCMU remaining development

- [x] Inspect existing source, routes, permissions, live schema, local repository changes, and release-letter foundations without changing production data.
- [ ] Priority 1: PDF template designer, reusable layouts, live preview, printable server-generated PDFs; preserve the Word master.
- [ ] Priority 2: annual leadership periods, position assignments, historical boards, responsibility checklist, authorized finalization without administrator role changes.
- [ ] Priority 3: review deep security results, fix confirmed authorization/exposure issues, test access boundaries, document manual review.
- [ ] Priority 4: private drafts, review/publish/archive workflow and revision history, extending existing content review.
- [ ] Priority 5: real Google Drive connection, scheduled/manual backups, history and verified safe restore.
- [x] Welcome URL fixed; booking/notification authorization fixed; empty homepage events hidden.
- [ ] Follow-ups: error dashboard, yearly CSV/PDF exports, dynamic public booking services, GitHub CI status. (Attendance out of scope.)

## Authorization boundary
Production database changes, merging, publishing, and deployment require explicit user authorization. Implement schema-dependent work in an isolated development draft only after its separate test database is verified. GitHub provider connection/status cannot be established from local Git remotes alone.
