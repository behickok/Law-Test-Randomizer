const BASE_URL = '/api';

export async function query(fetch, sql) {
	const res = await fetch(`${BASE_URL}/query`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ sql })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function uploadSQL(fetch, file) {
	const form = new FormData();
	form.append('sql_file', file);
	const res = await fetch(`${BASE_URL}/query-file`, {
		method: 'POST',
		body: form
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}
