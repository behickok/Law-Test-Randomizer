import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';

function requireString(value, field) {
	if (typeof value !== 'string' || !value.trim()) {
		const error = new Error(`${field} is required`);
		error.status = 400;
		throw error;
	}
	return value.trim();
}

function requireNumericString(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return String(value).trim();
}

export async function GET({ fetch }) {
	try {
		const rows = normaliseResult(
			await runQuery(fetch, 'SELECT id, name FROM teachers ORDER BY name')
		);
		return json({ teachers: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load teachers' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function POST({ request, fetch }) {
	try {
		const body = await request.json();
		const name = requireString(body?.name, 'name');
		const pin = requireNumericString(body?.pin, 'pin');

		if (pin.length < 4) {
			return json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
		}

		// Ensure PIN uniqueness across teachers/students/reviewers
		const uniquenessCheck = normaliseResult(
			await runQuery(
				fetch,
				`SELECT 1 FROM teachers WHERE pin = '${escapeSql(pin)}'
				 UNION SELECT 1 FROM students WHERE pin = '${escapeSql(pin)}'
				 UNION SELECT 1 FROM reviewers WHERE pin = '${escapeSql(pin)}'
				 LIMIT 1`
			)
		);

		if (uniquenessCheck.length > 0) {
			return json({ error: 'PIN already exists. Choose a different PIN.' }, { status: 400 });
		}

		const result = normaliseResult(
			await runQuery(
				fetch,
				`INSERT INTO teachers (name, pin, invite_code)
				 VALUES ('${escapeSql(name)}', '${escapeSql(pin)}', '${randomUUID()}')
				 RETURNING id, name`
			)
		);

		return json({ teacher: result[0] }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to create teacher' },
			{ status: error?.status ?? 500 }
		);
	}
}
