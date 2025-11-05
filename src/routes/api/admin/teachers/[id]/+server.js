import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';
import { requireTeacher } from '$lib/server/authz';

function requireNumericParam(param) {
	if (!/^\d+$/.test(param ?? '')) {
		const error = new Error('Teacher id must be numeric');
		error.status = 400;
		throw error;
	}
	return Number(param);
}

export async function GET({ params, locals }) {
	try {
		requireTeacher(locals);
		const teacherId = requireNumericParam(params.id);
		const rows = normaliseResult(
			await runQuery(locals.db,
				`SELECT id, name, pin, invite_code FROM teachers WHERE id = ${teacherId} LIMIT 1`
			)
		);

		if (rows.length === 0) {
			return json({ error: 'Teacher not found' }, { status: 404 });
		}

		const { pin, ...teacher } = rows[0];
		return json({
			teacher: {
				...teacher,
				has_pin: Boolean(pin),
				pin_is_hashed: typeof pin === 'string' && pin.includes(':')
			}
		});
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load teacher' },
			{ status: error?.status ?? 500 }
		);
	}
}
