import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
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
			await runQuery(locals.db, 'SELECT id, name FROM teachers ORDER BY name')
		);
		return json({ teachers: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load teachers' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function POST({ request, locals }) {
	try {
		requireTeacher(locals);
		const body = await request.json();
                const name = requireString(body?.name, 'name');
                let pin;
                try {
                        pin = validateCredential(body?.pin);
                } catch (validationError) {
                        return json({ error: validationError.message }, { status: 400 });
                }

                if (await pinExists(locals.db, pin)) {
                        return json({ error: 'Credential already exists. Choose a different value.' }, { status: 400 });
                }

                const hashedPin = hashPin(pin);

		const result = normaliseResult(
			await runQuery(locals.db,
				`INSERT INTO teachers (name, pin, invite_code)
				 VALUES ('${escapeSql(name)}', '${escapeSql(hashedPin)}', '${randomUUID()}')
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
