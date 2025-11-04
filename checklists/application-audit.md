# Law-Test-Randomizer Application Audit (2025-11-04)

- **Overall Score:** 38 / 100  
- **Reviewer:** Codex (GPT-5)  
- **Scope:** SvelteKit frontend, API proxy routes, lib utilities, data migrations, automated tests.

## Snapshot
- **Notable strengths**
  - Core teacher/student/reviewer flows are implemented end-to-end with previews, assignment, grading, and reviewing supported in the UI (`src/routes/+page.svelte:1`).
  - Client-side validation helpers reduce accidental bad input and are covered by unit tests (`src/lib/api.js:8`, `src/lib/api.spec.js:1`).
  - Unit test suite runs quickly and passes (`npm run test:unit -- --run`).
- **Top risks**
  - Client-side SQL execution and exposed bearer token allow any user to run arbitrary reads/writes against production data (`src/lib/api.js:29`, `src/routes/api/query/+server.js:5`).
  - Short, unhashed PINs with no rate limiting or session management make account takeover trivial (`migrations/001_init.sql:27`, `src/routes/login/+page.svelte:33`).
  - Administrative UI gives every logged-in teacher direct SQL access, enabling privilege escalation and data loss (`src/routes/admin/+page.svelte:159`).

## Security (critical risks)
- **Client-managed SQL with exposed credentials.** All data access happens in the browser by building raw SQL strings before proxying them verbatim to the backend (`src/lib/api.js:29`, `src/routes/api/query/+server.js:5`). Attackers can craft any SQL (including destructive statements) without restriction. *Action:* Move to authenticated server-side endpoints with parameterised queries; drop the generic `/api/query` proxy.
- **Public bearer token.** The bearer token that protects the Railway backend is injected via `$env/static/public`, so it is bundled into the client and visible in DevTools and the repo (`src/routes/login/+page.svelte:33`, `src/routes/api/query/+server.js:11`). Anyone can replay it against production. *Action:* Treat the token as a server secret (`$env/static/private`), terminate all current tokens, and replace with real authentication.
- **No server-side ownership checks.** Critical mutations trust `teacher_id` supplied by the client (`src/routes/api/tests/upload/+server.js:66`), so any attacker can create, overwrite, or delete tests for other teachers. *Action:* Derive teacher identity from a secure session on the server and enforce row-level ownership.
- **Arbitrary SQL console.** The admin page exposes a raw SQL console to any teacher (`src/routes/admin/+page.svelte:159`). Combined with exposed credentials, this is equivalent to full database compromise. *Action:* Remove or heavily restrict this console, limiting it to vetted read-only diagnostics behind admin-only auth.
- **Weak credentials & storage.** User PINs are stored in plaintext (`migrations/001_init.sql:27`) and must be numeric, minimum four digits (`src/routes/login/+page.svelte:95`). There is no hashing, rotation, or brute-force protection. *Action:* Replace PINs with salted password hashes and add rate limiting, MFA, and password reset flows.
- **Untrusted local storage session.** User identity is stored entirely in `localStorage` and can be edited by the browser (`src/lib/user.js:33`). There is no server session or signature, so role escalation is as simple as editing the stored JSON. *Action:* Implement server-issued JWTs or HTTP-only cookies with signature checks.

## Usability
- **Overloaded home dashboard.** All teacher, student, assignment, review, and image workflows live on one giant page with dozens of toggles (`src/routes/+page.svelte:1`). This produces cognitive overload and makes discoverability poor. *Recommendation:* Split flows into focused routes (e.g., “Upload Tests”, “Assign Students”, “Review Submissions”) with guided navigation.
- **High-friction data entry.** Teachers must paste CSV-like text into a textarea (`src/routes/+page.svelte:213`) with limited inline validation or error surfacing. When parsing fails, errors are logged to the console rather than surfaced clearly. *Recommendation:* Provide drag-and-drop CSV upload with real-time validation summaries.
- **Admin workflows lack affordances.** The admin page expects teachers to remember IDs and PINs (`src/routes/admin/+page.svelte:26`) and exposes destructive actions without confirmation beyond `confirm()`. *Recommendation:* Add search, sorting, and explicit confirmation modals with contextual help.
- **Accessibility gaps.** Custom controls lack ARIA labelling and keyboard focus management in several components (e.g., modal toggles in `src/routes/+page.svelte:325`). *Recommendation:* Audit with axe or Lighthouse and add semantic roles/labels.

