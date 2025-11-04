# Remediation Progress Log

## Priorities
- 🟡 Secure auth/token handling (remove public bearer token, drop arbitrary SQL access).
- 🟡 Improve credential storage and session management.
- 🟡 Restructure UI/API boundaries to minimise client-side business logic.
- 🟢 Tooling hygiene and documentation updates.

## Task Tracker

| Status | Area | Description | Notes |
| --- | --- | --- | --- |
| ✅ | Security | Move backend passphrase to private env and centralise server DB helper | Server routes now read `BACKEND_SERVICE_TOKEN` via private env helper |
| ✅ | Security | Replace client login/signup SQL calls with server endpoints and remove bearer token exposure | `/api/auth/*` endpoints added; login UI no longer injects bearer token |
| ✅ | Security | Lock down remaining API calls (tests, assignments, reviews) behind server endpoints with ownership checks | All teacher/student flows now use REST (attempt lifecycle, class rosters, signup/login); preparing for credential hardening |
| ✅ | Security | Remove generic SQL proxy endpoints and client helpers | `/api/query` and `/api/query-file` removed; SvelteKit pages now call server helpers directly (`src/routes/tests/[id]/+page.server.js:1`, `src/routes/+page.server.js:1`). Introduced `/api/tests/[id]` DELETE endpoint for secure cascade removal (`src/routes/api/tests/[id]/+server.js:1`), and client SDK now targets it (`src/lib/api.js:1`). Next: audit admin tooling for any remaining raw SQL affordances. |
| 🟡 | Auth | Hash PINs / migrate to passwords with rate limiting and proper sessions | Admin + auth endpoints hash PINs and hide secrets; login auto-upgrades legacy plaintext. Rate limiting and http-only server sessions now live (`src/routes/api/auth/login/+server.js:1`, `src/lib/server/loginRateLimit.js:1`, `src/lib/server/session.js:1`). Session guard now enforces teacher identity on assignment/grading/upload endpoints (`src/lib/server/authGuard.js:1`), and teacher dashboards no longer send `teacherId` to mutate or read tests—the server derives identity for test upload, assignment, deletion, question fetch, results, and grading flows (`src/lib/api.js:1`, `src/routes/api/tests/[id]/questions/+server.js:1`, `src/routes/api/results/teacher/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`, `src/routes/api/attempts/answers/grade/+server.js:1`). Review assignment APIs now require the authenticated session and ignore client-supplied teacher identifiers (`src/routes/api/review-assignments/+server.js:1`, `src/routes/api/review-assignments/[id]/+server.js:1`, `src/lib/api.js:1`, `src/lib/components/ReviewAssignment.svelte:1`, `src/routes/+page.svelte:1`). Next: script dormant-account rehash, migrate to stronger credentials, and finish removing client-supplied identifiers from remaining admin APIs. |
| ◻️ | App UX | Split monolithic dashboard into focused flows | Pending |
| ◻️ | Tooling | Re-run lint/format fixes and set up CI guardrails | Pending |

## Credential Hardening Notes

- Admin creation flows now hash and never echo PINs for teachers/students/reviewers (`src/routes/api/admin/students/+server.js:3`, `src/routes/api/admin/reviewers/+server.js:3`).
- Admin dashboard surfaces credential status and allows opt-in PIN resets without exposing values (`src/routes/admin/+page.svelte:760`).
- Successful logins auto-upgrade legacy plaintext entries to hashed values in place (`src/routes/api/auth/login/+server.js:1`).
- Login endpoint now throttles brute-force attempts via `auth_login_limits` (`src/lib/server/loginRateLimit.js:1`, `migrations/013_add_auth_security.sql:1`).
- Server-issued, signed sessions persisted in `auth_sessions` replace the old localStorage identity (`src/lib/server/session.js:1`, `src/hooks.server.js:1`, `src/routes/api/auth/logout/+server.js:1`).
- Teacher-facing APIs now derive the teacher id from the authenticated session via `resolveTeacherId`, rejecting mismatched payloads across assignment, grading, test export, and upload routes (`src/lib/server/authGuard.js:1`, `src/routes/api/tests/assign/+server.js:1`, `src/routes/api/tests/upload/+server.js:1`, `src/routes/api/tests/[id]/questions/+server.js:1`, `src/routes/api/tests/teacher/[id]/+server.js:1`, `src/routes/api/results/teacher/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`, `src/routes/api/attempts/answers/grade/+server.js:1`).
- Class roster retrieval now trusts the signed session exclusively; the client no longer sends `teacherId` and the server rejects unauthenticated access (`src/routes/api/classes/students/+server.js:1`, `src/lib/api.js:218`, `src/routes/+page.svelte:457`).
- Teacher dashboard API calls (assignments, deletions, question loads, grading, and results) now ignore client-supplied `teacherId` values; the client SDK stopped sending them and the server resolves identity from the session (`src/lib/api.js:1`, `src/routes/+page.svelte:1`, `src/routes/api/tests/[id]/questions/+server.js:1`, `src/routes/api/results/teacher/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`).
- Review assignment creation, updates, status changes, and deletions now enforce session-derived identity on the server and the UI/API no longer send teacher ids (`src/routes/api/review-assignments/+server.js:1`, `src/routes/api/review-assignments/[id]/+server.js:1`, `src/lib/api.js:1`, `src/lib/components/ReviewAssignment.svelte:1`, `src/routes/+page.svelte:1`).
- Migration guidance: schedule a backfill job that calls the login endpoint or a thin script to rehash dormant accounts; finish migrating to strong passwords and remove residual client-supplied identifiers from API payloads.
- Legacy SQL proxy endpoints are gone; all raw queries now originate from trusted server routes and helpers (`src/routes/api/tests/[id]/+server.js:1`, `src/routes/+page.server.js:1`, `src/lib/server/db.js:1`). Update admin docs to reflect the removal of `/api/query` tooling and follow up with UI affordances that no longer rely on it.
