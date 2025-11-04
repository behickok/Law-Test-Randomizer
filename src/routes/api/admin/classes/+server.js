import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';

export async function GET({ fetch }) {
	try {
		const rows = normaliseResult(
			await runQuery(
				fetch,
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
		return json({ assignments: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load class assignments' },
			{ status: error?.status ?? 500 }
		);
	}
}
