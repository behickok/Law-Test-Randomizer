import { json } from '@sveltejs/kit';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';
import { hashPin, pinExists } from '$lib/server/pin';
import { validateCredential } from '$lib/credentials';
import { requireTeacher } from '$lib/server/authz';

function requireString(value, field) {
	if (typeof value !== 'string' || !value.trim()) {
		const error = new Error(`${field} is required`);
		error.status = 400;
		throw error;
	}
	return value.trim();
}

export async function GET({ locals }) {
	try {
		requireTeacher(locals);
		const rows = normaliseResult(
			await runQuery(locals.db,
				`SELECT id, name, email, pin, is_active, created_at
				 FROM reviewers
				 ORDER BY created_at DESC`
			)
		);
		const reviewers = rows.map(({ pin, ...reviewer }) => ({
			...reviewer,
			has_pin: Boolean(pin),
			pin_is_hashed: typeof pin === 'string' && pin.includes(':')
		}));
		return json({ reviewers });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load reviewers' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function POST({ request, locals }) {
	try {
		requireTeacher(locals);
		const body = await request.json();
		const name = requireString(body?.name, 'name');
		const email = requireString(body?.email, 'email');
                let pin;
                try {
                        pin = validateCredential(body?.pin);
                } catch (validationError) {
                        return json({ error: validationError.message }, { status: 400 });
                }

                if (await pinExists(locals.db, pin)) {
                        return json({ error: 'Credential already exists. Choose a different value.' }, { status: 400 });
                }

		const emailCheck = normaliseResult(
			await runQuery(locals.db,
				`SELECT 1 FROM reviewers WHERE email = '${escapeSql(email)}' LIMIT 1`
			)
		);
		if (emailCheck.length > 0) {
			return json({ error: 'Email already exists. Choose a different email.' }, { status: 400 });
		}

		const hashedPin = hashPin(pin);

		const rows = normaliseResult(
			await runQuery(locals.db,
				`INSERT INTO reviewers (name, email, pin, is_active)
				 VALUES ('${escapeSql(name)}', '${escapeSql(email)}', '${escapeSql(hashedPin)}', TRUE)
				 RETURNING id, name, email, pin, is_active`
			)
		);

		const reviewer = rows[0];
		return json(
			{
				reviewer: {
					id: reviewer.id,
					name: reviewer.name,
					email: reviewer.email,
					is_active: reviewer.is_active,
					has_pin: true,
					pin_is_hashed: typeof reviewer.pin === 'string' && reviewer.pin.includes(':')
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to add reviewer' },
			{ status: error?.status ?? 500 }
		);
	}
}
