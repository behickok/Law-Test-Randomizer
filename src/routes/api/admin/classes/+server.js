import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';
import { requireTeacher } from '$lib/server/authz';

export async function GET({ locals }) {
	try {
		requireTeacher(locals);
		const rows = normaliseResult(
			await runQuery(locals.db,
				`SELECT s.id AS student_id,
				        s.name AS student_name,
				        s.pin AS student_pin,
				        t.id AS teacher_id,
				        t.name AS teacher_name,
				        c.status
				 FROM students s
				 LEFT JOIN classes c ON s.id = c.student_id AND c.status = 'active'
				 LEFT JOIN teachers t ON c.teacher_id = t.id
				 ORDER BY s.name, t.name`
			)
		);
		const assignments = rows.map(({ student_pin, ...rest }) => ({
			...rest,
			student_has_pin: Boolean(student_pin),
			student_pin_is_hashed: typeof student_pin === 'string' && student_pin.includes(':')
		}));
		return json({ assignments });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load class assignments' },
			{ status: error?.status ?? 500 }
		);
	}
}
