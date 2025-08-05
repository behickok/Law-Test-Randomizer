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

## Database migrations

This project includes SQL migrations for the DuckDB backend. The scripts live in the `migrations/` directory. To apply the initial schema, upload the SQL file to the FastAPI service:

```sh
curl -X POST -F "sql_file=@migrations/001_init.sql" https://web-production-b1513.up.railway.app/query-file
```

This will create the tables used by the app for tests, questions and student attempts.

## Authentication

API requests now require a bearer token. Set `PASSPHRASE` in your environment before running the app:

```sh
export PASSPHRASE=your_token_here
npm run dev
```

The token will be sent in the `Authorization` header for all queries using SvelteKit's [environment modules](https://kit.svelte.dev/docs/load#environment).
