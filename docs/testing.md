# Testing Guide

This project ships two complementary test suites:

- **Unit & integration (Vitest)** — exercises utilities, data stores, and API orchestration logic.
- **End-to-end (Playwright)** — validates critical user journeys (navigation, login validations).

Follow the steps below to keep the suites healthy and reproducible.

## 1. One-time prerequisites

```bash
npm install -D @vitest/coverage-v8@3.2.4
npx playwright install --with-deps
```

- `@vitest/coverage-v8@3.2.4` matches the Vitest 3.2.x release bundled with this repo and enables `--coverage` runs.
- `npx playwright install` downloads the Chromium runtime used by the e2e suite.

## 2. Unit and integration tests

```bash
# Fast feedback
npm run test:unit -- --run

# Coverage report (HTML in coverage/index.html)
npm run test:unit -- --coverage
```

- The npm script pins Vitest to `--maxWorkers=1` to stay compatible with environments that restrict worker threads (for example, Codespaces on Node 22).

What’s covered:

- `src/lib/api.js` data validation, SQL shaping, and branching (new attempt reuse).
- `src/lib/user.js` client store persistence.
- `src/lib/imageUtils.js` template parsing, validation, and helpers.

## 3. Playwright end-to-end tests

```bash
BACKEND_SERVICE_TOKEN=dummy-passphrase npm run test:e2e
```

Scenarios include:

- Navigating from the dashboard header to the Help Center.
- Client-side validation on the login form when no role is selected.

Tips:

- Run against `npm run dev` in another terminal for quicker iterations.
- Artifacts (screenshots/videos) live under `playwright-report/` when a test fails.

## 4. Troubleshooting

- **Channel closed / tinypool errors**: the script already runs in a single worker; if you need to override manually, use `npx vitest run --config vitest.config.js --maxWorkers=1`.
- **Missing PASS**: ensure `BACKEND_SERVICE_TOKEN` matches your backend or stub responses in Vitest using `vi.mock`.
- **Playwright browser missing**: rerun `npx playwright install`.

Keep this document updated when adding new suites or changing tooling defaults.
