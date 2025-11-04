import { json } from '@sveltejs/kit';
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
			await runQuery(
				fetch,
				`SELECT id, name, email, pin, is_active, created_at
				 FROM reviewers
				 ORDER BY created_at DESC`
			)
		);
		return json({ reviewers: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load reviewers' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function POST({ request, fetch }) {
	try {
		const body = await request.json();
		const name = requireString(body?.name, 'name');
		const email = requireString(body?.email, 'email');
		const pin = requireNumericString(body?.pin, 'pin');

		if (pin.length < 4) {
			return json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
		}

		// Unique PIN check across all roles
		const pinCheck = normaliseResult(
			await runQuery(
				fetch,
				`SELECT 1 FROM teachers WHERE pin = '${escapeSql(pin)}'
				 UNION SELECT 1 FROM students WHERE pin = '${escapeSql(pin)}'
				 UNION SELECT 1 FROM reviewers WHERE pin = '${escapeSql(pin)}'
				 LIMIT 1`
			)
		);
		if (pinCheck.length > 0) {
			return json({ error: 'PIN already exists. Choose a different PIN.' }, { status: 400 });
		}

		const emailCheck = normaliseResult(
			await runQuery(
				fetch,
				`SELECT 1 FROM reviewers WHERE email = '${escapeSql(email)}' LIMIT 1`
			)
		);
		if (emailCheck.length > 0) {
			return json({ error: 'Email already exists. Choose a different email.' }, { status: 400 });
		}

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`INSERT INTO reviewers (name, email, pin, is_active)
				 VALUES ('${escapeSql(name)}', '${escapeSql(email)}', '${escapeSql(pin)}', TRUE)
				 RETURNING id, name, email, pin, is_active`
			)
		);

		return json({ reviewer: rows[0] }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to add reviewer' },
			{ status: error?.status ?? 500 }
		);
	}
}
