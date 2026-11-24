# SCCMU 2.0 release-readiness checklist

This checklist is intentionally implementation-focused. It excludes attendance/fingerprint work, which is deferred.

## GitHub implementation before Lovable renewal
- [x] Privacy-safe assistant request contract and context sanitization
- [x] Privacy-safe diagnostics metadata normalization
- [x] Diagnostics redaction tests
- [x] Structured diagnostic incident model with safe metadata
- [x] Centralized coordination approval boundary
- [x] Scoped authorization helper and permission normalization tests
- [ ] Wire diagnostics into the existing error ingestion/dashboard route
- [ ] Route-level permission tests for Super Admin, administrator, and non-staff boundaries
- [ ] Finish and integrate PDF designer workflow
- [ ] Annual leadership/handover workflow
- [x] Revision history utility, comparison, restore-as-draft behavior, and tests (UI/database wiring pending)
- [x] CSV export utility with escaping/formatting tests (role-protected route wiring pending)
- [ ] Dynamic public booking services
- [ ] Final regression/build validation

## Lovable-only / credit-gated work
- Existing SCCMU Website project visual integration
- Preview-based responsive/UI polish
- Final end-to-end preview verification

## Safety
- Production Supabase untouched.
- No production migrations, writes, role changes, external integrations, messages, deployment, or publishing performed.
