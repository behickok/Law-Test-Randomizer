import { PUBLIC_PASSPHRASE } from '$env/static/public';

const BASE_URL = 'https://web-production-b1513.up.railway.app';

export async function POST({ request }) {
	const body = await request.json();
	const res = await fetch(`${BASE_URL}/query`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(PUBLIC_PASSPHRASE ? { Authorization: `Bearer ${PUBLIC_PASSPHRASE}` } : {})
		},
		body: JSON.stringify({ sql: body.sql, source: 'duckdb' })
	});
	const text = await res.text();
	return new Response(text, {
		status: res.status,
		headers: { 'Content-Type': 'application/json' }
	});
}
