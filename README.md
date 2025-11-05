# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## User flows

The app now uses session-backed passphrases for authentication. Teachers, students, and reviewers log in with a secure passphrase, and the server derives their identity for every action.

### Create or update a test by pasting from a spreadsheet

1. On the home page, open the **Edit Test Questions** section.
2. Choose an existing test to update or select "New Test..." and enter a title.
3. Paste rows from your spreadsheet where each row is `question,correct answer,wrong answer 1,...`.
4. Click **Preview** to review and optionally remove questions.
5. Click **Save Test** to create or update the test and its choices.

### Manage tests

- In **Manage Tests**, review the controls that appear once you're logged in.
- Use the **Activate/Deactivate** buttons next to each test to control availability.
- Click a test title to edit questions and answers directly from the dashboard.

### Review test responses

- Open **Review Test Responses** and click **Load Results** to see student scores for your tests.

### Assign a test to a student

- Use **Assign Test to Student** to pick a test, select the student, and click **Assign**.

### Student review of results

- Students can open **Student Results** and click **Load** to view their scores and completion times.

## Database migrations

This project targets Cloudflare D1. Migrations live in the `migrations/` directory and can be executed with Wrangler:

```sh
# Local development (uses wrangler.toml bindings)
wrangler d1 execute <DATABASE_NAME> --local --file migrations/001_init.sql
wrangler d1 execute <DATABASE_NAME> --local --file migrations/002_add_pins.sql

# Production
wrangler d1 execute <DATABASE_NAME> --file migrations/001_init.sql
wrangler d1 execute <DATABASE_NAME> --file migrations/002_add_pins.sql
```

Replace `<DATABASE_NAME>` with the binding configured in your `wrangler.toml`. The statements create the tables used by the app for tests, questions, and student attempts.

> **Security note:** The SvelteKit server now talks directly to the Cloudflare D1 binding. Ensure every environment (development, preview, production) defines a `DB` binding that points to the correct database. No bearer tokens are required or exposed to the browser.

## Authentication

Authentication is session-based and stored in HTTP-only cookies. All credential checks run on the server against the D1 database via the `DB` binding. Configure the binding through Wrangler/Cloudflare Pages to ensure server routes can access the database.
