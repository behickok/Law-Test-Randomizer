import { json } from '@sveltejs/kit';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';
import { hashPin, pinExists } from '$lib/server/pin';
import { requireTeacher } from '$lib/server/authz';

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

export async function GET({ fetch, locals }) {
	try {
		requireTeacher(locals);
		const rows = normaliseResult(
			await runQuery(fetch, 'SELECT id, name, pin FROM students ORDER BY name')
		);
		const students = rows.map(({ id, name, pin }) => ({
			id,
			name,
			has_pin: Boolean(pin),
			pin_is_hashed: typeof pin === 'string' && pin.includes(':')
		}));
		return json({ students });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load students' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function POST({ request, fetch, locals }) {
	try {
		requireTeacher(locals);
		const body = await request.json();
		const name = requireString(body?.name, 'name');
		const pin = requireNumericString(body?.pin, 'pin');
		const teacherId =
			body?.teacherId === undefined ? undefined : requireNumericString(body.teacherId, 'teacherId');

		if (pin.length < 4) {
			return json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
		}

		if (await pinExists(fetch, pin)) {
			return json({ error: 'PIN already exists. Choose a different PIN.' }, { status: 400 });
		}

		const hashedPin = hashPin(pin);

		const insertedStudent = normaliseResult(
			await runQuery(
				fetch,
				`INSERT INTO students (name, pin)
				 VALUES ('${escapeSql(name)}', '${escapeSql(hashedPin)}')
				 RETURNING id, name, pin`
			)
		);
		const student = insertedStudent[0];

		if (teacherId !== undefined) {
			await runQuery(
				fetch,
				`INSERT INTO classes (teacher_id, student_id, status)
				 VALUES (${teacherId}, ${student.id}, 'active')
				 ON CONFLICT (teacher_id, student_id)
				 DO UPDATE SET status = 'active'`
			);
		}

		return json(
			{
				student: {
					id: student.id,
					name: student.name,
					has_pin: true,
					pin_is_hashed: typeof student.pin === 'string' && student.pin.includes(':')
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to create student' },
			{ status: error?.status ?? 500 }
		);
	}
}
