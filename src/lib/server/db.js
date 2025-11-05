function resolveDatabase(target) {
	if (!target) {
		throw new Error(
			'[db] No database binding provided. Ensure a Cloudflare D1 binding named DB is configured.'
		);
	}

	if (typeof target.prepare === 'function') {
		return target;
	}

	if (target.locals?.db) {
		return resolveDatabase(target.locals.db);
	}

	if (target.db) {
		return resolveDatabase(target.db);
	}

	if (target.platform?.env?.DB) {
		return resolveDatabase(target.platform.env.DB);
	}

	if (target.env?.DB) {
		return resolveDatabase(target.env.DB);
	}

	throw new Error(
		'[db] Invalid database binding. Provide the D1 database instance (platform.env.DB).'
	);
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
        let source = optionSource ?? 'd1';

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

async function execute(database, sql) {
	const trimmed = sql.trim();
	if (!trimmed) {
		throw new Error('[db] Cannot execute an empty SQL statement');
	}

	// Prefer .all() to support statements that return rows (e.g. INSERT ... RETURNING).
	const statement = database.prepare(trimmed);
	const { results } = await statement.all();
	return results ?? [];
}

export async function runQuery(target, sqlOrConfig, options = {}) {
	const database = resolveDatabase(target);
        const { sql, source } = resolveQueryPayload(sqlOrConfig, options);

        // `source` is kept for compatibility with historical payloads but is unused now that
        // queries execute directly against the bound D1 database.
        void source;

	return execute(database, sql);
}

async function readSqlInput(input) {
	if (!input) {
		throw new Error('[db] No SQL input provided');
	}

	if (typeof input === 'string') {
		return input;
	}

	if ( typeof input === 'object') {
		if (input instanceof Blob) {
			return input.text();
		}

		if (typeof input.text === 'function') {
			return input.text();
		}
	}

	throw new Error('[db] Unsupported SQL input type');
}

export async function runQueryFile(target, sqlSource) {
	const database = resolveDatabase(target);
	const sql = await readSqlInput(sqlSource);
	const trimmed = sql.trim();
	if (!trimmed) {
		return { success: true };
	}

	await database.exec(trimmed);
	return { success: true };
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
