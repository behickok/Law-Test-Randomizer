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
| ✅ | Security | Introduce parameterised SQL helper across server routes | `runQuery` now accepts `{ text, values }` for binding (`src/lib/server/db.js:1`), and the remaining high-risk endpoints have been migrated. Test uploads, auth signup, attempt answer retrieval, and grading all submit parameterised queries (`src/routes/api/tests/upload/+server.js:1`, `src/routes/api/auth/signup/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`, `src/routes/api/attempts/answers/grade/+server.js:1`). |
| 🟢 | Auth | Hash PINs / migrate to passwords with rate limiting and proper sessions | Admin + auth endpoints hash passphrases and hide secrets; login auto-upgrades legacy plaintext. Rate limiting and http-only server sessions now live (`src/routes/api/auth/login/+server.js:1`, `src/lib/server/loginRateLimit.js:1`, `src/lib/server/session.js:1`). Session guard now enforces teacher identity on assignment/grading/upload endpoints (`src/lib/server/authGuard.js:1`), and teacher dashboards no longer send `teacherId` to mutate or read tests—the server derives identity for test upload, assignment, deletion, question fetch, results, and grading flows (`src/lib/api.js:1`, `src/routes/api/tests/[id]/questions/+server.js:1`, `src/routes/api/results/teacher/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`, `src/routes/api/attempts/answers/grade/+server.js:1`). Review assignment APIs now require the authenticated session and ignore client-supplied teacher identifiers (`src/routes/api/review-assignments/+server.js:1`, `src/routes/api/review-assignments/[id]/+server.js:1`, `src/lib/api.js:1`, `src/lib/components/ReviewAssignment.svelte:1`, `src/routes/+page.svelte:1`). New shared credential validation enforces 10–128 character passphrases with letters and numbers across signup, admin resets, and reviewer flows, and the legacy PIN migration script sweeps dormant accounts (`src/lib/credentials.js:1`, `src/routes/api/auth/signup/+server.js:1`, `src/routes/api/admin/teachers/+server.js:1`, `src/routes/api/admin/students/+server.js:1`, `src/routes/api/admin/reviewers/+server.js:1`, `src/routes/api/admin/reviewers/[id]/+server.js:1`, `scripts/migrate-pins.js:1`). |
| 🟡 | App UX | Split monolithic dashboard into focused flows | Baseline audit complete; detailed workstream outlined below |
| ◻️ | Tooling | Re-run lint/format fixes and set up CI guardrails | Pending |

## Credential Hardening Notes

- Admin creation flows now hash and never echo passphrases for teachers/students/reviewers (`src/routes/api/admin/students/+server.js:3`, `src/routes/api/admin/reviewers/+server.js:3`).
- Admin dashboard surfaces credential status and allows opt-in passphrase resets without exposing values (`src/routes/admin/+page.svelte:760`).
- Successful logins auto-upgrade legacy plaintext entries to hashed values in place (`src/routes/api/auth/login/+server.js:1`).
- Login endpoint now throttles brute-force attempts via `auth_login_limits` (`src/lib/server/loginRateLimit.js:1`, `migrations/013_add_auth_security.sql:1`).
- Server-issued, signed sessions persisted in `auth_sessions` replace the old localStorage identity (`src/lib/server/session.js:1`, `src/hooks.server.js:1`, `src/routes/api/auth/logout/+server.js:1`).
- Teacher-facing APIs now derive the teacher id from the authenticated session via `resolveTeacherId`, rejecting mismatched payloads across assignment, grading, test export, and upload routes (`src/lib/server/authGuard.js:1`, `src/routes/api/tests/assign/+server.js:1`, `src/routes/api/tests/upload/+server.js:1`, `src/routes/api/tests/[id]/questions/+server.js:1`, `src/routes/api/tests/teacher/[id]/+server.js:1`, `src/routes/api/results/teacher/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`, `src/routes/api/attempts/answers/grade/+server.js:1`).
- Class roster retrieval now trusts the signed session exclusively; the client no longer sends `teacherId` and the server rejects unauthenticated access (`src/routes/api/classes/students/+server.js:1`, `src/lib/api.js:218`, `src/routes/+page.svelte:457`).
- Teacher dashboard API calls (assignments, deletions, question loads, grading, and results) now ignore client-supplied `teacherId` values; the client SDK stopped sending them and the server resolves identity from the session (`src/lib/api.js:1`, `src/routes/+page.svelte:1`, `src/routes/api/tests/[id]/questions/+server.js:1`, `src/routes/api/results/teacher/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`).
- Review assignment creation, updates, status changes, and deletions now enforce session-derived identity on the server and the UI/API no longer send teacher ids (`src/routes/api/review-assignments/+server.js:1`, `src/routes/api/review-assignments/[id]/+server.js:1`, `src/lib/api.js:1`, `src/lib/components/ReviewAssignment.svelte:1`, `src/routes/+page.svelte:1`).
- Migration guidance: schedule a backfill job that calls the login endpoint or a thin script to rehash dormant accounts; finish migrating to strong passwords and remove residual client-supplied identifiers from API payloads.
- Legacy SQL proxy endpoints are gone; all raw queries now originate from trusted server routes and helpers (`src/routes/api/tests/[id]/+server.js:1`, `src/routes/+page.server.js:1`, `src/lib/server/db.js:1`). Update admin docs to reflect the removal of `/api/query` tooling and follow up with UI affordances that no longer rely on it.
- Shared credential validation enforces strong passphrases with server-side checks and client hints (`src/lib/credentials.js:1`, `src/routes/login/+page.svelte:1`, `src/routes/admin/+page.svelte:1`, `src/lib/api.js:1`). Login accepts legacy PINs for compatibility but requires the new policy for all new accounts and resets (`src/routes/api/auth/login/+server.js:1`, `src/routes/api/auth/signup/+server.js:1`).
- Parameterisation rollout: documented the highest-risk SQL builders (test upload, cascade deletes, signup, grading) and shipped the parameter-aware `runQuery` signature so endpoints can pass `values` arrays instead of interpolating (`src/lib/server/db.js:1`). `/api/tests/[id]` DELETE uses the helper across its cascade (`src/routes/api/tests/[id]/+server.js:1`), and uploads, signup, attempt answer retrieval, and grading all issue parameterised statements (`src/routes/api/tests/upload/+server.js:1`, `src/routes/api/auth/signup/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`, `src/routes/api/attempts/answers/grade/+server.js:1`).

