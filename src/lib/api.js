import { PUBLIC_PASSPHRASE } from '$env/static/public';

const BASE_URL = 'https://web-production-b1513.up.railway.app';

export async function query(sql) {
	const res = await fetch(`${BASE_URL}/query`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(PUBLIC_PASSPHRASE ? { Authorization: `Bearer ${PUBLIC_PASSPHRASE}` } : {})
		},
		body: JSON.stringify({ sql, source: 'duckdb' })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function uploadSQL(file) {
	const form = new FormData();
	form.append('sql_file', file);
	const res = await fetch(`${BASE_URL}/query-file`, {
		method: 'POST',
		headers: {
			...(PASSPHRASE ? { Authorization: `Bearer ${PASSPHRASE}` } : {})
		},
		body: form
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}
