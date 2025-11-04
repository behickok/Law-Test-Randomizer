# Remediation Progress Log

## Priorities
- 🔴 Secure auth/token handling (remove public bearer token, drop arbitrary SQL access).
- 🟡 Improve credential storage and session management.
- 🟡 Restructure UI/API boundaries to minimise client-side business logic.
- 🟢 Tooling hygiene and documentation updates.

## Task Tracker

| Status | Area | Description | Notes |
| --- | --- | --- | --- |
| ✅ | Security | Move backend passphrase to private env and centralise server DB helper | Server routes now read `BACKEND_SERVICE_TOKEN` via private env helper |
| ✅ | Security | Replace client login/signup SQL calls with server endpoints and remove bearer token exposure | `/api/auth/*` endpoints added; login UI no longer injects bearer token |
| ✅ | Security | Lock down remaining API calls (tests, assignments, reviews) behind server endpoints with ownership checks | All teacher/student flows now use REST (attempt lifecycle, class rosters, signup/login); preparing for credential hardening |
| 🟡 | Auth | Hash PINs / migrate to passwords with rate limiting and proper sessions | Admin + auth endpoints hash PINs and hide secrets; login auto-upgrades legacy plaintext. Rate limiting and http-only server sessions now live (`src/routes/api/auth/login/+server.js:1`, `src/lib/server/loginRateLimit.js:1`, `src/lib/server/session.js:1`). Session guard now enforces teacher identity on assignment/grading/upload endpoints (`src/lib/server/authGuard.js:1`). Next: script dormant-account rehash, migrate to stronger credentials, and extend the guard to remaining teacher/admin APIs. |
| ◻️ | App UX | Split monolithic dashboard into focused flows | Pending |
| ◻️ | Tooling | Re-run lint/format fixes and set up CI guardrails | Pending |

## Credential Hardening Notes

- Admin creation flows now hash and never echo PINs for teachers/students/reviewers (`src/routes/api/admin/students/+server.js:3`, `src/routes/api/admin/reviewers/+server.js:3`).
- Admin dashboard surfaces credential status and allows opt-in PIN resets without exposing values (`src/routes/admin/+page.svelte:760`).
- Successful logins auto-upgrade legacy plaintext entries to hashed values in place (`src/routes/api/auth/login/+server.js:1`).
- Login endpoint now throttles brute-force attempts via `auth_login_limits` (`src/lib/server/loginRateLimit.js:1`, `migrations/013_add_auth_security.sql:1`).
- Server-issued, signed sessions persisted in `auth_sessions` replace the old localStorage identity (`src/lib/server/session.js:1`, `src/hooks.server.js:1`, `src/routes/api/auth/logout/+server.js:1`).
- Teacher-facing APIs now derive the teacher id from the authenticated session via `resolveTeacherId`, rejecting mismatched payloads across assignment, grading, test export, and upload routes (`src/lib/server/authGuard.js:1`, `src/routes/api/tests/assign/+server.js:1`, `src/routes/api/tests/upload/+server.js:1`, `src/routes/api/tests/[id]/questions/+server.js:1`, `src/routes/api/tests/teacher/[id]/+server.js:1`, `src/routes/api/results/teacher/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`, `src/routes/api/attempts/answers/grade/+server.js:1`).
- Migration guidance: schedule a backfill job that calls the login endpoint or a thin script to rehash dormant accounts; finish migrating to strong passwords and remove residual client-supplied identifiers from API payloads.
