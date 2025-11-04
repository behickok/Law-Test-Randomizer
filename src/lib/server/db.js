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

function serialiseParameter(value) {
        if (value === null || value === undefined) {
                return 'NULL';
        }

        if (value instanceof Date) {
                return `'${value.toISOString()}'`;
        }

        if (Array.isArray(value)) {
                if (value.length === 0) {
                        return '(NULL)';
                }

                return `(${value.map((entry) => serialiseParameter(entry)).join(', ')})`;
        }

        const type = typeof value;

        if (type === 'number') {
                if (!Number.isFinite(value)) {
                        throw new Error('Invalid numeric query parameter');
                }

                return String(value);
        }

        if (type === 'bigint') {
                return value.toString();
        }

        if (type === 'boolean') {
                return value ? 'TRUE' : 'FALSE';
        }

        return `'${escapeSql(String(value))}'`;
}

function bindParameters(text, values = []) {
        if (typeof text !== 'string') {
                throw new TypeError('Query text must be a string');
        }

        if (!Array.isArray(values)) {
                throw new TypeError('Query values must be an array');
        }

        if (values.length === 0) {
                return text;
        }

        const hasNumericPlaceholders = /\$\d+/.test(text);
        let consumed = 0;

        if (hasNumericPlaceholders) {
                const used = Array.from({ length: values.length }, () => false);

                const bound = text.replace(/\$(\d+)/g, (_, index) => {
                        const idx = Number(index) - 1;
                        if (!Number.isInteger(idx) || idx < 0 || idx >= values.length) {
                                throw new Error(`Missing value for parameter $${index}`);
                        }

                        used[idx] = true;
                        return serialiseParameter(values[idx]);
                });

                if (used.some((flag) => !flag)) {
                        throw new Error('Unused query parameter values provided');
                }

                return bound;
        }

        const bound = text.replace(/\?/g, () => {
                if (consumed >= values.length) {
                        throw new Error('Insufficient query parameter values provided');
                }

                const replacement = serialiseParameter(values[consumed]);
                consumed += 1;
                return replacement;
        });

        if (consumed !== values.length) {
                throw new Error('Unused query parameter values provided');
        }

        return bound;
}

function resolveQueryPayload(sqlOrConfig, options = {}) {
        const { source: optionSource, values: optionValues } = options;
        let source = optionSource ?? 'duckdb';

        if (typeof sqlOrConfig === 'string') {
                const values = optionValues ?? [];
                const sql = values.length ? bindParameters(sqlOrConfig, values) : sqlOrConfig;
                return { sql, source };
        }

        if (!sqlOrConfig || typeof sqlOrConfig !== 'object') {
                throw new TypeError('Query must be a SQL string or { text, values } object');
        }

        const { text, values = [], source: querySource } = sqlOrConfig;

        if (typeof text !== 'string') {
                throw new TypeError('Query text must be a string');
        }

        if (querySource) {
                source = querySource;
        }

        const sql = values.length ? bindParameters(text, values) : text;
        return { sql, source };
}

export async function runQuery(fetcher, sqlOrConfig, options = {}) {
        const { sql, source } = resolveQueryPayload(sqlOrConfig, options);

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
