import { json } from '@sveltejs/kit';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';

function requireNumericParam(value) {
	if (!/^\d+$/.test(value ?? '')) {
		const error = new Error('Reviewer id must be numeric');
		error.status = 400;
		throw error;
	}
	return Number(value);
}

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

export async function PUT({ params, request, fetch }) {
	try {
		const id = requireNumericParam(params.id);
		const body = await request.json();
		const name = requireString(body?.name, 'name');
		const email = requireString(body?.email, 'email');
		const pin = requireNumericString(body?.pin, 'pin');
		const isActive = Boolean(body?.isActive);

		if (pin.length < 4) {
			return json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
		}

		const emailCheck = normaliseResult(
			await runQuery(
				fetch,
				`SELECT 1 FROM reviewers WHERE email = '${escapeSql(email)}' AND id <> ${id} LIMIT 1`
			)
		);
		if (emailCheck.length > 0) {
			return json({ error: 'Email already exists. Choose a different email.' }, { status: 400 });
		}

		await runQuery(
			fetch,
			`UPDATE reviewers
			 SET name = '${escapeSql(name)}',
			     email = '${escapeSql(email)}',
			     pin = '${escapeSql(pin)}',
			     is_active = ${isActive ? 'TRUE' : 'FALSE'}
			 WHERE id = ${id}`
		);

		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to update reviewer' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function DELETE({ params, fetch }) {
	try {
		const id = requireNumericParam(params.id);
		await runQuery(
			fetch,
			`UPDATE reviewers
			 SET is_active = FALSE
			 WHERE id = ${id}`
		);
		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to deactivate reviewer' },
			{ status: error?.status ?? 500 }
		);
	}
}
