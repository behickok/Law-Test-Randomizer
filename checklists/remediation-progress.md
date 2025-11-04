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
| 🟡 | Auth | Hash PINs / migrate to passwords with rate limiting and proper sessions | Admin + auth endpoints hash PINs and hide secrets; login auto-upgrades legacy plaintext. Next: backfill inactive accounts, add rate limiting, and move to server-backed sessions. |
| ◻️ | App UX | Split monolithic dashboard into focused flows | Pending |
| ◻️ | Tooling | Re-run lint/format fixes and set up CI guardrails | Pending |

## Credential Hardening Notes

- Admin creation flows now hash and never echo PINs for teachers/students/reviewers (`src/routes/api/admin/students/+server.js:3`, `src/routes/api/admin/reviewers/+server.js:3`).
- Admin dashboard surfaces credential status and allows opt-in PIN resets without exposing values (`src/routes/admin/+page.svelte:760`).
- Successful logins auto-upgrade legacy plaintext entries to hashed values in place (`src/routes/api/auth/login/+server.js:1`).
- Migration guidance: schedule a backfill job that calls the login endpoint or a thin script to rehash dormant accounts; add rate limiting + lockout in `/api/auth/login` and replace client-local sessions with signed server tokens.
