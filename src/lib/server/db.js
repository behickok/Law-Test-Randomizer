import { BACKEND_BASE_URL, BACKEND_SERVICE_TOKEN } from '$lib/server/env';

function ensureFetcher(fetcher) {
	if (fetcher) return fetcher;
	if (typeof fetch === 'function') return fetch;
	throw new Error('No fetch implementation available for backend request');
}

function buildHeaders(initHeaders) {
	const headers = new Headers(initHeaders ?? {});
	if (BACKEND_SERVICE_TOKEN && !headers.has('Authorization')) {
		headers.set('Authorization', `Bearer ${BACKEND_SERVICE_TOKEN}`);
	}
	return headers;
}

export async function backendFetch(fetcher, path, init = {}) {
	const finalFetch = ensureFetcher(fetcher);
	const headers = buildHeaders(init.headers);
	const response = await finalFetch(`${BACKEND_BASE_URL}${path}`, {
		...init,
		headers
	});
	return response;
}

export async function runQuery(fetcher, sql, { source = 'duckdb' } = {}) {
	const response = await backendFetch(fetcher, '/query', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ sql, source })
	});

	if (!response.ok) {
		const message = await response.text();
		const error = new Error(message || 'Backend query failed');
		error.status = response.status;
		throw error;
	}

	// Attempt to parse JSON, but fall back to raw text
	try {
		return await response.json();
	} catch {
		return await response.text();
	}
}

export async function runQueryFile(fetcher, formData) {
	const response = await backendFetch(fetcher, '/query-file', {
		method: 'POST',
		body: formData
	});

	if (!response.ok) {
		const message = await response.text();
		const error = new Error(message || 'Backend query-file failed');
		error.status = response.status;
		throw error;
	}

	try {
		return await response.json();
	} catch {
		return await response.text();
	}
}

export function escapeSql(str) {
	if (typeof str !== 'string') return str;
	return str.replace(/'/g, "''");
}

export function normaliseResult(result) {
	if (Array.isArray(result)) return result;
	if (result && Array.isArray(result.data)) return result.data;
	return [];
}