## Code Quality & Maintainability
- **Monolithic client API.** `src/lib/api.js` carries 600+ lines of mixed concerns (validation, SQL construction, business rules, randomisation). This impairs reuse and review. *Recommendation:* Split into domain-focused modules (tests, attempts, reviews) and push SQL construction server-side.
- **Console noise in server code.** Server load functions emit verbose emoji logging (`src/routes/tests/[id]/+page.server.js:3`) that will flood production logs. *Recommendation:* Replace with structured logging behind a debug flag.
- **Duplicated parsing logic.** CSV parsing is duplicated in both client (`src/routes/+page.svelte:184`) and server (`src/routes/api/tests/upload/+server.js:13`) with slightly diverging behaviour, increasing bug risk. *Recommendation:* Centralise parsing in a shared module.
- **Implicit dependencies.** Several functions require globals like `crypto` and `FormData` (e.g., `src/lib/api.js:454`) which fail in SSR contexts. *Recommendation:* Inject dependencies or guard for environment to avoid brittle runtime errors.

## Performance & Reliability
- **Unbounded data fetches.** Admin dashboards fetch all teachers, tests, and students without pagination (`src/routes/admin/+page.svelte:193`), which will degrade as data grows. *Recommendation:* Add server-side filtering and paging.
- **N+1 image requests.** `processQuestionsWithImagesOptimized` downloads each referenced image individually for every test load (`src/routes/tests/[id]/+page.server.js:44`). Large tests will incur long load times. *Recommendation:* Precompute resolved templates or batch image metadata server-side.
- **No failure handling for remote API.** Proxy routes assume the Railway backend is always up; failures surface as raw error strings in the UI. *Recommendation:* Add retries, timeouts, and user-friendly error states.

## Testing & Tooling
- **Unit tests exist but lack coverage of critical paths.** Tests cover utility functions but not security boundaries or server routes (`src/lib/api.spec.js:1`, `src/lib/user.spec.js:1`). There are no integration tests around login, uploads, or reviewer flows. *Recommendation:* Add Playwright smoke tests for each role and server-side API contract tests.
- **Linting currently fails.** `npm run lint` reports prettier violations across key files (`src/routes/+page.svelte:1`, `src/routes/tests/[id]/+page.server.js:1`). *Recommendation:* Enforce formatting in CI to catch drift.
- **No CI guidance.** README still mirrors the Svelte starter and omits auth/secrets setup, making onboarding uncertain (`README.md:1`). *Recommendation:* Document environment variables, migrations, and test data setup.

## Recommended Next Steps
1. **Shut down the client-side SQL proxy immediately.** Replace `/api/query` and friends with authenticated server endpoints that enforce ACLs and parameterised queries.
2. **Introduce real authentication.** Hash credentials, add password policies, and issue signed server sessions; remove public bearer tokens.
3. **Refactor the UI into dedicated flows.** Break the monolithic dashboard apart, prioritising clarity for teachers, students, and reviewers.
4. **Stabilise tooling.** Fix lint/format drift, add CI, and expand automated tests around the highest-risk paths.
5. **Plan a security hardening sprint.** Run threat modelling, add monitoring, and conduct penetration testing before onboarding more users.

