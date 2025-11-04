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
| ◻️ | Auth | Hash PINs / migrate to passwords with rate limiting and proper sessions | Pending |
| ◻️ | App UX | Split monolithic dashboard into focused flows | Pending |
| ◻️ | Tooling | Re-run lint/format fixes and set up CI guardrails | Pending |
