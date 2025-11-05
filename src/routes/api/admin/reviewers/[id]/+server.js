import { json } from '@sveltejs/kit';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';
import { hashPin, pinExists } from '$lib/server/pin';
import { validateCredential } from '$lib/credentials';
import { requireTeacher } from '$lib/server/authz';

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

export async function PUT({ params, request, fetch, locals }) {
	try {
		requireTeacher(locals);
		const id = requireNumericParam(params.id);
		const body = await request.json();
		const name = requireString(body?.name, 'name');
		const email = requireString(body?.email, 'email');
		const isActive = Boolean(body?.isActive);
		const pinProvided = body?.pin !== undefined && body?.pin !== null;
		let hashedPinSql = '';

                if (pinProvided) {
                        let pin;
                        try {
                                pin = validateCredential(body?.pin);
                        } catch (validationError) {
                                return json({ error: validationError.message }, { status: 400 });
                        }
                        if (await pinExists(fetch, pin, { table: 'reviewers', id })) {
                                return json({ error: 'Credential already exists. Choose a different value.' }, { status: 400 });
                        }
                        const hashedPin = hashPin(pin);
                        hashedPinSql = `, pin = '${escapeSql(hashedPin)}'`;
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
			     is_active = ${isActive ? 'TRUE' : 'FALSE'}
			     ${hashedPinSql}
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

export async function DELETE({ params, fetch, locals }) {
	try {
		requireTeacher(locals);
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
