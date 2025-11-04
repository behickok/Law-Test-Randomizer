import { json } from '@sveltejs/kit';
import { runQuery } from '$lib/server/db';

export async function POST({ request, fetch }) {
	const body = await request.json();
	try {
		const data = await runQuery(fetch, body.sql, { source: body.source ?? 'duckdb' });
		return json(data);
	} catch (error) {
		return new Response(error.message ?? 'Query failed', {
			status: error.status ?? 500
		});
	}
}
