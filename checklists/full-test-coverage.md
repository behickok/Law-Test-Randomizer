# Full Test Coverage Checklist

This checklist guides the team toward confident, maintainable test coverage across the Law Test Randomizer application. Review and update it regularly as features change.

## 1. Preparation
- [ ] Confirm local tooling matches the `package.json` versions for `vitest`, `playwright`, and `svelte`.
- [ ] Run `npm run prepare` to sync SvelteKit and ensure generated files (e.g., `types.d.ts`) are current.
- [ ] Reset test data and seed scripts so local, CI, and staging environments produce consistent results.
- [ ] Document any external service dependencies; create mocks or fixtures for offline execution.

## 2. Coverage Baseline
- [ ] Execute `npm run test:unit -- --coverage` and record statement/branch/function/line metrics.
- [ ] Run `npm run test:e2e -- --reporter=list` (or CI reporter) to capture scenario pass rates.
- [ ] Compare coverage reports and failing specs against the latest feature map or product requirements.
- [ ] Create or update a coverage dashboard (spreadsheet or issue tracker) that logs gaps with owners and due dates.

## 3. Unit Testing Focus (Vitest)
- [ ] Inventory all modules under `src/` and ensure each exports at least one unit test file adjacent to the source or under `src/lib/__tests__`.
- [ ] Prioritize pure functions/helpers: assert edge cases, invalid inputs, and boundary conditions.
- [ ] For Svelte stores and derived state, simulate subscriptions and verify reactivity on state mutations.
- [ ] Stub network calls with `vi.mock`/`vi.fn` to isolate business logic from I/O.
- [ ] Verify error handling paths: rejected promises, thrown exceptions, fallback UI states.
- [ ] Add snapshot tests for complex computed outputs but avoid brittle snapshots of large Svelte components.
- [ ] Track uncovered lines using `--coverage` reports and add targeted test cases until the gap is closed or justified.

## 4. Component & Integration Testing
- [ ] Use `vitest` + `@testing-library/svelte` (if installed) to render critical Svelte components in isolation; assert DOM structure, events, and accessibility roles.
- [ ] Mock SvelteKit `load` functions and `fetch` responses to validate data-loading logic without hitting real endpoints.
- [ ] Verify component props and slots accept invalid/missing values gracefully.
- [ ] Cross-check integration tests with actual routing flows (see `src/routes/`) to ensure navigation and guards behave as expected.
- [ ] Add contract tests for API client modules to ensure request schemas match mock server responses.
- [ ] For database-backed features, run integration tests against an ephemeral database or deterministic fixtures.

## 5. End-to-End (Playwright)
- [ ] List all user journeys (including edge-case flows) and ensure each has at least one Playwright spec.
- [ ] Configure deterministic seeds/environment variables (`PUBLIC_PASSPHRASE`, etc.) for reproducible runs.
- [ ] Cover authentication, error pages, and permission boundaries; include assertions for redirects and protected routes.
- [ ] Validate responsiveness by running tests at multiple viewport sizes representative of target devices.
- [ ] Capture screenshots/videos for failing specs; archive them in CI artifacts for quick triage.
- [ ] Use test IDs in markup where selectors would otherwise be brittle; avoid coupling to styling hooks.

## 6. Cross-Cutting Concerns
- [ ] Accessibility: run automated a11y checks (e.g., `axe-core`) in component or e2e tests; add manual keyboard navigation checks.
- [ ] Performance: add smoke performance assertions (e.g., page load under N ms, key interactions under M ms) using Playwright traces or SvelteKit metrics.
- [ ] Security: include input sanitization tests and ensure sensitive data never appears in logs or client storage.
- [ ] Internationalization/localization: when applicable, test alternate locales and formatting edge cases.
- [ ] Time-dependent logic: freeze time with `vi.useFakeTimers` or Playwright `timeId` to cover scheduling/expiry behavior.

## 7. Regression & Maintenance
- [ ] Enforce test addition as part of the Definition of Done for new features and bug fixes.
- [ ] Require code review sign-off on test coverage deltas; highlight uncovered lines in PRs.
- [ ] Automate coverage thresholds in Vitest (`--coverage.include`, `coverageProvider`) and fail builds when thresholds drop.
- [ ] Schedule nightly or weekly full Playwright runs; keep a separate quick smoke suite for per-PR checks.
- [ ] Archive flaky test investigations with root cause and remediation steps; track recurrence.
- [ ] Clean up obsolete tests when features are removed to keep the suite relevant and fast.

## 8. Documentation & Reporting
- [ ] Update the README or `docs/testing.md` with instructions for running and troubleshooting each test suite.
- [ ] Ensure CI pipelines surface coverage artifacts (HTML reports) for developers to inspect.
- [ ] Maintain a change log of major test suite updates (new fixtures, utilities, frameworks).
- [ ] Review this checklist quarterly; adjust milestones and tooling as the project evolves.

## Sign-off
- [ ] All critical paths (user-facing and background jobs) report ≥ 90% coverage or have justified exclusions.
- [ ] No open high-severity bugs attributed to untested logic.
- [ ] CI green for unit, integration, and e2e suites across supported platforms.

