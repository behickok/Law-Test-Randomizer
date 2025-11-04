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

The app now uses simple PIN codes rather than full authentication. A teacher PIN is stored with each test and a student PIN is stored with each test attempt.

### Create or update a test by pasting from a spreadsheet

1. On the home page, open the **Edit Test Questions** section.
2. Choose an existing test to update or select "New Test..." and enter a title.
3. Paste rows from your spreadsheet where each row is `question,correct answer,wrong answer 1,...`.
4. Click **Preview** to review and optionally remove questions.
5. Click **Save Test** to create or update the test and its choices.

### Manage tests

- In **Manage Tests**, enter your teacher PIN to reveal controls.
- Use the **Activate/Deactivate** buttons next to each test to control availability.
- Click a test title to edit questions and answers. After entering your teacher PIN on the test page you can modify text, mark the correct choice and save.

### Review test responses

- Enter your teacher PIN in **Review Test Responses** and click **Load Results** to see student scores for your tests.

### Assign a test to a student

- Use **Assign Test to Student** to pick a test, enter the student's name and a unique student PIN, then click **Assign**.

### Student review of results

- Students can open **Student Results**, provide their PIN and click **Load** to view their scores and completion times.

## Database migrations

This project includes SQL migrations for the DuckDB backend. The scripts live in the `migrations/` directory. To apply the initial schema, upload the SQL file to the FastAPI service:

```sh
curl -X POST -F "sql_file=@migrations/001_init.sql" https://web-production-b1513.up.railway.app/query-file
```

To add support for PIN codes and test activation, apply the additional migration:

```sh
curl -X POST -F "sql_file=@migrations/002_add_pins.sql" https://web-production-b1513.up.railway.app/query-file
```

This will create the tables used by the app for tests, questions and student attempts.

## Authentication

API requests now require a bearer token. Set `BACKEND_SERVICE_TOKEN` in your environment before running the app:

```sh
export BACKEND_SERVICE_TOKEN=your_token_here
npm run dev
```

The token is only sent from server-side routes; keep it private and avoid exposing it to the browser.