## Remediation Log
- 2025-11-04 — Backend bearer token moved to private env with shared DB helper (`src/lib/server/env.js:1`, `src/lib/server/db.js:1`). `/api/auth` endpoints now handle login & signup so the client never sees the token (`src/routes/api/auth/login/+server.js:1`, `src/routes/api/auth/signup/+server.js:1`, `src/routes/login/+page.svelte:1`). Docs and scripts updated to require `BACKEND_SERVICE_TOKEN` instead of the public token (`README.md:88`, `docs/testing.md:33`, `package.json:15`).
- 2025-11-04 — Teacher test assignment, activation, grading, and student/teacher results now flow through dedicated server endpoints with ownership checks (`src/routes/api/tests/assign/+server.js:1`, `src/routes/api/tests/active/+server.js:1`, `src/routes/api/results/teacher/+server.js:1`, `src/routes/api/attempts/[attemptId]/answers/+server.js:1`, `src/routes/api/attempts/answers/grade/+server.js:1`, `src/routes/api/results/student/+server.js:1`). Client helpers updated to hit these endpoints and pass teacher context (`src/lib/api.js:94`, `src/lib/api.js:105`, `src/lib/api.js:140`, `src/lib/api.js:155`, `src/lib/api.js:172`, `src/lib/api.js:202`), and the dashboard consumes the new response shapes (`src/routes/+page.svelte:705`). Unit tests adjusted to cover the new REST calls (`src/lib/api.spec.js:88`).
- 2025-11-04 — Removed the admin "Database Query Panel" to stop teachers from executing arbitrary SQL from the browser (`src/routes/admin/+page.svelte:1`). Risk mitigated while we replace remaining admin workflows with scoped server endpoints.
- 2025-11-04 — Migrated admin teacher/student/reviewer flows onto `/api/admin` server routes, replacing client-originated SQL (`src/routes/api/admin/teachers/+server.js:1`, `src/routes/api/admin/students/+server.js:1`, `src/routes/api/admin/tests/copy/+server.js:1`, `src/routes/api/admin/classes/+server.js:1`, `src/routes/api/admin/reviewers/+server.js:1`, `src/lib/api.js:643`). Admin UI now consumes REST payloads and refreshes lists without exposing the bearer token (`src/routes/admin/+page.svelte:1`), and unit coverage guards the new endpoints (`src/lib/api.spec.js:166`).
- 2025-11-04 — Image library CRUD moved to protected server endpoints with teacher-scoped headers (`src/routes/api/admin/images/+server.js:1`, `src/routes/api/admin/images/[id]/+server.js:1`). Client utilities and ImageManager now use the REST API (`src/lib/api.js:818`, `src/lib/components/ImageManager.svelte:1`, `src/routes/admin/+page.svelte:326`), closing the last major direct SQL pathway in the admin UI.
- 2025-11-04 — Reviewer invite management now runs through server routes (`src/routes/api/admin/reviewer-invitations/+server.js:1`, `src/routes/api/reviewers/+server.js:1`); the client fetches active reviewers and invitations via REST (`src/lib/api.js:681`, `src/lib/api.js:749`) and ReviewAssignment loads the new payloads (`src/lib/components/ReviewAssignment.svelte:19`). Added tests to cover the new fetch contracts (`src/lib/api.spec.js:200`).
- 2025-11-04 — Review assignment creation, dashboards, and feedback submission now rely on REST endpoints (`src/routes/api/review-assignments/+server.js:1`, `src/routes/api/reviewer-assignments/+server.js:1`, `src/routes/api/reviewer-reviews/[id]/+server.js:1`, `src/routes/api/review-assignments/[id]/results/+server.js:1`). Teacher and reviewer clients consume the new responses (`src/lib/api.js:1130`, `src/routes/+page.svelte:500`, `src/lib/components/ReviewerDashboard.svelte:1`), with Vitest coverage locking in the request shapes (`src/lib/api.spec.js:230`).
- 2025-11-04 — Teacher test/question management now uses scoped endpoints for class rosters, invites, active tests, and inline question editing (`src/routes/api/classes/students/+server.js:1`, `src/routes/api/classes/join/+server.js:1`, `src/routes/api/tests/active/+server.js:1`, `src/routes/api/tests/[id]/questions/+server.js:1`, `src/routes/api/questions/[id]/+server.js:1`, `src/routes/api/choices/[id]/+server.js:1`, `src/routes/api/tests/teacher/[id]/+server.js:1`). The dashboard and editor call these APIs (`src/routes/+page.svelte:440`, `src/routes/tests/[id]/+page.svelte:112`), and unit tests cover the new contracts (`src/lib/api.spec.js:240`).
- 2025-11-04 — Public signup and login now flow exclusively through `/api/auth` with invitation handling, removing client-side SQL for account creation (`src/routes/api/auth/signup/+server.js:1`, `src/routes/api/auth/login/+server.js:1`). Client helpers and the login page submit to the REST API (`src/lib/api.js:520`, `src/routes/login/+page.svelte:1`), and new Vitest cases assert the payloads (`src/lib/api.spec.js:360`).
- 2025-11-04 — Student attempt lifecycle moved to server routes for start/save/submit, preventing tampering with SQL (`src/routes/api/attempts/start/+server.js:1`, `src/routes/api/attempts/[id]/answer/+server.js:1`, `src/routes/api/attempts/[id]/submit/+server.js:1`). Client code now hits these endpoints (`src/lib/api.js:380`, `src/routes/tests/[id]/+page.svelte:58`), with unit coverage verifying the new contracts (`src/lib/api.spec.js:180`).

## Appendix: Commands Run
- `npm run lint` (fails: prettier issues in 12 files)  
- `npm run test:unit -- --run` (passes: 4 files, 52 tests)
