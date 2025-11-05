import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';

function requireNumeric(value) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error('studentId must be numeric');
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function GET({params, locals}) {
	try {
		const studentId = requireNumeric(params.id);

		const rows = normaliseResult(
			await runQuery(locals.db,
				`SELECT c.teacher_id,
				        t.name AS teacher_name,
				        c.status
				 FROM classes c
				 JOIN teachers t ON c.teacher_id = t.id
				 WHERE c.student_id = ${studentId}
				 ORDER BY t.name`
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
