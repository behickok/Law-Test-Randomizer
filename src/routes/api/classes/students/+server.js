import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function GET({ url, fetch }) {
	try {
		const teacherParam = url.searchParams.get('teacherId');
		if (!teacherParam) {
			return json({ error: 'teacherId query parameter is required' }, { status: 400 });
		}

		const teacherId = requireNumeric(teacherParam, 'teacherId');

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT s.id, s.name
				 FROM classes c
				 JOIN students s ON s.id = c.student_id
				 WHERE c.teacher_id = ${teacherId}
				   AND c.status = 'active'
				 ORDER BY s.name`
			)
		);

		return json({ students: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load class students' },
			{ status: error?.status ?? 500 }
		);
	}
}