## App UX Workstream

- ✅ **Map existing dashboard flows** – Documented every teacher/student/reviewer path living under `src/routes/+page.svelte` and tied them to the audit findings to confirm scope of the split.
- ✅ **Identify pain points & priorities** – Reconciled audit usability issues (dashboard overload, CSV friction, missing confirmations, accessibility gaps) to feed into the restructure plan.
- 🟢 **Define navigation architecture** – Drafting the IA and navigation model for the restructured dashboard.
  - ✅ Captured the current entry points and grouped them into Teacher (Upload, Assignment, Attempts), Reviewer (Queue, Feedback), Student (Join, Attempt history), and Admin (Rosters, Imports, Safeguards) pillars.
  - ✅ Produced the first pass IA map outlining a persistent teacher sidebar with primary links (`Upload`, `Assign`, `Monitor`, `Results`) and contextual breadcrumbs for nested test pages.
  - 🟢 Review the IA with the security/app owners and document sign-off criteria so downstream work can reference an approved structure. _Stakeholder review scheduled alongside assignment workspace spec._
  - ✅ Convert the IA notes into a navigation component checklist (sidebar shell, header actions, route guard transitions). _Implemented `TeacherNavigation` with grouped nav metadata and layout guard at `/teacher`._
- ⬜ **Outline incremental extraction plan** – Sequence component moves so we can peel teacher upload and assignment flows into `/routes/tests/upload` and `/routes/tests/assign` without breaking shared state.
  - 🟢 Identify shared stores/helpers that need to migrate to module-scoped contexts before extraction. _CSV parser and preview helpers lifted into `src/lib/teacher/upload/parser.js`; additional stores pending for assignments._
  - ✅ Draft migration steps for upload flow (data prep, validation, submission) with rollback guidance. _Teacher upload now lives at `/teacher/upload` with isolated layout, progress UI, and legacy dashboard link for rollback._
  - 🟢 Document testing touchpoints (unit, smoke, accessibility) for each extracted page. _Upload workspace smoke plan drafted; axe + Playwright hooks to follow._
  - ✅ Build dedicated upload workspace shell with guarded teacher layout, sidebar nav, and migration fallback.
- ⬜ **Design CSV upload replacement** – Specify drag-and-drop + validation summary component shared between teacher upload and admin import flows.
  - ⬜ Define data model and error states for the shared CSV parser service.
  - ⬜ Produce wireframe for drag-and-drop interaction and validation summary banners.
  - ⬜ Align on accessibility requirements (keyboard triggers, ARIA live regions) with QA.
- ⬜ **Introduce UX safeguards for admin tooling** – Plan confirmation modals, searchable lists, and guardrails for destructive actions in `src/routes/admin/+page.svelte`.
  - ⬜ Inventory destructive actions (delete user, reset passphrase, deactivate test) and required confirmation language.
  - ⬜ Specify search/filter requirements for teachers, students, reviewers, and tests.
  - ⬜ Outline audit logging touchpoints so admin actions are traceable post-refactor.
- ⬜ **Accessibility & QA hooks** – Budget keyboard/focus checks and axe regressions for each newly extracted route before declaring the workstream complete.
  - ⬜ Build an axe smoke checklist for Upload, Assign, Monitor, and Admin screens.
  - ⬜ Define focus management patterns (initial focus targets, trap logic for modals) and document them alongside component specs.
  - ⬜ Schedule QA sign-off gates aligned with each milestone in the extraction plan.

### Next Update Gate

Socialise the teacher upload workspace with stakeholders, lock IA sign-off, and promote the assignment workspace spec so we can begin carving `/teacher/assign` with shared stores and QA hooks.
